"use client";

import { useState } from "react";

import { getSupabaseBrowser } from "@/lib/auth/supabaseBrowser";

/**
 * Dedicated admin entry point: Supabase magic-link login. Independent of the
 * public app's Privy login. On success the email link routes through
 * /admin/auth/callback which sets the session cookie and lands on /admin.
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const supabase = getSupabaseBrowser();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured on this deployment.");
      return;
    }
    setStatus("sending");
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your email for a sign-in link.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Admin sign-in</h1>
        <p className="mt-1 text-sm text-ink-400">
          Enter your admin email to receive a magic sign-in link.
        </p>
      </div>

      {!supabase && (
        <p className="rounded-md border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none focus:border-electric-500"
        />
        <button
          type="submit"
          disabled={status === "sending" || !supabase}
          className="w-full rounded-md bg-electric-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-electric-500 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {message && (
        <p
          className={`text-sm ${status === "error" ? "text-rose-400" : "text-emerald-400"}`}
        >
          {message}
        </p>
      )}
    </main>
  );
}
