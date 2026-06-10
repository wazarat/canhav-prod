"use client";

import { useState } from "react";
import { AlertTriangle, Fingerprint, Loader2, LogIn, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { resolvePasskeyRpId } from "@/lib/auth/passkey-rp";

const PASSKEY_SERVER = process.env.NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER;

interface AuthResponse {
  ok?: boolean;
  configured?: boolean;
  userId?: string;
  error?: string;
}

export interface SessionInfo {
  userId: string;
  agentId: string;
  displayName?: string | null;
}

export function PasskeyAuthGate({
  passkeyConfigured,
  onAuthenticated,
}: {
  passkeyConfigured: boolean;
  onAuthenticated: (session: SessionInfo) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "register" | "login">("idle");
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  async function authenticate(mode: "register" | "login") {
    if (!PASSKEY_SERVER) return;
    setError(null);
    setPhase(mode);

    try {
      const { toWebAuthnKey, WebAuthnMode } = await import("@zerodev/webauthn-key");
      const rpId = resolvePasskeyRpId();
      const webAuthnKey = await toWebAuthnKey({
        passkeyName: "CanHav Research",
        passkeyServerUrl: PASSKEY_SERVER,
        rpID: rpId,
        mode: mode === "register" ? WebAuthnMode.Register : WebAuthnMode.Login,
      });

      // SDK returns rpID as "" — use the resolved RP ID for server validation.
      const rpID = webAuthnKey.rpID || rpId;

      const res = await fetch("/api/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          displayName: displayName.trim() || undefined,
          webAuthnKey: {
            pubX: webAuthnKey.pubX.toString(),
            pubY: webAuthnKey.pubY.toString(),
            authenticatorId: webAuthnKey.authenticatorId,
            authenticatorIdHash: webAuthnKey.authenticatorIdHash,
            rpID,
          },
        }),
      });
      const data = (await res.json()) as AuthResponse;
      if (!res.ok || !data.ok || !data.userId) {
        throw new Error(data.error ?? `Authentication failed (status ${res.status}).`);
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
      setError(e instanceof Error ? e.message : "Passkey authentication failed.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <div className="glass w-full max-w-md space-y-6 rounded-2xl p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-50">
            Sign in to Agent Lab
          </h1>
          <p className="text-sm leading-relaxed text-ink-300">
            Use a passkey to access your research chats and launch on-chain agents. No password
            required.
          </p>
        </div>

        {!passkeyConfigured ? (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <Badge tone="warning" className="w-fit">
              <AlertTriangle className="h-3 w-3" /> Passkey server not configured
            </Badge>
            <p className="text-xs leading-relaxed text-ink-400">
              Set{" "}
              <code className="font-mono text-ink-200">NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER</code> in
              your environment to enable passkey sign-in.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
                Your name <span className="text-ink-600">(optional)</span>
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Ada Lovelace"
                maxLength={80}
                disabled={phase !== "idle"}
                className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 transition-colors focus:border-electric-500/50 focus:outline-none disabled:opacity-50"
              />
              <span className="text-[10px] text-ink-500">
                Identifies you across your wallet and the agents you create.
              </span>
            </label>
            <button
              type="button"
              onClick={() => authenticate("login")}
              disabled={phase !== "idle"}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-electric-500/40 bg-electric-500/10 px-4 py-2.5 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
            >
              {phase === "login" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Sign in with passkey
            </button>
            <button
              type="button"
              onClick={() => authenticate("register")}
              disabled={phase !== "idle"}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:border-ink-600 hover:text-ink-50 disabled:opacity-50"
            >
              {phase === "register" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create passkey account
            </button>
          </div>
        )}

        {error && <p className="text-center text-xs text-rose-300">{error}</p>}

        <p className="text-center text-[10px] text-ink-500">
          Powered by ZeroDev · Arbitrum Sepolia testnet
        </p>
      </div>
    </div>
  );
}
