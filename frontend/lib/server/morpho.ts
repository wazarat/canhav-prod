import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

const MORPHO_GRAPHQL = "https://api.morpho.org/graphql";

export interface MorphoLiveMetrics {
  tvlUsd: number | null;
  vaultCount: number | null;
  curatorCount: number | null;
  supplyApyPct: number | null;
  topCurators: { name: string; aumUsd: number }[];
}

interface MorphoVaultRow {
  name?: string;
  curator?: { name?: string };
  state?: {
    apy?: number | null;
    netApy?: number | null;
    totalAssetsUsd?: number | null;
  };
}

const VAULTS_QUERY = `
  query MorphoVaults($chainIds: [Int!]!) {
    vaults(first: 1000, where: { chainId_in: $chainIds }) {
      items {
        name
        curator { name }
        state {
          apy
          netApy
          totalAssetsUsd
        }
      }
    }
  }
`;

/** Aggregate Morpho Blue / MetaMorpho vault metrics via the public GraphQL API. */
export async function fetchMorphoLiveMetrics(
  revalidate?: number,
): Promise<MorphoLiveMetrics | null> {
  const { status, data } = await fetchJson(MORPHO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: VAULTS_QUERY,
      variables: { chainIds: [1, 8453] },
    }),
    revalidate,
  });

  if (status !== 200 || !data?.data?.vaults?.items) return null;

  const items = data.data.vaults.items as MorphoVaultRow[];
  if (!items.length) return null;

  let tvlUsd = 0;
  let supplyWeighted = 0;
  let supplyWeight = 0;
  const curatorAum = new Map<string, number>();

  for (const v of items) {
    const assets = v.state?.totalAssetsUsd ?? 0;
    if (assets <= 0) continue;
    tvlUsd += assets;
    const apy = v.state?.netApy ?? v.state?.apy;
    if (apy != null && Number.isFinite(apy)) {
      supplyWeighted += apy * assets;
      supplyWeight += assets;
    }
    const curator = v.curator?.name?.trim() || v.name?.trim() || "Unknown";
    curatorAum.set(curator, (curatorAum.get(curator) ?? 0) + assets);
  }

  const topCurators = [...curatorAum.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, aumUsd]) => ({ name, aumUsd }));

  return {
    tvlUsd: tvlUsd > 0 ? tvlUsd : null,
    vaultCount: items.length,
    curatorCount: curatorAum.size,
    supplyApyPct: supplyWeight > 0 ? supplyWeighted / supplyWeight : null,
    topCurators,
  };
}

export function morphoMetricsToLendingOverlay(metrics: MorphoLiveMetrics) {
  const sourced = (value: number | null, label = "Morpho API") => ({
    value,
    dataSource: "live" as const,
    sourceLabel: label,
    updatedAt: nowIso(),
  });

  return {
    ...(metrics.tvlUsd != null ? { tvlUsd: sourced(metrics.tvlUsd) } : {}),
    ...(metrics.supplyApyPct != null ? { supplyApyPct: sourced(metrics.supplyApyPct) } : {}),
  };
}

export function morphoMetricsToTagOverlay(metrics: MorphoLiveMetrics) {
  const sourced = (value: number | null, label = "Morpho API") => ({
    value,
    dataSource: "live" as const,
    sourceLabel: label,
    updatedAt: nowIso(),
  });

  // Credit-sector re-key (Option A): Morpho carries the "Lending" tag, so live
  // vault aggregates overlay the CreditTagMetrics.lending (LendingMarketMetrics)
  // block. vaultCount is used as the isolated-market proxy.
  return {
    lending: {
      ...(metrics.tvlUsd != null ? { totalSuppliedUsd: sourced(metrics.tvlUsd) } : {}),
      ...(metrics.supplyApyPct != null ? { supplyApyPct: sourced(metrics.supplyApyPct) } : {}),
      ...(metrics.vaultCount != null ? { isolatedMarketCount: metrics.vaultCount } : {}),
    },
  };
}
