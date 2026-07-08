import type { Address } from "viem";

import type { WatchedAsset } from "../types";

/**
 * WatchedAsset presets for alpha yield/stablecoin agents.
 *
 * Addresses are Arbitrum One mainnet (chain 42161) — research reads only.
 * Agent identity and gated writes stay on Arbitrum Sepolia.
 *
 * Sources:
 *   sUSDe token — bootstrap-store.json / CoinGecko detail_platforms
 *   sUSDe core  — Ethena StakedUSDe (same as token; accrual contract)
 *   sUSDe factory/pool — Curve sUSDe/USDe pool (primary liquidity venue on Arb)
 *   sUSDai token — bootstrap-store.json
 *   sUSDai core  — USD.AI staking vault (Metastreet deployment on Arb)
 */

const SUSDE_TOKEN = "0x9d39a5de30e57443bff2a8307a4256c8797a3497" as Address;
/** Curve sUSDe/USDe pool on Arbitrum One (liquidity + peg signal). */
const SUSDE_POOL = "0x02950460E2b9529D0E00284A2fBB4596bC3318C" as Address;
const SUSDE_FACTORY = "0x0000000000000000000000000000000000000000" as Address;

const SUSDAI_TOKEN = "0x0b2b2b2076d95dda7817e785989fe353fe955ef9" as Address;
/** USD.AI sUSDai staking core on Arbitrum One. */
const SUSDAI_CORE = "0x0b2b2b2076d95dda7817e785989fe353fe955ef9" as Address;
const SUSDAI_FACTORY = "0x0000000000000000000000000000000000000000" as Address;
const SUSDAI_POOL: Address[] = [];

// Majors (ETH, BTC) — market agents read CoinGecko only (slug key), so the
// on-chain fields are zeroed: native L1 assets have no ERC-20 token/factory/
// core to read, and runMarketAgent never calls readCoreState.
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export const WATCHED_ASSETS: Record<string, WatchedAsset> = {
  sUSDe: {
    symbol: "sUSDe",
    token: SUSDE_TOKEN,
    factory: SUSDE_FACTORY,
    pools: [SUSDE_POOL],
    core: SUSDE_TOKEN,
    decimals: 18,
    slug: "susde",
    entitySlug: "ethena",
  },
  sUSDai: {
    symbol: "sUSDai",
    token: SUSDAI_TOKEN,
    factory: SUSDAI_FACTORY,
    pools: SUSDAI_POOL,
    core: SUSDAI_CORE,
    decimals: 18,
    slug: "susdai",
    entitySlug: "usd-ai",
  },
  ETH: {
    symbol: "ETH",
    token: ZERO_ADDRESS,
    factory: ZERO_ADDRESS,
    pools: [],
    core: ZERO_ADDRESS,
    decimals: 18,
    slug: "eth",
    entitySlug: "ethereum",
  },
  BTC: {
    symbol: "BTC",
    token: ZERO_ADDRESS,
    factory: ZERO_ADDRESS,
    pools: [],
    core: ZERO_ADDRESS,
    decimals: 8,
    slug: "btc",
    entitySlug: "bitcoin",
  },
};

export function getWatchedAsset(symbol: string): WatchedAsset | null {
  return WATCHED_ASSETS[symbol] ?? null;
}

export function listWatchedAssetSymbols(): string[] {
  return Object.keys(WATCHED_ASSETS);
}
