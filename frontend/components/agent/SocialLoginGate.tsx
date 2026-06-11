"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { Loader2, LogIn } from "lucide-react";

export interface SessionInfo {
  userId: string;
  agentId: string;
  displayName?: string | null;
}

/**
 * Social-login gate (Privy). The user signs in with Google or email and Privy
 * provisions a self-custodial embedded wallet; we then verify the Privy access
 * token server-side and mint the CanHav session cookie. No QR codes, no seed
 * phrase. Only rendered when Privy is configured (provider is mounted), so the
 * `usePrivy` hook is always safe here.
 */
export function SocialLoginGate({
  onAuthenticated,
}: {
  onAuthenticated: (session: SessionInfo) => void;
}) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { login } = useLogin({
    onError: (code) => {
      setPhase("idle");
      setError(
        `Privy sign-in failed (${code}). If this persists, check the Privy dashboard: Allowed origins include this site, Google + email login are enabled, embedded wallets are on, and Arbitrum Sepolia (421614) is added as a chain.`,
      );
    },
  });
  const [displayName, setDisplayName] = useState("");
  const [phase, setPhase] = useState<"idle" | "connecting" | "establishing">("idle");
  const [error, setError] = useState<string | null>(null);
  const establishedRef = useRef(false);
  const displayNameRef = useRef("");

  const establishSession = useCallback(async () => {
    setPhase("establishing");
    setError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Could not read your Privy session token.");
      const email = user?.email?.address ?? user?.google?.email ?? null;
      const res = await fetch("/api/auth/privy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          displayName: displayNameRef.current.trim() || undefined,
          email,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Login failed (status ${res.status}).`);
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = (await sessionRes.json()) as {
        authenticated?: boolean;
        userId?: string;
        agentId?: string;
        profile?: { displayName?: string | null } | null;
      };
      if (!session.authenticated || !session.userId || !session.agentId) {
        throw new Error("Session could not be established.");
      }

      onAuthenticated({
        userId: session.userId,
        agentId: session.agentId,
        displayName: session.profile?.displayName ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setPhase("idle");
    }
  }, [getAccessToken, user, onAuthenticated]);

  // Once Privy reports an authenticated user, exchange the token for our cookie.
  useEffect(() => {
    if (ready && authenticated && !establishedRef.current) {
      establishedRef.current = true;
      void establishSession();
    }
  }, [ready, authenticated, establishSession]);

  const busy = phase !== "idle" || (authenticated && !error);

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <div className="glass w-full max-w-md space-y-6 rounded-2xl p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-50">
            Sign in to Agent Lab
          </h1>
          <p className="text-sm leading-relaxed text-ink-300">
            Sign in with Google or email to spin up your self-custodial research wallet and launch
            on-chain agents. No seed phrase, no extensions.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
              Your name <span className="text-ink-600">(optional)</span>
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                displayNameRef.current = e.target.value;
              }}
              placeholder="e.g. Ada Lovelace"
              maxLength={80}
              disabled={busy}
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 transition-colors focus:border-electric-500/50 focus:outline-none disabled:opacity-50"
            />
            <span className="text-[10px] text-ink-500">
              Identifies you across your wallet and the agents you create.
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setPhase("connecting");
              login();
            }}
            disabled={!ready || busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-electric-500/40 bg-electric-500/10 px-4 py-2.5 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {phase === "establishing"
              ? "Setting up your wallet…"
              : phase === "connecting"
                ? "Opening sign-in…"
                : "Continue with Google or email"}
          </button>

          {error && (
            <button
              type="button"
              onClick={() => void establishSession()}
              className="text-center text-xs font-medium text-ink-400 transition-colors hover:text-ink-100"
            >
              Try again
            </button>
          )}
        </div>

        {error && <p className="text-center text-xs text-rose-300">{error}</p>}

        <p className="text-center text-[10px] text-ink-500">
          Self-custodial wallet by Privy · ZeroDev smart accounts · Arbitrum Sepolia testnet
        </p>
      </div>
    </div>
  );
}
