import { CANONICAL_LENDING_SLUGS } from "@/data/credit-seed";
import { CANONICAL_PERP_DEX_SLUGS } from "@/data/derivatives-seed";
import { CANONICAL_LIQUIDITY_POOL_SLUGS } from "@/data/liquidity-seed";
import type { BadgeTone } from "@/components/ui/Badge";
import type {
  CreditTag,
  DerivativesSubSector,
  LiquiditySubSector,
  NetworkProfile,
  OtherSubSector,
  RwaSecondaryTag,
  StakingSubSector,
} from "@/lib/types";

const CANONICAL_LENDING_SLUG_SET = new Set<string>(CANONICAL_LENDING_SLUGS);
const CANONICAL_PERP_DEX_SLUG_SET = new Set<string>(CANONICAL_PERP_DEX_SLUGS);
const CANONICAL_LIQUIDITY_POOL_SLUG_SET = new Set<string>(CANONICAL_LIQUIDITY_POOL_SLUGS);

export interface NetworkTaxonomyBadges {
  primarySector: string | null;
  secondarySectors: string[];
  subSectorTags: string[];
}

/** Primary Credit tag vocabulary for the network-tab filter row. */
export const CREDIT_PRIMARY_TAGS: CreditTag[] = ["Lending", "Leveraged Yield", "Fixed Income"];

/** Primary Staking tag vocabulary for the network-tab filter row. */
export const STAKING_PRIMARY_TAGS: StakingSubSector[] = [
  "Liquid Staking",
  "Restaking",
  "Liquid Restaking",
];

/** Primary Liquidity tag vocabulary for the network-tab filter row. */
export const LIQUIDITY_PRIMARY_TAGS: LiquiditySubSector[] = ["Pools", "Vaults"];

/** Primary Derivatives tag vocabulary for the network-tab filter row. */
export const DERIVATIVES_PRIMARY_TAGS: DerivativesSubSector[] = [
  "Perp DEX",
  "Option Vaults",
  "Delta-Neutral",
];

/** Primary Other tag vocabulary for the network-tab filter row. */
export const OTHER_PRIMARY_TAGS: OtherSubSector[] = ["Underwriting", "Governance"];

/** RWA attribute-tag vocabulary for the network-tab filter row (5-tag revamp). */
export const RWA_SECONDARY_TAGS: RwaSecondaryTag[] = [
  "Institutional-Gated",
  "Yield-Bearing",
  "Real-World-Custody",
  "DAO-Governed",
  "Multi-Chain",
];

/** Sector chip tone per ontology §9. */
export function sectorBadgeTone(sector: string | null | undefined): BadgeTone {
  switch (sector) {
    case "Credit":
      return "electric";
    case "DEX":
      return "neon";
    case "Stablecoin":
      return "signal";
    case "RWA":
      return "warning";
    case "Staking":
      return "positive";
    case "Liquidity":
      return "electric";
    case "Derivatives":
      return "warning";
    case "Other":
      return "neutral";
    default:
      return "neutral";
  }
}

/** Cross-sector secondary sector chips use a muted tone. */
export function secondarySectorBadgeTone(): BadgeTone {
  return "neutral";
}

/** Sub-sector and behavioral tags. */
export function subSectorBadgeTone(): BadgeTone {
  return "neutral";
}

/** Whether an RWA entity runs on a non-EVM chain (structural flag, not a taxonomy tag). */
export function isNonEvmRwa(profile: NetworkProfile): boolean {
  return profile.rwa?.deployment?.evmCompatible === "no";
}

/** Tags for a profile under a given sector (primary + secondary — used for entity badges). */
export function tagsForSector(profile: NetworkProfile, sector: string): string[] {
  if (sector === "DEX") {
    return [profile.dexSubSector, ...(profile.dexSecondaryTags ?? [])].filter(Boolean) as string[];
  }
  if (sector === "RWA") {
    return [profile.rwaSubSector, ...(profile.rwaSecondaryTags ?? [])].filter(Boolean) as string[];
  }
  if (sector === "Stablecoin") {
    return [profile.stablecoinSubSector, ...(profile.stablecoinSecondaryTags ?? [])].filter(
      Boolean,
    ) as string[];
  }
  if (sector === "Staking") {
    return [profile.stakingSubSector, ...(profile.stakingSecondaryTags ?? [])].filter(
      Boolean,
    ) as string[];
  }
  if (sector === "Liquidity") {
    return [profile.liquiditySubSector, ...(profile.liquiditySecondaryTags ?? [])].filter(
      Boolean,
    ) as string[];
  }
  if (sector === "Derivatives") {
    const primary =
      profile.derivativesSubSector ??
      (profile.sector === "Derivatives" && profile.subSector ? profile.subSector : null);
    return [primary, ...(profile.derivativesSecondaryTags ?? [])].filter(Boolean) as string[];
  }
  if (sector === "Other") {
    return [profile.otherSubSector, ...(profile.otherSecondaryTags ?? [])].filter(
      Boolean,
    ) as string[];
  }
  return profile.tags ?? (profile.subSector ? [profile.subSector] : []);
}

/** Primary OR secondary sector match, with canonical lenders always under Credit. */
export function matchesSectorFilter(profile: NetworkProfile, sector: string): boolean {
  if (profile.sector === sector) return true;
  if ((profile.secondarySectors as string[] | undefined)?.includes(sector)) return true;
  if (sector === "Credit" && CANONICAL_LENDING_SLUG_SET.has(profile.slug)) return true;
  if (sector === "Derivatives" && CANONICAL_PERP_DEX_SLUG_SET.has(profile.slug)) return true;
  if (sector === "Liquidity" && CANONICAL_LIQUIDITY_POOL_SLUG_SET.has(profile.slug)) return true;
  return false;
}

/** Primary tags used for sector filter chips and tag-based row filtering. */
export function filterTagsForSector(profile: NetworkProfile, sector: string): string[] {
  if (sector === "Staking") {
    return profile.stakingSubSector ? [profile.stakingSubSector] : [];
  }
  if (sector === "Liquidity") {
    const primary =
      profile.liquiditySubSector ??
      (profile.sector === "Liquidity" && profile.subSector ? profile.subSector : null) ??
      (CANONICAL_LIQUIDITY_POOL_SLUG_SET.has(profile.slug) ? "Pools" : null);
    return primary ? [primary] : [];
  }
  if (sector === "Derivatives") {
    const primary =
      profile.derivativesSubSector ??
      (profile.sector === "Derivatives" && profile.subSector ? profile.subSector : null);
    return primary ? [primary] : [];
  }
  if (sector === "Other") {
    return profile.otherSubSector ? [profile.otherSubSector] : [];
  }
  if (sector === "Credit") {
    const slug = profile.slug;
    if (CANONICAL_LENDING_SLUG_SET.has(slug)) {
      return ["Lending"];
    }
    const tags = profile.tags ?? (profile.subSector ? [profile.subSector] : []);
    return tags.filter((t) => t !== "Lending");
  }
  if (sector === "DEX") {
    return profile.dexSubSector ? [profile.dexSubSector] : [];
  }
  if (sector === "RWA") {
    return profile.rwaSecondaryTags ?? [];
  }
  if (sector === "Stablecoin") {
    return profile.stablecoinSubSector ? [profile.stablecoinSubSector] : [];
  }
  return profile.tags ?? (profile.subSector ? [profile.subSector] : []);
}

/**
 * Fixed primary tag vocabulary for filter chip rows. Returns null when tags
 * should be derived dynamically from profile data (DEX/Stablecoin secondaries).
 */
export function sectorFilterTagOptions(sector: string): string[] | null {
  if (sector === "Credit") return [...CREDIT_PRIMARY_TAGS];
  if (sector === "Staking") return [...STAKING_PRIMARY_TAGS];
  if (sector === "Liquidity") return [...LIQUIDITY_PRIMARY_TAGS];
  if (sector === "Derivatives") return [...DERIVATIVES_PRIMARY_TAGS];
  if (sector === "Other") return [...OTHER_PRIMARY_TAGS];
  if (sector === "RWA") return [...RWA_SECONDARY_TAGS];
  return null;
}

export function getNetworkTaxonomyBadges(profile: NetworkProfile): NetworkTaxonomyBadges {
  const primarySector = profile.sector ?? null;
  const secondarySectors = profile.secondarySectors ?? [];
  const subSectorTags = primarySector ? tagsForSector(profile, primarySector) : [];
  return { primarySector, secondarySectors, subSectorTags };
}
