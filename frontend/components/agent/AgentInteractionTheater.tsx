"use client";

import { Bot, CheckCircle2, ExternalLink, Loader2, Radio, Zap } from "lucide-react";

import type { StrategyPacketDrip } from "@/lib/types";

/**
 * AgentInteractionTheater — a live (and replayable) visual of two agents
 * transacting over x402 on Arbitrum Sepolia. It animates the canonical stages
 * (402 challenge → pay → settle → record → packet), shows the on-the-wire
 * X-PAYMENT / X-PAYMENT-RESPONSE headers, and links the USDC + CollabRegistry
 * transactions to Arbiscan — the proof that the work happened on-chain, not in
 * the LLM.
 */

export type TheaterPhase =
  | "idle"
  | "preflight"
  | "anchoring"
  | "quoting"
  | "paying"
  | "settling"
  | "recording"
  | "done";

export interface TheaterSettlement {
  txHash: string;
  network: string;
  networkName?: string;
  payTo?: string;
  humanAmount?: string;
  asset?: string;
}

export interface TheaterProps {
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  phase: TheaterPhase;
  /** Settlement (USDC) tx hash. */
  paymentTx?: string | null;
  /** CollabRegistry attestation tx hash (if recorded). */
  recordTx?: string | null;
  /** Decoded X-PAYMENT-RESPONSE settlement from the seller. */
  settlement?: TheaterSettlement | null;
  /** Quote price (human USDC) shown on the 402 challenge. */
  price?: string | null;
  /** Drip descriptor for an agreement installment. */
  drip?: StrategyPacketDrip | null;
  error?: string | null;
}

type StageStatus = "pending" | "active" | "done" | "error";

const STAGE_ORDER: TheaterPhase[] = [
  "preflight",
  "quoting",
  "anchoring",
  "paying",
  "settling",
  "recording",
  "done",
];

function rank(phase: TheaterPhase): number {
  const i = STAGE_ORDER.indexOf(phase);
  return i < 0 ? 0 : i;
}

const ARBISCAN_TX = (hash: string) => `https://sepolia.arbiscan.io/tx/${hash}`;

/** Build a representative base64 X-PAYMENT payload for the wire console. */
function encodeWirePreview(payload: unknown): string {
  try {
    const json = JSON.stringify(payload);
    if (typeof window !== "undefined" && "btoa" in window) {
      return window.btoa(unescape(encodeURIComponent(json)));
    }
    return json;
  } catch {
    return "";
  }
}

export function AgentInteractionTheater({
  buyer,
  seller,
  phase,
  paymentTx,
  recordTx,
  settlement,
  price,
  drip,
  error,
}: TheaterProps) {
  const current = rank(phase);

  const stageStatus = (stagePhase: TheaterPhase): StageStatus => {
    const stageRank = rank(stagePhase);
    if (error && stageRank === current) return "error";
    if (phase === "done") return "done";
    if (stageRank < current) return "done";
    if (stageRank === current) return "active";
    return "pending";
  };

  const stages: { phase: TheaterPhase; label: string; detail: string }[] = [
    { phase: "quoting", label: "Quote", detail: price ? `${price} credits` : "price quote" },
    { phase: "paying", label: "Pay", detail: "from your agent" },
    { phase: "settling", label: "Confirm", detail: "payment confirmed" },
    { phase: "recording", label: "Save record", detail: "verifiable record" },
    { phase: "done", label: "Delivered", detail: drip ? drip.label : "knowledge delivered" },
  ];

  const flowing = phase !== "idle" && phase !== "done" && !error;

  const xPaymentPreview = paymentTx
    ? encodeWirePreview({
        x402Version: 1,
        scheme: "exact",
        network: "eip155:421614",
        payload: { txHash: paymentTx, settlement: "smart-account-transfer" },
      })
    : null;

  const xPaymentResponsePreview = settlement
    ? encodeWirePreview({
        success: true,
        txHash: settlement.txHash,
        network: settlement.network,
        payer: settlement.payTo,
      })
    : null;

  return (
    <div className="glass space-y-4 rounded-2xl border border-electric-500/20 p-6">
      <div className="flex items-center gap-2">
        <Radio className={`h-4 w-4 ${flowing ? "animate-pulse text-neon-400" : "text-ink-400"}`} />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Agent interaction
        </h3>
        <span className="rounded-full border border-electric-500/30 bg-electric-500/10 px-2 py-0.5 text-[10px] font-medium text-electric-300">
          Live · Arbitrum testnet
        </span>
        {phase === "done" && !error && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-signal-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> complete
          </span>
        )}
      </div>

      {/* Two-agent stage */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-4">
        <AgentAvatar label="Buyer" name={buyer.name} id={buyer.id} active={flowing} tone="electric" />
        <div className="relative flex-1">
          <div className="h-0.5 w-full rounded-full bg-ink-700/60" />
          <div
            className="absolute left-0 top-0 h-0.5 rounded-full bg-gradient-to-r from-electric-500 to-neon-400 transition-all duration-700"
            style={{ width: `${Math.min(100, (current / (STAGE_ORDER.length - 1)) * 100)}%` }}
          />
          {flowing && (
            <Zap className="absolute -top-2 h-4 w-4 animate-pulse text-neon-400" style={{ left: `${Math.min(96, (current / (STAGE_ORDER.length - 1)) * 100)}%` }} />
          )}
        </div>
        <AgentAvatar label="Seller" name={seller.name} id={seller.id} active={flowing} tone="signal" />
      </div>

      {/* Stage rail */}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stages.map((s) => {
          const st = stageStatus(s.phase);
          return (
            <li
              key={s.phase}
              className={`rounded-lg border px-2.5 py-2 text-center transition-colors ${
                st === "done"
                  ? "border-signal-400/40 bg-signal-400/10"
                  : st === "active"
                    ? "border-neon-500/50 bg-neon-500/10"
                    : st === "error"
                      ? "border-rose-500/50 bg-rose-500/10"
                      : "border-ink-800/60 bg-ink-900/30"
              }`}
            >
              <div className="flex items-center justify-center">
                {st === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-neon-400" />
                ) : st === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-signal-300" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-ink-600" />
                )}
              </div>
              <p
                className={`mt-1 text-[10px] font-medium ${
                  st === "pending" ? "text-ink-500" : "text-ink-100"
                }`}
              >
                {s.label}
              </p>
              <p className="text-[9px] leading-tight text-ink-500">{s.detail}</p>
            </li>
          );
        })}
      </ol>

      {/* Wire console */}
      {(xPaymentPreview || xPaymentResponsePreview) && (
        <div className="space-y-2 rounded-xl border border-ink-800/60 bg-ink-950/60 p-3 font-mono text-[10px]">
          {xPaymentPreview && (
            <div>
              <p className="text-electric-300">→ X-PAYMENT</p>
              <p className="break-all text-ink-400">{xPaymentPreview.slice(0, 120)}…</p>
            </div>
          )}
          {xPaymentResponsePreview && (
            <div>
              <p className="text-signal-300">← X-PAYMENT-RESPONSE</p>
              <p className="break-all text-ink-400">{xPaymentResponsePreview.slice(0, 120)}…</p>
            </div>
          )}
        </div>
      )}

      {/* On-chain links */}
      {(paymentTx || recordTx) && (
        <div className="flex flex-wrap gap-2">
          {paymentTx && (
            <a
              href={ARBISCAN_TX(paymentTx)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-neon-500/30 bg-neon-500/10 px-2.5 py-1.5 text-[11px] font-medium text-neon-300 transition-colors hover:bg-neon-500/20"
            >
              <ExternalLink className="h-3 w-3" /> Payment receipt
            </a>
          )}
          {recordTx && (
            <a
              href={ARBISCAN_TX(recordTx)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-signal-400/30 bg-signal-400/10 px-2.5 py-1.5 text-[11px] font-medium text-signal-300 transition-colors hover:bg-signal-400/20"
            >
              <ExternalLink className="h-3 w-3" /> Saved record
            </a>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}

function AgentAvatar({
  label,
  name,
  id,
  active,
  tone,
}: {
  label: string;
  name: string;
  id: string;
  active: boolean;
  tone: "electric" | "signal";
}) {
  const ring = tone === "electric" ? "border-electric-500/50" : "border-signal-400/50";
  const glow = tone === "electric" ? "text-electric-300" : "text-signal-400";
  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1 text-center">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-ink-900/60 ${ring} ${
          active ? "animate-pulse" : ""
        }`}
      >
        <Bot className={`h-5 w-5 ${glow}`} />
      </span>
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">{label}</p>
      <p className="line-clamp-1 text-[11px] text-ink-200">{name}</p>
      <p className="font-mono text-[9px] text-ink-600">{id}</p>
    </div>
  );
}
