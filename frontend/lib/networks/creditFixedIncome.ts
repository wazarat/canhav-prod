import "server-only";

import { cache } from "react";

import type { MetricBandModel } from "@/components/networks/credit/CreditMetricBands";
import type { BarColumnDatum } from "@/components/ui/charts/BarColumnChart";
import type { SeriesPoint } from "@/components/ui/charts/TimeSeriesAreaChart";
import {
  fetchPendleMarketHistory,
  fetchPendleMarketsDetailed,
  type PendleMarketDetail,
} from "@/lib/server/pendle";
import type { FixedIncomeMarketRow, NetworkProfile } from "@/lib/types";
import type { TimeRange } from "@/lib/networks/timeRange";
import {
  CHART_REVALIDATE,
  card,
  sliceSeries,
  sourcedNumber,
} from "@/lib/networks/metricCardHelpers";
import { buildSharedCreditBand } from "@/lib/networks/creditShared";

const PENDLE_MARKETS_URL = "https://api-v2.pendle.finance/core/v1/1/markets";

/** Everything the Fixed Income tag panel renders (JSON-safe). */
export interface FixedIncomePanelData {
  bands: MetricBandModel[];
  /** Yield-curve dataset; null when the entity has no live per-market source. */
  yieldCurve: FixedIncomeMarketRow[] | null;
  /** Implied vs underlying APY history for the flagship market. */
  spread: { implied: SeriesPoint[]; underlying: SeriesPoint[]; marketName: string } | null;
  /** Derived PT/YT price-in-underlying history for the flagship market. */
  convergence: { pt: SeriesPoint[]; yt: SeriesPoint[]; marketName: string } | null;
  /** Notional outstanding by expiry (maturity ladder). */
  maturityLadder: BarColumnDatum[] | null;
}

/** Mechanism heuristics: which cards apply (CAN-64: never force one shape). */
function isPtYtMechanism(mechanism: string | null | undefined, slug: string): boolean {
  if (slug === "pendle" || slug === "spectra" || slug === "sense") return true;
  return Boolean(mechanism && /pt|yt|principal|yield token/i.test(mechanism));
}
function isFcashMechanism(mechanism: string | null | undefined, slug: string): boolean {
  if (slug === "notional") return true;
  return Boolean(mechanism && /fcash/i.test(mechanism));
}

function weightedAvg(rows: { value: number | null; weight: number | null }[]): number | null {
  let sum = 0;
  let w = 0;
  for (const r of rows) {
    if (r.value == null || r.weight == null || r.weight <= 0) continue;
    sum += r.value * r.weight;
    w += r.weight;
  }
  return w > 0 ? sum / w : null;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM, sortable
}
function monthLabel(key: string): string {
  const d = new Date(`${key}-01T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/**
 * Fixed Income FI1-FI17 (docs/credit/metrics-spec.md section 3.4) as labelled
 * bands plus the four tag charts. Live data comes from the keyless Pendle API
 * for pendle itself; other Fixed Income entities render their cron/curated
 * KV values with honest empties. Nothing is fabricated: derived values carry
 * source "derived" with the derivation in the calculation text.
 */
export const buildFixedIncomeBands = cache(
  async (profile: NetworkProfile, range: TimeRange): Promise<FixedIncomePanelData> => {
    const slug = profile.slug;
    const fi = profile.creditTagMetrics?.fixedIncome ?? null;
    const mechanism = fi?.mechanism ?? null;
    const ptYt = isPtYtMechanism(mechanism, slug);
    const fcash = isFcashMechanism(mechanism, slug);
    const nowIso = new Date().toISOString();

    // Live per-market data: Pendle protocol only (the API is protocol-specific).
    const [shared, markets] = await Promise.all([
      buildSharedCreditBand(profile, range),
      slug === "pendle"
        ? fetchPendleMarketsDetailed(CHART_REVALIDATE).catch(() => null)
        : Promise.resolve(null),
    ]);

    const live = markets && markets.length > 0 ? markets : null;
    const flagship: PendleMarketDetail | null = live
      ? live.reduce((best, m) =>
          (m.liquidityUsd ?? 0) > (best.liquidityUsd ?? 0) ? m : best,
        )
      : null;

    // Flagship-market history for the spread + convergence charts.
    const history =
      flagship != null
        ? await fetchPendleMarketHistory(flagship.chainId, flagship.address, CHART_REVALIDATE).catch(
            () => null,
          )
        : null;

    /* ------------------------------ Aggregates ----------------------------- */

    const liquiditySum = live
      ? live.reduce((s, m) => s + (m.liquidityUsd ?? 0), 0) || null
      : null;
    const wImplied = live
      ? weightedAvg(live.map((m) => ({ value: m.impliedApyPct, weight: m.liquidityUsd })))
      : null;
    const wUnderlying = live
      ? weightedAvg(live.map((m) => ({ value: m.underlyingApyPct, weight: m.liquidityUsd })))
      : null;
    const wYt = live
      ? weightedAvg(live.map((m) => ({ value: m.ytFloatingApyPct, weight: m.liquidityUsd })))
      : null;
    const wDays = live
      ? weightedAvg(
          live.map((m) => ({
            value: (Date.parse(m.expiry) - Date.now()) / 86_400_000,
            weight: m.liquidityUsd,
          })),
        )
      : null;
    const notional = live
      ? live.reduce((s, m) => s + (m.totalPt != null && m.ptPriceUsd != null ? m.totalPt * m.ptPriceUsd : 0), 0) ||
        null
      : null;
    const volumeSum = live
      ? live.reduce((s, m) => s + (m.volume24hUsd ?? 0), 0) || null
      : null;
    const expiries = live
      ? [...new Set(live.map((m) => m.expiry.slice(0, 10)))].sort()
      : (fi?.maturities ?? null);

    // Fall back to the KV tag block (cron TVL, curated APYs) when not live.
    const fiImplied = wImplied ?? sourcedNumber(fi?.fixedApyPct);
    const fiUnderlying = wUnderlying ?? sourcedNumber(fi?.underlyingApyPct);
    const fiSpreadVal =
      fiImplied != null && fiUnderlying != null ? fiImplied - fiUnderlying : null;
    const marketsCount = live ? live.length : (fi?.markets ?? null);
    const ptInUnderlying =
      flagship?.ptDiscount != null ? 1 - flagship.ptDiscount : sourcedNumber(fi?.ptPriceInUnderlying);
    const ytInUnderlying =
      flagship?.ptDiscount != null ? flagship.ptDiscount : sourcedNumber(fi?.ytPriceInUnderlying);

    const liveSource = live
      ? { dataSource: "live" as const, sourceLabel: "Pendle API", sourceUrl: PENDLE_MARKETS_URL, asOf: nowIso }
      : {};

    /* -------------------------------- Cards -------------------------------- */

    const fiCards = [
      card({
        id: "fi-liquidity",
        label: "Market liquidity",
        kind: "usd",
        unit: "usd",
        value: liquiditySum ?? sourcedNumber(fi?.tvlUsd),
        ...(liquiditySum != null
          ? liveSource
          : fi?.tvlUsd?.value != null
            ? {
                dataSource: fi.tvlUsd.dataSource,
                sourceLabel: fi.tvlUsd.sourceLabel ?? null,
                asOf: fi.tvlUsd.updatedAt ?? null,
              }
            : {}),
        calculation:
          "Sum of USD pool liquidity across the protocol's active fixed-income markets (spec row FI1). Falls back to the protocol TVL overlay when per-market data is unavailable.",
      }),
      card({
        id: "fi-markets",
        label: "Active markets",
        kind: "count",
        unit: "count",
        value: marketsCount,
        ...(live ? liveSource : {}),
        seriesNote: "Count metric; no series",
        calculation: "Count of currently active fixed-income markets (spec row FI2).",
      }),
      card({
        id: "fi-implied-apy",
        label: "Implied fixed APY",
        kind: "pct",
        unit: "pct",
        value: fiImplied,
        ...(wImplied != null
          ? { ...liveSource, dataSource: "derived" as const, sourceLabel: "Pendle API (derived)" }
          : {}),
        calculation:
          "Liquidity-weighted implied fixed APY across active markets: the rate locked by buying PT and holding to maturity (spec row FI3).",
      }),
      card({
        id: "fi-underlying-apy",
        label: "Underlying APY",
        kind: "pct",
        unit: "pct",
        value: fiUnderlying,
        ...(wUnderlying != null
          ? { ...liveSource, dataSource: "derived" as const, sourceLabel: "Pendle API (derived)" }
          : {}),
        calculation:
          "Liquidity-weighted variable APY of the underlying yield sources (spec row FI4).",
      }),
      card({
        id: "fi-spread",
        label: "Implied - underlying spread",
        kind: "pct",
        unit: "pct",
        value: fiSpreadVal,
        ...(fiSpreadVal != null ? { dataSource: "derived" as const, sourceLabel: "Derived", asOf: nowIso } : {}),
        calculation:
          "Implied fixed APY minus underlying APY (spec row FI5). Positive means the market prices future yield above the current variable rate; the core carry-trade signal.",
      }),
      card({
        id: "fi-volume",
        label: "Volume (24h)",
        kind: "usd",
        unit: "usd",
        value: volumeSum ?? sourcedNumber(fi?.volume24hUsd),
        ...(volumeSum != null ? liveSource : {}),
        calculation:
          "Sum of 24h trading volume across the protocol's fixed-income markets (spec row FI13).",
      }),
      ...(ptYt
        ? [
            card({
              id: "fi-yt-apy",
              label: "YT long-yield APY",
              kind: "pct",
              unit: "pct",
              value: wYt ?? sourcedNumber(fi?.ytApyPct),
              ...(wYt != null
                ? { ...liveSource, dataSource: "derived" as const, sourceLabel: "Pendle API (derived)" }
                : {}),
              calculation:
                "Liquidity-weighted floating APY of holding YT, the leveraged long-yield side of the split (spec row FI6).",
            }),
            card({
              id: "fi-pt-price",
              label: "PT price (underlying)",
              kind: "ratio",
              unit: "ratio",
              value: ptInUnderlying,
              ...(flagship?.ptDiscount != null
                ? { ...liveSource, dataSource: "derived" as const, sourceLabel: "Pendle API (derived)" }
                : {}),
              hint: flagship ? flagship.name : null,
              calculation:
                "Principal-token price in units of the underlying for the deepest market: 1 minus the PT discount; converges to 1 at maturity (spec row FI7).",
            }),
            card({
              id: "fi-yt-price",
              label: "YT price (underlying)",
              kind: "ratio",
              unit: "ratio",
              value: ytInUnderlying,
              ...(flagship?.ptDiscount != null
                ? { ...liveSource, dataSource: "derived" as const, sourceLabel: "Pendle API (derived)" }
                : {}),
              hint: flagship ? flagship.name : null,
              calculation:
                "Yield-token price in units of the underlying for the deepest market. PT + YT equals one underlying by construction, so YT equals the PT discount; decays to 0 at maturity (spec row FI8).",
            }),
          ]
        : []),
      card({
        id: "fi-maturities",
        label: "Maturities",
        kind: "text",
        unit: "count",
        value:
          expiries && expiries.length > 0
            ? live
              ? `${expiries.length} expiries, ${expiries[0].slice(0, 10)} to ${expiries[expiries.length - 1].slice(0, 10)}`
              : expiries.join(", ")
            : null,
        ...(live ? liveSource : {}),
        seriesNote: "List metric; no series",
        calculation: "Distinct market expiry dates currently tradable (spec row FI9).",
      }),
      card({
        id: "fi-days-to-maturity",
        label: "Avg days to maturity",
        kind: "count",
        unit: "count",
        value: wDays != null ? Math.round(wDays) : null,
        ...(wDays != null
          ? { ...liveSource, dataSource: "derived" as const, sourceLabel: "Pendle API (derived)" }
          : {}),
        calculation:
          "Liquidity-weighted average days until market expiry (spec row FI10, derived).",
      }),
      card({
        id: "fi-notional",
        label: "Notional outstanding",
        kind: "usd",
        unit: "usd",
        value: notional ?? sourcedNumber(fi?.notionalOutstandingUsd),
        ...(notional != null
          ? { ...liveSource, dataSource: "derived" as const, sourceLabel: "Pendle API (derived)" }
          : {}),
        calculation:
          "Sum across markets of PT outstanding times PT price (spec row FI11, derived): the USD principal committed to fixed rates.",
      }),
      card({
        id: "fi-pool-liquidity",
        label: "Deepest market liquidity",
        kind: "usd",
        unit: "usd",
        value: flagship?.liquidityUsd ?? sourcedNumber(fi?.poolLiquidityUsd),
        ...(flagship?.liquidityUsd != null ? liveSource : {}),
        hint: flagship ? flagship.name : null,
        calculation: "USD liquidity of the deepest single market (spec row FI12).",
      }),
      card({
        id: "fi-mechanism",
        label: "Mechanism",
        kind: "text",
        unit: "count",
        value: mechanism,
        sourceLabel: mechanism ? "Curated" : null,
        seriesNote: "Curated field; no series",
        calculation:
          "How the protocol splits or fixes yield: PT/YT split (Pendle-style), fCash zero-coupon (Notional), or protocol-specific (spec row FI14).",
        caveats: ["Curated field; refreshed editorially, not by the cron."],
      }),
      card({
        id: "fi-yield-source",
        label: "Underlying yield source",
        kind: "text",
        unit: "count",
        value:
          fi?.underlyingYieldSource ??
          (live
            ? [...new Set(live.map((m) => m.underlyingSymbol).filter(Boolean))].slice(0, 4).join(", ")
            : null),
        sourceLabel: fi?.underlyingYieldSource ? "Curated" : live ? "Pendle API" : null,
        ...(live && !fi?.underlyingYieldSource ? { dataSource: "live" as const, asOf: nowIso } : {}),
        seriesNote: "List metric; no series",
        calculation:
          "Where the underlying variable yield comes from (spec row FI15): curated per entity, or the top underlying assets of the live markets.",
      }),
      ...(fcash
        ? [
            card({
              id: "fi-fcash-rate",
              label: "fCash implied rate",
              kind: "pct",
              unit: "pct",
              value: sourcedNumber(fi?.fcashImpliedRatePct),
              emptyChip: sourcedNumber(fi?.fcashImpliedRatePct) == null ? "Tier 2" : null,
              calculation:
                "Annualized rate implied by fCash exchange rates on Notional V3 (spec row FI17).",
              caveats: [
                "Tier 2: the Notional V3 subgraph now requires a Graph gateway API key; wired nullable until a key or curated value lands.",
              ],
            }),
          ]
        : []),
    ];

    const bands: MetricBandModel[] = [
      {
        id: "shared",
        title: "Shared across Credit",
        subtitle: "Cross-tag rows every Credit entity reports.",
        cards: shared,
        primaryCount: 4,
      },
      {
        id: "fixed-income",
        title: "Specific to Fixed Income",
        subtitle: mechanism ? `Mechanism: ${mechanism}` : undefined,
        cards: fiCards,
        primaryCount: 6,
      },
    ];

    /* ------------------------------- Charts -------------------------------- */

    const yieldCurve: FixedIncomeMarketRow[] | null = live
      ? live.map((m) => ({
          name: m.name,
          address: m.address,
          chainId: m.chainId,
          expiry: m.expiry,
          impliedApyPct: m.impliedApyPct,
          underlyingApyPct: m.underlyingApyPct,
          liquidityUsd: m.liquidityUsd,
          ptPriceInUnderlying: m.ptDiscount != null ? 1 - m.ptDiscount : null,
          ytPriceInUnderlying: m.ptDiscount != null ? m.ptDiscount : null,
        }))
      : null;

    let spread: FixedIncomePanelData["spread"] = null;
    let convergence: FixedIncomePanelData["convergence"] = null;
    if (history && flagship) {
      const implied: SeriesPoint[] = [];
      const underlying: SeriesPoint[] = [];
      const pt: SeriesPoint[] = [];
      const yt: SeriesPoint[] = [];
      const expiryMs = Date.parse(flagship.expiry);
      for (const h of history) {
        if (h.impliedApyPct != null) implied.push({ date: h.date, value: h.impliedApyPct });
        if (h.underlyingApyPct != null) underlying.push({ date: h.date, value: h.underlyingApyPct });
        if (h.impliedApyPct != null && Number.isFinite(expiryMs)) {
          const days = (expiryMs - Date.parse(h.date)) / 86_400_000;
          if (days > 0) {
            const ptVal = 1 / Math.pow(1 + h.impliedApyPct / 100, days / 365);
            pt.push({ date: h.date, value: ptVal });
            yt.push({ date: h.date, value: 1 - ptVal });
          }
        }
      }
      if (implied.length >= 2 && underlying.length >= 2) {
        spread = {
          implied: sliceSeries(implied, range) ?? implied,
          underlying: sliceSeries(underlying, range) ?? underlying,
          marketName: flagship.name,
        };
      }
      if (pt.length >= 2) {
        convergence = {
          pt: sliceSeries(pt, range) ?? pt,
          yt: sliceSeries(yt, range) ?? yt,
          marketName: flagship.name,
        };
      }
    }

    let maturityLadder: BarColumnDatum[] | null = null;
    if (live) {
      const byExpiry = new Map<string, number>();
      for (const m of live) {
        const notionalUsd =
          m.totalPt != null && m.ptPriceUsd != null ? m.totalPt * m.ptPriceUsd : null;
        if (notionalUsd == null || notionalUsd <= 0) continue;
        const key = monthKey(m.expiry);
        byExpiry.set(key, (byExpiry.get(key) ?? 0) + notionalUsd);
      }
      const entries = [...byExpiry.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (entries.length > 0) {
        maturityLadder = entries.map(([key, value]) => ({ label: monthLabel(key), value }));
      }
    }

    return { bands, yieldCurve, spread, convergence, maturityLadder };
  },
);
