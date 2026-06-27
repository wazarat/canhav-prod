import { filterTagsForSector, matchesSectorFilter } from "@/lib/networkTaxonomy";
import { networkHeadlineTvlUsd } from "@/lib/networks/marketHeadlines";
import type { Competitor, NetworkProfile } from "@/lib/types";

function profileSector(profile: NetworkProfile): string {
  return profile.sector ?? "Other";
}

/** True when peer shares at least one taxonomy tag under the given sector. */
function sharesSectorTag(
  profile: NetworkProfile,
  peer: NetworkProfile,
  sector: string,
): boolean {
  const tags = filterTagsForSector(profile, sector);
  const peerTags = filterTagsForSector(peer, sector);
  if (tags.length === 0 || peerTags.length === 0) return true;
  return tags.some((t) => peerTags.includes(t));
}

function autoCompetitorFromPeer(
  peer: NetworkProfile,
  profile: NetworkProfile,
  sector: string,
  rank: number,
): Competitor {
  const profileTags = filterTagsForSector(profile, sector);
  const peerTags = filterTagsForSector(peer, sector);
  const sharedTags = profileTags.filter((t) => peerTags.includes(t));

  return {
    rank,
    name: peer.name,
    slug: peer.slug,
    positioning: peer.tagline || peer.description.slice(0, 120) || "—",
    similarities:
      sharedTags.length > 0
        ? `Both in ${sector} (${sharedTags.join(", ")}).`
        : `Both operate in ${sector}.`,
    differences: peer.differentiator || "—",
  };
}

/** Merge curated competitor rows with auto-discovered peers (curated wins on slug). */
function mergeCuratedAndAuto(curated: Competitor[], auto: Competitor[]): Competitor[] {
  const curatedSlugs = new Set(curated.map((c) => c.slug).filter(Boolean));
  const curatedSorted = [...curated].sort((a, b) => a.rank - b.rank);
  const extra = auto.filter((c) => !c.slug || !curatedSlugs.has(c.slug));

  let rank = 1;
  const merged: Competitor[] = [];
  for (const c of curatedSorted) {
    merged.push({ ...c, rank: rank++ });
  }
  for (const c of extra) {
    merged.push({ ...c, rank: rank++ });
  }
  return merged;
}

/**
 * Derive competitors from all approved networks sharing sector + tag overlap.
 * Curated `profile.competitors` entries are preserved and ranked first.
 */
export function deriveCompetitors(
  profile: NetworkProfile,
  allNetworks: NetworkProfile[],
): Competitor[] {
  const sector = profileSector(profile);

  const peers = allNetworks
    .filter((peer) => {
      if (peer.slug === profile.slug) return false;
      if (!matchesSectorFilter(peer, sector)) return false;
      return sharesSectorTag(profile, peer, sector);
    })
    .sort((a, b) => {
      const tvlA = networkHeadlineTvlUsd(a) ?? 0;
      const tvlB = networkHeadlineTvlUsd(b) ?? 0;
      return tvlB - tvlA;
    });

  const auto = peers.map((peer, i) => autoCompetitorFromPeer(peer, profile, sector, i + 1));
  return mergeCuratedAndAuto(profile.competitors ?? [], auto);
}

/** Attach resolved competitors to each network profile. */
export function enrichNetworksWithCompetitors(
  networks: NetworkProfile[],
): NetworkProfile[] {
  return networks.map((network) => ({
    ...network,
    competitors: deriveCompetitors(network, networks),
  }));
}
