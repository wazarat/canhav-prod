import { rwaMockData } from "@/lib/mock/rwaMockData";
import { stablecoinMockData } from "@/lib/mock/stablecoinMockData";
import type { CategoryDef, RwaProfile, StablecoinProfile } from "@/lib/types";

/**
 * Data accessors.
 *
 * The APPROVAL GATE lives here: public-facing pages must only ever call the
 * `*Approved*` accessors. `getAllStablecoins()` is reserved for the restricted
 * /staging view. When the live API (Step 4) lands, only the bodies of these
 * functions change — call sites stay identical.
 */

const SOURCE: StablecoinProfile[] = stablecoinMockData;

/** Whether the dataset is mock (used to render a clear "mock data" banner). */
export const IS_MOCK_DATA = true;

/** All profiles regardless of status — STAGING / admin only. */
export function getAllStablecoins(): StablecoinProfile[] {
  return [...SOURCE].sort((a, b) => a.name.localeCompare(b.name));
}

/** Public: only APPROVED profiles ever leave this function. */
export function getApprovedStablecoins(): StablecoinProfile[] {
  return getAllStablecoins().filter((p) => p.status === "APPROVED");
}

/** Public: a single APPROVED profile, or null (so pending items 404 publicly). */
export function getApprovedStablecoinBySlug(slug: string): StablecoinProfile | null {
  return getApprovedStablecoins().find((p) => p.slug === slug) ?? null;
}

/** Staging: a single profile of any status. */
export function getStablecoinBySlug(slug: string): StablecoinProfile | null {
  return SOURCE.find((p) => p.slug === slug) ?? null;
}

export interface StagingCounts {
  total: number;
  approved: number;
  pending: number;
}

export function getStagingCounts(): StagingCounts {
  const all = getAllStablecoins();
  const approved = all.filter((p) => p.status === "APPROVED").length;
  return { total: all.length, approved, pending: all.length - approved };
}

/* -------------------------------------------------------------------------- */
/* Derived peg helpers                                                        */
/* -------------------------------------------------------------------------- */

export function latestPegPrice(profile: StablecoinProfile): number | null {
  const points = profile.historicalPegData.points;
  return points.length ? points[points.length - 1].price : null;
}

/** Absolute deviation from the 1.0 peg, in basis points (100 bps = 1%). */
export function pegDeviationBps(profile: StablecoinProfile): number | null {
  const latest = latestPegPrice(profile);
  if (latest === null) return null;
  return Math.round(Math.abs(latest - 1) * 10_000);
}

export type PegHealth = "tight" | "watch" | "loose";

export function pegHealth(profile: StablecoinProfile): PegHealth {
  const bps = pegDeviationBps(profile);
  if (bps === null) return "watch";
  if (bps <= 30) return "tight";
  if (bps <= 75) return "watch";
  return "loose";
}

/* -------------------------------------------------------------------------- */
/* RWA accessors (same approval gate as stablecoins)                          */
/* -------------------------------------------------------------------------- */

const RWA_SOURCE: RwaProfile[] = rwaMockData;

/** All RWA profiles regardless of status — STAGING / admin only. */
export function getAllRwas(): RwaProfile[] {
  return [...RWA_SOURCE].sort((a, b) => a.name.localeCompare(b.name));
}

/** Public: only APPROVED RWA profiles ever leave this function. */
export function getApprovedRwas(): RwaProfile[] {
  return getAllRwas().filter((p) => p.status === "APPROVED");
}

/** Public: a single APPROVED RWA profile, or null (so pending items 404). */
export function getApprovedRwaBySlug(slug: string): RwaProfile | null {
  return getApprovedRwas().find((p) => p.slug === slug) ?? null;
}

/** Staging: a single RWA profile of any status. */
export function getRwaBySlug(slug: string): RwaProfile | null {
  return RWA_SOURCE.find((p) => p.slug === slug) ?? null;
}

export function getRwaStagingCounts(): StagingCounts {
  const all = getAllRwas();
  const approved = all.filter((p) => p.status === "APPROVED").length;
  return { total: all.length, approved, pending: all.length - approved };
}

/* -------------------------------------------------------------------------- */
/* Derived TVL helpers                                                        */
/* -------------------------------------------------------------------------- */

export function latestTvl(profile: RwaProfile): number | null {
  const points = profile.historicalTvlData.points;
  return points.length ? points[points.length - 1].value : null;
}

/** Percentage change in TVL across the available series (first → last). */
export function tvlChangePct(profile: RwaProfile): number | null {
  const points = profile.historicalTvlData.points;
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

export type TvlTrend = "growing" | "stable" | "declining";

export function tvlTrend(profile: RwaProfile): TvlTrend {
  const pct = tvlChangePct(profile);
  if (pct === null) return "stable";
  if (pct >= 3) return "growing";
  if (pct <= -3) return "declining";
  return "stable";
}

/* -------------------------------------------------------------------------- */
/* Category taxonomy                                                          */
/* -------------------------------------------------------------------------- */

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "stablecoins",
    label: "Stablecoins",
    description: "Pegged dollar & euro assets, peg health, and circulating supply.",
    status: "active",
    trackedCount: getAllStablecoins().length,
  },
  {
    slug: "rwas",
    label: "Real World Assets",
    description: "Tokenized treasuries, credit, equities, and off-chain collateral.",
    status: "active",
    trackedCount: getAllRwas().length,
  },
  {
    slug: "lending",
    label: "Lending / Borrowing",
    description: "Money markets, rates, and collateral risk.",
    status: "coming_soon",
  },
  {
    slug: "perpetuals",
    label: "Perpetuals",
    description: "Perp DEX volume, open interest, and funding.",
    status: "coming_soon",
  },
  {
    slug: "yield",
    label: "Yield Optimization",
    description: "Vaults, auto-compounders, and strategy yields.",
    status: "coming_soon",
  },
  {
    slug: "dex",
    label: "DEX",
    description: "Spot AMMs, order books, and aggregators.",
    status: "coming_soon",
  },
  {
    slug: "options",
    label: "Options",
    description: "On-chain options, structured products, and vol.",
    status: "coming_soon",
  },
];
