import Link from "next/link";
import { ShieldCheck, ShieldX } from "lucide-react";

import { TradeProposalForm } from "@/components/agent/trade/TradeProposalForm";
import { Badge } from "@/components/ui/Badge";
import {
  sanitizeAgentConfig,
  type AgentConfig,
  type TradeHitlMethod,
} from "@/lib/agent/agentConfig";
import { getCombinedVerdict } from "@/lib/agent/memory";
import { TRADE_COINS } from "@/lib/agent/trade/coins";
import { evaluateVerdictGate, VERDICT_MAX_AGE_MS } from "@/lib/agent/trade/gate";
import { MAX_LEVERAGE, MAX_SIZE_USD } from "@/lib/agent/trade/gmx";

const HITL_LABELS: Record<TradeHitlMethod, string> = {
  manual: "Manual — the agent only suggests, you place trades yourself",
  propose_approve: "Propose → approve — trades execute only after you approve",
  spending_cap: "Auto within caps — the agent trades on its own inside your limits",
};

function formatAge(ageMs: number | null): string {
  if (ageMs == null) return "no verdict";
  const hours = ageMs / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(ageMs / 60_000))}m old`;
  return `${Math.round(hours)}h old`;
}

/**
 * Guided GMX execution surface on the Trade & research tab, styled as the
 * landing page's terminal window ("mwin" chrome: traffic dots + mono tag).
 * Shows, per supported coin, the research-gate state ("no research, no
 * trade"), and lets the owner file a trade proposal through the exact same
 * server path as the chat tool. All execution stays on Arbitrum Sepolia and
 * flows through the existing propose → approve → Privy-sign pipeline.
 */
export async function TradeDesk({
  agentId,
  config,
  isOwner,
}: {
  agentId: string;
  config: AgentConfig | null | undefined;
  isOwner: boolean;
}) {
  const now = Date.now();
  const coins = await Promise.all(
    TRADE_COINS.map(async (coin) => {
      const verdict = await getCombinedVerdict(coin.symbol);
      const gate = evaluateVerdictGate(verdict, now);
      const ts = verdict ? Date.parse(verdict.ts) : NaN;
      return {
        symbol: coin.symbol,
        entitySlug: coin.entitySlug,
        signal: verdict?.signal ?? null,
        severity: verdict?.severity ?? null,
        gateOpen: gate.ok,
        reason: gate.ok ? null : gate.reason,
        ageMs: Number.isFinite(ts) ? now - ts : null,
      };
    }),
  );

  const cfg = sanitizeAgentConfig(config ?? {});
  const maxSizeUsdHuman = Number(MAX_SIZE_USD / 10n ** 30n);

  return (
    <div className="card-surface glow-ring overflow-hidden rounded-2xl border border-ink-800/60">
      {/* Terminal chrome */}
      <div className="flex items-center gap-1.5 border-b border-ink-800/60 px-4 py-2.5">
        <i className="term-dot" />
        <i className="term-dot" />
        <i className="term-dot" />
        <span className="flex-1" />
        <span className="font-mono text-[10px] tracking-wide text-ink-500">
          gmx · arbitrum-sepolia
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <span className="kicker">Trade desk</span>
          <p className="text-sm leading-relaxed text-ink-300">
            Research-gated perps: a coin is tradable only while it has a fresh, positive CanHav
            verdict (≤{VERDICT_MAX_AGE_MS / 3_600_000}h) and GMX is allowlisted on the
            SecurityRegistry. <span className="font-medium text-ink-100">No research, no trade.</span>
          </p>
        </div>

        <div className="divide-y divide-ink-800/60 rounded-xl border border-ink-800/60 bg-ink-950/40">
          {coins.map((coin) => (
            <div key={coin.symbol} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 shrink-0">
                {coin.gateOpen ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                ) : (
                  <ShieldX className="h-4 w-4 text-ink-500" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/networks/${coin.entitySlug}`}
                    className="font-mono text-sm font-medium text-ink-50 transition-colors hover:text-electric-300"
                  >
                    {coin.symbol}
                  </Link>
                  {coin.gateOpen ? (
                    <Badge tone="positive" className="font-mono text-[10px]">
                      gate open
                    </Badge>
                  ) : (
                    <Badge tone="neutral" className="font-mono text-[10px]">
                      blocked
                    </Badge>
                  )}
                  {coin.signal && (
                    <span className="tabular font-mono text-[10px] text-ink-400">
                      {coin.signal} · {coin.severity} · {formatAge(coin.ageMs)}
                    </span>
                  )}
                </div>
                {!coin.gateOpen && <p className="mt-1 text-xs text-ink-400">{coin.reason}</p>}
              </div>
            </div>
          ))}
        </div>

        {isOwner ? (
          <>
            <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Approval method
              </p>
              <p className="mt-1 text-sm text-ink-200">{HITL_LABELS[cfg.tradeHitlMethod]}</p>
              <p className="mt-1 text-xs text-ink-500">
                Change it (and spending caps) in{" "}
                <Link
                  href={`/agents/${encodeURIComponent(agentId)}?tab=train#panel-framework`}
                  className="font-medium text-electric-400 hover:text-electric-300"
                >
                  the framework panel on the Train tab
                </Link>
                .
              </p>
            </div>

            <TradeProposalForm
              agentId={agentId}
              coins={coins.map((c) => ({ symbol: c.symbol, gateOpen: c.gateOpen }))}
              maxSizeUsd={maxSizeUsdHuman}
              maxLeverage={MAX_LEVERAGE}
              hitlMethod={cfg.tradeHitlMethod}
            />
          </>
        ) : (
          <p className="text-xs text-ink-500">
            Only the agent&apos;s owner can propose trades. Verdicts above are public research
            signals.
          </p>
        )}
      </div>
    </div>
  );
}
