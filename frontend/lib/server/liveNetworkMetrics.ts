import "server-only";

import { unstable_cache } from "next/cache";

import { DERIVATIVES_SEED } from "@/data/derivatives-seed";
import { LIQUIDITY_SEED } from "@/data/liquidity-seed";
import { OTHER_SEED } from "@/data/other-seed";
import { STAKING_SEED } from "@/data/staking-seed";
import { collectDerivativesMetrics } from "@/lib/server/derivatives";
import {
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
  LendingMarketMetrics,
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

/**
 * Live lending metrics shaped for `creditTagMetrics.lending` — the single
 * lending representation since M4.1 (CAN-70). The legacy `profile.lending`
 * block is editorial-only and no longer written here. Borrow-side data is
 * skipped entirely: yields.llama.fi/poolsBorrow is behind the paid plan
 * (HTTP 402 since 2026-07), so calling it per render only burned a round trip.
 * The cron owns borrow-side writes when a Pro key lands. The TVL-backed
 * supplied value still populates from the free protocol endpoint.
 */
// The raw /protocol/{slug} payloads are full daily histories (aave-v3 alone is
// ~38MB) and can never enter the 2MB fetch cache, so the download re-ran on
// every Credit detail render (~9s of TTFB). Cache the derived latest value.
const fetchLatestProtocolTvlUsd = unstable_cache(
  async (slug: string): Promise<number | null> => {
    const tvl = await fetchLlamaProtocolTvl(slug, 1, LIVE_REVALIDATE);
    return tvl?.points.at(-1)?.value ?? null;
  },
  ["latest-protocol-tvl"],
  { revalidate: LIVE_REVALIDATE },
);

async function fetchLiveLendingMetrics(slug: string): Promise<Partial<LendingMarketMetrics>> {
  const tvlUsd = await fetchLatestProtocolTvlUsd(slug);

  const live: Partial<LendingMarketMetrics> = {};
  if (tvlUsd != null) live.totalSuppliedUsd = sourced(tvlUsd);
  return live;
}

function mergeCreditTagLending(
  existing: CreditTagMetrics | null | undefined,
  lendingLive: Partial<LendingMarketMetrics>,
): CreditTagMetrics {
  const prior = existing ?? {};
  return { ...prior, lending: { ...(prior.lending ?? {}), ...lendingLive } };
}

/** True when sector/tag metrics are missing live Tier-1 values. */
export function networkNeedsLiveSectorMetrics(profile: NetworkProfile): boolean {
  if (isCreditNetwork(profile) && llamaLendingProjectForSlug(profile.slug)) {
    if (!hasLiveValue(profile.creditTagMetrics?.lending?.totalSuppliedUsd)) return true;
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

  if (
    isCreditNetwork(profile) &&
    llamaLendingProjectForSlug(profile.slug) &&
    !hasLiveValue(profile.creditTagMetrics?.lending?.totalSuppliedUsd)
  ) {
    const lendingLive = await fetchLiveLendingMetrics(profile.slug);
    if (Object.keys(lendingLive).length > 0) {
      next = {
        ...next,
        creditTagMetrics: mergeCreditTagLending(next.creditTagMetrics, lendingLive),
      };
      const tags = profile.tags ?? [];
      if (tags.includes("Leveraged Yield") && lendingLive.totalSuppliedUsd) {
        next.creditTagMetrics = {
          ...(next.creditTagMetrics ?? {}),
          leveragedYield: mergeMetrics(next.creditTagMetrics?.leveragedYield, {
            tvlUsd: lendingLive.totalSuppliedUsd,
          }),
        };
      }
      if (tags.includes("Fixed Income") && lendingLive.totalSuppliedUsd) {
        next.creditTagMetrics = {
          ...(next.creditTagMetrics ?? {}),
          fixedIncome: mergeMetrics(next.creditTagMetrics?.fixedIncome, {
            tvlUsd: lendingLive.totalSuppliedUsd,
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
    const aumUsd = await fetchLatestProtocolTvlUsd(profile.slug);
    if (aumUsd != null) {
      const live: Partial<RwaMetrics> = { aumUsd: sourced(aumUsd) };
      next.rwa = mergeMetrics(next.rwa, live);
      overlayRwaTagMetrics(item, next.rwa as RwaMetrics, resolveRwaSubSector(item));
      next.rwaTagMetrics = item.RwaTagMetrics as NetworkProfile["rwaTagMetrics"];
    }
  }

  return next;
}
