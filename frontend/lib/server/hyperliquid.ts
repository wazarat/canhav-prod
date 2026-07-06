import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Hyperliquid perp-DEX live client (Derivatives sector, Perp DEX tag).
 *
 * Single keyless POST to the public `info` endpoint with `{"type":"metaAndAssetCtxs"}`.
 * The response is a 2-tuple `[meta, assetCtxs]`:
 *   - meta.universe[i]        -> { name, szDecimals, maxLeverage, isDelisted? }
 *   - assetCtxs[i]            -> { openInterest, funding, markPx, oraclePx,
 *                                  dayNtlVlm, premium, midPx, ... } (all strings)
 * The two arrays are index-aligned (universe[i] <-> assetCtxs[i]).
 *
 * Aggregation (see docs/m2-sources/hyperliquid.md):
 *   marketsCount            = count of non-delisted universe entries
 *   openInterestUsd         = sum(openInterest[i] * markPx[i])  (OI is base units)
 *   volume24hUsd            = sum(dayNtlVlm[i])                 (already notional USD)
 *   fundingRatePct          = BTC current funding * 100         (hourly, as a %)
 *   fundingRateAnnualizedPct= fundingRatePct * 24 * 365         (HL funding is hourly)
 *
 * Long/short OI split is NOT exposed by the public `info` endpoint, so
 * longOpenInterestUsd / shortOpenInterestUsd stay null (Tier-2).
 */
const HYPERLIQUID_INFO = "https://api.hyperliquid.xyz/info";

/** Reference market for the representative funding rate. */
const FUNDING_REFERENCE_MARKET = "BTC";

/** Hyperliquid funding accrues hourly. Annualize hourly -> yearly. */
const FUNDING_PERIODS_PER_YEAR = 24 * 365;

export interface HyperliquidLiveMetrics {
  marketsCount: number | null;
  openInterestUsd: number | null;
  volume24hUsd: number | null;
  /** Representative (BTC) current funding rate, as a percent (e.g. 0.00125). */
  fundingRatePct: number | null;
  /** fundingRatePct annualized over hourly funding periods. */
  fundingRateAnnualizedPct: number | null;
  /** Per-side OI is not exposed by the public info endpoint (Tier-2). */
  longOpenInterestUsd: number | null;
  shortOpenInterestUsd: number | null;
}

interface HyperliquidUniverseRow {
  name?: string;
  isDelisted?: boolean;
}

interface HyperliquidAssetCtx {
  openInterest?: string | number | null;
  funding?: string | number | null;
  markPx?: string | number | null;
  dayNtlVlm?: string | number | null;
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fetch aggregate Hyperliquid perp-DEX metrics from the public info endpoint. */
export async function fetchHyperliquidLiveMetrics(
  revalidate?: number,
): Promise<HyperliquidLiveMetrics | null> {
  const { status, data } = await fetchJson(HYPERLIQUID_INFO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    revalidate,
  });

  if (status !== 200 || !Array.isArray(data) || data.length < 2) return null;

  const meta = data[0] as { universe?: HyperliquidUniverseRow[] } | undefined;
  const ctxs = data[1] as HyperliquidAssetCtx[] | undefined;
  const universe = meta?.universe;
  if (!Array.isArray(universe) || !Array.isArray(ctxs) || universe.length === 0) {
    return null;
  }

  let marketsCount = 0;
  let openInterestUsd = 0;
  let volume24hUsd = 0;
  let fundingRatePct: number | null = null;

  for (let i = 0; i < universe.length; i++) {
    const row = universe[i];
    if (row?.isDelisted) continue;
    marketsCount += 1;

    const ctx = ctxs[i];
    if (!ctx) continue;

    const oi = num(ctx.openInterest);
    const markPx = num(ctx.markPx);
    if (oi != null && markPx != null) openInterestUsd += oi * markPx;

    const vol = num(ctx.dayNtlVlm);
    if (vol != null) volume24hUsd += vol;

    if (row?.name === FUNDING_REFERENCE_MARKET) {
      const funding = num(ctx.funding);
      if (funding != null) fundingRatePct = funding * 100;
    }
  }

  const fundingRateAnnualizedPct =
    fundingRatePct != null ? fundingRatePct * FUNDING_PERIODS_PER_YEAR : null;

  return {
    marketsCount: marketsCount > 0 ? marketsCount : null,
    openInterestUsd: openInterestUsd > 0 ? openInterestUsd : null,
    volume24hUsd: volume24hUsd > 0 ? volume24hUsd : null,
    fundingRatePct,
    fundingRateAnnualizedPct,
    longOpenInterestUsd: null,
    shortOpenInterestUsd: null,
  };
}

/**
 * Map live metrics onto the Derivatives `perpDex` tag block. Live for direct API
 * reads (OI, volume, markets, funding); "derived" for the annualized funding
 * rate (computed from the hourly rate). Spread-conditional so null fields are
 * omitted, preserving curated Tier-2 values on overlay.
 *
 * `fundingRatePct` / `fundingRateAnnualizedPct` are added to
 * DerivativesPerpDexTagMetrics in Phase B.
 */
export function hyperliquidMetricsToTagOverlay(metrics: HyperliquidLiveMetrics) {
  const sourced = (
    value: number,
    dataSource: "live" | "derived" = "live",
    label = "Hyperliquid API",
  ) => ({
    value,
    dataSource,
    sourceLabel: label,
    updatedAt: nowIso(),
  });

  return {
    perpDex: {
      ...(metrics.openInterestUsd != null
        ? { openInterestUsd: sourced(metrics.openInterestUsd) }
        : {}),
      ...(metrics.volume24hUsd != null
        ? { volume24hUsd: sourced(metrics.volume24hUsd) }
        : {}),
      ...(metrics.marketsCount != null
        ? { marketsCount: sourced(metrics.marketsCount) }
        : {}),
      ...(metrics.fundingRatePct != null
        ? { fundingRatePct: sourced(metrics.fundingRatePct) }
        : {}),
      ...(metrics.fundingRateAnnualizedPct != null
        ? { fundingRateAnnualizedPct: sourced(metrics.fundingRateAnnualizedPct, "derived") }
        : {}),
    },
  };
}
