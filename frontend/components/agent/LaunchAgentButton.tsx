"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { AlertTriangle, Loader2, LogIn, Rocket, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { AGENT_CATEGORIES, type AgentCategory } from "@/lib/agent/categories";
import { mintAgentOnClient, type SpawnPreflightResponse } from "@/lib/agent/spawn-client";
import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";
import { cn } from "@/lib/utils";
import type { AgentProductRef, AgentSkill } from "canhav-agent-service";
import type { Signer } from "@zerodev/sdk/types";
import { AgentIdentityCard, type AgentIdentity } from "./AgentIdentityCard";
import { SkillPicker, type SkillPickerOption } from "./SkillPicker";

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

export function LaunchAgentButton({
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
  const [agentName, setAgentName] = useState("");
  const [category, setCategory] = useState<AgentCategory | null>(null);
  const [catalog, setCatalog] = useState<SkillPickerOption[]>([]);
  const [extraSkillIds, setExtraSkillIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "wallet" | "minting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const router = useRouter();

  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const configured = zerodevConfigured;
  const busy = phase !== "idle";

  // Full platform skill catalog (entities + stablecoins + RWAs + tokens) so
  // the owner can hand the new agent extra knowledge at creation.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/agent/skills");
        if (!res.ok) return;
        const data = (await res.json()) as { skills?: SkillPickerOption[] };
        if (active && data.skills) setCatalog(data.skills);
      } catch {
        // Catalog is optional sugar — the bound entity skill still works.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // The bound entity skill is always part of the selection and can't be removed.
  const pickerSelection = useMemo(
    () => [skillId, ...extraSkillIds.filter((id) => id !== skillId)],
    [skillId, extraSkillIds],
  );

  function toggleExtraSkill(id: string) {
    if (id === skillId) return;
    setExtraSkillIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function launch() {
    setError(null);
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    // The owner mints with their existing self-custodial wallet — prompt the
    // social login if the Privy session isn't live (e.g. it expired while the
    // CanHav cookie is still valid).
    if (!authenticated) {
      login();
      return;
    }

    try {
      // 1) Resolve the user's Privy embedded wallet and build a viem signer from
      //    its EIP-1193 provider. Keys stay in Privy's TEE; this signer drives
      //    the ZeroDev Kernel account's ECDSA validator.
      setPhase("wallet");
      const embedded = wallets.find((w) => w.walletClientType === "privy");
      if (!embedded) {
        throw new Error("Your embedded wallet isn't ready yet — try again in a moment.");
      }
      try {
        await embedded.switchChain(ARBITRUM_SEPOLIA_CHAIN_ID);
      } catch {
        // Non-fatal: the kernel client pins Arbitrum Sepolia regardless.
      }
      const provider = await embedded.getEthereumProvider();
      const { createWalletClient, custom } = await import("viem");
      const { arbitrumSepolia } = await import("viem/chains");
      const signer: Signer = createWalletClient({
        account: embedded.address as `0x${string}`,
        chain: arbitrumSepolia,
        transport: custom(provider),
      });

      // 2) Preflight: reuse check + mint config (userOp signing stays in-browser).
      setPhase("minting");
      const preflightRes = await fetch(
        `/api/agent/spawn/preflight?skillId=${encodeURIComponent(skillId)}&entitySlug=${encodeURIComponent(entitySlug ?? skillId)}`,
      );
      const preflight = (await preflightRes.json()) as SpawnPreflightResponse;
      if (!preflightRes.ok || !preflight.configured) {
        throw new Error(preflight.error ?? `Preflight failed (status ${preflightRes.status}).`);
      }
      if (preflight.reused && preflight.agentId && preflight.agentAddress) {
        setIdentity({
          agentId: preflight.agentId,
          agentAddress: preflight.agentAddress,
          agentURI: preflight.agentURI ?? null,
          arbiscanUrl: preflight.arbiscanUrl ?? null,
          tokenUrl: preflight.tokenUrl ?? null,
          skillTitle: skill.title,
          onChain: true,
        });
        router.push(`/agents/${encodeURIComponent(preflight.agentId)}`);
        return;
      }
      if (
        preflight.accountIndex == null ||
        !preflight.mintConfig ||
        !preflight.baseUrl ||
        !preflight.skill
      ) {
        throw new Error("Spawn preflight missing mint parameters.");
      }

      // 3) Mint in the browser (the embedded wallet signs userOps).
      const mintResult = await mintAgentOnClient({
        skill: preflight.skill as AgentSkill,
        signer,
        accountIndex: preflight.accountIndex,
        entitySlug: entitySlug ?? skillId,
        associatedProducts: (preflight.associatedProducts as AgentProductRef[]) ?? [],
        mintConfig: preflight.mintConfig,
        baseUrl: preflight.baseUrl,
      });

      // 4) Persist the minted identity server-side (no signing on Vercel).
      const res = await fetch("/api/agent/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId,
          entitySlug: entitySlug ?? skillId,
          mintResult,
          name: agentName.trim() || undefined,
          category: category ?? undefined,
          extraSkillIds,
        }),
      });
      const data = (await res.json()) as SpawnResponse;
      if (!res.ok || !data.ok || !data.agentId || !data.agentAddress) {
        throw new Error(data.error ?? `Spawn persist failed (status ${res.status}).`);
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
      setError(e instanceof Error ? e.message : "Minting failed.");
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
            Mint an on-chain ERC-8004 identity owned by your self-custodial wallet.
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
          <code className="font-mono text-ink-200">SECURITY_REGISTRY_ADDRESS</code> and the{" "}
          <code className="font-mono text-ink-200">NEXT_PUBLIC_PRIVY_APP_ID</code> /{" "}
          <code className="font-mono text-ink-200">PRIVY_APP_SECRET</code> pair. The full social
          login → mint flow is wired and ready.
        </p>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
              Agent name
            </span>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              maxLength={60}
              placeholder='Name your agent (e.g. "Peg Sentinel")'
              disabled={busy}
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
              Category
            </span>
            <div className="flex flex-wrap gap-1.5">
              {AGENT_CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(active ? null : c.id)}
                    disabled={busy}
                    title={c.description}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                      active
                        ? "border-electric-500/60 bg-electric-500/15 text-electric-300"
                        : "border-ink-700 bg-ink-900/60 text-ink-300 hover:border-electric-500/40 hover:text-ink-100",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {skills.length > 1 && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
                Core skill
              </span>
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
          )}

          {catalog.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
                Skills
              </span>
              <p className="text-xs text-ink-500">
                The project&apos;s core skill is included. Add knowledge from other entities,
                stablecoins, RWAs, and tokens — the agent studies everything you select.
              </p>
              <SkillPicker
                options={catalog}
                selected={pickerSelection}
                onToggle={toggleExtraSkill}
                lockedIds={[skillId]}
                disabled={busy}
              />
            </div>
          )}

          <button
            type="button"
            onClick={launch}
            disabled={busy || !skillId || !ready}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : authenticated ? (
              <Wallet className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {phase === "wallet"
              ? "Approve in your wallet…"
              : phase === "minting"
                ? "Minting identity…"
                : authenticated
                  ? "Mint with your wallet"
                  : "Sign in to mint"}
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
