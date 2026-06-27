import type { DerivativesSubSector, DerivativesSecondaryTag } from "@/lib/types";

export interface DerivativesSeed {
  name: string;
  slug: string; // canhav internal slug
  token: string | null; // governance token ticker (null = tokenless, e.g. Rage Trade)
  subSector: DerivativesSubSector;
  secondaryTags: DerivativesSecondaryTag[];
  llamaSlug: string | null; // DefiLlama protocol slug
  coingeckoId: string | null; // CoinGecko coin id (null = no liquid token)
  // Perp DEX venues report open interest; the collector pulls OI for these.
  tracksOpenInterest?: boolean;
  seedMode: "new" | "extend-existing";
}

// Derivatives sector seed (canhav-derivatives spec §3/§4/§5). Perp venues GMX,
// Gains, dYdX, Hyperliquid, and Drift are primary Derivatives (seedMode: new).
// Ethena is extend-existing — primary Stablecoin with secondary Derivatives tag
// (wired in backend ingest_entities.py). Ids verified against the spec tables on
// 2026-06-25; the collector fails soft to null when a slug/id is wrong.
export const DERIVATIVES_SEED: DerivativesSeed[] = [
  // ---------------------------- PERP DEX ----------------------------------
  { name: "GMX",           slug: "gmx",            token: "GMX",  subSector: "Perp DEX", secondaryTags: [], llamaSlug: "gmx",           coingeckoId: "gmx",            tracksOpenInterest: true, seedMode: "new" },
  { name: "Gains Network", slug: "gains-network",  token: "GNS",  subSector: "Perp DEX", secondaryTags: [], llamaSlug: "gains-network", coingeckoId: "gains-network",  tracksOpenInterest: true, seedMode: "new" },
  { name: "Hyperliquid",   slug: "hyperliquid",    token: "HYPE", subSector: "Perp DEX", secondaryTags: [], llamaSlug: "hyperliquid",   coingeckoId: "hyperliquid",    tracksOpenInterest: true, seedMode: "new" },
  { name: "dYdX",          slug: "dydx",           token: "DYDX", subSector: "Perp DEX", secondaryTags: [], llamaSlug: "dydx",          coingeckoId: "dydx-chain",     tracksOpenInterest: true, seedMode: "new" },
  { name: "Drift Protocol", slug: "drift-protocol", token: "DRIFT", subSector: "Perp DEX", secondaryTags: [], llamaSlug: "drift-trade",   coingeckoId: "drift-protocol", tracksOpenInterest: true, seedMode: "new" },
  { name: "Synthetix",     slug: "synthetix",      token: "SNX",  subSector: "Perp DEX", secondaryTags: ["Synthetic-Assets", "Multi-Chain"], llamaSlug: "synthetix-v3",  coingeckoId: "havven",         tracksOpenInterest: true, seedMode: "new" },
  { name: "Aevo",          slug: "aevo",           token: "AEVO", subSector: "Perp DEX", secondaryTags: ["Orderbook"],                       llamaSlug: "aevo-perps",    coingeckoId: "aevo-exchange",  tracksOpenInterest: true, seedMode: "new" },

  // -------------------------- OPTION VAULTS -------------------------------
  { name: "Ribbon Finance", slug: "ribbon-finance", token: "RBN",   subSector: "Option Vaults", secondaryTags: ["Auto-Strategy"],                 llamaSlug: "ribbon",     coingeckoId: "ribbon-finance", seedMode: "new" },
  { name: "Dopex",          slug: "dopex",          token: "DPX",   subSector: "Option Vaults", secondaryTags: ["Auto-Strategy"],                 llamaSlug: "dopex",      coingeckoId: null,             seedMode: "new" },
  { name: "Derive",         slug: "derive",         token: "DRV",   subSector: "Option Vaults", secondaryTags: ["Auto-Strategy", "Multi-Chain"],  llamaSlug: "derive-v2",  coingeckoId: "derive",         seedMode: "new" },
  { name: "Jones DAO",      slug: "jones-dao",      token: "JONES", subSector: "Option Vaults", secondaryTags: ["Auto-Strategy"],                 llamaSlug: "jones-dao",  coingeckoId: "jones-dao",      seedMode: "new" },

  // -------------------------- DELTA-NEUTRAL -------------------------------
  // Ethena keeps primary Stablecoin; it is DeFi Llama-classified "Basis Trading"
  // (the canonical delta-neutral protocol) and gains a secondary Derivatives tag.
  { name: "Ethena",         slug: "ethena",         token: "ENA",  subSector: "Delta-Neutral", secondaryTags: ["Funding-Rate-Yield"], llamaSlug: "ethena-usde",   coingeckoId: "ethena", seedMode: "extend-existing" },
  // Rage Trade / Neutra have no headline tradable token → path (c) network TVL from Llama.
  { name: "Rage Trade",     slug: "rage-trade",     token: null,   subSector: "Delta-Neutral", secondaryTags: ["Auto-Strategy"],      llamaSlug: "rage-trade-v1", coingeckoId: null,     seedMode: "new" },
  { name: "Neutra Finance", slug: "neutra-finance", token: null,   subSector: "Delta-Neutral", secondaryTags: ["Auto-Strategy"],      llamaSlug: "neutral-trade", coingeckoId: null,     seedMode: "new" },
];
