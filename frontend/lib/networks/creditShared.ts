import "server-only";

import { cache } from "react";

import type { MetricCardModel } from "@/components/ui/MetricCardGrid";
import type { SeriesPoint } from "@/components/ui/charts/TimeSeriesAreaChart";
import { coinIdForSlug, fetchMarketChart } from "@/lib/server/coingecko";
import { fetchLlamaFeesSeries } from "@/lib/server/defillama";
import { resolveNetworkTvlSeries } from "@/lib/server/series";
import { fetchSnapshotLiveMetrics } from "@/lib/server/snapshot";
import type { NetworkProfile } from "@/lib/types";
import type { TimeRange } from "@/lib/networks/timeRange";
import {
  CHART_REVALIDATE,
  FULL_WINDOW_DAYS,
  INTRADAY_NOTE,
  NO_HISTORY_NOTE,
  changeLabel,
  coingeckoUrl,
  llamaFeesUrl,
  llamaProtocolUrl,
  seriesChangePct,
  seriesSum,
  sliceSeries,
  sourcedNumber,
  windowOverWindowPct,
  zipRatioSeries,
} from "@/lib/networks/metricCardHelpers";

/**
 * The "Shared across Credit" card band (spec section 9 layout mandate): the
 * cross-tag rows every Credit tag sub-tab leads with, built once per request
 * and reused by the rollup tab and all three tag tabs via react cache().
 */

export interface SharedCardInputs {
  profile: NetworkProfile;
  range: TimeRange;
  tvlSeries: SeriesPoint[] | null;
  feesSeries: SeriesPoint[] | null;
  revenueSeries: SeriesPoint[] | null;
  priceSeries: SeriesPoint[] | null;
  mcapSeries: SeriesPoint[] | null;
  nowIso: string;
}

/** Fetch the series every Credit metrics tab shares (request-deduped). */
export const fetchSharedInputs = cache(
  async (profile: NetworkProfile, range: TimeRange): Promise<SharedCardInputs> => {
    const slug = profile.slug;
    const coinId = coinIdForSlug(slug);

    const [tvlResult, feesResult, chartResult] = await Promise.all([
      resolveNetworkTvlSeries(slug, FULL_WINDOW_DAYS).catch(() => null),
      fetchLlamaFeesSeries(slug, FULL_WINDOW_DAYS).catch(() => null),
      coinId
        ? fetchMarketChart(coinId, FULL_WINDOW_DAYS, { revalidate: CHART_REVALIDATE }).catch(
            () => null,
          )
        : Promise.resolve(null),
    ]);

    return {
      profile,
      range,
      tvlSeries: tvlResult && tvlResult.points.length >= 2 ? tvlResult.points : null,
      feesSeries: feesResult?.feesDaily?.length ? feesResult.feesDaily : null,
      revenueSeries: feesResult?.revenueDaily?.length ? feesResult.revenueDaily : null,
      priceSeries: chartResult?.prices?.length
        ? chartResult.prices.map((p) => ({ date: p.date, value: p.price }))
        : null,
      mcapSeries: chartResult?.marketCaps?.length ? chartResult.marketCaps : null,
      nowIso: new Date().toISOString(),
    };
  },
);

/** Snapshot space id from the DefiLlama governanceIds ("snapshot:aave.eth"). */
export function snapshotSpaceForProfile(profile: NetworkProfile): string | null {
  const ids = profile.universalMetrics?.identity?.governanceIds?.value ?? null;
  if (!ids) return null;
  for (const id of ids) {
    if (typeof id === "string" && id.startsWith("snapshot:")) {
      const space = id.slice("snapshot:".length).trim();
      if (space) return space;
    }
  }
  return null;
}

/* ------------------------- Shared card builders --------------------------- */

export function tvlCard(i: SharedCardInputs): MetricCardModel {
  const universal = i.profile.universalMetrics?.tvl.tvlUsd ?? null;
  const seriesLatest = i.tvlSeries?.at(-1)?.value ?? null;
  const value = sourcedNumber(universal) ?? seriesLatest;
  const asOf =
    universal?.value != null ? (universal.updatedAt ?? null) : value != null ? i.nowIso : null;
  const d1 = sourcedNumber(i.profile.universalMetrics?.tvl.tvlChangePct?.d1 ?? null);
  const d7 = sourcedNumber(i.profile.universalMetrics?.tvl.tvlChangePct?.d7 ?? null);
  const pct =
    i.range === "24h" ? (d1 ?? seriesChangePct(i.tvlSeries, 1)) : (seriesChangePct(i.tvlSeries, 7) ?? d7);
  return {
    id: "tvl",
    label: "TVL (net)",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? "DeFi Llama" : null,
    sourceUrl: llamaProtocolUrl(i.profile.slug),
    asOf,
    series: sliceSeries(i.tvlSeries, i.range),
    fullSeries: i.tvlSeries,
    seriesNote: i.range === "24h" ? INTRADAY_NOTE : NO_HISTORY_NOTE,
    change: pct != null ? { pct, tone: "up-good", label: changeLabel(i.range) } : null,
    calculation:
      "Net protocol TVL from the DeFi Llama protocol endpoint: value locked net of borrows, summed across products and chains (spec row C0.3).",
    caveats: ["Multi-product protocols are summed (for example Aave v3 plus v2)."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function feesCard(i: SharedCardInputs): MetricCardModel {
  const fr = i.profile.protocolFeesRevenue ?? null;
  const windowed: Record<TimeRange, number | null> = {
    "24h": fr?.fees24hUsd ?? seriesSum(i.feesSeries, 1),
    "7d": fr?.fees7dUsd ?? seriesSum(i.feesSeries, 7),
    "30d": fr?.fees30dUsd ?? seriesSum(i.feesSeries, 30),
    "90d": seriesSum(i.feesSeries, 90),
  };
  const value = windowed[i.range];
  const pct =
    i.range === "24h" ? (fr?.feesChange1dPct ?? null) : windowOverWindowPct(i.feesSeries, 7);
  return {
    id: "fees",
    label: `Fees (${i.range})`,
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? "DeFi Llama" : null,
    sourceUrl: llamaFeesUrl(i.profile.slug),
    asOf: fr?.updatedAt ?? (value != null ? i.nowIso : null),
    series: sliceSeries(i.feesSeries, i.range),
    fullSeries: i.feesSeries,
    seriesNote: i.range === "24h" ? INTRADAY_NOTE : NO_HISTORY_NOTE,
    change: pct != null ? { pct, tone: "up-good", label: changeLabel(i.range) } : null,
    calculation:
      "Total fees paid by users over the selected window, from the DeFi Llama fees summary (spec row C0.4). The 7d change compares the trailing 7 days against the 7 days before.",
    caveats: [
      "Fee methodology varies per protocol; see the endpoint's methodology field.",
      "Some Credit entities have no DeFi Llama fee adapter (for example Centrifuge).",
    ],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function revenueCard(i: SharedCardInputs): MetricCardModel {
  const fr = i.profile.protocolFeesRevenue ?? null;
  const windowed: Record<TimeRange, number | null> = {
    "24h": fr?.revenue24hUsd ?? seriesSum(i.revenueSeries, 1),
    "7d": fr?.revenue7dUsd ?? seriesSum(i.revenueSeries, 7),
    "30d": fr?.revenue30dUsd ?? seriesSum(i.revenueSeries, 30),
    "90d": seriesSum(i.revenueSeries, 90),
  };
  const value = windowed[i.range];
  const pct = i.range === "24h" ? null : windowOverWindowPct(i.revenueSeries, 7);
  return {
    id: "revenue",
    label: `Revenue (${i.range})`,
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? "DeFi Llama" : null,
    sourceUrl: llamaFeesUrl(i.profile.slug),
    asOf: fr?.updatedAt ?? (value != null ? i.nowIso : null),
    series: sliceSeries(i.revenueSeries, i.range),
    fullSeries: i.revenueSeries,
    seriesNote: i.range === "24h" ? INTRADAY_NOTE : NO_HISTORY_NOTE,
    change: pct != null ? { pct, tone: "up-good", label: "7d" } : null,
    calculation:
      "Protocol revenue (the fee share kept by the protocol or its treasury) over the selected window, from the DeFi Llama fees summary with dataType dailyRevenue (spec row C0.4).",
    caveats: ["Revenue split definitions vary per protocol adapter."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function marketCapCard(i: SharedCardInputs): MetricCardModel {
  const cell = i.profile.universalMetrics?.market.marketCapUsd ?? null;
  const value = sourcedNumber(cell) ?? i.mcapSeries?.at(-1)?.value ?? null;
  const pct =
    i.range === "24h" ? seriesChangePct(i.mcapSeries, 1) : seriesChangePct(i.mcapSeries, 7);
  return {
    id: "mcap",
    label: "Market cap",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? (cell?.sourceLabel ?? "CoinGecko") : null,
    sourceUrl: coingeckoUrl(i.profile.slug),
    asOf: cell?.updatedAt ?? (value != null ? i.nowIso : null),
    series: sliceSeries(i.mcapSeries, i.range),
    fullSeries: i.mcapSeries,
    seriesNote: i.range === "24h" ? INTRADAY_NOTE : NO_HISTORY_NOTE,
    change: pct != null ? { pct, tone: "up-good", label: changeLabel(i.range) } : null,
    calculation: "Circulating market capitalization from CoinGecko (universal rollup).",
    caveats: [],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function fdvCard(i: SharedCardInputs): MetricCardModel {
  const cell = i.profile.universalMetrics?.market.fdvUsd ?? null;
  const value = sourcedNumber(cell);
  return {
    id: "fdv",
    label: "FDV",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? (cell?.sourceLabel ?? "CoinGecko") : null,
    sourceUrl: coingeckoUrl(i.profile.slug),
    asOf: cell?.updatedAt ?? null,
    series: null,
    fullSeries: null,
    seriesNote: "FDV history not tracked",
    change: null,
    calculation:
      "Fully diluted valuation: price times max or total supply, from CoinGecko (universal rollup).",
    caveats: [
      "No FDV history: deriving it from a constant supply would fabricate a series, so the sparkline is deliberately absent.",
    ],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function pTvlCard(i: SharedCardInputs): MetricCardModel {
  const mcap =
    sourcedNumber(i.profile.universalMetrics?.market.marketCapUsd ?? null) ??
    i.mcapSeries?.at(-1)?.value ??
    null;
  const tvl =
    sourcedNumber(i.profile.universalMetrics?.tvl.tvlUsd ?? null) ??
    i.tvlSeries?.at(-1)?.value ??
    null;
  const value = mcap != null && tvl != null && tvl !== 0 ? mcap / tvl : null;
  const ratioSeries = zipRatioSeries(i.mcapSeries, i.tvlSeries);
  const pct = i.range === "24h" ? seriesChangePct(ratioSeries, 1) : seriesChangePct(ratioSeries, 7);
  return {
    id: "ptvl",
    label: "P/TVL",
    kind: "ratio",
    unit: "ratio",
    value,
    dataSource: value != null ? "derived" : null,
    sourceLabel: value != null ? "Derived" : null,
    sourceUrl: null,
    asOf: value != null ? i.nowIso : null,
    series: sliceSeries(ratioSeries, i.range),
    fullSeries: ratioSeries,
    seriesNote: i.range === "24h" ? INTRADAY_NOTE : NO_HISTORY_NOTE,
    change: pct != null ? { pct, tone: "neutral", label: changeLabel(i.range) } : null,
    calculation:
      "Market cap divided by TVL (universal rollup). Lower can mean a cheaper valuation or lower capital efficiency; it is not directionally good or bad.",
    caveats: ["Both inputs are point-in-time reads from different sources; treat small moves as noise."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function tvlDelta30dCard(i: SharedCardInputs): MetricCardModel {
  const universalD7 = sourcedNumber(i.profile.universalMetrics?.tvl.tvlChangePct?.d7 ?? null);
  const value = seriesChangePct(i.tvlSeries, 30);
  return {
    id: "tvl-delta-30d",
    label: "TVL Δ 30d",
    kind: "pct",
    unit: "pct",
    value,
    dataSource: value != null ? "derived" : null,
    sourceLabel: value != null ? "Derived (DeFi Llama)" : null,
    sourceUrl: llamaProtocolUrl(i.profile.slug),
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: i.tvlSeries,
    seriesNote: "Derived from the TVL series",
    change: null,
    calculation:
      "Percent change of net TVL over the trailing 30 days, computed from the DeFi Llama daily series (universal rollup). The drill-down chart shows the underlying TVL series.",
    caveats: universalD7 != null ? [] : ["Universal d7 change unavailable; series-derived only."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function chainCountCard(i: SharedCardInputs): MetricCardModel {
  const perChain = i.profile.universalMetrics?.tvl.perChain?.value ?? null;
  const value = perChain && perChain.length > 0 ? perChain.length : null;
  return {
    id: "chain-count",
    label: "Chain count",
    kind: "count",
    unit: "count",
    value,
    dataSource: value != null ? "derived" : null,
    sourceLabel: value != null ? "Derived (DeFi Llama)" : null,
    sourceUrl: value != null ? llamaProtocolUrl(i.profile.slug) : null,
    asOf: value != null ? (i.profile.universalMetrics?.syncedAt ?? null) : null,
    series: null,
    fullSeries: null,
    seriesNote: "Count metric; no series",
    change: null,
    calculation:
      "Number of chains with nonzero TVL per the DeFi Llama per-chain breakdown (universal rollup).",
    caveats: [],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

export function tokenPriceCard(i: SharedCardInputs): MetricCardModel {
  const cell = i.profile.universalMetrics?.market.priceUsd ?? null;
  const value = sourcedNumber(cell) ?? i.priceSeries?.at(-1)?.value ?? null;
  const d1 = sourcedNumber(i.profile.universalMetrics?.market.priceChangePct?.d1 ?? null);
  const pct =
    i.range === "24h" ? (d1 ?? seriesChangePct(i.priceSeries, 1)) : seriesChangePct(i.priceSeries, 7);
  return {
    id: "token-price",
    label: "Token price",
    kind: "price",
    unit: "price",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? (cell?.sourceLabel ?? "CoinGecko") : null,
    sourceUrl: coingeckoUrl(i.profile.slug),
    asOf: cell?.updatedAt ?? (value != null ? i.nowIso : null),
    series: sliceSeries(i.priceSeries, i.range),
    fullSeries: i.priceSeries,
    seriesNote: i.range === "24h" ? INTRADAY_NOTE : NO_HISTORY_NOTE,
    change: pct != null ? { pct, tone: "up-good", label: changeLabel(i.range) } : null,
    calculation: "Spot price of the protocol token from CoinGecko (spec row L23 trio).",
    caveats: ["Entities without a liquid token render an honest empty."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

/** Governance activity via the keyless Snapshot hub (spec row L22). */
async function governanceCard(i: SharedCardInputs): Promise<MetricCardModel> {
  const space = snapshotSpaceForProfile(i.profile);
  const live = space
    ? await fetchSnapshotLiveMetrics(space, CHART_REVALIDATE).catch(() => null)
    : null;
  const curated = i.profile.creditTagMetrics?.lending?.governanceDetail ?? null;
  const value = live?.totalProposals ?? curated?.proposals ?? null;
  const hintParts: string[] = [];
  if (live?.activeProposals != null) hintParts.push(`${live.activeProposals} active`);
  if (live?.uniqueVoters != null) hintParts.push(`${live.uniqueVoters} recent voters`);
  return {
    id: "governance",
    label: "Governance proposals",
    kind: "count",
    unit: "count",
    value,
    dataSource: live?.totalProposals != null ? "live" : null,
    sourceLabel: live?.totalProposals != null ? "Snapshot" : value != null ? "Curated" : null,
    sourceUrl: space ? `https://snapshot.org/#/${space}` : null,
    asOf: live?.totalProposals != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: "Count metric; no series",
    change: null,
    calculation:
      "Lifetime governance proposals for the protocol's Snapshot space, resolved from the DeFi Llama governance ids (spec row L22). The hint shows currently active proposals and unique voters across the recent sample.",
    caveats: space
      ? []
      : ["No Snapshot space is linked for this protocol; on-chain-only governance is not counted."],
    emptyChip: value == null ? "Pending" : null,
    hint: hintParts.length > 0 ? hintParts.join(", ") : null,
  };
}

/**
 * The full "Shared across Credit" band, in display order. Built once per
 * request per (profile, range) via cache(); tag panels await this in parallel
 * with their tag-specific fetches.
 */
export const buildSharedCreditBand = cache(
  async (profile: NetworkProfile, range: TimeRange): Promise<MetricCardModel[]> => {
    const inputs = await fetchSharedInputs(profile, range);
    const governance = await governanceCard(inputs);
    return [
      tvlCard(inputs),
      feesCard(inputs),
      revenueCard(inputs),
      marketCapCard(inputs),
      fdvCard(inputs),
      pTvlCard(inputs),
      tokenPriceCard(inputs),
      governance,
    ];
  },
);
