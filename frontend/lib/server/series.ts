import "server-only";

import { fetchTotalValueLocked } from "@/lib/server/alchemy";
import { coinIdForSlug, fetchMarketChart } from "@/lib/server/coingecko";
import { fetchPegHistory, fetchTvlHistory } from "@/lib/server/dune";
import { resolveEntityToken } from "@/lib/server/resolve";
import type {
  PegDataPoint,
  RwaProfile,
  StablecoinProfile,
  TvlDataPoint,
} from "@/lib/types";

/**
 * Resolve the historical series powering the detail-page charts, live on render.
 *
 * Source precedence (best first):
 *   1. Stored history on the profile (authoritative, written by the Dune-backed
 *      refresh) — `source: "dune"`.
 *   2. A live, cached CoinGecko market_chart fallback — `source: "coingecko"`.
 *
 * Phase 3 inserts a live Dune fetch between (1) and (2). Returns `source: null`
 * with no points when nothing resolves, so the chart shows its empty state.
 */

const LIVE_REVALIDATE = 300;
const DAYS = 30;

export type SeriesSource = "dune" | "coingecko" | null;

export interface PegSeries {
  points: PegDataPoint[];
  source: SeriesSource;
}

export interface TvlSeries {
  points: TvlDataPoint[];
  source: SeriesSource;
}

export async function resolvePegSeries(profile: StablecoinProfile): Promise<PegSeries> {
  const stored = profile.historicalPegData?.points ?? [];
  if (stored.length >= 2) return { points: stored, source: "dune" };

  // Live Dune (authoritative) when a saved query id is mapped for this slug.
  const dune = await fetchPegHistory(profile.slug, DAYS);
  if (dune.length >= 2) return { points: dune, source: "dune" };

  const coinId = coinIdForSlug(profile.slug);
  if (coinId) {
    const vsCurrency = profile.pegTarget === "EUR" ? "eur" : "usd";
    const chart = await fetchMarketChart(coinId, DAYS, { vsCurrency, revalidate: LIVE_REVALIDATE });
    if (chart && chart.prices.length >= 2) {
      return { points: chart.prices, source: "coingecko" };
    }
  }
  return { points: stored, source: null };
}

export async function resolveTvlSeries(profile: RwaProfile): Promise<TvlSeries> {
  const stored = profile.historicalTvlData?.points ?? [];
  if (stored.length >= 2) return { points: stored, source: "dune" };

  // Live Dune (authoritative) when a saved query id is mapped for this slug.
  const dune = await fetchTvlHistory(profile.slug, DAYS);
  if (dune.length >= 2) return { points: dune, source: "dune" };

  const coinId = coinIdForSlug(profile.slug);
  if (coinId) {
    const chart = await fetchMarketChart(coinId, DAYS, { revalidate: LIVE_REVALIDATE });
    // Market cap (supply * price) is our on-the-record TVL proxy for tokenized RWAs.
    if (chart && chart.marketCaps.length >= 2) {
      return { points: chart.marketCaps, source: "coingecko" };
    }
  }
  return { points: stored, source: null };
}

/* -------------------------------------------------------------------------- */
/* Derived helpers over a resolved series (independent of stored data)        */
/* -------------------------------------------------------------------------- */

export function latestPrice(points: PegDataPoint[]): number | null {
  return points.length ? points[points.length - 1].price : null;
}

export function pegDeviationBps(points: PegDataPoint[]): number | null {
  const latest = latestPrice(points);
  if (latest === null) return null;
  return Math.round(Math.abs(latest - 1) * 10_000);
}

export type PegHealth = "tight" | "watch" | "loose";

export function pegHealth(points: PegDataPoint[]): PegHealth {
  const bps = pegDeviationBps(points);
  if (bps === null) return "watch";
  if (bps <= 30) return "tight";
  if (bps <= 75) return "watch";
  return "loose";
}

export function latestValue(points: TvlDataPoint[]): number | null {
  return points.length ? points[points.length - 1].value : null;
}

/**
 * Current RWA TVL for the headline stat. Prefers the live on-chain proxy
 * (Alchemy: supply x price) since most RWA tokens have no CoinGecko market cap;
 * falls back to the latest point of the resolved series. Returns null when
 * neither is available.
 */
export async function resolveCurrentTvl(profile: RwaProfile): Promise<number | null> {
  const token = await resolveEntityToken(profile);
  if (token.address && token.priceUsd !== null) {
    const result = await fetchTotalValueLocked(
      [{ address: token.address, decimals: token.decimals, priceUsd: token.priceUsd }],
      LIVE_REVALIDATE,
    );
    if (result.value !== null) return result.value;
  }
  const { points } = await resolveTvlSeries(profile);
  return latestValue(points);
}

export function changePct(points: { value: number }[]): number | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

export type TvlTrend = "growing" | "stable" | "declining";

export function tvlTrend(points: TvlDataPoint[]): TvlTrend {
  const pct = changePct(points);
  if (pct === null) return "stable";
  if (pct >= 3) return "growing";
  if (pct <= -3) return "declining";
  return "stable";
}
