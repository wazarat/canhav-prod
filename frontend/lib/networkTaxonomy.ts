import type { BadgeTone } from "@/components/ui/Badge";
import type { CreditTag, NetworkProfile, RwaSecondaryTag, StakingSubSector } from "@/lib/types";

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
  return profile.tags ?? (profile.subSector ? [profile.subSector] : []);
}

/** Primary tags used for sector filter chips and tag-based row filtering. */
export function filterTagsForSector(profile: NetworkProfile, sector: string): string[] {
  if (sector === "Staking") {
    return profile.stakingSubSector ? [profile.stakingSubSector] : [];
  }
  if (sector === "Credit") {
    return profile.tags ?? (profile.subSector ? [profile.subSector] : []);
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
  if (sector === "RWA") return [...RWA_SECONDARY_TAGS];
  return null;
}

export function getNetworkTaxonomyBadges(profile: NetworkProfile): NetworkTaxonomyBadges {
  const primarySector = profile.sector ?? null;
  const secondarySectors = profile.secondarySectors ?? [];
  const subSectorTags = primarySector ? tagsForSector(profile, primarySector) : [];
  return { primarySector, secondarySectors, subSectorTags };
}
