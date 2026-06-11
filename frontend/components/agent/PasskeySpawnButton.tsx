"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Fingerprint, Loader2, Rocket } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { resolvePasskeyRpId } from "@/lib/auth/passkey-rp";
import { AgentIdentityCard, type AgentIdentity } from "./AgentIdentityCard";

interface SkillOption {
  id: string;
  title: string;
}

interface SpawnResponse {
  ok?: boolean;
  configured?: boolean;
  agentId?: string;
  agentAddress?: string;
  agentURI?: string;
  arbiscanUrl?: string;
  tokenUrl?: string;
  error?: string;
  code?: string;
}

const PASSKEY_SERVER = process.env.NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER;

export function PasskeySpawnButton({
  skills,
  zerodevConfigured,
  entitySlug,
}: {
  skills: SkillOption[];
  zerodevConfigured: boolean;
  /** When set, the agent is launched pre-bound to this project (Entity). */
  entitySlug?: string;
}) {
  const [skillId, setSkillId] = useState(skills[0]?.id ?? "");
  const [phase, setPhase] = useState<"idle" | "passkey" | "minting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const router = useRouter();

  const configured = zerodevConfigured;
  const busy = phase !== "idle";

  async function launch() {
    setError(null);
    const skill = skills.find((s) => s.id === skillId);
    if (!skill || !PASSKEY_SERVER) return;

    try {
      // 1) Client-side passkey ceremony (no seed phrase). Loaded on demand so the
      //    WebAuthn SDK never weighs down the initial bundle or SSR.
      //
      //    Use Login (not Register): the owner reaches this button already signed
      //    in with a passkey, so we reuse that EXISTING credential to own the
      //    agent. Registering here instead would mint a brand-new throwaway
      //    passkey on every click (passkey sprawl) and detach the agent from the
      //    user's wallet. One passkey owns many agents — one per project — via the
      //    server-derived account index.
      setPhase("passkey");
      const { toWebAuthnKey, WebAuthnMode } = await import("@zerodev/webauthn-key");
      const rpId = resolvePasskeyRpId();
      const webAuthnKey = await toWebAuthnKey({
        passkeyName: `CanHav · ${skill.title}`,
        passkeyServerUrl: PASSKEY_SERVER,
        rpID: rpId,
        mode: WebAuthnMode.Login,
      });

      // 2) Hand the public key to the server bridge to mint the ERC-8004 identity.
      setPhase("minting");
      const rpID = webAuthnKey.rpID || rpId;
      const res = await fetch("/api/agent/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId,
          entitySlug: entitySlug ?? skillId,
          webAuthnKey: {
            pubX: webAuthnKey.pubX.toString(),
            pubY: webAuthnKey.pubY.toString(),
            authenticatorId: webAuthnKey.authenticatorId,
            authenticatorIdHash: webAuthnKey.authenticatorIdHash,
            rpID,
          },
        }),
      });
      const data = (await res.json()) as SpawnResponse;
      if (!res.ok || !data.ok || !data.agentId || !data.agentAddress) {
        throw new Error(data.error ?? `Spawn failed (status ${res.status}).`);
      }
      setIdentity({
        agentId: data.agentId,
        agentAddress: data.agentAddress,
        agentURI: data.agentURI ?? null,
        arbiscanUrl: data.arbiscanUrl ?? null,
        tokenUrl: data.tokenUrl ?? null,
        skillTitle: skill.title,
        onChain: true,
      });
      router.push(`/agents/${encodeURIComponent(data.agentId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey ceremony failed.");
    } finally {
      setPhase("idle");
    }
  }

  if (identity) {
    return (
      <div className="space-y-3">
        <AgentIdentityCard
          identity={identity}
          verifyUrl={`/api/agent/${encodeURIComponent(identity.agentId)}/verify`}
        />
        <button
          type="button"
          onClick={() => setIdentity(null)}
          className="text-xs font-medium text-ink-400 transition-colors hover:text-ink-100"
        >
          Launch another agent
        </button>
      </div>
    );
  }

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-50">
            <Rocket className="h-4 w-4 text-neon-400" />
            Launch agent
          </h3>
          <p className="mt-1 text-sm text-ink-300">
            Mint an on-chain ERC-8004 identity owned by your existing passkey.
          </p>
        </div>
        {!configured && (
          <Badge tone="warning">
            <AlertTriangle className="h-3 w-3" /> not configured
          </Badge>
        )}
      </div>

      {!configured ? (
        <p className="text-sm text-ink-400">
          Deploy the registries, create a ZeroDev project, then set{" "}
          <code className="font-mono text-ink-200">ZERODEV_RPC</code>,{" "}
          <code className="font-mono text-ink-200">IDENTITY_REGISTRY_ADDRESS</code>,{" "}
          <code className="font-mono text-ink-200">SECURITY_REGISTRY_ADDRESS</code> and{" "}
          <code className="font-mono text-ink-200">NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER</code>. The
          full passkey → mint flow is wired and ready.
        </p>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Skill</span>
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            >
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={launch}
            disabled={busy || !skillId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Fingerprint className="h-4 w-4" />
            )}
            {phase === "passkey"
              ? "Approve passkey…"
              : phase === "minting"
                ? "Minting identity…"
                : "Mint with your passkey"}
          </button>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
          <p className="text-xs leading-relaxed text-rose-200">{error}</p>
        </div>
      )}
    </div>
  );
}
