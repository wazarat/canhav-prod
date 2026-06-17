import type { CoinLiveData } from "@/lib/server/coin";
import type { NetworkProfile } from "@/lib/types";

/**
 * Derived dashboard metrics for a network. These are computed from data already
 * in the store / live member-coin snapshots — there is no entity-level TVL time
 * series, so the "24h flow" is a real, weighted aggregate of member-coin 24h
 * moves rather than a fabricated chart. Widgets degrade to an honest empty
 * state (`hasData: false`) when no member coin reports live market data.
 */

export interface MemberFlowContribution {
  slug: string;
  symbol: string;
  name: string;
  category: CoinLiveData["category"];
  /** USD weight used for the aggregate (market cap when available). */
  valueUsd: number | null;
  change24hPct: number | null;
}

export interface TvlFlow {
  /** Sum of member-coin USD weights that have live data. */
  totalUsd: number;
  /** Market-cap-weighted aggregate 24h % move across members with data. */
  change24hPct: number | null;
  /** Approx USD added/removed over 24h implied by the weighted move. */
  netFlow24hUsd: number | null;
  contributions: MemberFlowContribution[];
  hasData: boolean;
}

/** USD weight for a single member coin (market cap, the only cross-category unit). */
function memberValueUsd(coin: CoinLiveData): number | null {
  return coin.market?.marketCap ?? null;
}

/**
 * Build the 24h TVL/value flow for a network from its live member coins.
 * Aggregate change is market-cap-weighted across members that report a 24h
 * price change; members without live data are still listed (valueUsd null) so
 * the panel is transparent about coverage.
 */
export function buildTvlFlow(coins: CoinLiveData[]): TvlFlow {
  const contributions: MemberFlowContribution[] = coins.map((c) => ({
    slug: c.slug,
    symbol: c.symbol,
    name: c.name,
    category: c.category,
    valueUsd: memberValueUsd(c),
    change24hPct: c.market?.priceChange24h ?? null,
  }));

  let weightedSum = 0;
  let weightTotal = 0;
  let totalUsd = 0;
  for (const c of contributions) {
    if (c.valueUsd != null && c.valueUsd > 0) {
      totalUsd += c.valueUsd;
      if (c.change24hPct != null) {
        weightedSum += c.valueUsd * c.change24hPct;
        weightTotal += c.valueUsd;
      }
    }
  }

  const change24hPct = weightTotal > 0 ? weightedSum / weightTotal : null;
  // Implied net flow: today's weighted value minus its value 24h ago.
  const netFlow24hUsd =
    change24hPct != null && weightTotal > 0
      ? weightTotal - weightTotal / (1 + change24hPct / 100)
      : null;

  return {
    totalUsd,
    change24hPct,
    netFlow24hUsd,
    contributions: contributions.sort(
      (a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1),
    ),
    hasData: weightTotal > 0,
  };
}

export interface FeesSummary {
  fees24hUsd: number | null;
  fees7dUsd: number | null;
  fees30dUsd: number | null;
  feesChange1dPct: number | null;
  revenue24hUsd: number | null;
  volume24hUsd: number | null;
  volumeChange1dPct: number | null;
  llamaCategory: string | null;
  updatedAt: string | null;
  hasData: boolean;
}

/** Roll up the DeFi Llama fee/revenue + DEX volume overlays for the fees widget. */
export function buildFeesSummary(network: NetworkProfile): FeesSummary {
  const f = network.protocolFeesRevenue ?? null;
  const v = network.dexVolume ?? null;
  const hasData =
    (f != null &&
      (f.fees24hUsd != null || f.fees7dUsd != null || f.fees30dUsd != null)) ||
    (v != null && v.volume24hUsd != null);
  return {
    fees24hUsd: f?.fees24hUsd ?? null,
    fees7dUsd: f?.fees7dUsd ?? null,
    fees30dUsd: f?.fees30dUsd ?? null,
    feesChange1dPct: f?.feesChange1dPct ?? null,
    revenue24hUsd: f?.revenue24hUsd ?? null,
    volume24hUsd: v?.volume24hUsd ?? null,
    volumeChange1dPct: v?.change1dPct ?? null,
    llamaCategory: f?.llamaCategory ?? null,
    updatedAt: f?.updatedAt ?? v?.updatedAt ?? null,
    hasData,
  };
}
