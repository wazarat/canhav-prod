import "server-only";

import { CANONICAL_LENDING_SLUGS, CREDIT_SEED } from "@/data/credit-seed";
import { CANONICAL_PERP_DEX_SLUGS, DERIVATIVES_SEED } from "@/data/derivatives-seed";
import { LIQUIDITY_SEED } from "@/data/liquidity-seed";
import { OTHER_SEED } from "@/data/other-seed";
import { STAKING_SEED } from "@/data/staking-seed";
import {
  aggregateLendingBorrow,
  fetchAllProtocols,
  fetchLlamaBorrowPools,
  fetchLlamaOpenInterestOverview,
  fetchLlamaOverview,
  llamaProtocolForSlug,
  type LlamaProtocolRow,
} from "@/lib/server/defillama";
import { nowIso } from "@/lib/server/http";
import type { NetworkSector, SectorAggregate, SectorTopProtocol, Sourced } from "@/lib/types";

function sourced<T>(value: T, sourceLabel: string): Sourced<T> {
  return { value, dataSource: "live", sourceLabel, updatedAt: nowIso() };
}

function uniqueSlugs(...lists: string[][]): string[] {
  return [...new Set(lists.flat())];
}

function sectorSlugSets(items: Record<string, unknown>[]): Record<NetworkSector, string[]> {
  const rwaSlugs = items
    .filter((it) => String(it.Sector ?? "") === "RWA")
    .map((it) => String(it.Slug ?? ""))
    .filter(Boolean);

  return {
    Credit: uniqueSlugs(
      CREDIT_SEED.map((s) => s.slug),
      [...CANONICAL_LENDING_SLUGS],
    ),
    Derivatives: uniqueSlugs(
      DERIVATIVES_SEED.map((s) => s.slug),
      [...CANONICAL_PERP_DEX_SLUGS],
    ),
    Liquidity: LIQUIDITY_SEED.map((s) => s.slug),
    Staking: STAKING_SEED.map((s) => s.slug),
    RWA: rwaSlugs,
    Other: OTHER_SEED.map((s) => s.slug),
    // Legacy sectors — empty seed sets; aggregates skipped if no slugs.
    Stablecoin: [],
    DEX: [],
    Perpetuals: [],
    Yield: [],
    Options: [],
  };
}

function rowByCanhavSlug(
  slug: string,
  byLlamaSlug: Map<string, LlamaProtocolRow>,
): LlamaProtocolRow | null {
  const llama = llamaProtocolForSlug(slug);
  if (llama && byLlamaSlug.has(llama)) return byLlamaSlug.get(llama)!;
  return byLlamaSlug.get(slug) ?? null;
}

function weightedTvlChange(
  rows: { tvl: number; change_1d: number | null; change_7d: number | null }[],
): { d1: number | null; d7: number | null } {
  let w1 = 0;
  let s1 = 0;
  let w7 = 0;
  let s7 = 0;
  for (const r of rows) {
    if (r.tvl <= 0) continue;
    if (r.change_1d != null) {
      s1 += r.change_1d * r.tvl;
      w1 += r.tvl;
    }
    if (r.change_7d != null) {
      s7 += r.change_7d * r.tvl;
      w7 += r.tvl;
    }
  }
  return {
    d1: w1 > 0 ? s1 / w1 : null,
    d7: w7 > 0 ? s7 / w7 : null,
  };
}

const FOCUS_SECTORS: NetworkSector[] = [
  "Credit",
  "Derivatives",
  "Liquidity",
  "Staking",
  "RWA",
  "Other",
];

/** Build sector aggregate snapshots and persist to the store. */
export async function refreshSectorAggregates(
  items: Record<string, unknown>[],
  putItem: (item: Record<string, unknown>) => Promise<void>,
): Promise<{ sector: NetworkSector; totalTvlUsd: number | null }[]> {
  const now = nowIso();
  const slugSets = sectorSlugSets(items);
  // no-store on the multi-MB payloads: Next's data cache rejects bodies >2MB and
  // the failed cache-set can throw outside fetchJson's soft-fail. This is cron-only,
  // so there's no request-time caching to lose.
  const allProtocols = await fetchAllProtocols();
  const byLlamaSlug = new Map(allProtocols.map((p) => [p.slug, p]));

  const totalDefiTvl = allProtocols.reduce((sum, p) => sum + (p.tvl ?? 0), 0);

  const [dexOverview, feesOverview, revenueOverview, optionsOverview, borrowPools, oiRoster] =
    await Promise.all([
      fetchLlamaOverview("dexs", undefined, 1800),
      fetchLlamaOverview("fees", "dailyFees", 1800),
      fetchLlamaOverview("fees", "dailyRevenue", 1800),
      fetchLlamaOverview("options", undefined, 1800),
      fetchLlamaBorrowPools(),
      fetchLlamaOpenInterestOverview(),
    ]);

  const feesRevenueBlock =
    feesOverview || revenueOverview
      ? {
          fees24hUsd: feesOverview?.total24h ?? null,
          fees7dUsd: feesOverview?.total7d ?? null,
          fees30dUsd: feesOverview?.total30d ?? null,
          feesAllTimeUsd: null,
          revenue24hUsd: revenueOverview?.total24h ?? null,
          revenue7dUsd: revenueOverview?.total7d ?? null,
          revenue30dUsd: revenueOverview?.total30d ?? null,
          holdersRevenue24hUsd: null,
          feesChange1dPct: null,
          methodology: null,
          methodologyUrl: null,
          llamaCategory: null,
          source: "defillama" as const,
          updatedAt: now,
        }
      : null;

  const results: { sector: NetworkSector; totalTvlUsd: number | null }[] = [];

  for (const sector of FOCUS_SECTORS) {
    const slugs = slugSets[sector];
    if (slugs.length === 0) continue;

    const matched: LlamaProtocolRow[] = [];
    for (const slug of slugs) {
      const row = rowByCanhavSlug(slug, byLlamaSlug);
      if (row && row.tvl != null && row.tvl > 0) matched.push(row);
    }

    const sectorTvl = matched.reduce((sum, r) => sum + (r.tvl ?? 0), 0);
    const topProtocols: SectorTopProtocol[] = [...matched]
      .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
      .slice(0, 5)
      .map((r) => ({ name: r.name, slug: r.slug, tvlUsd: r.tvl ?? 0 }));

    const chainsCovered = [...new Set(matched.flatMap((r) => r.chains))].sort();

    const aggregate: SectorAggregate = {
      sector,
      totalTvlUsd: sourced(sectorTvl > 0 ? sectorTvl : null, "DeFi Llama"),
      tvlChangePct: weightedTvlChange(
        matched.map((r) => ({
          tvl: r.tvl ?? 0,
          change_1d: r.change_1d,
          change_7d: r.change_7d,
        })),
      ),
      protocolCount: sourced(matched.length, "DeFi Llama"),
      dominancePct: sourced(
        totalDefiTvl > 0 && sectorTvl > 0 ? (sectorTvl / totalDefiTvl) * 100 : null,
        "Derived",
      ),
      topProtocols,
      chainsCovered,
      feesRevenue: feesRevenueBlock,
      syncedAt: now,
    };

    if (sector === "Credit") {
      let totalSupplied = 0;
      let totalBorrowed = 0;
      for (const slug of slugs) {
        const row = rowByCanhavSlug(slug, byLlamaSlug);
        if (row?.tvl) totalSupplied += row.tvl;
        const borrow = aggregateLendingBorrow(slug, borrowPools);
        if (borrow?.totalBorrowUsd) totalBorrowed += borrow.totalBorrowUsd;
      }
      aggregate.totalSuppliedUsd = sourced(totalSupplied > 0 ? totalSupplied : null, "DeFi Llama");
      aggregate.totalBorrowedUsd = sourced(totalBorrowed > 0 ? totalBorrowed : null, "DeFi Llama");
      aggregate.utilizationPct = sourced(
        totalSupplied > 0 && totalBorrowed > 0 ? (totalBorrowed / totalSupplied) * 100 : null,
        "Derived",
      );
    }

    if (sector === "Derivatives") {
      aggregate.optionsNotional24hUsd = sourced(optionsOverview?.total24h ?? null, "DeFi Llama");
      const derivLlamaSlugs = new Set(
        slugs
          .map((s) => llamaProtocolForSlug(s))
          .filter((x): x is string => x != null)
          .map((s) => s.toLowerCase()),
      );
      let totalOi = 0;
      for (const row of oiRoster) {
        if (!derivLlamaSlugs.has(row.slug.toLowerCase())) continue;
        if (row.openInterestUsd != null) totalOi += row.openInterestUsd;
      }
      aggregate.totalOpenInterestUsd = sourced(totalOi > 0 ? totalOi : null, "DeFi Llama");
    }

    if (sector === "Liquidity") {
      aggregate.dexVolume24hUsd = sourced(dexOverview?.total24h ?? null, "DeFi Llama");
    }

    if (sector === "Staking") {
      aggregate.totalStakedUsd = sourced(sectorTvl > 0 ? sectorTvl : null, "DeFi Llama");
    }

    if (sector === "RWA") {
      aggregate.totalAumUsd = sourced(sectorTvl > 0 ? sectorTvl : null, "DeFi Llama");
    }

    await putItem({
      PK: "CATEGORY#SectorAggregate",
      SK: `PROTOCOL#${sector}`,
      Category: "SectorAggregate",
      Slug: sector,
      Sector: sector,
      ...aggregateToStore(aggregate),
      UpdatedAt: now,
    });

    results.push({ sector, totalTvlUsd: sectorTvl > 0 ? sectorTvl : null });
  }

  return results;
}

function aggregateToStore(agg: SectorAggregate): Record<string, unknown> {
  return {
    TotalTvlUsd: agg.totalTvlUsd,
    TvlChangePct: agg.tvlChangePct,
    ProtocolCount: agg.protocolCount,
    DominancePct: agg.dominancePct,
    TopProtocols: agg.topProtocols,
    ChainsCovered: agg.chainsCovered,
    FeesRevenue: agg.feesRevenue,
    TotalSuppliedUsd: agg.totalSuppliedUsd,
    TotalBorrowedUsd: agg.totalBorrowedUsd,
    UtilizationPct: agg.utilizationPct,
    TotalOpenInterestUsd: agg.totalOpenInterestUsd,
    PerpVolume24hUsd: agg.perpVolume24hUsd,
    OptionsNotional24hUsd: agg.optionsNotional24hUsd,
    DexVolume24hUsd: agg.dexVolume24hUsd,
    TotalStakedUsd: agg.totalStakedUsd,
    RestakingTvlUsd: agg.restakingTvlUsd,
    TotalAumUsd: agg.totalAumUsd,
    CoverageCapacityUsd: agg.coverageCapacityUsd,
    TreasuryUsd: agg.treasuryUsd,
    SyncedAt: agg.syncedAt,
  };
}
