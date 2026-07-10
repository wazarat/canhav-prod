import Link from "next/link";
import { ExternalLink, ShieldCheck, ShieldX, Wallet } from "lucide-react";

import { TradeProposalForm } from "@/components/agent/trade/TradeProposalForm";
import { Badge } from "@/components/ui/Badge";
import {
  sanitizeAgentConfig,
  type AgentConfig,
  type TradeHitlMethod,
} from "@/lib/agent/agentConfig";
import { getCombinedVerdict } from "@/lib/agent/memory";
import { TRADE_COINS } from "@/lib/agent/trade/coins";
import { readTradeFunding } from "@/lib/agent/trade/funding";
import { evaluateVerdictGate, VERDICT_MAX_AGE_MS } from "@/lib/agent/trade/gate";
import { MAX_LEVERAGE, MAX_SIZE_USD } from "@/lib/agent/trade/gmx";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";

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

  // Owner-only funding readout: the treasury wallet that signs trades needs
  // Sepolia ETH (gas + execution fee) and USDC.SG (the markets' collateral).
  let funding = null;
  if (isOwner) {
    const session = getSession();
    const profile = session ? await getUserProfile(session.userId) : null;
    if (profile?.address && /^0x[0-9a-fA-F]{40}$/.test(profile.address)) {
      funding = await readTradeFunding(profile.address as `0x${string}`);
    }
  }

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
            {funding && (
              <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    <Wallet className="h-3.5 w-3.5" /> Trading wallet
                  </p>
                  <a
                    href={`https://sepolia.arbiscan.io/address/${funding.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-400 transition-colors hover:text-electric-300"
                  >
                    {funding.address.slice(0, 6)}…{funding.address.slice(-4)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="tabular font-mono text-xs text-ink-200">
                    {funding.usdcSgBalance}{" "}
                    <span className="text-ink-400">USDC.SG collateral</span>
                  </span>
                  <span className="tabular font-mono text-xs text-ink-200">
                    {funding.ethBalance} <span className="text-ink-400">ETH gas</span>
                  </span>
                </div>
                {funding.usdcSgRaw === 0n ? (
                  <p className="mt-1.5 text-xs text-amber-400">
                    No USDC.SG collateral — GMX orders will fail. tCNHV credits are marketplace-only
                    and can&apos;t back trades.
                  </p>
                ) : funding.ethRaw === 0n ? (
                  <p className="mt-1.5 text-xs text-amber-400">
                    No Sepolia ETH — the wallet can&apos;t pay gas or the GMX execution fee.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink-500">
                    GMX collateral is USDC.SG; tCNHV credits are marketplace-only. Execution fee is
                    paid in Sepolia ETH.
                  </p>
                )}
              </div>
            )}

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
