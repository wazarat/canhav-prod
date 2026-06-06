import "server-only";

import type { CurrentScale, EntityProfile, ScaleLabels } from "@/lib/types";

/** Demo-pinned entity headline stats and member-coin display patches. */
export interface CuratedEntityPatch {
  currentScale?: Partial<CurrentScale>;
  scaleLabels?: Partial<ScaleLabels>;
  /** Override member-coin ref fields by slug (e.g. display name). */
  memberCoins?: Record<string, { name?: string; symbol?: string }>;
}

/**
 * Curated entity demo data. Applied on top of the Upstash/file store so vision
 * demos stay accurate even when production Redis has not been re-seeded.
 */
export const CURATED_ENTITY: Record<string, CuratedEntityPatch> = {
  jupiter: {
    memberCoins: {
      jljupusd: { name: "Jupiter Lend JUPUSD" },
    },
  },
};

/** Merge curated demo patches over a store-backed entity profile. */
export function applyCuratedEntity(profile: EntityProfile): EntityProfile {
  const patch = CURATED_ENTITY[profile.slug];
  if (!patch) return profile;

  const memberCoins = profile.memberCoins.map((ref) => {
    const coinPatch = patch.memberCoins?.[ref.slug];
    return coinPatch ? { ...ref, ...coinPatch } : ref;
  });

  return {
    ...profile,
    currentScale: patch.currentScale
      ? { ...profile.currentScale, ...patch.currentScale }
      : profile.currentScale,
    scaleLabels: patch.scaleLabels
      ? { ...profile.scaleLabels, ...patch.scaleLabels }
      : profile.scaleLabels,
    memberCoins,
  };
}

/** Demo display name overrides for stablecoin/token profiles. */
export const CURATED_PROFILE_NAMES: Record<string, string> = {
  jljupusd: "Jupiter Lend JUPUSD",
};
