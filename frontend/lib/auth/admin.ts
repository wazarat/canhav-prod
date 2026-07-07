import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { readSecret } from "@/lib/server/env";

/**
 * Supabase-backed admin gate for the /admin panel ONLY. Fully independent of the
 * public app's Privy + `canhav_session` auth (lib/auth/session.ts is untouched).
 *
 * Admin membership is an `admins` table in Supabase (dashboard-managed): a row
 * per allowed email. Grant = insert a row, revoke = delete it, no redeploy.
 *
 * Env (all via readSecret → process.env or backend/.env):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

export interface AdminUser {
  email: string;
  role: string | null;
}

function supabaseEnv(): { url: string | null; anon: string | null; service: string | null } {
  return {
    url: readSecret("NEXT_PUBLIC_SUPABASE_URL"),
    anon: readSecret("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    service: readSecret("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/** Whether the browser-facing Supabase client can be constructed at all. */
export function hasSupabaseAuth(): boolean {
  const { url, anon } = supabaseEnv();
  return Boolean(url && anon);
}

/**
 * Resolve the current admin from the Supabase auth cookie, or null. Verifies the
 * signed-in email exists in the `admins` table via a service-role query (bypasses
 * RLS). Returns null on any gap (no env, no session, not an admin).
 */
export async function requireAdmin(): Promise<AdminUser | null> {
  const { url, anon, service } = supabaseEnv();
  if (!url || !anon || !service) return null;

  const cookieStore = cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // No-op: server components can't set cookies. Session refresh happens in
      // the login route/client; here we only read to authorize.
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from("admins")
    .select("email, role")
    .eq("email", email)
    .maybeSingle();
  if (error || !data) return null;

  return { email: String(data.email), role: (data.role as string | null) ?? null };
}

/**
 * Authorize an API request for admin actions. Accepts either a valid Supabase
 * admin session (the /admin UI calls with its cookie) OR a
 * `Bearer <APPROVAL_TOKEN>` header (scripts / the existing ops tooling). Returns
 * true when either path authorizes.
 */
export async function authorizeAdminRequest(req: Request): Promise<boolean> {
  const token = readSecret("APPROVAL_TOKEN");
  if (token && req.headers.get("authorization") === `Bearer ${token}`) return true;
  return (await requireAdmin()) !== null;
}
