import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Lido eth-api — keyless, Tier-1 (Liquid Staking, LS3).
 *
 * Base: https://eth-api.lido.fi/v1
 *
 * Endpoints used:
 *   GET /protocol/steth/apr/last  -> { data: { timeUnix, apr }, meta }
 *     The latest single stETH staking APR datapoint. `apr` is ALREADY a percent
 *     (e.g. 2.324 == 2.324%), so no *100 conversion is applied.
 *   GET /protocol/steth/apr/sma   -> { data: { aprs:[...], smaApr }, meta }
 *     A ~7-point simple moving average of the same APR. `smaApr` is the smoothed
 *     percent — steadier than the raw last value; carried as an optional field.
 *   GET /protocol/steth/stats     -> { uniqueHolders, totalStaked, marketCap, ... }
 *     `totalStaked` is total pooled ETH (== stETH total supply, 1:1 rebasing),
 *     as a decimal-ETH string. `marketCap` is USD market cap of stETH.
 *
 * We use apr/last for the headline LS3 net staking APR (freshest value) and carry
 * smaApr as a secondary smoothed reading. See docs/m2-sources/lido.md.
 *
 * Rate limit: 100 requests / window (x-ratelimit-limit: 100). Well within budget.
 */

const LIDO_BASE = "https://eth-api.lido.fi/v1";

export interface LidoLiveMetrics {
  /** LS3: latest stETH net staking APR, as a percent (already a percent). */
  netStakingAprPct: number | null;
  /** Optional: simple-moving-average stETH APR, as a percent. */
  smaAprPct: number | null;
  /** Optional: total pooled ETH (== stETH total supply, 1:1). */
  totalPooledEth: number | null;
  /** Optional: stETH USD market cap. */
  stEthMarketCapUsd: number | null;
  /** Optional: current unique stETH holder count. */
  uniqueHolders: number | null;
}

interface LidoAprLastResponse {
  data?: { timeUnix?: number | null; apr?: number | null } | null;
}

interface LidoAprSmaResponse {
  data?: { smaApr?: number | null } | null;
}

interface LidoStatsResponse {
  totalStaked?: string | number | null;
  marketCap?: string | number | null;
  uniqueHolders?: string | number | null;
}

/** Coerce a string|number|null field to a finite number or null. */
function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fetch Lido stETH staking APR (+ optional stats) from the keyless eth-api. */
export async function fetchLidoLiveMetrics(
  revalidate?: number,
): Promise<LidoLiveMetrics | null> {
  const [lastRes, smaRes, statsRes] = await Promise.all([
    fetchJson(`${LIDO_BASE}/protocol/steth/apr/last`, { revalidate }),
    fetchJson(`${LIDO_BASE}/protocol/steth/apr/sma`, { revalidate }),
    fetchJson(`${LIDO_BASE}/protocol/steth/stats`, { revalidate }),
  ]);

  const netStakingAprPct =
    lastRes.status === 200
      ? num((lastRes.data as LidoAprLastResponse | null)?.data?.apr)
      : null;
  const smaAprPct =
    smaRes.status === 200
      ? num((smaRes.data as LidoAprSmaResponse | null)?.data?.smaApr)
      : null;

  let totalPooledEth: number | null = null;
  let stEthMarketCapUsd: number | null = null;
  let uniqueHolders: number | null = null;
  if (statsRes.status === 200) {
    const stats = statsRes.data as LidoStatsResponse | null;
    totalPooledEth = num(stats?.totalStaked);
    stEthMarketCapUsd = num(stats?.marketCap);
    uniqueHolders = num(stats?.uniqueHolders);
  }

  // The APR is the headline LS3 metric — if it's unavailable the client has
  // nothing meaningful to overlay.
  if (netStakingAprPct == null && smaAprPct == null) return null;

  return {
    netStakingAprPct,
    smaAprPct,
    totalPooledEth,
    stEthMarketCapUsd,
    uniqueHolders,
  };
}

/**
 * Map Lido live metrics onto the Staking sector's `liquidStaking` tag block
 * (StakingLiquidStakingTagMetrics — LS3). Returns a plain inferred object (no
 * Phase B type imports); numeric fields are wrapped in the `Sourced` shape and
 * only spread when non-null.
 *
 * The headline `stakingAprPct` is Lido's net stETH APR (already a percent).
 * `marketCapUsd` overlays the stETH USD market cap when the stats endpoint is up.
 */
export function lidoMetricsToTagOverlay(metrics: LidoLiveMetrics) {
  const sourced = <T>(value: T, kind: "live" | "derived" = "live") => ({
    value,
    dataSource: kind,
    sourceLabel: "Lido API",
    updatedAt: nowIso(),
  });

  return {
    liquidStaking: {
      ...(metrics.netStakingAprPct != null
        ? { stakingAprPct: sourced(metrics.netStakingAprPct) }
        : {}),
      ...(metrics.stEthMarketCapUsd != null
        ? { marketCapUsd: sourced(metrics.stEthMarketCapUsd) }
        : {}),
    },
  };
}
