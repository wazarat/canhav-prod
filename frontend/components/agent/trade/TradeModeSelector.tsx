"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { AgentConfig, TradeHitlMethod } from "@/lib/agent/agentConfig";
import { cn } from "@/lib/utils";

const MODES: { value: TradeHitlMethod; name: string; description: string }[] = [
  {
    value: "manual",
    name: "Research only",
    description:
      "The agent researches and suggests. Nothing is filed or executed — you place any trade yourself.",
  },
  {
    value: "propose_approve",
    name: "Propose & approve",
    description:
      "The agent files a proposal. Nothing executes until you approve it and sign with your wallet.",
  },
  {
    value: "spending_cap",
    name: "Auto within limits",
    description:
      "Proposals inside your spending caps skip the approval click. No unattended signer exists — every trade still requires your wallet signature. Auto replaces the approval step, not the signature.",
  },
];

/**
 * The three HITL methods as an explicit, named choice on the Trade Desk.
 * Persists to the agent config via the existing PATCH /api/agent/[id]/config
 * route — which replaces the whole config, so we GET the current config and
 * merge before sending (same trap DunePublishPanel documents).
 */
export function TradeModeSelector({
  agentId,
  method,
  hasCaps,
}: {
  agentId: string;
  method: TradeHitlMethod;
  hasCaps: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<TradeHitlMethod>(method);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(next: TradeHitlMethod) {
    if (busy || next === selected) return;
    const previous = selected;
    setSelected(next);
    setBusy(true);
    setError(null);
    try {
      const base = `/api/agent/${encodeURIComponent(agentId)}/config`;
      const current = await fetch(base);
      const data = (await current.json()) as { ok?: boolean; config?: AgentConfig; error?: string };
      if (!current.ok || !data.ok || !data.config) {
        throw new Error(data.error ?? "Could not load the agent config.");
      }
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.config, tradeHitlMethod: next }),
      });
      const saved = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !saved.ok) throw new Error(saved.error ?? `Save failed (${res.status}).`);
      router.refresh();
    } catch (e) {
      setSelected(previous);
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Approval method
        </p>
        {busy && <Loader2 className="h-3 w-3 animate-spin text-ink-500" />}
      </div>

      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Approval method">
        {MODES.map((mode) => {
          const active = mode.value === selected;
          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => select(mode.value)}
              disabled={busy}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-electric-500/40 bg-electric-500/10"
                  : "border-ink-800/60 bg-ink-950/40 hover:border-ink-700",
              )}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    active ? "text-electric-300" : "text-ink-100",
                  )}
                >
                  {mode.name}
                </span>
                {active && <CheckCircle2 className="h-3.5 w-3.5 text-electric-400" />}
                {mode.value === "propose_approve" && (
                  <Badge tone="electric" className="px-1.5 py-0 text-[9px] uppercase">
                    default
                  </Badge>
                )}
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-ink-400">
                {mode.description}
              </span>
            </button>
          );
        })}
      </div>

      {selected === "spending_cap" && !hasCaps && (
        <p className="text-xs text-amber-400">
          No caps set — every proposal auto-approves (you still sign each one). Set caps in{" "}
          <Link
            href={`/agents/${encodeURIComponent(agentId)}?tab=train#panel-framework`}
            className="font-medium underline underline-offset-2 hover:text-amber-300"
          >
            the framework panel
          </Link>
          .
        </p>
      )}
      {selected === "spending_cap" && hasCaps && (
        <p className="text-xs text-ink-500">
          Adjust the per-trade and 24h caps in{" "}
          <Link
            href={`/agents/${encodeURIComponent(agentId)}?tab=train#panel-framework`}
            className="font-medium text-electric-400 hover:text-electric-300"
          >
            the framework panel
          </Link>
          .
        </p>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
