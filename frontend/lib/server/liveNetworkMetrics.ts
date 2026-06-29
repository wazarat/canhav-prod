import "server-only";

import { DERIVATIVES_SEED } from "@/data/derivatives-seed";
import { LIQUIDITY_SEED } from "@/data/liquidity-seed";
import { OTHER_SEED } from "@/data/other-seed";
import { STAKING_SEED } from "@/data/staking-seed";
import { collectDerivativesMetrics } from "@/lib/server/derivatives";
import {
  aggregateLendingBorrow,
  fetchLlamaBorrowPools,
  fetchLlamaFeesRevenue,
  fetchLlamaOpenInterest,
  fetchLlamaProtocolTvl,
  fetchLlamaTreasury,
  llamaLendingProjectForSlug,
  llamaProtocolForSlug,
} from "@/lib/server/defillama";
import { collectLiquidityMetrics } from "@/lib/server/liquidity";
import { nowIso } from "@/lib/server/http";
import { collectOtherMetrics } from "@/lib/server/other";
import { collectStakingMetrics } from "@/lib/server/staking";
import {
  overlayDerivativesTagMetrics,
  overlayLiquidityTagMetrics,
  overlayOtherTagMetrics,
  overlayRwaTagMetrics,
  overlayStakingTagMetrics,
  resolveDerivativesSubSector,
  resolveLiquiditySubSector,
  resolveOtherSubSector,
  resolveRwaSubSector,
  resolveStakingSubSector,
} from "@/lib/server/tagMetricsOverlay";
import { affiliatedTagMetricSectors } from "@/lib/networkTaxonomy";
import type {
  CreditTagMetrics,
  DerivativesTagMetrics,
  LendingMetrics,
  LiquidityMetrics,
  LiquidityTagMetrics,
  NetworkProfile,
  OtherMetrics,
  OtherTagMetrics,
  RwaMetrics,
  Sourced,
  StakingMetrics,
  StakingTagMetrics,
} from "@/lib/types";
import { fetchMarketData } from "@/lib/server/coingecko";

const LIVE_REVALIDATE = 300;

function sourced(value: number | null, sourceLabel = "DeFi Llama"): Sourced<number | null> {
  return {
    value,
    dataSource: "live",
    sourceLabel,
    updatedAt: nowIso(),
  };
}

function hasLiveValue(field?: Sourced<number | null> | null): boolean {
  return field?.value != null;
}

function mergeMetrics<T extends object>(base: T | null | undefined, live: Partial<T>): T {
  return { ...(base ?? {}), ...live } as T;
}

function isCreditNetwork(profile: NetworkProfile): boolean {
  return (
    profile.sector === "Credit" ||
    profile.secondarySectors?.includes("Credit") === true ||
    llamaLendingProjectForSlug(profile.slug) != null
  );
}

async function fetchLiveLendingMetrics(slug: string): Promise<Partial<LendingMetrics>> {
  const borrowPools = await fetchLlamaBorrowPools(LIVE_REVALIDATE);
  const borrow = aggregateLendingBorrow(slug, borrowPools);
  const tvl = await fetchLlamaProtocolTvl(slug, 1, LIVE_REVALIDATE);
  const tvlUsd = tvl?.points.at(-1)?.value ?? null;
  const feesRev = await fetchLlamaFeesRevenue(slug, LIVE_REVALIDATE);

  const supplyApy = borrow?.supplyApyPct ?? null;
  const borrowApy = borrow?.borrowApyPct ?? null;
  const nim = supplyApy != null && borrowApy != null ? borrowApy - supplyApy : null;

  const live: Partial<LendingMetrics> = {};
  if (tvlUsd != null) live.tvlUsd = sourced(tvlUsd);
  if (borrow?.totalBorrowUsd != null) live.totalBorrowsUsd = sourced(borrow.totalBorrowUsd);
  if (borrow?.utilizationPct != null) live.utilizationPct = sourced(borrow.utilizationPct);
  if (tvlUsd != null && borrow?.totalBorrowUsd != null) {
    live.availableLiquidityUsd = sourced(Math.max(0, tvlUsd - borrow.totalBorrowUsd), "Derived");
    live.availableLiquidityUsd.dataSource = "derived";
  }
  if (supplyApy != null) live.supplyApyPct = sourced(supplyApy);
  if (borrowApy != null) live.borrowApyPct = sourced(borrowApy);
  if (nim != null) live.netInterestMarginPct = sourced(nim);
  if (feesRev?.revenue30dUsd != null) live.revenue30dUsd = sourced(feesRev.revenue30dUsd);
  if (feesRev?.fees30dUsd != null) live.fees30dUsd = sourced(feesRev.fees30dUsd);
  if (feesRev?.revenue30dUsd != null) live.revenueAnnualizedUsd = sourced(feesRev.revenue30dUsd * 12);
  if (feesRev?.fees30dUsd != null) live.feesAnnualizedUsd = sourced(feesRev.fees30dUsd * 12);
  return live;
}

function mergeCreditTagLending(
  existing: CreditTagMetrics | null | undefined,
  lendingLive: Partial<LendingMetrics>,
): CreditTagMetrics {
  const prior = existing ?? {};
  const lendingBlock = { ...(prior.lending ?? {}) };
  if (lendingLive.tvlUsd) lendingBlock.totalSuppliedUsd = lendingLive.tvlUsd;
  if (lendingLive.totalBorrowsUsd) lendingBlock.totalBorrowsUsd = lendingLive.totalBorrowsUsd;
  if (lendingLive.utilizationPct) lendingBlock.utilizationPct = lendingLive.utilizationPct;
  if (lendingLive.availableLiquidityUsd) {
    lendingBlock.availableLiquidityUsd = lendingLive.availableLiquidityUsd;
  }
  if (lendingLive.supplyApyPct) lendingBlock.supplyApyPct = lendingLive.supplyApyPct;
  if (lendingLive.borrowApyPct) lendingBlock.borrowApyPct = lendingLive.borrowApyPct;
  return { ...prior, lending: lendingBlock };
}

/** True when sector/tag metrics are missing live Tier-1 values. */
export function networkNeedsLiveSectorMetrics(profile: NetworkProfile): boolean {
  if (isCreditNetwork(profile) && llamaLendingProjectForSlug(profile.slug)) {
    if (!hasLiveValue(profile.lending?.tvlUsd)) return true;
  }
  if (profile.sector === "Staking" || profile.secondarySectors?.includes("Staking")) {
    if (!hasLiveValue(profile.staking?.totalStakedUsd)) return true;
  }
  if (profile.sector === "Liquidity" || profile.secondarySectors?.includes("Liquidity")) {
    const tvl =
      profile.liquidityTagMetrics?.pools?.tvlUsd ??
      profile.liquidityTagMetrics?.vaults?.tvlUsd ??
      profile.liquidity?.tvlUsd;
    if (!hasLiveValue(tvl)) return true;
  }
  if (profile.sector === "Derivatives" || profile.secondarySectors?.includes("Derivatives")) {
    if (!hasLiveValue(profile.derivatives?.tvlUsd) && !hasLiveValue(profile.derivativesTagMetrics?.perpDex?.tvlUsd)) {
      return true;
    }
  }
  if (profile.sector === "Other" || profile.secondarySectors?.includes("Other")) {
    if (!hasLiveValue(profile.other?.tvlUsd)) return true;
  }
  if (profile.sector === "RWA" || profile.secondarySectors?.includes("RWA")) {
    if (!hasLiveValue(profile.rwa?.aumUsd)) return true;
  }
  return false;
}

/**
 * Fetch live DefiLlama sector metrics at request time when the store/cron has
 * not yet populated Tier-1 values. Keeps curated fields; overlays live data only.
 */
export async function enrichNetworkWithLiveSectorMetrics(
  profile: NetworkProfile,
): Promise<NetworkProfile> {
  if (!networkNeedsLiveSectorMetrics(profile)) return profile;

  let next: NetworkProfile = { ...profile };
  const item: Record<string, unknown> = {
    Slug: profile.slug,
    Sector: profile.sector,
    SubSector: profile.subSector,
    SecondarySectors: profile.secondarySectors,
    StakingSubSector: profile.stakingSubSector,
    LiquiditySubSector: profile.liquiditySubSector,
    DerivativesSubSector: profile.derivativesSubSector,
    OtherSubSector: profile.otherSubSector,
    RwaSubSector: profile.rwaSubSector,
    StakingTagMetrics: profile.stakingTagMetrics,
    LiquidityTagMetrics: profile.liquidityTagMetrics,
    DerivativesTagMetrics: profile.derivativesTagMetrics,
    OtherTagMetrics: profile.otherTagMetrics,
    RwaTagMetrics: profile.rwaTagMetrics,
  };

  const sectors = affiliatedTagMetricSectors(profile);

  if (isCreditNetwork(profile) && llamaLendingProjectForSlug(profile.slug) && !hasLiveValue(profile.lending?.tvlUsd)) {
    const lendingLive = await fetchLiveLendingMetrics(profile.slug);
    if (Object.keys(lendingLive).length > 0) {
      next = {
        ...next,
        lending: mergeMetrics(next.lending, lendingLive),
        creditTagMetrics: mergeCreditTagLending(next.creditTagMetrics, lendingLive),
      };
      const tags = profile.tags ?? [];
      if (tags.includes("Leveraged Yield") && lendingLive.tvlUsd) {
        next.creditTagMetrics = {
          ...(next.creditTagMetrics ?? {}),
          leveragedYield: mergeMetrics(next.creditTagMetrics?.leveragedYield, {
            tvlUsd: lendingLive.tvlUsd,
          }),
        };
      }
      if (tags.includes("Fixed Income") && lendingLive.tvlUsd) {
        next.creditTagMetrics = {
          ...(next.creditTagMetrics ?? {}),
          fixedIncome: mergeMetrics(next.creditTagMetrics?.fixedIncome, {
            tvlUsd: lendingLive.tvlUsd,
          }),
        };
      }
    }
  }

  if (sectors.includes("Staking") && !hasLiveValue(profile.staking?.totalStakedUsd)) {
    const seed = STAKING_SEED.find((s) => s.slug === profile.slug);
    if (seed?.llamaSlug) {
      const eth = await fetchMarketData("ethereum");
      const live = await collectStakingMetrics(seed, eth?.currentPrice ?? null);
      if (Object.keys(live).length > 0) {
        next.staking = mergeMetrics(next.staking, live);
        overlayStakingTagMetrics(item, live, resolveStakingSubSector(item, seed.subSector));
        next.stakingTagMetrics = item.StakingTagMetrics as StakingTagMetrics;
      }
    }
  }

  if (sectors.includes("Liquidity")) {
    const existingTvl =
      profile.liquidityTagMetrics?.pools?.tvlUsd ??
      profile.liquidityTagMetrics?.vaults?.tvlUsd ??
      profile.liquidity?.tvlUsd;
    if (!hasLiveValue(existingTvl)) {
      const seed = LIQUIDITY_SEED.find((s) => s.slug === profile.slug);
      if (seed?.llamaSlug) {
        const live = await collectLiquidityMetrics(seed);
        if (Object.keys(live).length > 0) {
          next.liquidity = mergeMetrics(next.liquidity, live);
          overlayLiquidityTagMetrics(item, live, resolveLiquiditySubSector(item, seed.subSector));
          next.liquidityTagMetrics = item.LiquidityTagMetrics as LiquidityTagMetrics;
        }
      }
    }
  }

  if (sectors.includes("Derivatives")) {
    const existingTvl =
      profile.derivativesTagMetrics?.perpDex?.tvlUsd ??
      profile.derivativesTagMetrics?.optionVaults?.tvlUsd ??
      profile.derivativesTagMetrics?.deltaNeutral?.tvlUsd ??
      profile.derivatives?.tvlUsd;
    if (!hasLiveValue(existingTvl)) {
      const seed = DERIVATIVES_SEED.find((s) => s.slug === profile.slug);
      if (seed?.llamaSlug) {
        const live = await collectDerivativesMetrics(seed);
        if (Object.keys(live).length > 0) {
          next.derivatives = mergeMetrics(next.derivatives, live);
          const protocol = llamaProtocolForSlug(profile.slug);
          const oi = protocol ? await fetchLlamaOpenInterest(protocol, LIVE_REVALIDATE) : null;
          overlayDerivativesTagMetrics(
            item,
            live,
            resolveDerivativesSubSector(item, seed.subSector),
            oi,
          );
          next.derivativesTagMetrics = item.DerivativesTagMetrics as DerivativesTagMetrics;
        }
      }
    }
  }

  if (sectors.includes("Other") && !hasLiveValue(profile.other?.tvlUsd)) {
    const seed = OTHER_SEED.find((s) => s.slug === profile.slug);
    if (seed?.llamaSlug) {
      const live = await collectOtherMetrics(seed);
      if (seed.subSector === "Governance" && llamaProtocolForSlug(profile.slug)) {
        const treasury = await fetchLlamaTreasury(profile.slug, LIVE_REVALIDATE);
        if (treasury?.treasuryUsd != null) {
          live.treasuryUsd = sourced(treasury.treasuryUsd);
        }
      }
      if (Object.keys(live).length > 0) {
        next.other = mergeMetrics(next.other, live);
        overlayOtherTagMetrics(item, live, resolveOtherSubSector(item, seed.subSector));
        next.otherTagMetrics = item.OtherTagMetrics as OtherTagMetrics;
      }
    }
  }

  if (sectors.includes("RWA") && !hasLiveValue(profile.rwa?.aumUsd) && llamaProtocolForSlug(profile.slug)) {
    const tvl = await fetchLlamaProtocolTvl(profile.slug, 1, LIVE_REVALIDATE);
    const aumUsd = tvl?.points.at(-1)?.value ?? null;
    if (aumUsd != null) {
      const live: Partial<RwaMetrics> = { aumUsd: sourced(aumUsd) };
      next.rwa = mergeMetrics(next.rwa, live);
      overlayRwaTagMetrics(item, next.rwa as RwaMetrics, resolveRwaSubSector(item));
      next.rwaTagMetrics = item.RwaTagMetrics as NetworkProfile["rwaTagMetrics"];
    }
  }

  return next;
}
