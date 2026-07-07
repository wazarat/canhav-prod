"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCcw, Send } from "lucide-react";

import type { TradeHitlMethod } from "@/lib/agent/agentConfig";
import { cn } from "@/lib/utils";

interface ProposeResult {
  ok: boolean;
  blocked?: boolean;
  mode?: string;
  summary?: string;
  hint?: string;
  proposalId?: string;
  autoExecute?: boolean;
  suggestion?: Record<string, unknown>;
  error?: string;
}

/**
 * Files a GMX trade proposal through POST /api/agent/[agentId]/trade-proposals
 * — the same research-gated path as the `trade_propose` chat tool. On
 * approval-mode success the page refreshes so the proposed-trade card (with
 * Approve & trade / Reject) appears in the feed alongside this form.
 */
export function TradeProposalForm({
  agentId,
  coins,
  maxSizeUsd,
  maxLeverage,
  hitlMethod,
}: {
  agentId: string;
  coins: { symbol: string; gateOpen: boolean }[];
  maxSizeUsd: number;
  maxLeverage: number;
  hitlMethod: TradeHitlMethod;
}) {
  const router = useRouter();
  const [asset, setAsset] = useState(coins.find((c) => c.gateOpen)?.symbol ?? coins[0]?.symbol ?? "");
  const [side, setSide] = useState<"long" | "short">("long");
  const [sizeUsd, setSizeUsd] = useState(10);
  const [leverage, setLeverage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<ProposeResult | null>(null);

  const base = `/api/agent/${encodeURIComponent(agentId)}`;

  async function propose() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`${base}/trade-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset, side, sizeUsdHuman: sizeUsd, leverage }),
      });
      const data = (await res.json()) as ProposeResult;
      setResult(data);
      if (data.ok && data.proposalId) {
        // Surface the new proposal card (ProposedTradesPanel is an RSC).
        router.refresh();
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Request failed." });
    } finally {
      setBusy(false);
    }
  }

  async function refreshResearch() {
    setRefreshing(true);
    try {
      const res = await fetch(`${base}/trade-readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset }),
      });
      const data = (await res.json()) as { ok: boolean; summary?: string };
      if (data.ok) {
        // Gate rows above are server-rendered — refresh them, then retry.
        router.refresh();
        await propose();
      } else {
        setResult({ ok: false, error: data.summary ?? "Research refresh failed." });
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Refresh failed." });
    } finally {
      setRefreshing(false);
    }
  }

  const blockedNeedsRefresh =
    result &&
    !result.ok &&
    result.blocked &&
    /stale|No research verdict/i.test(result.summary ?? "");

  return (
    <div className="space-y-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        Propose a trade
      </p>

      <div className="flex flex-wrap gap-2">
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          aria-label="Asset"
        >
          {coins.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.symbol}
              {c.gateOpen ? "" : " (blocked)"}
            </option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg border border-ink-700">
          <button
            type="button"
            onClick={() => setSide("long")}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
              side === "long"
                ? "bg-neon-500/20 text-neon-400"
                : "bg-ink-900/60 text-ink-300 hover:text-ink-100",
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Long
          </button>
          <button
            type="button"
            onClick={() => setSide("short")}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
              side === "short"
                ? "bg-rose-500/20 text-rose-400"
                : "bg-ink-900/60 text-ink-300 hover:text-ink-100",
            )}
          >
            <ArrowDownRight className="h-3.5 w-3.5" /> Short
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-400">
            Size (USD, max {maxSizeUsd})
          </span>
          <input
            type="number"
            min={1}
            max={maxSizeUsd}
            value={sizeUsd}
            onChange={(e) =>
              setSizeUsd(Math.max(1, Math.min(maxSizeUsd, Number(e.target.value) || 1)))
            }
            className="w-28 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-400">
            Leverage (max {maxLeverage}x)
          </span>
          <input
            type="number"
            min={1}
            max={maxLeverage}
            value={leverage}
            onChange={(e) =>
              setLeverage(Math.max(1, Math.min(maxLeverage, Number(e.target.value) || 1)))
            }
            className="w-24 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          />
        </label>
        <button
          type="button"
          onClick={propose}
          disabled={busy || refreshing || !asset}
          className="btn-gradient btn-glow inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Propose
        </button>
      </div>

      <p className="text-[11px] text-ink-500">
        {hitlMethod === "manual"
          ? "Manual mode: you'll get a suggestion to place yourself on GMX."
          : hitlMethod === "spending_cap"
            ? "Cap mode: proposals inside your spending caps are marked auto-executable."
            : "The proposal appears in the feed on the left — nothing trades until you approve it."}
      </p>

      {result && (
        <div
          className={cn(
            "space-y-2 rounded-lg border px-3 py-2.5 text-sm",
            result.ok
              ? "border-neon-500/30 bg-neon-500/5 text-neon-400"
              : "border-rose-500/30 bg-rose-500/5 text-rose-400",
          )}
        >
          <p>{result.summary ?? result.error ?? (result.ok ? "Proposed." : "Failed.")}</p>
          {result.ok && result.suggestion && (
            <pre className="overflow-x-auto rounded bg-ink-950/60 p-2 font-mono text-[10px] text-ink-300">
              {JSON.stringify(result.suggestion, null, 2)}
            </pre>
          )}
          {blockedNeedsRefresh && (
            <button
              type="button"
              onClick={refreshResearch}
              disabled={refreshing || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Refresh research &amp; retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
