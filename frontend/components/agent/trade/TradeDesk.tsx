import Link from "next/link";
import { ExternalLink, Gauge, ShieldCheck, ShieldX, Wallet } from "lucide-react";

import { EncryptedCapsCard } from "@/components/agent/trade/EncryptedCapsCard";
import {
  CardRailsPanel,
  type RailLiveInputs,
} from "@/components/agent/trade/rails/CardRailsPanel";
import { TradeModeSelector } from "@/components/agent/trade/TradeModeSelector";
import { TradeProposalForm } from "@/components/agent/trade/TradeProposalForm";
import { Badge } from "@/components/ui/Badge";
import { sanitizeAgentConfig, type AgentConfig } from "@/lib/agent/agentConfig";
import { getCombinedVerdict } from "@/lib/agent/memory";
import { getTradeCoinsForAgent } from "@/lib/agent/trade/coins";
import { readTradeFunding, type TradeFunding } from "@/lib/agent/trade/funding";
import { evaluateVerdictGate, VERDICT_MAX_AGE_MS } from "@/lib/agent/trade/gate";
import {
  readAllowlistStatus,
  readCapStatus,
  type CapStatus,
} from "@/lib/agent/trade/gateStatus";
import { MAX_LEVERAGE, MAX_SIZE_USD } from "@/lib/agent/trade/gmx";
import { getSession } from "@/lib/auth/session";
import { fetchReserveRatesForSlug } from "@/lib/server/aave";
import { resolveCoin } from "@/lib/server/coingecko";
import { collabEnabled } from "@/lib/collab-flag";
import { fheEnabled } from "@/lib/fhe-flag";
import { getUserProfile } from "@/lib/auth/users";

function formatAge(ageMs: number | null): string {
  if (ageMs == null) return "no verdict";
  const hours = ageMs / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(ageMs / 60_000))}m old`;
  return `${Math.round(hours)}h old`;
}

/**
 * Guided GMX execution surface on the agent's Trade desk tab (and the
 * standalone /agents/trade page), styled as the
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
  skillId,
  defaultAsset,
}: {
  agentId: string;
  config: AgentConfig | null | undefined;
  isOwner: boolean;
  /** Agent skill id — drives which coins the desk covers (majors fallback). */
  skillId?: string | null;
  /** Optional coin symbol to preselect in the proposal form (e.g. from a ?asset= param). */
  defaultAsset?: string;
}) {
  const now = Date.now();
  const deskCoins = getTradeCoinsForAgent(skillId);
  // A desk with no executable coin (skill token without a GMX Sepolia market)
  // is recommendation-only: no fills, so no GMX allowlist/funding concerns.
  const deskExecutable = deskCoins.some((c) => c.executable);
  // The card-rails panel is AAVE-desk only; its live readings (reserve
  // utilization + AAVE market data) all fail soft to null so the panel's
  // sliders and backtest work even fully offline.
  const isAaveDesk = deskCoins.some((c) => c.symbol === "AAVE");
  const [coins, allowlist, railReserves, railMarket] = await Promise.all([
    Promise.all(
      deskCoins.map(async (coin) => {
        const verdict = await getCombinedVerdict(coin.symbol);
        const gate = evaluateVerdictGate(verdict, now);
        const ts = verdict ? Date.parse(verdict.ts) : NaN;
        return {
          symbol: coin.symbol,
          entitySlug: coin.entitySlug,
          executable: coin.executable,
          signal: verdict?.signal ?? null,
          severity: verdict?.severity ?? null,
          gateOpen: gate.ok,
          reason: gate.ok ? null : gate.reason,
          ageMs: Number.isFinite(ts) ? now - ts : null,
        };
      }),
    ),
    deskExecutable ? readAllowlistStatus() : Promise.resolve(null),
    isAaveDesk
      ? Promise.all(["aweth", "ausdc", "ausdt", "gho"].map(fetchReserveRatesForSlug)).catch(
          () => null,
        )
      : Promise.resolve(null),
    isAaveDesk ? resolveCoin("aave", 60).catch(() => null) : Promise.resolve(null),
  ]);

  // Surface the most stressed reserve next to the utilization rails.
  let railLive: RailLiveInputs | null = null;
  if (isAaveDesk) {
    const hottest = (railReserves ?? [])
      .filter(
        (r): r is NonNullable<typeof r> & { utilizationPct: number } =>
          r != null && r.utilizationPct != null,
      )
      .sort((a, b) => b.utilizationPct - a.utilizationPct)[0];
    railLive = {
      utilizationPct: hottest?.utilizationPct ?? null,
      utilizationSymbol: hottest?.underlyingSymbol ?? null,
      change24hPct: railMarket?.change24hPct ?? null,
      priceUsd: railMarket?.priceUsd ?? null,
    };
  }

  const cfg = sanitizeAgentConfig(config ?? {});
  const maxSizeUsdHuman = Number(MAX_SIZE_USD / 10n ** 30n);
  const hasCaps = Boolean(cfg.tradeSpendingCapUsd || cfg.tradeCumulativeCapUsd);

  // Owner-only readouts: funding for the treasury wallet that signs trades
  // (Sepolia ETH gas + USDC.SG collateral) and spending-cap headroom.
  let funding: TradeFunding | null = null;
  let caps: CapStatus | null = null;
  if (isOwner) {
    const session = getSession();
    const profile = session ? await getUserProfile(session.userId) : null;
    const fundingPromise =
      profile?.address && /^0x[0-9a-fA-F]{40}$/.test(profile.address)
        ? readTradeFunding(profile.address as `0x${string}`)
        : Promise.resolve(null);
    [funding, caps] = await Promise.all([fundingPromise, readCapStatus(agentId, cfg)]);
  }
  const showCaps = isOwner && caps && (cfg.tradeHitlMethod === "spending_cap" || hasCaps);

  return (
    <div className="card-surface glow-ring overflow-hidden rounded-2xl border border-ink-800/60">
      {/* Terminal chrome */}
      <div className="flex items-center gap-1.5 border-b border-ink-800/60 px-4 py-2.5">
        <i className="term-dot" />
        <i className="term-dot" />
        <i className="term-dot" />
        <span className="flex-1" />
        <Badge tone="signal" className="px-2 py-0 font-mono text-[10px] uppercase">
          {deskExecutable ? "perps" : "signals"}
        </Badge>
        <span className="font-mono text-[10px] tracking-wide text-ink-500">
          {deskExecutable ? "gmx · arbitrum" : "research · recommendations"}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <span className="kicker">Trade desk</span>
          {deskExecutable ? (
            <>
              <p className="text-sm leading-relaxed text-ink-300">
                Research-gated perps: a coin is tradable only while it has a fresh, positive CanHav
                verdict (≤{VERDICT_MAX_AGE_MS / 3_600_000}h) and GMX is allowlisted on the
                SecurityRegistry.{" "}
                <span className="font-medium text-ink-100">No research, no trade.</span>
              </p>
              <p className="font-mono text-[11px] text-ink-400">
                research <span className="text-ink-600">→</span> verdict{" "}
                <span className="text-ink-600">→</span> proposal{" "}
                <span className="text-ink-600">→</span>{" "}
                {cfg.tradeHitlMethod === "spending_cap" ? "caps auto-approve" : "your approval"}{" "}
                <span className="text-ink-600">→</span> your signature{" "}
                <span className="text-ink-600">→</span> GMX fill
              </p>
              <p className="text-xs leading-relaxed text-ink-500">
                The agent researches a coin; a fresh positive verdict opens the gate; the agent
                files a proposal; you approve it (or your caps auto-approve it); you sign in your
                wallet, and GMX fills on Arbitrum.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-ink-300">
                Research-gated recommendations: the agent can call a buy or sell only while its
                coin has a fresh, positive CanHav verdict (≤{VERDICT_MAX_AGE_MS / 3_600_000}h).
                There is no GMX market for it on Arbitrum Sepolia, so nothing executes on-chain.{" "}
                <span className="font-medium text-ink-100">No research, no recommendation.</span>
              </p>
              <p className="font-mono text-[11px] text-ink-400">
                research <span className="text-ink-600">→</span> verdict{" "}
                <span className="text-ink-600">→</span> recommendation{" "}
                <span className="text-ink-600">→</span> your call
              </p>
              <p className="text-xs leading-relaxed text-ink-500">
                The agent researches its coin; a fresh positive verdict opens the gate; the agent
                files a buy/sell recommendation. Acting on it is up to you — no order is built,
                signed, or filled.
              </p>
            </>
          )}
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
                  {!coin.executable && (
                    <Badge tone="neutral" className="font-mono text-[10px]">
                      recommendation only
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

          {deskExecutable && (
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0">
              {allowlist && allowlist.routerAllowed && allowlist.vaultAllowed ? (
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
              ) : (
                <ShieldX className="h-4 w-4 text-ink-500" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium text-ink-50">
                  SecurityRegistry
                </span>
                {allowlist == null ? (
                  <Badge tone="warning" className="font-mono text-[10px]">
                    unreadable
                  </Badge>
                ) : allowlist.routerAllowed && allowlist.vaultAllowed ? (
                  <Badge tone="positive" className="font-mono text-[10px]">
                    allowlisted
                  </Badge>
                ) : (
                  <Badge tone="danger" className="font-mono text-[10px]">
                    blocked
                  </Badge>
                )}
                <span className="font-mono text-[10px] text-ink-400">
                  GMX router + OrderVault
                </span>
              </div>
              {allowlist == null ? (
                <p className="mt-1 text-xs text-amber-400">
                  Allowlist unreadable (RPC); it is re-checked server-side at trade time.
                </p>
              ) : !allowlist.routerAllowed || !allowlist.vaultAllowed ? (
                <p className="mt-1 text-xs text-ink-400">
                  {[
                    !allowlist.routerAllowed ? "ExchangeRouter" : null,
                    !allowlist.vaultAllowed ? "OrderVault" : null,
                  ]
                    .filter(Boolean)
                    .join(" and ")}{" "}
                  not on the SecurityRegistry allowlist, so every trade is blocked until re-verified.
                </p>
              ) : null}
            </div>
          </div>
          )}
        </div>

        {/* Every gate below is enforced server-side at proposal time (assertResearchGate);
            this card is a readout of those rules, not the enforcement itself. */}
        <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 px-4 py-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Research guardrails
          </p>
          <ul className="mt-2 space-y-1.5">
            <li className="text-xs leading-relaxed text-ink-400">
              <span className="font-mono text-[11px] text-ink-200">fresh verdict</span> — every{" "}
              {deskExecutable ? "trade" : "recommendation"} gates on a CanHav research verdict no
              older than {VERDICT_MAX_AGE_MS / 3_600_000}h. Stale or missing research closes the
              gate.
            </li>
            <li className="text-xs leading-relaxed text-ink-400">
              <span className="font-mono text-[11px] text-ink-200">positive signal</span> —
              high-severity verdicts and risk signals (peg risk, supply contraction) block the
              coin even when research is fresh.
            </li>
            {deskExecutable ? (
              <>
                <li className="text-xs leading-relaxed text-ink-400">
                  <span className="font-mono text-[11px] text-ink-200">allowlist check</span> —
                  the GMX ExchangeRouter and OrderVault must be on the on-chain SecurityRegistry
                  allowlist, re-verified server-side at trade time.
                </li>
                <li className="text-xs leading-relaxed text-ink-400">
                  <span className="font-mono text-[11px] text-ink-200">hard limits</span> —
                  proposals are capped at ${maxSizeUsdHuman} notional and {MAX_LEVERAGE}x
                  leverage regardless of your spending-cap settings.
                </li>
                <li className="text-xs leading-relaxed text-ink-400">
                  <span className="font-mono text-[11px] text-ink-200">your signature</span> — no
                  unattended signer exists. Caps can skip the approval click, but every trade
                  still requires your wallet signature.
                </li>
              </>
            ) : (
              <li className="text-xs leading-relaxed text-ink-400">
                <span className="font-mono text-[11px] text-ink-200">nothing executes</span> —
                the agent files a buy/sell call and stops. No order is built, signed, or filled;
                acting on it is entirely your decision.
              </li>
            )}
          </ul>
        </div>

        {isAaveDesk && <CardRailsPanel live={railLive} />}

        {isOwner ? (
          <>
            {deskExecutable && funding && (
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
                    No USDC.SG collateral: GMX orders will fail.
                    {collabEnabled() && " tCNHV credits are marketplace-only and can't back trades."}
                  </p>
                ) : funding.ethRaw === 0n ? (
                  <p className="mt-1.5 text-xs text-amber-400">
                    No ETH: the wallet can&apos;t pay gas or the GMX execution fee.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink-500">
                    GMX collateral is USDC.SG
                    {collabEnabled() && "; tCNHV credits are marketplace-only"}. Execution fee is
                    paid in ETH.
                  </p>
                )}
              </div>
            )}

            {showCaps && caps && (
              <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 px-4 py-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <Gauge className="h-3.5 w-3.5" /> Spending caps
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="tabular font-mono text-xs text-ink-200">
                    {caps.perTradeCapUsd != null ? `$${caps.perTradeCapUsd}` : "—"}{" "}
                    <span className="text-ink-400">per trade</span>
                  </span>
                  <span className="tabular font-mono text-xs text-ink-200">
                    {caps.cumulativeCapUsd != null ? `$${caps.cumulativeCapUsd}` : "—"}{" "}
                    <span className="text-ink-400">24h cap</span>
                  </span>
                  <span className="tabular font-mono text-xs text-ink-200">
                    ${caps.spent24hUsd.toFixed(2)} <span className="text-ink-400">spent 24h</span>
                  </span>
                  {caps.remaining24hUsd != null && (
                    <span className="tabular font-mono text-xs text-ink-200">
                      ${caps.remaining24hUsd.toFixed(2)}{" "}
                      <span className="text-ink-400">remaining</span>
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-ink-500">
                  {caps.perTradeCapUsd == null && caps.cumulativeCapUsd == null
                    ? "No caps set: in Auto within limits, every proposal auto-approves."
                    : "Proposals inside these caps auto-approve; you still sign each trade."}
                </p>
              </div>
            )}

            {fheEnabled() && showCaps && caps && (
              <EncryptedCapsCard
                agentId={agentId}
                defaultPerTradeUsd={caps.perTradeCapUsd}
                defaultCumulativeUsd={caps.cumulativeCapUsd}
              />
            )}

            <TradeModeSelector agentId={agentId} method={cfg.tradeHitlMethod} hasCaps={hasCaps} />

            <TradeProposalForm
              agentId={agentId}
              coins={coins.map((c) => ({
                symbol: c.symbol,
                gateOpen: c.gateOpen,
                executable: c.executable,
              }))}
              maxSizeUsd={maxSizeUsdHuman}
              maxLeverage={MAX_LEVERAGE}
              hitlMethod={cfg.tradeHitlMethod}
              defaultAsset={defaultAsset}
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
