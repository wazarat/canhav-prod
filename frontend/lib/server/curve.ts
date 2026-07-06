import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Curve DAO — gauge emissions (Other sector / Governance tag, spec G7).
 *
 * Base host: `https://api.curve.fi/api` 301-redirects to the canonical
 * `https://api.curve.finance/api`; we call the canonical host directly to skip
 * the redirect hop. Keyless, public.
 *
 * Endpoint: `GET /getAllGauges` returns `{ success, data, generatedTimeMs }`
 * where `data` is an object keyed by gauge shortName. Each gauge carries
 * `gauge_controller.inflation_rate` and `gauge_data.inflation_rate` (both the
 * global CRV mint rate in **wei-CRV per second**, 1e18 scale — a string), a
 * normalized `gauge_controller.gauge_relative_weight` (1e18-scaled fraction, a
 * string), and flags `is_killed`, `side_chain`, `blockchainId`.
 */
const CURVE_API = "https://api.curve.finance/api";

const SECONDS_PER_WEEK = 604_800;
const SECONDS_PER_YEAR = 31_536_000; // 365 d
const WAD = 1e18; // 18-decimal fixed-point scale used by all Curve on-chain rates

export interface CurveLiveMetrics {
  /** Global CRV mint rate, CRV per second (canonical current epoch value). */
  crvInflationPerSec: number | null;
  /** Derived: crvInflationPerSec × 604 800 — CRV minted per week network-wide. */
  crvEmissionsWeekly: number | null;
  /** Derived: crvInflationPerSec × 31 536 000 — CRV minted per year (365 d). */
  crvEmissionsAnnual: number | null;
  /** Count of live gauges (not killed) with a nonzero inflation rate. */
  activeGaugeCount: number | null;
  /** Σ of normalized gauge_relative_weight across live gauges (≈1.0 = 100%). */
  totalGaugeRelativeWeight: number | null;
}

interface CurveGaugeRow {
  is_killed?: boolean;
  side_chain?: boolean;
  blockchainId?: string;
  gauge_data?: {
    inflation_rate?: string | number | null;
  };
  gauge_controller?: {
    inflation_rate?: string | number | null;
    gauge_relative_weight?: string | number | null;
  };
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch Curve DAO gauge-emission metrics from the public REST API.
 *
 * The per-gauge `inflation_rate` is the DAO-wide CRV mint rate, but individual
 * gauge snapshots are captured at slightly different block times, so stale
 * gauges report an older (higher) rate from a previous epoch — Curve emissions
 * decay ~16 %/yr. We therefore take the **mode** (most common) nonzero rate
 * across live gauges as the canonical current CRV/s, then derive weekly/annual
 * emissions from it.
 */
export async function fetchCurveLiveMetrics(
  revalidate?: number,
): Promise<CurveLiveMetrics | null> {
  const url = `${CURVE_API}/getAllGauges`;
  const { status, data } = await fetchJson(url, { revalidate });
  if (status !== 200 || !data?.success || !data?.data || typeof data.data !== "object") {
    return null;
  }

  const gauges = Object.values(data.data) as CurveGaugeRow[];
  if (!gauges.length) return null;

  const inflCounts = new Map<number, number>();
  let activeGaugeCount = 0;
  let weightSum = 0;
  let anyWeight = false;

  for (const g of gauges) {
    if (g.is_killed) continue;

    const infl =
      num(g.gauge_controller?.inflation_rate) ?? num(g.gauge_data?.inflation_rate);
    if (infl != null && infl > 0) {
      activeGaugeCount += 1;
      inflCounts.set(infl, (inflCounts.get(infl) ?? 0) + 1);
    }

    const rw = num(g.gauge_controller?.gauge_relative_weight);
    if (rw != null && rw > 0) {
      weightSum += rw / WAD;
      anyWeight = true;
    }
  }

  // Mode of the nonzero inflation rates = canonical current CRV mint rate.
  let modeRaw: number | null = null;
  let modeCount = -1;
  for (const [raw, count] of inflCounts) {
    if (count > modeCount) {
      modeCount = count;
      modeRaw = raw;
    }
  }

  const crvInflationPerSec = modeRaw != null ? modeRaw / WAD : null;
  const crvEmissionsWeekly =
    crvInflationPerSec != null ? crvInflationPerSec * SECONDS_PER_WEEK : null;
  const crvEmissionsAnnual =
    crvInflationPerSec != null ? crvInflationPerSec * SECONDS_PER_YEAR : null;

  return {
    crvInflationPerSec,
    crvEmissionsWeekly,
    crvEmissionsAnnual,
    activeGaugeCount: activeGaugeCount > 0 ? activeGaugeCount : null,
    totalGaugeRelativeWeight: anyWeight ? weightSum : null,
  };
}

/**
 * Map Curve live gauge-emission metrics onto the Other-sector "Governance" tag
 * block (spec G7). Returns a plain inferred object; each present field is a
 * `Sourced<T>` (value + dataSource + sourceLabel + ISO updatedAt). Fields the
 * client returned null for are omitted (spread-conditional) so the consumer
 * falls back to Tier-2 editorial values.
 */
export function curveMetricsToTagOverlay(metrics: CurveLiveMetrics) {
  const sourced = (value: number, dataSource: "live" | "derived" = "live") => ({
    value,
    dataSource,
    sourceLabel: "Curve API",
    updatedAt: nowIso(),
  });

  return {
    governance: {
      ...(metrics.crvInflationPerSec != null
        ? { crvInflationPerSec: sourced(metrics.crvInflationPerSec) }
        : {}),
      ...(metrics.crvEmissionsWeekly != null
        ? { crvEmissionsWeekly: sourced(metrics.crvEmissionsWeekly, "derived") }
        : {}),
      ...(metrics.crvEmissionsAnnual != null
        ? { crvEmissionsAnnual: sourced(metrics.crvEmissionsAnnual, "derived") }
        : {}),
      ...(metrics.activeGaugeCount != null
        ? { activeGaugeCount: sourced(metrics.activeGaugeCount) }
        : {}),
      ...(metrics.totalGaugeRelativeWeight != null
        ? { totalGaugeRelativeWeight: sourced(metrics.totalGaugeRelativeWeight) }
        : {}),
    },
  };
}
