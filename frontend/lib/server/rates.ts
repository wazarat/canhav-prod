import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Macro benchmark rate helpers — keyless, Tier-1.
 *
 * Aggregates TWO independent keyless upstreams into a single GLOBAL macro
 * snapshot (not per-network). Both halves fail soft and are optional; the
 * aggregate is non-null as long as at least one upstream succeeds.
 *
 * 1. NY Fed SOFR (Secured Overnight Financing Rate)
 *    GET https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json
 *    -> { refRates: [{ effectiveDate, type: "SOFR", percentRate, ... }] }
 *    `percentRate` is already in PERCENT (e.g. 3.66 == 3.66%). Published on
 *    U.S. business days only, so `effectiveDate` can be 1-3 days stale over
 *    weekends / holidays. Feeds the RWA yield-bearing benchmark spread (YB7).
 *
 * 2. ETH base / staking rate — Tier-2 (null).
 *    ultrasound.money exposes keyless JSON (e.g. /api/v2/fees/base-fee-per-gas,
 *    /api/v2/fees/effective-balance-sum, /api/v2/fees/supply-projection-inputs)
 *    but NONE of them return a ready-to-use ETH staking APR / base issuance
 *    rate as a single percentage — they surface raw beacon-chain inputs
 *    (effective-balance sum, validator counts, gas base fee) that would require
 *    reconstructing the consensus issuance + MEV/tips formula to turn into an
 *    APR. Rather than ship a hand-rolled derivation, `ethBaseRatePct` is left
 *    null (Tier-2). The SOFR half is unaffected. See docs/m2-sources/rates.md.
 */

const NYFED_SOFR_URL =
  "https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json";

export interface RatesLiveMetrics {
  /** SOFR overnight rate, in PERCENT (e.g. 3.66). Feeds RWA YB7 benchmark. */
  sofrPct: number | null;
  /** SOFR effective (publication) date, ISO date string "YYYY-MM-DD". */
  sofrEffectiveDate: string | null;
  /** ETH base / staking rate, in PERCENT. Tier-2 (no clean keyless source). */
  ethBaseRatePct: number | null;
}

interface NyFedRefRate {
  effectiveDate?: string | null;
  type?: string | null;
  percentRate?: number | string | null;
}

interface NyFedSofrResponse {
  refRates?: NyFedRefRate[];
}

/** Coerce a string|number|null field to a finite number or null. */
function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fetch the latest published SOFR rate + its effective date. */
async function fetchSofr(
  revalidate?: number,
): Promise<{ sofrPct: number | null; sofrEffectiveDate: string | null } | null> {
  const { status, data } = await fetchJson(NYFED_SOFR_URL, { revalidate });
  if (status !== 200) return null;

  const rates = (data as NyFedSofrResponse | null)?.refRates;
  if (!Array.isArray(rates) || rates.length === 0) return null;

  // Prefer the SOFR row explicitly; fall back to the first row.
  const row = rates.find((r) => r?.type === "SOFR") ?? rates[0];
  const sofrPct = num(row?.percentRate);
  const sofrEffectiveDate =
    typeof row?.effectiveDate === "string" && row.effectiveDate
      ? row.effectiveDate
      : null;

  if (sofrPct == null && sofrEffectiveDate == null) return null;
  return { sofrPct, sofrEffectiveDate };
}

/**
 * ETH base / staking rate — Tier-2 stub. No keyless upstream returns a clean
 * pre-computed ETH staking APR, so this always resolves to null. Kept as a
 * separate async fn so a future Tier-1 source can be dropped in without
 * touching the aggregator contract.
 */
async function fetchEthBaseRate(
  _revalidate?: number,
): Promise<number | null> {
  return null;
}

/**
 * Aggregate the two keyless macro upstreams into a single snapshot. Tolerates
 * either half failing: returns a partial (non-null) result as long as at least
 * one upstream produced a value; returns null only if BOTH failed.
 */
export async function fetchRatesLiveMetrics(
  revalidate?: number,
): Promise<RatesLiveMetrics | null> {
  const [sofr, ethBaseRatePct] = await Promise.all([
    fetchSofr(revalidate),
    fetchEthBaseRate(revalidate),
  ]);

  const sofrPct = sofr?.sofrPct ?? null;
  const sofrEffectiveDate = sofr?.sofrEffectiveDate ?? null;

  // Non-null only if at least one upstream produced a usable value.
  if (sofrPct == null && sofrEffectiveDate == null && ethBaseRatePct == null) {
    return null;
  }

  return {
    sofrPct,
    sofrEffectiveDate,
    ethBaseRatePct,
  };
}

/**
 * Map macro rate metrics onto a Sourced overlay. Returns a plain inferred
 * object (no Phase B type imports). The source label is PER-SOURCE: SOFR
 * fields are labelled "NY Fed", the ETH base rate "ultrasound.money". Fields
 * are spread-conditionally so nulls are omitted.
 */
export function ratesMetricsToTagOverlay(metrics: RatesLiveMetrics) {
  const sourced = <T>(value: T, label: string) => ({
    value,
    dataSource: "live" as const,
    sourceLabel: label,
    updatedAt: nowIso(),
  });

  return {
    ...(metrics.sofrPct != null
      ? { sofrPct: sourced(metrics.sofrPct, "NY Fed") }
      : {}),
    ...(metrics.sofrEffectiveDate != null
      ? { sofrEffectiveDate: sourced(metrics.sofrEffectiveDate, "NY Fed") }
      : {}),
    ...(metrics.ethBaseRatePct != null
      ? { ethBaseRatePct: sourced(metrics.ethBaseRatePct, "ultrasound.money") }
      : {}),
  };
}
