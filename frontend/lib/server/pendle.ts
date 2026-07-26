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

interface PendleListedTokenRow {
  symbol?: string;
  price?: { usd?: number | string | null } | null;
}

interface PendleListedMarketRow {
  name?: string;
  symbol?: string;
  isActive?: boolean;
  liquidity?: { usd?: number | string | null } | null;
  pt?: PendleListedTokenRow | null;
  yt?: PendleListedTokenRow | null;
}

interface PendleListedMarketsResponse {
  results?: PendleListedMarketRow[];
}

export interface PendlePtYtPrices {
  ptPriceUsd: number | null;
  ytPriceUsd: number | null;
  /** Market the prices were read from (e.g. "PT-stETH-26DEC2026"). */
  marketName: string | null;
}

/**
 * Representative PT/YT unit prices for the Credit member-coin placeholders
 * (`pendle-ptyt` / `pendle-ptyt-family`, symbols "PT-stETH" / "YT-stETH").
 * Uses the paginated /v1/1/markets list (the only endpoint that carries
 * pt.price.usd / yt.price.usd); prefers the deepest active stETH market,
 * falling back to the deepest active market overall. Returns null on any
 * failure; callers degrade to placeholder dashes.
 */
export async function fetchPendleRepresentativePtYtPrices(
  revalidate?: number,
): Promise<PendlePtYtPrices | null> {
  const { status, data } = await fetchJson(`${PENDLE_BASE}/v1/1/markets?limit=100`, {
    revalidate,
  });
  if (status !== 200) return null;
  const results = (data as PendleListedMarketsResponse | null)?.results;
  if (!Array.isArray(results)) return null;

  const active = results.filter((m) => m?.isActive !== false);
  const bySize = (rows: PendleListedMarketRow[]) =>
    rows.reduce<PendleListedMarketRow | null>((best, m) => {
      const tvl = num(m.liquidity?.usd) ?? 0;
      return tvl > (num(best?.liquidity?.usd) ?? 0) ? m : best;
    }, null);

  const isSteth = (m: PendleListedMarketRow) =>
    `${m.name ?? ""} ${m.symbol ?? ""} ${m.pt?.symbol ?? ""}`.toLowerCase().includes("steth");
  const market = bySize(active.filter(isSteth)) ?? bySize(active);
  if (!market) return null;

  const ptPriceUsd = num(market.pt?.price?.usd);
  const ytPriceUsd = num(market.yt?.price?.usd);
  if (ptPriceUsd == null && ytPriceUsd == null) return null;

  return {
    ptPriceUsd,
    ytPriceUsd,
    marketName: market.pt?.symbol ?? market.name ?? null,
  };
}

/* ------------------------- M4 (CAN-64) additions -------------------------- */

/** One active market with everything the FI rows + yield curve need. */
export interface PendleMarketDetail {
  name: string;
  address: string;
  chainId: number;
  /** ISO expiry date. */
  expiry: string;
  liquidityUsd: number | null;
  /** Implied fixed APY, percent. */
  impliedApyPct: number | null;
  /** Underlying (variable) APY, percent. */
  underlyingApyPct: number | null;
  ptPriceUsd: number | null;
  ytPriceUsd: number | null;
  /** Underlying asset symbol (e.g. "sUSDS", "stETH"). */
  underlyingSymbol: string | null;
  volume24hUsd: number | null;
  /** YT floating (long-yield) APY, percent. */
  ytFloatingApyPct: number | null;
  /** PT discount to the underlying (0..1); PT-in-underlying = 1 - discount. */
  ptDiscount: number | null;
  /** Total PT outstanding, in PT units (notional = totalPt * ptPriceUsd). */
  totalPt: number | null;
}

interface PendleDetailedMarketRow extends PendleListedMarketRow {
  address?: string;
  chainId?: number;
  expiry?: string | null;
  proName?: string;
  impliedApy?: number | string | null;
  underlyingApy?: number | string | null;
  ytFloatingApy?: number | string | null;
  ptDiscount?: number | string | null;
  totalPt?: number | string | null;
  underlyingAsset?: { symbol?: string } | null;
  tradingVolume?: { usd?: number | string | null } | null;
  pt?: (PendleListedTokenRow & { price?: { usd?: number | string | null } | null }) | null;
  yt?: (PendleListedTokenRow & { price?: { usd?: number | string | null } | null }) | null;
}

/**
 * All ACTIVE markets across the covered chains with per-market detail
 * (expiry, USD liquidity, implied + underlying APY, PT/YT unit prices).
 * This is the yield-curve dataset (spec FI3/FI4/FI7-FI10/FI12); the paginated
 * /v1/{chainId}/markets list is the only endpoint carrying pt/yt prices.
 */
export async function fetchPendleMarketsDetailed(
  revalidate?: number,
): Promise<PendleMarketDetail[] | null> {
  const responses = await Promise.all(
    PENDLE_CHAIN_IDS.map((chainId) =>
      fetchJson(`${PENDLE_BASE}/v1/${chainId}/markets?limit=100`, { revalidate }).then(
        (r) => ({ chainId, ...r }),
      ),
    ),
  );

  const out: PendleMarketDetail[] = [];
  let anyOk = false;
  for (const { chainId, status, data } of responses) {
    if (status !== 200) continue;
    const results = (data as PendleListedMarketsResponse | null)?.results as
      | PendleDetailedMarketRow[]
      | undefined;
    if (!Array.isArray(results)) continue;
    anyOk = true;
    for (const m of results) {
      if (m?.isActive === false) continue;
      if (!m?.address || !m?.expiry) continue;
      const implied = num(m.impliedApy);
      const underlying = num(m.underlyingApy);
      out.push({
        // The market's own name/symbol is the generic LP token ("PENDLE-LPT");
        // the PT symbol ("PT-sUSDS-26NOV2026") is the human-meaningful label.
        name: m.pt?.symbol ?? m.proName ?? m.symbol ?? m.address,
        address: m.address,
        chainId: m.chainId ?? chainId,
        expiry: m.expiry,
        liquidityUsd: num(m.liquidity?.usd),
        impliedApyPct: implied != null ? implied * 100 : null,
        underlyingApyPct: underlying != null ? underlying * 100 : null,
        ptPriceUsd: num(m.pt?.price?.usd),
        ytPriceUsd: num(m.yt?.price?.usd),
        underlyingSymbol: m.underlyingAsset?.symbol ?? null,
        volume24hUsd: num(m.tradingVolume?.usd),
        ytFloatingApyPct: num(m.ytFloatingApy) != null ? (num(m.ytFloatingApy) as number) * 100 : null,
        ptDiscount: num(m.ptDiscount),
        totalPt: num(m.totalPt),
      });
    }
  }
  return anyOk ? out : null;
}

export interface PendleMarketHistoryPoint {
  /** ISO date. */
  date: string;
  impliedApyPct: number | null;
  underlyingApyPct: number | null;
  tvlUsd: number | null;
}

interface PendleHistoryResponse {
  results?: {
    timestamp?: string;
    impliedApy?: number | string | null;
    underlyingApy?: number | string | null;
    tvl?: number | string | null;
  }[];
}

/**
 * Daily implied/underlying APY history for one market (v2 historical-data,
 * shape verified live 2026-07-26). Feeds the implied-vs-underlying spread
 * chart; PT price history is NOT exposed, so price-convergence series are
 * derived from implied APY + days-to-maturity by the caller.
 */
export async function fetchPendleMarketHistory(
  chainId: number,
  address: string,
  revalidate?: number,
): Promise<PendleMarketHistoryPoint[] | null> {
  const { status, data } = await fetchJson(
    `${PENDLE_BASE}/v2/${chainId}/markets/${address}/historical-data?time_frame=day`,
    { revalidate },
  );
  if (status !== 200) return null;
  const results = (data as PendleHistoryResponse | null)?.results;
  if (!Array.isArray(results)) return null;
  const out: PendleMarketHistoryPoint[] = [];
  for (const r of results) {
    if (!r?.timestamp) continue;
    const implied = num(r.impliedApy);
    const underlying = num(r.underlyingApy);
    out.push({
      date: r.timestamp.slice(0, 10),
      impliedApyPct: implied != null ? implied * 100 : null,
      underlyingApyPct: underlying != null ? underlying * 100 : null,
      tvlUsd: num(r.tvl),
    });
  }
  return out.length > 0 ? out : null;
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
