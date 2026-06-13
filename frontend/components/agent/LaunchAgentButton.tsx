"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { AlertTriangle, CheckCircle2, Loader2, LogIn, Rocket, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { AGENT_CATEGORIES, type AgentCategory } from "@/lib/agent/categories";
import { mintAgentOnClient, type SpawnPreflightResponse } from "@/lib/agent/spawn-client";
import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";
import { cn } from "@/lib/utils";
import type { AgentProductRef, AgentSkill } from "canhav-agent-service";
import type { Signer } from "@zerodev/sdk/types";
import {
  ENTITY_AGENT_MINTED_EVENT,
  openResearchChat,
} from "./research-chat-context";
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
  onChain?: boolean;
  pendingVerification?: boolean;
  error?: string;
  code?: string;
}

function newNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function LaunchAgentButton({
  skills,
  zerodevConfigured,
  entitySlug,
}: {
  skills: SkillOption[];
  zerodevConfigured: boolean;
  /**
   * Legacy: when set, the agent is launched pre-bound to this project (Entity).
   * Omitted on the Agents tab, where agents are general (no entity binding).
   */
  entitySlug?: string;
}) {
  const router = useRouter();
  const [skillId, setSkillId] = useState(skills[0]?.id ?? "");
  const [agentName, setAgentName] = useState("");
  const [category, setCategory] = useState<AgentCategory | null>(null);
  const [catalog, setCatalog] = useState<SkillPickerOption[]>([]);
  const [extraSkillIds, setExtraSkillIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "wallet" | "minting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ agentId: string; pending: boolean } | null>(null);
  // A general agent (no entity) needs a unique creation slot so one wallet can
  // own many agents; the nonce is held stable across retries and rotated after a
  // successful mint so the next launch is a distinct agent.
  const [createNonce, setCreateNonce] = useState<string>(() => newNonce());

  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const isGeneral = !entitySlug;
  const configured = zerodevConfigured;
  const busy = phase !== "idle";

  // Keep the core-skill selection valid as the catalog/props resolve.
  useEffect(() => {
    if (!skillId && skills[0]?.id) setSkillId(skills[0].id);
  }, [skills, skillId]);

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
    setCreated(null);
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
      //    General agents key off a per-create nonce; legacy mints off an entity.
      setPhase("minting");
      const slotQuery = isGeneral
        ? `&nonce=${encodeURIComponent(createNonce)}`
        : `&entitySlug=${encodeURIComponent(entitySlug as string)}`;
      const preflightRes = await fetch(
        `/api/agent/spawn/preflight?skillId=${encodeURIComponent(skillId)}${slotQuery}`,
      );
      const preflight = (await preflightRes.json()) as SpawnPreflightResponse;
      if (!preflightRes.ok || !preflight.configured) {
        throw new Error(preflight.error ?? `Preflight failed (status ${preflightRes.status}).`);
      }
      if (preflight.reused && preflight.agentId && preflight.agentAddress) {
        window.dispatchEvent(new CustomEvent(ENTITY_AGENT_MINTED_EVENT));
        setCreated({ agentId: preflight.agentId, pending: false });
        if (isGeneral) {
          setCreateNonce(newNonce());
          setAgentName("");
          router.refresh();
        } else {
          openResearchChat();
        }
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
        entitySlug: entitySlug ?? null,
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
          ...(isGeneral ? { nonce: createNonce } : { entitySlug }),
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
      window.dispatchEvent(new CustomEvent(ENTITY_AGENT_MINTED_EVENT));
      setCreated({ agentId: data.agentId, pending: Boolean(data.pendingVerification) });
      if (isGeneral) {
        // Rotate the slot so the next launch is a distinct agent, and refresh
        // the roster so the new agent appears immediately.
        setCreateNonce(newNonce());
        setAgentName("");
        setCategory(null);
        setExtraSkillIds([]);
        router.refresh();
      } else {
        openResearchChat();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Minting failed.");
    } finally {
      setPhase("idle");
    }
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

      {created && (
        <div className="flex items-start gap-2 rounded-lg border border-neon-500/30 bg-neon-500/10 px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-300" />
          <p className="text-xs leading-relaxed text-neon-100">
            Agent minted.{" "}
            {created.pending && (
              <span className="text-ink-300">
                On-chain confirmation is still settling — open the agent to verify.{" "}
              </span>
            )}
            <Link
              href={`/agents/${encodeURIComponent(created.agentId)}`}
              className="font-medium text-neon-300 underline-offset-2 hover:underline"
            >
              Open {agentName.trim() || "your new agent"} →
            </Link>
          </p>
        </div>
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
