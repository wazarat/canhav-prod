import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readSecret } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase magic-link callback: exchange the `code` for a session and write the
 * auth cookies, then redirect into /admin. Mirrors the @supabase/ssr Next.js
 * pattern; cookies are mutable in a Route Handler.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/admin";

  const supUrl = readSecret("NEXT_PUBLIC_SUPABASE_URL");
  const anon = readSecret("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!code || !supUrl || !anon) {
    return NextResponse.redirect(new URL("/admin/login?error=callback", url.origin));
  }

  const cookieStore = cookies();
  const supabase = createServerClient(supUrl, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/admin/login?error=exchange", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
