import "server-only";

import { resolveForSlug } from "@/lib/server/coingecko";
import { rwaTokenForSlug } from "@/lib/server/rwaRegistry";
import type { RwaProfile, StablecoinProfile } from "@/lib/types";

/**
 * Resolve an entity's Arbitrum contract address + decimals + USD price for the
 * live-render detail panels.
 *
 * Order of preference:
 *   1. The address already stored on the profile (written by the daily cron).
 *   2. For RWAs: the curated `RWA_ADDRESSES` registry (most RWA tokens aren't on
 *      CoinGecko, so their address/price must be pinned).
 *   3. A live, cached CoinGecko resolve for richer fields (decimals, price) and
 *      to fill the address when the cron hasn't populated it yet.
 *
 * Always fails soft: returns `{ address: null, ... }` when nothing resolves, so
 * panels can render an explicit empty state instead of erroring.
 */

const LIVE_REVALIDATE = 300;

export interface ResolvedToken {
  address: string | null;
  decimals: number | null;
  priceUsd: number | null;
}

export async function resolveEntityToken(
  profile: StablecoinProfile | RwaProfile,
): Promise<ResolvedToken> {
  const stored = (profile.contractAddress || "").trim().toLowerCase() || null;
  const live = await resolveForSlug(profile.slug, LIVE_REVALIDATE);

  if (profile.category === "RWA") {
    const reg = rwaTokenForSlug(profile.slug);
    if (reg) {
      const registryPrice = reg.pegged ? 1 : (reg.priceUsd ?? null);
      return {
        address: stored ?? reg.address.toLowerCase(),
        decimals: reg.decimals ?? live?.decimals ?? null,
        priceUsd: registryPrice ?? live?.priceUsd ?? null,
      };
    }
  }

  return {
    address: stored ?? live?.address ?? null,
    decimals: live?.decimals ?? null,
    priceUsd: live?.priceUsd ?? null,
  };
}
