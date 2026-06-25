import type { StakingSubSector, StakingSecondaryTag } from "@/lib/types";

export interface StakingSeed {
  name: string;
  slug: string; // canhav internal slug
  token: string | null; // LST/LRT ticker
  subSector: StakingSubSector;
  secondaryTags: StakingSecondaryTag[];
  llamaSlug: string | null; // DefiLlama protocol slug
  coingeckoId: string | null; // CoinGecko coin id (null = no liquid token)
  seedMode: "new" | "extend-existing";
}

export const STAKING_SEED: StakingSeed[] = [
  // ---------- 1) LIQUID STAKING ----------
  { name: "Lido Finance",   slug: "lido",        token: "stETH",   subSector: "Liquid Staking", secondaryTags: ["Non-Custodial"],                       llamaSlug: "lido",                        coingeckoId: "staked-ether",                seedMode: "extend-existing" },
  { name: "Rocket Pool",    slug: "rocket-pool", token: "rETH",    subSector: "Liquid Staking", secondaryTags: ["Non-Custodial", "Permissionless-Operators"], llamaSlug: "rocket-pool",            coingeckoId: "rocket-pool-eth",             seedMode: "new" },
  { name: "Binance",        slug: "binance-wbeth", token: "wBETH", subSector: "Liquid Staking", secondaryTags: ["Exchange-Native"],                     llamaSlug: "binance-staked-eth",          coingeckoId: "wrapped-beacon-eth",          seedMode: "new" },
  { name: "Coinbase",       slug: "coinbase-cbeth", token: "cbETH", subSector: "Liquid Staking", secondaryTags: ["Exchange-Native"],                    llamaSlug: "coinbase-wrapped-staked-eth", coingeckoId: "coinbase-wrapped-staked-eth", seedMode: "new" },
  { name: "Mantle",         slug: "mantle-meth", token: "mETH",    subSector: "Liquid Staking", secondaryTags: ["L2-Ecosystem", "Non-Custodial"],       llamaSlug: "mantle-restaking",            coingeckoId: "mantle-staked-ether",         seedMode: "new" },
  { name: "Frax Finance",   slug: "frax",        token: "sfrxETH", subSector: "Liquid Staking", secondaryTags: ["CDP-Integrated", "Non-Custodial"],     llamaSlug: "frax-ether",                  coingeckoId: "staked-frax-ether",           seedMode: "extend-existing" },
  { name: "Swell",          slug: "swell",       token: "swETH",   subSector: "Liquid Staking", secondaryTags: ["Non-Custodial"],                       llamaSlug: "swell-liquid-staking",        coingeckoId: "swell-ethereum",              seedMode: "new" },
  { name: "Stader Labs",    slug: "stader",      token: "ETHx",    subSector: "Liquid Staking", secondaryTags: ["Non-Custodial", "Multi-Chain"],        llamaSlug: "stader",                      coingeckoId: "stader-ethx",                 seedMode: "new" },
  { name: "StakeWise",      slug: "stakewise",   token: "osETH",   subSector: "Liquid Staking", secondaryTags: ["Non-Custodial"],                       llamaSlug: "stakewise-v2",                coingeckoId: "stakewise-v3-oseth",          seedMode: "new" },
  { name: "Ankr",           slug: "ankr",        token: "ankrETH", subSector: "Liquid Staking", secondaryTags: ["Multi-Chain", "Non-Custodial"],        llamaSlug: "ankr",                        coingeckoId: "ankreth",                     seedMode: "extend-existing" },

  // ---------- 2) RESTAKING ----------
  { name: "EigenLayer",     slug: "eigenlayer",  token: null,      subSector: "Restaking",      secondaryTags: ["Multi-Asset", "Non-Custodial"],        llamaSlug: "eigencloud",                  coingeckoId: "eigenlayer",                  seedMode: "new" },
  { name: "Symbiotic",      slug: "symbiotic",   token: null,      subSector: "Restaking",      secondaryTags: ["Multi-Asset", "Non-Custodial"],        llamaSlug: "symbiotic",                   coingeckoId: null,                          seedMode: "new" },
  // Karak: no clean DefiLlama slug / no token resolved on 2026-06-25 — resolve
  // manually from https://api.llama.fi/protocols before relying; metrics curated.
  { name: "Karak",          slug: "karak",       token: null,      subSector: "Restaking",      secondaryTags: ["Multi-Asset", "Multi-Chain"],          llamaSlug: null,                          coingeckoId: null,                          seedMode: "new" },

  // ---------- 3) LIQUID RESTAKING ----------
  { name: "Ether.fi",       slug: "ether-fi",    token: "weETH",   subSector: "Liquid Restaking", secondaryTags: ["Non-Custodial"],                     llamaSlug: "ether.fi-stake",              coingeckoId: "wrapped-eeth",                seedMode: "new" },
  { name: "Renzo",          slug: "renzo",       token: "ezETH",   subSector: "Liquid Restaking", secondaryTags: ["EigenLayer-Strategy-Manager"],       llamaSlug: "renzo",                       coingeckoId: "renzo-restaked-eth",          seedMode: "new" },
  { name: "Kelp DAO",       slug: "kelp-dao",    token: "rsETH",   subSector: "Liquid Restaking", secondaryTags: ["LST-Backed-Basket"],                 llamaSlug: "kelp",                        coingeckoId: "kelp-dao-restaked-eth",       seedMode: "new" },
  { name: "Puffer Finance", slug: "puffer",      token: "pufETH",  subSector: "Liquid Restaking", secondaryTags: ["Native-Restaking", "Non-Custodial"], llamaSlug: "puffer-stake",                coingeckoId: "pufeth",                      seedMode: "new" },
  { name: "Bedrock",        slug: "bedrock",     token: "uniETH",  subSector: "Liquid Restaking", secondaryTags: ["LST-Backed-Basket"],                 llamaSlug: "bedrock-unieth",              coingeckoId: "bedrock-unieth",              seedMode: "new" },
  { name: "YieldNest",      slug: "yieldnest",   token: "ynETH",   subSector: "Liquid Restaking", secondaryTags: ["LST-Backed-Basket"],                 llamaSlug: "yieldnest",                   coingeckoId: "yieldnest-restaked-eth",      seedMode: "new" },
];
