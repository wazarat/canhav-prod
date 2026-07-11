"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { Loader2, LogIn, Wallet } from "lucide-react";

export interface SessionInfo {
  userId: string;
  agentId: string;
  displayName?: string | null;
}

/**
 * Auth gate (Privy). Sign in with MetaMask, Google, or email. MetaMask becomes
 * the ECDSA root of your treasury + agents; social login provisions an embedded
 * wallet instead. We verify the Privy access token server-side and mint the
 * CanHav session cookie.
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
        `Privy sign-in failed (${code}). Check the Privy dashboard: allowed origins include this site, Wallet + Google + email login are enabled, embedded wallets are on for social users, and chain 421614 is added.`,
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
            Connect MetaMask for a wallet you control on Arbitrum, or sign in with Google
            or email for a self-custodial embedded wallet. Your signer becomes the treasury root for
            credits and on-chain agents.
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
                : "Continue with MetaMask, Google, or email"}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-ink-500">
            <Wallet className="h-3 w-3" />
            MetaMask login uses your extension on Arbitrum · Privy embedded wallet for social
          </p>

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
          Self-custodial Privy wallets · tCNHV credits · Arbitrum
        </p>
      </div>
    </div>
  );
}
