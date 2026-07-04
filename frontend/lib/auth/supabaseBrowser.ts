"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client for the /admin login flow. Reads the public env
 * vars inlined at build time. Returns null when Supabase isn't configured so the
 * login page can render an explicit "not configured" state instead of throwing.
 */
let _client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!_client) _client = createBrowserClient(url, anon);
  return _client;
}
