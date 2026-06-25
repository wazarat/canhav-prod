import type { BadgeTone } from "@/components/ui/Badge";
import type { NetworkProfile } from "@/lib/types";

export interface NetworkTaxonomyBadges {
  primarySector: string | null;
  secondarySectors: string[];
  subSectorTags: string[];
}

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

/** Tags for a profile under a given sector (mirrors NetworkTableWithFilter). */
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

export function getNetworkTaxonomyBadges(profile: NetworkProfile): NetworkTaxonomyBadges {
  const primarySector = profile.sector ?? null;
  const secondarySectors = profile.secondarySectors ?? [];
  const subSectorTags = primarySector ? tagsForSector(profile, primarySector) : [];
  return { primarySector, secondarySectors, subSectorTags };
}
