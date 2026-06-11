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

interface Provider {
  agentId: string;
  ownerHandle: string;
  agentWallet: string | null;
  walletVerified: boolean;
  x402: { price: string; asset: string; decimals: number };
  reputationScore: number | null;
}

interface Service {
  skillId: string;
  title: string;
  summary: string;
  providers: Provider[];
}

interface BuyerAgent {
  agentId: string;
  name: string;
}

interface Selection {
  service: Service;
  provider: Provider;
}

type Phase = "idle" | "preflight" | "quoting" | "paying" | "settling" | "recording" | "done";

export function CollabBrowser({ buyerAgents }: { buyerAgents: BuyerAgent[] }) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [services, setServices] = useState<Service[] | null>(null);
  const [buyerAgentId, setBuyerAgentId] = useState(buyerAgents[0]?.agentId ?? "");
  const [selection, setSelection] = useState<Selection | null>(null);
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
          if (active) setServices([]);
          return;
        }
        const data = (await res.json()) as {
          capabilities?: { skill: { id: string; title: string; summary: string }; agents: Provider[] }[];
        };
        if (active) {
          setServices(
            (data.capabilities ?? []).map((c) => ({
              skillId: c.skill.id,
              title: c.skill.title,
              summary: c.skill.summary,
              providers: c.agents,
            })),
          );
        }
      } catch {
        if (active) setServices([]);
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

    const { service, provider } = selection;
    try {
      // 1) Preflight (buyer agent mint params).
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

      // 2) Seller quote (authoritative payTo + amount).
      setPhase("quoting");
      const quote: SellerQuote = await getSellerQuote({
        skillId: service.skillId,
        toAgentId: provider.agentId,
        fromAgentId: buyerAgentId,
      });

      // 3) Sign + send the USDC transfer userOp.
      setPhase("paying");
      const signer = await buildSigner();
      const { txHash } = await payStrategy({
        signer,
        accountIndex: pf.accountIndex,
        mintConfig: pf.mintConfig,
        quote,
      });

      // 4) Complete the x402 exchange + ingest.
      setPhase("settling");
      const reqRes = await fetch("/api/collab/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: service.skillId,
          toAgentId: provider.agentId,
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

      // 5) Best-effort on-chain attestation.
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
    if (!selection || ratingBusy) return;
    setRating(stars);
    setRatingBusy(true);
    try {
      const res = await fetch("/api/collab/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAgentId: selection.provider.agentId,
          fromAgentId: buyerAgentId,
          rating: stars,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; onChain?: FeedbackParams | null };
      if (res.ok && data.ok) {
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
      {/* Buyer agent selector */}
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

      {/* Marketplace */}
      <div className="glass space-y-4 rounded-2xl p-6">
        <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
          <Search className="h-4 w-4 text-electric-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Discoverable skills
          </h3>
        </div>
        {services === null ? (
          <p className="flex items-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </p>
        ) : services.length === 0 ? (
          <p className="text-sm text-ink-400">
            No discoverable skills yet. Make one of your skills discoverable and attach it to an
            on-chain agent to list it here.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.skillId} className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
                <p className="text-sm font-medium text-ink-100">{service.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{service.summary}</p>
                <div className="mt-3 space-y-2">
                  {service.providers.map((p) => (
                    <div
                      key={p.agentId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-800/60 bg-ink-950/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink-200">
                          {p.ownerHandle}{" "}
                          <span className="font-mono text-ink-500">· {p.agentId}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-500">
                          <span>
                            {p.x402.price} USDC
                          </span>
                          {p.reputationScore != null && (
                            <span className="flex items-center gap-0.5 text-amber-300">
                              <Star className="h-3 w-3" /> {p.reputationScore}
                            </span>
                          )}
                          {p.walletVerified ? (
                            <span className="flex items-center gap-0.5 text-emerald-300">
                              <Wallet className="h-3 w-3" /> verified
                            </span>
                          ) : (
                            <span className="text-amber-300">wallet unverified</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy || !p.walletVerified || p.agentId === buyerAgentId}
                        onClick={() => {
                          setSelection({ service, provider: p });
                          setPacket(null);
                          setError(null);
                          setNotice(null);
                          setPhase("idle");
                        }}
                        className="rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-40"
                      >
                        {p.agentId === buyerAgentId ? "your agent" : "Request"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Human approval */}
      {selection && (
        <div className="glass space-y-4 rounded-2xl border border-electric-500/30 p-6">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Approve collaboration
          </h3>
          <div className="space-y-1 text-sm text-ink-300">
            <p>
              Skill: <span className="text-ink-100">{selection.service.title}</span>
            </p>
            <p>
              Seller: <span className="text-ink-100">{selection.provider.ownerHandle}</span>{" "}
              <span className="font-mono text-ink-500">({selection.provider.agentId})</span>
            </p>
            <p>
              Price:{" "}
              <span className="font-medium text-neon-400">
                {selection.provider.x402.price} testnet USDC
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
                        : `Approve & pay ${selection.provider.x402.price} USDC`}
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

      {/* Result */}
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
          <p className="font-mono text-[10px] text-ink-500">
            skillHash {packet.skillHash.slice(0, 14)}… · paymentRef {packet.paymentRef.slice(0, 14)}…
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
