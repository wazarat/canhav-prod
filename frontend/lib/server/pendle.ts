import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Pendle Finance v2 core API — keyless, Tier-1.
 *
 * Base: https://api-v2.pendle.finance/core
 * Endpoint used: GET /v1/{chainId}/markets/active
 *   Pre-filtered to currently-active markets; one call per chain. Each market's
 *   `details` block carries USD liquidity (== market TVL), implied APY, Pendle
 *   incentive APY and the realized aggregated APY, plus an `expiry` ISO date.
 *
 * We aggregate across the chains with meaningful Pendle TVL (Ethereum, Arbitrum,
 * BNB Chain, Base). PT / YT unit prices are NOT surfaced by the /active endpoint
 * (only the paginated /v1/{chainId}/markets list carries pt.price.usd /
 * yt.price.usd), so those spec fields are left null → Tier-2. See
 * docs/m2-sources/pendle.md.
 */

const PENDLE_BASE = "https://api-v2.pendle.finance/core";

/** Chains with meaningful Pendle TVL. */
const PENDLE_CHAIN_IDS = [1, 42161, 56, 8453] as const;

export interface PendleLiveMetrics {
  /** FI: aggregate USD TVL across all active markets. */
  totalTvlUsd: number | null;
  /** FI: count of active markets aggregated. */
  marketCount: number | null;
  /** FI: TVL-weighted average implied (fixed) APY, in percent. */
  avgImpliedApyPct: number | null;
  /** FI: TVL-weighted average realized/aggregated APY, in percent. */
  avgUnderlyingApyPct: number | null;
  /** FI: nearest market maturity, ISO date string. */
  nearestMaturity: string | null;
  /** FI: furthest market maturity, ISO date string. */
  furthestMaturity: string | null;
  /** FI (derived): TVL-weighted average days-to-maturity from now. */
  avgDaysToMaturity: number | null;
  /** FI: representative (largest-market) PT unit price, USD. Tier-2 → null. */
  representativePtPriceUsd: number | null;
  /** FI: representative (largest-market) YT unit price, USD. Tier-2 → null. */
  representativeYtPriceUsd: number | null;
}

interface PendleActiveMarketDetails {
  liquidity?: number | null;
  impliedApy?: number | null;
  pendleApy?: number | null;
  aggregatedApy?: number | null;
}

interface PendleActiveMarketRow {
  name?: string;
  address?: string;
  expiry?: string | null;
  details?: PendleActiveMarketDetails | null;
}

interface PendleActiveMarketsResponse {
  markets?: PendleActiveMarketRow[];
}

/** Coerce a string|number|null field to a finite number or null. */
function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fetch and aggregate Pendle active-market metrics across all covered chains. */
export async function fetchPendleLiveMetrics(
  revalidate?: number,
): Promise<PendleLiveMetrics | null> {
  const responses = await Promise.all(
    PENDLE_CHAIN_IDS.map((chainId) =>
      fetchJson(`${PENDLE_BASE}/v1/${chainId}/markets/active`, { revalidate }),
    ),
  );

  const rows: PendleActiveMarketRow[] = [];
  let anyOk = false;
  for (const { status, data } of responses) {
    if (status !== 200) continue;
    const markets = (data as PendleActiveMarketsResponse | null)?.markets;
    if (!Array.isArray(markets)) continue;
    anyOk = true;
    rows.push(...markets);
  }

  // Every chain call failed or none returned the expected shape.
  if (!anyOk) return null;

  let totalTvlUsd = 0;
  let marketCount = 0;
  let impliedWeighted = 0;
  let underlyingWeighted = 0;
  let apyWeight = 0;
  let dtmWeighted = 0;
  let dtmWeight = 0;
  let nearestMs: number | null = null;
  let furthestMs: number | null = null;
  let largestTvl = 0;
  const nowMs = Date.now();

  for (const m of rows) {
    const tvl = num(m.details?.liquidity);
    if (tvl == null || tvl <= 0) continue;
    totalTvlUsd += tvl;
    marketCount += 1;

    const implied = num(m.details?.impliedApy);
    if (implied != null) {
      impliedWeighted += implied * 100 * tvl;
      apyWeight += tvl;
    }
    const aggregated = num(m.details?.aggregatedApy);
    if (aggregated != null) {
      underlyingWeighted += aggregated * 100 * tvl;
    }

    if (m.expiry) {
      const exp = Date.parse(m.expiry);
      if (Number.isFinite(exp)) {
        if (nearestMs == null || exp < nearestMs) nearestMs = exp;
        if (furthestMs == null || exp > furthestMs) furthestMs = exp;
        const days = (exp - nowMs) / 86_400_000;
        if (days > 0) {
          dtmWeighted += days * tvl;
          dtmWeight += tvl;
        }
      }
    }

    if (tvl > largestTvl) largestTvl = tvl;
  }

  if (marketCount === 0) return null;

  return {
    totalTvlUsd: totalTvlUsd > 0 ? totalTvlUsd : null,
    marketCount,
    avgImpliedApyPct: apyWeight > 0 ? impliedWeighted / apyWeight : null,
    avgUnderlyingApyPct: apyWeight > 0 ? underlyingWeighted / apyWeight : null,
    nearestMaturity: nearestMs != null ? new Date(nearestMs).toISOString() : null,
    furthestMaturity: furthestMs != null ? new Date(furthestMs).toISOString() : null,
    avgDaysToMaturity: dtmWeight > 0 ? dtmWeighted / dtmWeight : null,
    // PT/YT unit prices are not exposed by the /active endpoint → Tier-2.
    representativePtPriceUsd: null,
    representativeYtPriceUsd: null,
  };
}

/**
 * Map Pendle live metrics onto the Credit sector's `fixedIncome` tag block
 * (CreditTagMetrics.fixedIncome → FixedIncomeMetrics). Returns a plain inferred
 * object (no Phase B type imports). `Sourced` fields are wrapped; `markets`,
 * `mechanism` and `maturities` are plain (non-Sourced) per the interface.
 *
 * Field mapping (Pendle → FixedIncomeMetrics):
 *   totalTvlUsd          → tvlUsd          (live)   — overlays the DefiLlama curated value
 *   avgImpliedApyPct     → fixedApyPct     (live)   — PT implied (fixed) APY, TVL-weighted
 *   avgUnderlyingApyPct  → impliedYieldPct (live)   — realized/aggregated APY proxy
 *   marketCount          → markets         (number) — active-market count
 *   nearest/furthest     → maturities      (string[]) — ISO date bounds
 */
export function pendleMetricsToTagOverlay(metrics: PendleLiveMetrics) {
  const sourced = <T>(value: T, kind: "live" | "derived" = "live") => ({
    value,
    dataSource: kind,
    sourceLabel: "Pendle API",
    updatedAt: nowIso(),
  });

  const maturities = [metrics.nearestMaturity, metrics.furthestMaturity].filter(
    (m): m is string => m != null,
  );

  return {
    fixedIncome: {
      ...(metrics.totalTvlUsd != null
        ? { tvlUsd: sourced(metrics.totalTvlUsd) }
        : {}),
      ...(metrics.avgImpliedApyPct != null
        ? { fixedApyPct: sourced(metrics.avgImpliedApyPct) }
        : {}),
      ...(metrics.avgUnderlyingApyPct != null
        ? { impliedYieldPct: sourced(metrics.avgUnderlyingApyPct) }
        : {}),
      ...(metrics.marketCount != null ? { markets: metrics.marketCount } : {}),
      ...(maturities.length ? { maturities } : {}),
    },
  };
}
