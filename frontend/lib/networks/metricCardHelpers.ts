import "server-only";

import { coinIdForSlug } from "@/lib/server/coingecko";
import { llamaFeesProtocolForSlug, llamaProtocolForSlug } from "@/lib/server/defillama";
import type { MetricCardModel } from "@/components/ui/MetricCardGrid";
import type { SeriesPoint } from "@/components/ui/charts/TimeSeriesAreaChart";
import type { Sourced } from "@/lib/types";
import type { TimeRange } from "@/lib/networks/timeRange";

/**
 * Shared series/window math and source-URL helpers for MetricCardModel
 * builders (Credit rollup + the M4 per-tag builders). Pure functions only;
 * every helper is honest-null (no zero substitution) by construction.
 */

export const RANGE_DAYS: Record<Exclude<TimeRange, "24h">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};
export const FULL_WINDOW_DAYS = 90;
export const CHART_REVALIDATE = 3600;

export const INTRADAY_NOTE = "Daily granularity; no intraday series";
export const NO_HISTORY_NOTE = "No daily history from the current sources";

/** Range-sliced copy of a daily series; 24h is honest-null (daily data). */
export function sliceSeries(series: SeriesPoint[] | null, range: TimeRange): SeriesPoint[] | null {
  if (!series || series.length < 2) return null;
  if (range === "24h") return null;
  const sliced = series.slice(-(RANGE_DAYS[range] + 1));
  return sliced.length >= 2 ? sliced : null;
}

/** Percent change over the trailing `days` observations of a daily series. */
export function seriesChangePct(series: SeriesPoint[] | null, days: number): number | null {
  if (!series || series.length < 2) return null;
  const window = series.slice(-(days + 1));
  if (window.length < 2) return null;
  const first = window[0].value;
  const last = window[window.length - 1].value;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

/** Sum of the trailing `days` values (fees/revenue windows). */
export function seriesSum(series: SeriesPoint[] | null, days: number, offset = 0): number | null {
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
export function windowOverWindowPct(series: SeriesPoint[] | null, days: number): number | null {
  const current = seriesSum(series, days);
  const prior = seriesSum(series, days, days);
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export function zipRatioSeries(
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

export function sourcedNumber(cell: Sourced<number | null> | null | undefined): number | null {
  return cell?.value ?? null;
}

export function llamaProtocolUrl(slug: string): string | null {
  const p = llamaProtocolForSlug(slug);
  return p ? `https://api.llama.fi/protocol/${p}` : null;
}

export function llamaFeesUrl(slug: string): string | null {
  const p = llamaFeesProtocolForSlug(slug);
  return p ? `https://api.llama.fi/summary/fees/${p}` : null;
}

export function coingeckoUrl(slug: string): string | null {
  const id = coinIdForSlug(slug);
  return id ? `https://www.coingecko.com/en/coins/${id}` : null;
}

export function changeLabel(range: TimeRange): string {
  return range === "24h" ? "24h" : "7d";
}

type CardOverrides = Pick<MetricCardModel, "id" | "label" | "kind" | "unit" | "calculation"> &
  Partial<MetricCardModel>;

/**
 * MetricCardModel factory with honest defaults: no series, "Pending" chip when
 * the value is null (pass emptyChip explicitly for Tier 2 rows), no change.
 * Cuts the per-card boilerplate the M4 tag builders would otherwise repeat.
 */
export function card(overrides: CardOverrides): MetricCardModel {
  const value = overrides.value ?? null;
  return {
    value: null,
    dataSource: null,
    sourceLabel: null,
    sourceUrl: null,
    asOf: null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    caveats: [],
    hint: null,
    emptyChip: value == null ? "Pending" : null,
    ...overrides,
  };
}
