import { readLiveStore } from "@/lib/server/store";
import type { CategoryDef, RwaProfile, StablecoinProfile } from "@/lib/types";

/**
 * Data accessors.
 *
 * The APPROVAL GATE lives here: public-facing pages must only ever call the
 * `*Approved*` accessors. `getAllStablecoins()` is reserved for the restricted
 * /staging view. Call sites only change in that the accessors are now `async`.
 *
 * SOURCE is the backend store read at request/build time via
 * `lib/server/store.ts`: Upstash Redis in production (and locally when the
 * Upstash env vars are set), or `backend/data/store.json` from disk for offline
 * dev. An approval flip via /api/approve appears publicly after revalidation.
 */

/**
 * Whether the dataset is illustrative mock data. Now `false`: profiles come
 * from the real CSV-backed store. Live Alchemy/Dune metrics (supply, peg, TVL)
 * are still pending (B2), so headline figures may be empty until then.
 */
export const IS_MOCK_DATA = false;

/**
 * Whether live on-chain/analytics metrics are still pending. Now `false`: the
 * daily refresh cron (frontend/app/api/cron/refresh) resolves each protocol's
 * Arbitrum address (CoinGecko + the RWA registry) and writes live Alchemy
 * supply/TVL to the store, so headline figures are real. Historical peg/TVL
 * charts still fall back to CoinGecko until Dune query IDs are wired up, but
 * that's surfaced per-chart rather than via a global banner.
 */
export const LIVE_METRICS_PENDING = false;

/** All profiles regardless of status — STAGING / admin only. */
export async function getAllStablecoins(): Promise<StablecoinProfile[]> {
  const { stablecoins } = await readLiveStore();
  return [...stablecoins].sort((a, b) => a.name.localeCompare(b.name));
}

/** Public: only APPROVED profiles ever leave this function. */
export async function getApprovedStablecoins(): Promise<StablecoinProfile[]> {
  return (await getAllStablecoins()).filter((p) => p.status === "APPROVED");
}

/** Public: a single APPROVED profile, or null (so pending items 404 publicly). */
export async function getApprovedStablecoinBySlug(
  slug: string,
): Promise<StablecoinProfile | null> {
  return (await getApprovedStablecoins()).find((p) => p.slug === slug) ?? null;
}

/** Staging: a single profile of any status. */
export async function getStablecoinBySlug(slug: string): Promise<StablecoinProfile | null> {
  return (await getAllStablecoins()).find((p) => p.slug === slug) ?? null;
}

export interface StagingCounts {
  total: number;
  approved: number;
  pending: number;
}

export async function getStagingCounts(): Promise<StagingCounts> {
  const all = await getAllStablecoins();
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

/** All RWA profiles regardless of status — STAGING / admin only. */
export async function getAllRwas(): Promise<RwaProfile[]> {
  const { rwas } = await readLiveStore();
  return [...rwas].sort((a, b) => a.name.localeCompare(b.name));
}

/** Public: only APPROVED RWA profiles ever leave this function. */
export async function getApprovedRwas(): Promise<RwaProfile[]> {
  return (await getAllRwas()).filter((p) => p.status === "APPROVED");
}

/** Public: a single APPROVED RWA profile, or null (so pending items 404). */
export async function getApprovedRwaBySlug(slug: string): Promise<RwaProfile | null> {
  return (await getApprovedRwas()).find((p) => p.slug === slug) ?? null;
}

/** Staging: a single RWA profile of any status. */
export async function getRwaBySlug(slug: string): Promise<RwaProfile | null> {
  return (await getAllRwas()).find((p) => p.slug === slug) ?? null;
}

export async function getRwaStagingCounts(): Promise<StagingCounts> {
  const all = await getAllRwas();
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
  },
  {
    slug: "rwas",
    label: "Real World Assets",
    description: "Tokenized treasuries, credit, equities, and off-chain collateral.",
    status: "active",
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
