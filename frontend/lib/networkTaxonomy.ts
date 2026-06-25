import type { BadgeTone } from "@/components/ui/Badge";
import type { CreditTag, NetworkProfile, StakingSubSector } from "@/lib/types";

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
    return profile.rwaSubSector ? [profile.rwaSubSector] : [];
  }
  if (sector === "Stablecoin") {
    return profile.stablecoinSubSector ? [profile.stablecoinSubSector] : [];
  }
  return profile.tags ?? (profile.subSector ? [profile.subSector] : []);
}

/**
 * Fixed primary tag vocabulary for filter chip rows. Returns null when tags
 * should be derived dynamically from profile data (DEX/RWA/Stablecoin secondaries).
 */
export function sectorFilterTagOptions(sector: string): string[] | null {
  if (sector === "Credit") return [...CREDIT_PRIMARY_TAGS];
  if (sector === "Staking") return [...STAKING_PRIMARY_TAGS];
  return null;
}

export function getNetworkTaxonomyBadges(profile: NetworkProfile): NetworkTaxonomyBadges {
  const primarySector = profile.sector ?? null;
  const secondarySectors = profile.secondarySectors ?? [];
  const subSectorTags = primarySector ? tagsForSector(profile, primarySector) : [];
  return { primarySector, secondarySectors, subSectorTags };
}
