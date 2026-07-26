import "server-only";

import { cache } from "react";

import type { MetricCardModel } from "@/components/ui/MetricCardGrid";
import type { SeriesPoint } from "@/components/ui/charts/TimeSeriesAreaChart";
import { coinIdForSlug, fetchMarketChart } from "@/lib/server/coingecko";
import {
  aggregateLendingBorrow,
  aggregateSupplySideYield,
  fetchLlamaBorrowPools,
  fetchLlamaFeesSeries,
  fetchLlamaPools,
  llamaFeesProtocolForSlug,
  llamaLendingProjectForSlug,
  llamaProtocolForSlug,
} from "@/lib/server/defillama";
import { resolveNetworkTvlSeries } from "@/lib/server/series";
import type { NetworkProfile, Sourced } from "@/lib/types";
import type { TimeRange } from "@/lib/networks/timeRange";

export type { TimeRange } from "@/lib/networks/timeRange";

const RANGE_DAYS: Record<Exclude<TimeRange, "24h">, number> = { "7d": 7, "30d": 30, "90d": 90 };
const FULL_WINDOW_DAYS = 90;
const CHART_REVALIDATE = 3600;

const INTRADAY_NOTE = "Daily granularity; no intraday series";
const NO_HISTORY_NOTE = "No daily history from the current sources";

/** Range-sliced copy of a daily series; 24h is honest-null (daily data). */
function sliceSeries(series: SeriesPoint[] | null, range: TimeRange): SeriesPoint[] | null {
  if (!series || series.length < 2) return null;
  if (range === "24h") return null;
  const sliced = series.slice(-(RANGE_DAYS[range] + 1));
  return sliced.length >= 2 ? sliced : null;
}

/** Percent change over the trailing `days` observations of a daily series. */
function seriesChangePct(series: SeriesPoint[] | null, days: number): number | null {
  if (!series || series.length < 2) return null;
  const window = series.slice(-(days + 1));
  if (window.length < 2) return null;
  const first = window[0].value;
  const last = window[window.length - 1].value;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

/** Sum of the trailing `days` values (fees/revenue windows). */
function seriesSum(series: SeriesPoint[] | null, days: number, offset = 0): number | null {
  if (!series || series.length === 0) return null;
  const end = series.length - offset;
  const start = Math.max(0, end - days);
  if (end <= 0 || start >= end) return null;
  let sum = 0;
  let any = false;
  for (const p of series.slice(start, end)) {
    sum += p.value;
    any = true;
  }
  return any ? sum : null;
}

/** Sum-window vs the immediately preceding window, as percent change. */
function windowOverWindowPct(series: SeriesPoint[] | null, days: number): number | null {
  const current = seriesSum(series, days);
  const prior = seriesSum(series, days, days);
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function zipRatioSeries(
  numerator: SeriesPoint[] | null,
  denominator: SeriesPoint[] | null,
): SeriesPoint[] | null {
  if (!numerator || !denominator) return null;
  const byDate = new Map(denominator.map((p) => [p.date, p.value]));
  const out: SeriesPoint[] = [];
  for (const p of numerator) {
    const d = byDate.get(p.date);
    if (d != null && d !== 0) out.push({ date: p.date, value: p.value / d });
  }
  return out.length >= 2 ? out : null;
}

function sourcedNumber(cell: Sourced<number | null> | null | undefined): number | null {
  return cell?.value ?? null;
}

interface CardInputs {
  profile: NetworkProfile;
  range: TimeRange;
  tvlSeries: SeriesPoint[] | null;
  feesSeries: SeriesPoint[] | null;
  revenueSeries: SeriesPoint[] | null;
  priceSeries: SeriesPoint[] | null;
  mcapSeries: SeriesPoint[] | null;
  borrow: {
    totalSupplyUsd: number | null;
    totalBorrowUsd: number | null;
    supplyApyPct: number | null;
    borrowApyPct: number | null;
  } | null;
  supplyYield: { weightedSupplyApyPct: number | null } | null;
  nowIso: string;
}

const POOLS_BORROW_URL = "https://yields.llama.fi/poolsBorrow";

function llamaProtocolUrl(slug: string): string | null {
  const p = llamaProtocolForSlug(slug);
  return p ? `https://api.llama.fi/protocol/${p}` : null;
}

function llamaFeesUrl(slug: string): string | null {
  const p = llamaFeesProtocolForSlug(slug);
  return p ? `https://api.llama.fi/summary/fees/${p}` : null;
}

function coingeckoUrl(slug: string): string | null {
  const id = coinIdForSlug(slug);
  return id ? `https://www.coingecko.com/en/coins/${id}` : null;
}

function changeLabel(range: TimeRange): string {
  return range === "24h" ? "24h" : "7d";
}

/**
 * Assemble the Credit rollup card models for one entity: spec rows C0.1-C0.8
 * plus the universal rollup subset (docs/credit/metrics-spec.md, section 3.1).
 * Every upstream fetch fails soft to an honest empty; values are never
 * fabricated or zero-substituted (missing renders a dash plus a chip).
 */
export const buildCreditRollup = cache(
  async (profile: NetworkProfile, range: TimeRange): Promise<MetricCardModel[]> => {
    const slug = profile.slug;
    const coinId = coinIdForSlug(slug);
    const lendingProject = llamaLendingProjectForSlug(slug);

    const [tvlResult, feesResult, chartResult, borrowResult, supplyYieldResult] = await Promise.all([
      resolveNetworkTvlSeries(slug, FULL_WINDOW_DAYS).catch(() => null),
      fetchLlamaFeesSeries(slug, FULL_WINDOW_DAYS).catch(() => null),
      coinId
        ? fetchMarketChart(coinId, FULL_WINDOW_DAYS, { revalidate: CHART_REVALIDATE }).catch(
            () => null,
          )
        : Promise.resolve(null),
      // /poolsBorrow moved behind the Llama paid plan (402, 2026-07-26); this
      // fails soft today and lights the borrow-side cards up if Pro lands.
      lendingProject
        ? fetchLlamaBorrowPools(300)
            .then((pools) => aggregateLendingBorrow(slug, pools))
            .catch(() => null)
        : Promise.resolve(null),
      lendingProject
        ? fetchLlamaPools(300)
            .then((pools) => aggregateSupplySideYield(slug, pools))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const inputs: CardInputs = {
      profile,
      range,
      tvlSeries: tvlResult && tvlResult.points.length >= 2 ? tvlResult.points : null,
      feesSeries: feesResult?.feesDaily?.length ? feesResult.feesDaily : null,
      revenueSeries: feesResult?.revenueDaily?.length ? feesResult.revenueDaily : null,
      priceSeries: chartResult?.prices?.length
        ? chartResult.prices.map((p) => ({ date: p.date, value: p.price }))
        : null,
      mcapSeries: chartResult?.marketCaps?.length ? chartResult.marketCaps : null,
      borrow: borrowResult
        ? {
            totalSupplyUsd: borrowResult.totalSupplyUsd,
            totalBorrowUsd: borrowResult.totalBorrowUsd,
            supplyApyPct: borrowResult.supplyApyPct,
            borrowApyPct: borrowResult.borrowApyPct,
          }
        : null,
      supplyYield: supplyYieldResult,
      nowIso: new Date().toISOString(),
    };

    return [
      suppliedCard(inputs),
      borrowedCard(inputs),
      tvlCard(inputs),
      feesCard(inputs),
      revenueCard(inputs),
      borrowApyCard(inputs),
      supplyApyCard(inputs),
      collateralCard(inputs),
      badDebtCard(inputs),
      marketCapCard(inputs),
      fdvCard(inputs),
      pTvlCard(inputs),
      tvlDelta30dCard(inputs),
      chainCountCard(inputs),
    ];
  },
);

/* ----------------------------- C0.1 - C0.8 ------------------------------- */

function suppliedCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.totalSupplyUsd ?? null;
  return {
    id: "supplied",
    label: "Total supplied",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? "DeFi Llama poolsBorrow" : null,
    sourceUrl: POOLS_BORROW_URL,
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Sum of totalSupplyUsd across this protocol's lending pools on the DeFi Llama poolsBorrow endpoint (spec row C0.1).",
    caveats: [
      "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).",
      "Lending-market metric; structurally absent for non-lending Credit protocols.",
    ],
    emptyChip: value == null ? "Tier 2" : null,
    hint: null,
  };
}

function borrowedCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.totalBorrowUsd ?? null;
  return {
    id: "borrowed",
    label: "Total borrowed",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? "DeFi Llama poolsBorrow" : null,
    sourceUrl: POOLS_BORROW_URL,
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Sum of totalBorrowUsd across this protocol's lending pools on the DeFi Llama poolsBorrow endpoint (spec row C0.2).",
    caveats: [
      "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).",
      "Lending-market metric; structurally absent for non-lending Credit protocols.",
    ],
    emptyChip: value == null ? "Tier 2" : null,
    hint: null,
  };
}

function tvlCard(i: CardInputs): MetricCardModel {
  const universal = i.profile.universalMetrics?.tvl.tvlUsd ?? null;
  const seriesLatest = i.tvlSeries?.at(-1)?.value ?? null;
  const value = sourcedNumber(universal) ?? seriesLatest;
  const asOf = universal?.value != null ? (universal.updatedAt ?? null) : value != null ? i.nowIso : null;
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

function feesCard(i: CardInputs): MetricCardModel {
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

function revenueCard(i: CardInputs): MetricCardModel {
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

function borrowApyCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.borrowApyPct ?? null;
  return {
    id: "borrow-apy",
    label: "Wtd avg borrow APY",
    kind: "pct",
    unit: "pct",
    value,
    dataSource: value != null ? "derived" : null,
    sourceLabel: value != null ? "DeFi Llama poolsBorrow (derived)" : null,
    sourceUrl: POOLS_BORROW_URL,
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Borrow-side base APY weighted by each pool's outstanding borrows, across this protocol's pools on the poolsBorrow endpoint (spec row C0.5).",
    caveats: [
      "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).",
      "Excludes reward APY; base rates only.",
    ],
    emptyChip: value == null ? "Tier 2" : null,
    hint: null,
  };
}

function supplyApyCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.supplyApyPct ?? i.supplyYield?.weightedSupplyApyPct ?? null;
  return {
    id: "supply-apy",
    label: "Wtd avg supply APY",
    kind: "pct",
    unit: "pct",
    value,
    dataSource: value != null ? "derived" : null,
    sourceLabel: value != null ? "DeFi Llama pools (derived)" : null,
    sourceUrl: "https://yields.llama.fi/pools",
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Supply-side base APY weighted by each pool's TVL, across this protocol's pools on the free DeFi Llama pools endpoint (spec row C0.6).",
    caveats: ["Excludes reward APY; base rates only."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

function collateralCard(i: CardInputs): MetricCardModel {
  const assets =
    i.profile.creditTagMetrics?.lending?.collateralAssets ??
    i.profile.lending?.collateralAssets ??
    null;
  const shown = assets && assets.length > 0 ? assets.slice(0, 4) : null;
  const value = shown
    ? shown.join(", ") + (assets!.length > shown.length ? ` +${assets!.length - shown.length}` : "")
    : null;
  return {
    id: "collateral",
    label: "Top collateral assets",
    kind: "text",
    unit: "count",
    value,
    dataSource: null,
    sourceLabel: value != null ? "Curated" : null,
    sourceUrl: null,
    asOf: null,
    series: null,
    fullSeries: null,
    seriesNote: "List metric; no series",
    change: null,
    calculation:
      "Curated list of the assets accepted as collateral, from protocol docs and on-chain configuration (spec row C0.7).",
    caveats: ["Curated field; refreshed editorially, not by the cron."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

function badDebtCard(i: CardInputs): MetricCardModel {
  return {
    id: "bad-debt",
    label: "Bad debt",
    kind: "usd",
    unit: "usd",
    value: null,
    dataSource: null,
    sourceLabel: null,
    sourceUrl: null,
    asOf: null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Outstanding unbacked debt after liquidations, per Chaos Labs risk analytics or on-chain simulation (spec row C0.8).",
    caveats: [
      "Tier 2: needs Chaos Labs or a curated on-chain simulation; deliberately null until that source lands (deferred register item 5).",
    ],
    emptyChip: "Tier 2",
    hint: null,
  };
}

/* ------------------------- Universal rollup subset ------------------------ */

function marketCapCard(i: CardInputs): MetricCardModel {
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

function fdvCard(i: CardInputs): MetricCardModel {
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

function pTvlCard(i: CardInputs): MetricCardModel {
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

function tvlDelta30dCard(i: CardInputs): MetricCardModel {
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

function chainCountCard(i: CardInputs): MetricCardModel {
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
