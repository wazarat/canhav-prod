import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/** Primary Kamino Lend market on Solana mainnet. */
const KAMINO_MAIN_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";

const KAMINO_API = "https://api.kamino.finance";

export interface KaminoLiveMetrics {
  tvlUsd: number | null;
  totalBorrowUsd: number | null;
  utilizationPct: number | null;
  supplyApyPct: number | null;
  borrowApyPct: number | null;
}

interface KaminoReserveRow {
  totalSupplyUsd?: string | number | null;
  totalBorrowUsd?: string | number | null;
  supplyApy?: string | number | null;
  borrowApy?: string | number | null;
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fetch Kamino Lend reserve metrics from the public REST API. */
export async function fetchKaminoLiveMetrics(
  revalidate?: number,
): Promise<KaminoLiveMetrics | null> {
  const url = `${KAMINO_API}/kamino-market/${KAMINO_MAIN_MARKET}/reserves/metrics`;
  const { status, data } = await fetchJson(url, { revalidate });
  if (status !== 200 || !Array.isArray(data) || data.length === 0) return null;

  const reserves = data as KaminoReserveRow[];
  let supply = 0;
  let borrow = 0;
  let supplyApyWeighted = 0;
  let borrowApyWeighted = 0;
  let supplyWeight = 0;
  let borrowWeight = 0;

  for (const r of reserves) {
    const dep = num(r.totalSupplyUsd) ?? 0;
    const bor = num(r.totalBorrowUsd) ?? 0;
    supply += dep;
    borrow += bor;
    const supplyApy = num(r.supplyApy);
    const borrowApy = num(r.borrowApy);
    if (dep > 0 && supplyApy != null) {
      supplyApyWeighted += supplyApy * 100 * dep;
      supplyWeight += dep;
    }
    if (bor > 0 && borrowApy != null) {
      borrowApyWeighted += borrowApy * 100 * bor;
      borrowWeight += bor;
    }
  }

  const tvlUsd = supply > 0 ? supply : null;
  const totalBorrowUsd = borrow > 0 ? borrow : null;
  const utilizationPct =
    tvlUsd != null && totalBorrowUsd != null && tvlUsd > 0
      ? (totalBorrowUsd / tvlUsd) * 100
      : null;

  return {
    tvlUsd,
    totalBorrowUsd,
    utilizationPct,
    supplyApyPct: supplyWeight > 0 ? supplyApyWeighted / supplyWeight : null,
    borrowApyPct: borrowWeight > 0 ? borrowApyWeighted / borrowWeight : null,
  };
}

export function kaminoMetricsToLendingOverlay(metrics: KaminoLiveMetrics) {
  const sourced = (value: number | null) => ({
    value,
    dataSource: "live" as const,
    sourceLabel: "Kamino API",
    updatedAt: nowIso(),
  });

  const nim =
    metrics.supplyApyPct != null && metrics.borrowApyPct != null
      ? metrics.borrowApyPct - metrics.supplyApyPct
      : null;

  return {
    ...(metrics.tvlUsd != null ? { tvlUsd: sourced(metrics.tvlUsd) } : {}),
    ...(metrics.totalBorrowUsd != null ? { totalBorrowsUsd: sourced(metrics.totalBorrowUsd) } : {}),
    ...(metrics.utilizationPct != null ? { utilizationPct: sourced(metrics.utilizationPct) } : {}),
    ...(metrics.supplyApyPct != null ? { supplyApyPct: sourced(metrics.supplyApyPct) } : {}),
    ...(metrics.borrowApyPct != null ? { borrowApyPct: sourced(metrics.borrowApyPct) } : {}),
    ...(nim != null ? { netInterestMarginPct: sourced(nim) } : {}),
  };
}
