"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { AlertTriangle, CheckCircle2, Loader2, Search, Star, Wallet } from "lucide-react";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";
import {
  getSellerQuote,
  payStrategy,
  recordCollabOnChain,
  submitFeedbackOnChain,
  type FeedbackParams,
  type RecordParams,
  type SellerQuote,
} from "@/lib/agent/collab-client";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";
import type { StrategyPacket } from "@/lib/types";
import type { Signer } from "@zerodev/sdk/types";

interface AgentListing {
  agentId: string;
  agentName: string;
  ownerHandle: string;
  agentWallet: string | null;
  walletVerified: boolean;
  attachedSkillTitles: string[];
  x402: { price: string; asset: string; decimals: number };
  reputationScore: number | null;
  specialization?: {
    focusAreas: string[];
    riskLens: string | null;
    category?: string | null;
    entitySlug: string | null;
    level: number;
    knowledgeDocs: number;
    dataFrames: number;
    customTools: number;
    exchangeCount: number;
  } | null;
}

interface BuyerAgent {
  agentId: string;
  name: string;
}

type Phase = "idle" | "preflight" | "quoting" | "paying" | "settling" | "recording" | "done";

export function CollabBrowser({ buyerAgents }: { buyerAgents: BuyerAgent[] }) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [agents, setAgents] = useState<AgentListing[] | null>(null);
  const [buyerAgentId, setBuyerAgentId] = useState(buyerAgents[0]?.agentId ?? "");
  const [selection, setSelection] = useState<AgentListing | null>(null);
  const [objective, setObjective] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [packet, setPacket] = useState<StrategyPacket | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingBusy, setRatingBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/collab/discover");
        if (!res.ok) {
          if (active) setAgents([]);
          return;
        }
        const data = (await res.json()) as { agents?: AgentListing[] };
        if (active) setAgents(data.agents ?? []);
      } catch {
        if (active) setAgents([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function buildSigner(): Promise<Signer> {
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded) throw new Error("Your embedded wallet isn't ready yet — try again in a moment.");
    try {
      await embedded.switchChain(ARBITRUM_SEPOLIA_CHAIN_ID);
    } catch {
      /* kernel client pins the chain regardless */
    }
    const provider = await embedded.getEthereumProvider();
    const { createWalletClient, custom } = await import("viem");
    const { arbitrumSepolia } = await import("viem/chains");
    return createWalletClient({
      account: embedded.address as `0x${string}`,
      chain: arbitrumSepolia,
      transport: custom(provider),
    });
  }

  async function approveAndPay() {
    if (!selection || !buyerAgentId) return;
    if (!authenticated) {
      login();
      return;
    }
    setError(null);
    setNotice(null);
    setPacket(null);
    setRating(0);

    const seller = selection;
    try {
      setPhase("preflight");
      const pfRes = await fetch(
        `/api/collab/request/preflight?agentId=${encodeURIComponent(buyerAgentId)}`,
      );
      const pf = (await pfRes.json()) as {
        configured?: boolean;
        accountIndex?: number;
        mintConfig?: SpawnMintConfig;
        error?: string;
      };
      if (!pfRes.ok || !pf.configured || pf.accountIndex == null || !pf.mintConfig) {
        throw new Error(pf.error ?? "Buyer preflight failed.");
      }

      setPhase("quoting");
      const quote: SellerQuote = await getSellerQuote({
        toAgentId: seller.agentId,
        fromAgentId: buyerAgentId,
      });

      setPhase("paying");
      const signer = await buildSigner();
      const { txHash } = await payStrategy({
        signer,
        accountIndex: pf.accountIndex,
        mintConfig: pf.mintConfig,
        quote,
      });

      setPhase("settling");
      const reqRes = await fetch("/api/collab/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAgentId: seller.agentId,
          fromAgentId: buyerAgentId,
          objective: objective.trim() || undefined,
          paymentRef: txHash,
        }),
      });
      const reqData = (await reqRes.json()) as {
        ok?: boolean;
        packet?: StrategyPacket;
        record?: RecordParams | null;
        error?: string;
      };
      if (!reqRes.ok || !reqData.ok || !reqData.packet) {
        throw new Error(reqData.error ?? "Strategy request failed.");
      }
      setPacket(reqData.packet);

      if (reqData.record) {
        try {
          setPhase("recording");
          await recordCollabOnChain({ signer, record: reqData.record });
          setNotice("Exchange complete and attested on-chain (CollabRegistry).");
        } catch (e) {
          setNotice(
            `Exchange complete and ingested. On-chain attestation skipped: ${
              e instanceof Error ? e.message : "signing failed"
            }`,
          );
        }
      } else {
        setNotice("Exchange complete — the strategy was ingested into your agent's memory.");
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collaboration failed.");
      setPhase("idle");
    }
  }

  async function rate(stars: number) {
    if (!selection || !packet || ratingBusy) return;
    setRating(stars);
    setRatingBusy(true);
    try {
      const res = await fetch("/api/collab/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAgentId: selection.agentId,
          fromAgentId: buyerAgentId,
          rating: stars,
          paymentRef: packet.paymentRef,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        onChain?: FeedbackParams | null;
      };
      if (!res.ok || !data.ok) {
        setNotice(data.error ?? "Rating was not accepted.");
      } else {
        setNotice(`Thanks — rated ${stars}/5.`);
        if (data.onChain) {
          try {
            const signer = await buildSigner();
            await submitFeedbackOnChain({ signer, feedback: data.onChain });
            setNotice(`Rated ${stars}/5 and recorded on-chain.`);
          } catch {
            /* flag-off / gate / signing issue — Redis rating already stored */
          }
        }
      }
    } finally {
      setRatingBusy(false);
    }
  }

  const busy = phase !== "idle" && phase !== "done";

  if (buyerAgents.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-ink-300">
        You need an on-chain agent to pay from. Mint one from an{" "}
        <a href="/entities" className="font-medium text-electric-400 hover:text-electric-300">
          entity page
        </a>{" "}
        first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass space-y-2 rounded-2xl p-6">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Pay from agent
          </span>
          <select
            value={buyerAgentId}
            onChange={(e) => setBuyerAgentId(e.target.value)}
            disabled={busy}
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
          >
            {buyerAgents.map((a) => (
              <option key={a.agentId} value={a.agentId}>
                {a.name} ({a.agentId})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="glass space-y-4 rounded-2xl p-6">
        <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
          <Search className="h-4 w-4 text-electric-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Discoverable agents
          </h3>
        </div>
        {agents === null ? (
          <p className="flex items-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </p>
        ) : agents.length === 0 ? (
          <p className="text-sm text-ink-400">
            No discoverable agents yet. Attach skills to your agent, then enable collaboration on
            the agent page to list it here.
          </p>
        ) : (
          <div className="space-y-3">
            {agents.map((a) => (
              <div
                key={a.agentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-100">{a.agentName}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-500">{a.agentId}</p>
                  {a.attachedSkillTitles.length > 0 && (
                    <p className="mt-1 text-xs text-ink-400">
                      Expertise: {a.attachedSkillTitles.join(" · ")}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ink-500">
                    <span>{a.x402.price} USDC</span>
                    {a.reputationScore != null && (
                      <span className="flex items-center gap-0.5 text-amber-300">
                        <Star className="h-3 w-3" /> {a.reputationScore}
                      </span>
                    )}
                    {a.walletVerified ? (
                      <span className="flex items-center gap-0.5 text-emerald-300">
                        <Wallet className="h-3 w-3" /> verified
                      </span>
                    ) : (
                      <span className="text-amber-300">wallet unverified</span>
                    )}
                  </p>
                  {a.specialization && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-400">
                      <span className="rounded border border-electric-500/30 bg-electric-500/10 px-1.5 py-0.5 text-electric-300">
                        L{a.specialization.level}
                      </span>
                      {a.specialization.category && (
                        <span className="rounded border border-signal-400/40 bg-signal-400/10 px-1.5 py-0.5 text-signal-400">
                          {a.specialization.category}
                        </span>
                      )}
                      {a.specialization.entitySlug && (
                        <span className="rounded border border-ink-700 px-1.5 py-0.5">
                          {a.specialization.entitySlug}
                        </span>
                      )}
                      {a.specialization.focusAreas.slice(0, 3).map((f) => (
                        <span key={f} className="rounded border border-ink-700 px-1.5 py-0.5">
                          {f}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy || !a.walletVerified || a.agentId === buyerAgentId}
                  onClick={() => {
                    setSelection(a);
                    setPacket(null);
                    setError(null);
                    setNotice(null);
                    setPhase("idle");
                  }}
                  className="rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-40"
                >
                  {a.agentId === buyerAgentId ? "your agent" : "Request"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selection && (
        <div className="glass space-y-4 rounded-2xl border border-electric-500/30 p-6">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Approve collaboration
          </h3>
          <div className="space-y-1 text-sm text-ink-300">
            <p>
              Agent: <span className="text-ink-100">{selection.agentName}</span>{" "}
              <span className="font-mono text-ink-500">({selection.agentId})</span>
            </p>
            <p>
              Expertise:{" "}
              <span className="text-ink-100">
                {selection.attachedSkillTitles.length} attached skill
                {selection.attachedSkillTitles.length === 1 ? "" : "s"}
              </span>
              {selection.attachedSkillTitles.length > 0 && (
                <span className="mt-0.5 block text-xs text-ink-400">
                  {selection.attachedSkillTitles.join(" · ")}
                </span>
              )}
            </p>
            <p>
              Price:{" "}
              <span className="font-medium text-neon-400">
                {selection.x402.price} testnet USDC
              </span>
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
              Objective (optional)
            </span>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={busy}
              rows={2}
              placeholder="What do you want this strategy to help with?"
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={approveAndPay}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {phase === "preflight"
                ? "Preparing…"
                : phase === "quoting"
                  ? "Getting quote…"
                  : phase === "paying"
                    ? "Approve payment in wallet…"
                    : phase === "settling"
                      ? "Settling…"
                      : phase === "recording"
                        ? "Attesting on-chain…"
                        : `Approve & pay ${selection.x402.price} USDC`}
            </button>
            <button
              type="button"
              onClick={() => setSelection(null)}
              disabled={busy}
              className="text-xs font-medium text-ink-400 transition-colors hover:text-ink-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="flex items-start gap-2 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          {notice && (
            <p className="flex items-start gap-2 text-xs text-signal-300">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {notice}
            </p>
          )}
        </div>
      )}

      {packet && (
        <div className="glass space-y-3 rounded-2xl p-6">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            {packet.title}
          </h3>
          <p className="text-sm text-ink-300">{packet.summary}</p>
          {packet.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-200">
              {packet.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {packet.tailoredBrief && (
            <div className="space-y-2 rounded-xl border border-electric-500/30 bg-electric-500/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-electric-300">
                Tailored for your objective
              </p>
              <p className="text-xs italic text-ink-400">“{packet.tailoredBrief.objective}”</p>
              <p className="whitespace-pre-wrap text-sm text-ink-200">
                {packet.tailoredBrief.brief}
              </p>
            </div>
          )}
          <p className="font-mono text-[10px] text-ink-500">
            offerHash {packet.skillHash.slice(0, 14)}… · paymentRef {packet.paymentRef.slice(0, 14)}…
          </p>
          <div className="flex items-center gap-2 border-t border-ink-800/60 pt-3">
            <span className="text-xs text-ink-400">Rate this strategy:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rate(n)}
                disabled={ratingBusy}
                className="text-ink-600 transition-colors hover:text-amber-300 disabled:opacity-50"
                aria-label={`Rate ${n} of 5`}
              >
                <Star
                  className={`h-4 w-4 ${n <= rating ? "fill-amber-300 text-amber-300" : ""}`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
