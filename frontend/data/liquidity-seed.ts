import type { LiquiditySubSector, LiquiditySecondaryTag } from "@/lib/types";

export interface LiquiditySeed {
  name: string;
  slug: string; // canhav internal slug
  token: string | null; // governance token ticker (null = tokenless, e.g. Arrakis)
  subSector: LiquiditySubSector;
  secondaryTags: LiquiditySecondaryTag[];
  llamaSlug: string | null; // DefiLlama protocol slug
  coingeckoId: string | null; // CoinGecko coin id (null = no liquid token)
  seedMode: "new" | "extend-existing";
}

// Liquidity sector seed (canhav-liquidity spec §3/§4). Curve, Uniswap, Balancer,
// Aerodrome, and PancakeSwap are exclusive primary Liquidity / Pools venues
// (defined in liquidity_specs.py; no DEX secondary sector).
// Ids verified against DeFi Llama /protocols + CoinGecko markets on 2026-06-25.
export const LIQUIDITY_SEED: LiquiditySeed[] = [
  // ---------------- POOLS (LPing / stable pools) ----------------
  { name: "Curve Finance",     slug: "curve-finance", token: "CRV",  subSector: "Pools",  secondaryTags: ["Stable-Pools", "ve-Tokenomics", "Multi-Chain"],        llamaSlug: "curve-dex",            coingeckoId: "curve-dao-token",  seedMode: "new" },
  { name: "Uniswap",           slug: "uniswap",       token: "UNI",  subSector: "Pools",  secondaryTags: ["Concentrated-Liquidity", "Multi-Chain"],               llamaSlug: "uniswap-v3",           coingeckoId: "uniswap",          seedMode: "new" },
  { name: "Balancer",          slug: "balancer",      token: "BAL",  subSector: "Pools",  secondaryTags: ["Stable-Pools", "ve-Tokenomics"],                       llamaSlug: "balancer-v3",          coingeckoId: "balancer",         seedMode: "new" },
  { name: "Aerodrome Finance", slug: "aerodrome",     token: "AERO", subSector: "Pools",  secondaryTags: ["Concentrated-Liquidity", "ve-Tokenomics"],             llamaSlug: "aerodrome-slipstream", coingeckoId: "aerodrome-finance", seedMode: "new" },
  { name: "PancakeSwap",       slug: "pancakeswap",   token: "CAKE", subSector: "Pools",  secondaryTags: ["Concentrated-Liquidity", "Multi-Chain"],               llamaSlug: "pancakeswap-amm-v3",   coingeckoId: "pancakeswap-token", seedMode: "new" },
  { name: "Gamma",             slug: "gamma",         token: "GAMMA", subSector: "Pools", secondaryTags: ["LP-Strategy-Manager", "Concentrated-Liquidity", "Multi-Chain"], llamaSlug: "gamma",          coingeckoId: "gamma-strategies", seedMode: "new" },

  // ---------------- VAULTS (yield farming / auto-compounding) ----------------
  { name: "Yearn Finance",     slug: "yearn-finance",  token: "YFI",  subSector: "Vaults", secondaryTags: ["Auto-Compounding", "Multi-Chain"],                    llamaSlug: "yearn-finance",   coingeckoId: "yearn-finance",    seedMode: "new" },
  { name: "Convex Finance",    slug: "convex-finance", token: "CVX",  subSector: "Vaults", secondaryTags: ["Auto-Compounding", "ve-Tokenomics"],                  llamaSlug: "convex-finance",  coingeckoId: "convex-finance",   seedMode: "new" },
  { name: "Beefy",             slug: "beefy",          token: "BIFI", subSector: "Vaults", secondaryTags: ["Auto-Compounding", "Multi-Chain"],                    llamaSlug: "beefy",           coingeckoId: "beefy-finance",    seedMode: "new" },
  { name: "Aura",              slug: "aura",           token: "AURA", subSector: "Vaults", secondaryTags: ["Auto-Compounding", "ve-Tokenomics"],                  llamaSlug: "aura",            coingeckoId: "aura-finance",     seedMode: "new" },
  // Arrakis is tokenless — TVL is sourced directly from DeFi Llama (path (c)),
  // there is no governance token to aggregate a market cap from.
  { name: "Arrakis Finance",   slug: "arrakis",        token: null,   subSector: "Vaults", secondaryTags: ["LP-Strategy-Manager", "Concentrated-Liquidity"],      llamaSlug: "arrakis-modular", coingeckoId: null,               seedMode: "new" },
  { name: "Maverick Protocol", slug: "maverick",       token: "MAV",  subSector: "Vaults", secondaryTags: ["LP-Strategy-Manager", "Concentrated-Liquidity"],      llamaSlug: "maverick-protocol", coingeckoId: "maverick-protocol", seedMode: "new" },
];

/** Pool venues reclassified from DEX → exclusive Liquidity / Pools (read-time + store backfill). */
export const CANONICAL_LIQUIDITY_POOL_SLUGS = [
  "curve-finance",
  "uniswap",
  "balancer",
  "aerodrome",
  "pancakeswap",
] as const;
