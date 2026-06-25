import { readLiveStore } from "@/lib/server/store";
import type {
  CategoryDef,
  NetworkProfile,
  RwaProfile,
  StablecoinProfile,
  TokenProfile,
} from "@/lib/types";

/**
 * Data accessors.
 *
 * Profiles are published as soon as they are ingested and synced to the store.
 * `getApproved*` names are kept for call-site stability; they return every item
 * in the store (no manual approval step).
 *
 * SOURCE is the backend store read at request/build time via
 * `lib/server/store.ts`: Upstash Redis in production (and locally when the
 * Upstash env vars are set), or `backend/data/store.json` from disk for offline
 * dev.
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

/** All stablecoin profiles in the store. */
export async function getAllStablecoins(): Promise<StablecoinProfile[]> {
  const { stablecoins } = await readLiveStore();
  return [...stablecoins].sort((a, b) => a.name.localeCompare(b.name));
}

/** Published stablecoins (all items in the store). */
export async function getApprovedStablecoins(): Promise<StablecoinProfile[]> {
  return getAllStablecoins();
}

export async function getApprovedStablecoinBySlug(
  slug: string,
): Promise<StablecoinProfile | null> {
  return (await getAllStablecoins()).find((p) => p.slug === slug) ?? null;
}

export async function getStablecoinBySlug(slug: string): Promise<StablecoinProfile | null> {
  return getApprovedStablecoinBySlug(slug);
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

/** Published RWAs (all items in the store). */
export async function getApprovedRwas(): Promise<RwaProfile[]> {
  return getAllRwas();
}

export async function getApprovedRwaBySlug(slug: string): Promise<RwaProfile | null> {
  return (await getAllRwas()).find((p) => p.slug === slug) ?? null;
}

export async function getRwaBySlug(slug: string): Promise<RwaProfile | null> {
  return getApprovedRwaBySlug(slug);
}

/* -------------------------------------------------------------------------- */
/* Derived TVL helpers                                                        */
/* -------------------------------------------------------------------------- */

export function latestTvl(profile: RwaProfile): number | null {
  const points = profile.historicalTvlData.points;
  if (points.length) return points[points.length - 1].value;
  // Fall back to the cron-written live TVL (Alchemy / DeFi Llama / CoinGecko)
  // so the table column and the page aggregate can never disagree.
  return profile.totalValueLocked.value;
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
/* Token accessors                                                            */
/* -------------------------------------------------------------------------- */

export async function getAllTokens(): Promise<TokenProfile[]> {
  const { tokens } = await readLiveStore();
  return [...tokens].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getApprovedTokens(): Promise<TokenProfile[]> {
  return getAllTokens();
}

export async function getApprovedTokenBySlug(slug: string): Promise<TokenProfile | null> {
  return (await getAllTokens()).find((p) => p.slug === slug) ?? null;
}

export async function getTokenBySlug(slug: string): Promise<TokenProfile | null> {
  return getApprovedTokenBySlug(slug);
}

/* -------------------------------------------------------------------------- */
/* Network accessors (top-tier umbrella protocols)                            */
/* -------------------------------------------------------------------------- */

export async function getAllNetworks(): Promise<NetworkProfile[]> {
  const { networks } = await readLiveStore();
  return [...networks].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getApprovedNetworks(): Promise<NetworkProfile[]> {
  const store = await readLiveStore();
  const networks = [...store.networks].sort((a, b) => a.name.localeCompare(b.name));
  return enrichNetworksWithTvl(networks, store);
}

export async function getApprovedNetworkBySlug(slug: string): Promise<NetworkProfile | null> {
  const store = await readLiveStore();
  const network = store.networks.find((p) => p.slug === slug) ?? null;
  if (!network) return null;
  return enrichNetworksWithTvl([network], store)[0] ?? network;
}

/**
 * Network headline TVL is a curated static seed for most networks, but a few ship
 * with `tvlUsd: null` (e.g. Monerium, Pleasing Market). When it's missing we
 * derive it from the network's member coins already in the store — no network, so
 * it self-heals offline and in production:
 *   - Stablecoin: circulating supply (peg-target units, treated ~ USD)
 *   - RWA:        total value locked (USD)
 *   - Token:      market cap (USD)
 * Curated seeds are never overwritten, and networks whose members aren't tracked
 * by any source (e.g. Stably) keep their honest empty state (null).
 */
function enrichNetworksWithTvl(
  networks: NetworkProfile[],
  store: { stablecoins: StablecoinProfile[]; rwas: RwaProfile[]; tokens: TokenProfile[] },
): NetworkProfile[] {
  if (!networks.some((e) => e.currentScale.tvlUsd == null)) return networks;

  const stablecoinBySlug = new Map(store.stablecoins.map((p) => [p.slug, p]));
  const rwaBySlug = new Map(store.rwas.map((p) => [p.slug, p]));
  const tokenBySlug = new Map(store.tokens.map((p) => [p.slug, p]));

  const memberValueUsd = (ref: NetworkProfile["memberCoins"][number]): number | null => {
    if (ref.category === "Stablecoin") {
      return stablecoinBySlug.get(ref.slug)?.totalSupply?.value ?? null;
    }
    if (ref.category === "RWA") {
      const profile = rwaBySlug.get(ref.slug);
      if (!profile) return null;
      return latestTvl(profile);
    }
    return tokenBySlug.get(ref.slug)?.market?.marketCapUsd?.value ?? null;
  };

  return networks.map((network) => {
    if (network.currentScale.tvlUsd != null) return network;

    const lendingTvl = network.lending?.tvlUsd?.value;
    if (lendingTvl != null && lendingTvl > 0) {
      return { ...network, currentScale: { ...network.currentScale, tvlUsd: lendingTvl } };
    }

    const rwaAum = network.rwa?.aumUsd?.value;
    if (rwaAum != null && rwaAum > 0) {
      return { ...network, currentScale: { ...network.currentScale, tvlUsd: rwaAum } };
    }

    const stableSupply = network.stablecoin?.currentSupplyUsd?.value;
    if (stableSupply != null && stableSupply > 0) {
      return { ...network, currentScale: { ...network.currentScale, tvlUsd: stableSupply } };
    }

    const stakingTvl = network.staking?.totalStakedUsd?.value;
    if (stakingTvl != null && stakingTvl > 0) {
      return { ...network, currentScale: { ...network.currentScale, tvlUsd: stakingTvl } };
    }

    let total = 0;
    let found = false;
    for (const ref of network.memberCoins) {
      const value = memberValueUsd(ref);
      if (value != null && value > 0) {
        total += value;
        found = true;
      }
    }
    if (!found) return network;
    return { ...network, currentScale: { ...network.currentScale, tvlUsd: total } };
  });
}

export async function getNetworkBySlug(slug: string): Promise<NetworkProfile | null> {
  return getApprovedNetworkBySlug(slug);
}

/**
 * Resolve a network's member coins to their store profiles.
 */
export async function getNetworkMemberCoins(
  network: NetworkProfile,
): Promise<
  {
    ref: NetworkProfile["memberCoins"][number];
    profile: StablecoinProfile | TokenProfile | RwaProfile | null;
  }[]
> {
  const [stablecoins, tokens, rwas] = await Promise.all([
    getAllStablecoins(),
    getAllTokens(),
    getAllRwas(),
  ]);
  return network.memberCoins.map((ref) => {
    const profile =
      ref.category === "Stablecoin"
        ? (stablecoins.find((p) => p.slug === ref.slug) ?? null)
        : ref.category === "RWA"
          ? (rwas.find((p) => p.slug === ref.slug) ?? null)
          : (tokens.find((p) => p.slug === ref.slug) ?? null);
    return { ref, profile };
  });
}

/* -------------------------------------------------------------------------- */
/* Category taxonomy                                                          */
/* -------------------------------------------------------------------------- */

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "networks",
    label: "Networks",
    description:
      "Umbrella protocols that group stablecoins, RWAs, and tokens under one issuer.",
    status: "active",
  },
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
    slug: "tokens",
    label: "Tokens",
    description: "Governance & utility tokens powering protocol ecosystems.",
    status: "active",
  },
  {
    slug: "lending",
    label: "Credit",
    description: "Lending money markets, leveraged yield, and fixed income.",
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
