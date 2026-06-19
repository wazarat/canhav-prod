import "server-only";

import { createPublicClient, http, type Address } from "viem";
import { arbitrum } from "viem/chains";

import { readSecret } from "@/lib/server/env";
import { nowIso } from "@/lib/server/http";
import type { LendingMarket } from "@/lib/types";

/**
 * Aave V3 lending-rate overlay — supply/borrow APY read on-chain via Alchemy.
 *
 * The platform already talks to Arbitrum through the free-tier Alchemy JSON-RPC
 * endpoint (see `lib/server/alchemy.ts`). This module reads Aave V3's
 * `AaveProtocolDataProvider.getReserveData(asset)` over that same RPC (using
 * viem for ABI decoding) and converts the ray-denominated `liquidityRate` /
 * `variableBorrowRate` into human APY percentages — the numbers shown on the
 * Aave app and on every CanHav coin/entity page.
 *
 * Everything fails soft: a missing `ALCHEMY_API_KEY` or any RPC error yields
 * `null` rather than throwing, so a cron run / page render is never blocked.
 *
 * Addresses are from the canonical bgd-labs/aave-address-book (AaveV3Arbitrum).
 */

// AaveV3Arbitrum.AAVE_PROTOCOL_DATA_PROVIDER
const DATA_PROVIDER: Address = "0x243Aa95cAC2a25651eda86e80bEe66114413c43b";
// AaveV3Arbitrum.POOL (used only by the Phase-2 per-user helper below).
const POOL: Address = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";

const DEFAULT_BASE_URL = "https://arb-mainnet.g.alchemy.com/v2";
// Used only when no ALCHEMY_API_KEY is configured. Aave reads are a handful of
// cheap view calls, so a public RPC keeps live rates working out of the box
// (e.g. local dev) without a key. Production with a key always prefers Alchemy.
const PUBLIC_FALLBACK_RPC = "https://arbitrum-one.publicnode.com";

// Compounded-per-second ray rate -> APY %. RAY = 1e27, matching Aave's docs.
const RAY = 1e27;
const SECONDS_PER_YEAR = 31_536_000;

const DATA_PROVIDER_ABI = [
  {
    type: "function",
    name: "getReserveData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "unbacked", type: "uint256" },
      { name: "accruedToTreasuryScaled", type: "uint256" },
      { name: "totalAToken", type: "uint256" },
      { name: "totalStableDebt", type: "uint256" },
      { name: "totalVariableDebt", type: "uint256" },
      { name: "liquidityRate", type: "uint256" },
      { name: "variableBorrowRate", type: "uint256" },
      { name: "stableBorrowRate", type: "uint256" },
      { name: "averageStableBorrowRate", type: "uint256" },
      { name: "liquidityIndex", type: "uint256" },
      { name: "variableBorrowIndex", type: "uint256" },
      { name: "lastUpdateTimestamp", type: "uint40" },
    ],
  },
  {
    type: "function",
    name: "getAllReservesTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "symbol", type: "string" },
          { name: "tokenAddress", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getUserReserveData",
    stateMutability: "view",
    inputs: [
      { name: "asset", type: "address" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "currentATokenBalance", type: "uint256" },
      { name: "currentStableDebt", type: "uint256" },
      { name: "currentVariableDebt", type: "uint256" },
      { name: "principalStableDebt", type: "uint256" },
      { name: "scaledVariableDebt", type: "uint256" },
      { name: "stableBorrowRate", type: "uint256" },
      { name: "liquidityRate", type: "uint256" },
      { name: "stableRateLastUpdated", type: "uint40" },
      { name: "usageAsCollateralEnabled", type: "bool" },
    ],
  },
] as const;

function rpcUrl(): string {
  const key = readSecret("ALCHEMY_API_KEY");
  if (key) {
    const base = readSecret("ALCHEMY_ARBITRUM_BASE_URL") || DEFAULT_BASE_URL;
    return `${base.replace(/\/$/, "")}/${key}`;
  }
  return PUBLIC_FALLBACK_RPC;
}

let client: ReturnType<typeof createPublicClient> | null = null;

function getClient(): ReturnType<typeof createPublicClient> | null {
  if (client) return client;
  client = createPublicClient({ chain: arbitrum, transport: http(rpcUrl()) });
  return client;
}

/** Aave rates are always readable (Alchemy when keyed, else a public RPC). */
export function hasAave(): boolean {
  return true;
}

function rayRateToApyPct(rateRay: bigint): number {
  const apr = Number(rateRay) / RAY;
  return ((1 + apr / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1) * 100;
}

/**
 * Member-coin slug -> the Aave reserve it tracks. aTokens (aUSDC/aUSDT/aWETH)
 * map to their *underlying* reserve; GHO is the underlying itself. Where the
 * underlying address is stable it's pinned; otherwise we resolve it by symbol
 * from `getAllReservesTokens()` so a future reserve migration is picked up
 * automatically.
 */
const RESERVE_BY_SLUG: Record<string, { symbols: string[]; underlying?: Address }> = {
  gho: { symbols: ["GHO"], underlying: "0x7dfF72693f6A4149b17e7C6314655f6A9F7c8B33" },
  ausdc: { symbols: ["USDC", "USDCN", "USDC.E"] },
  ausdt: { symbols: ["USDT", "USDT0", "USD₮0", "USDT₮0"] },
  aweth: { symbols: ["WETH"] },
};

/** Canonical Aave V3 Arbitrum aToken addresses (bgd-labs address book). */
const ATOKEN_BY_SLUG: Record<string, Address> = {
  ausdc: "0x625E765fa5a82f5870032b31a019831D17832d365",
  ausdt: "0x6ab707Aca74e9E62665E9AAaA7152A0709A3B0ed",
  aweth: "0xe50fA9b3c56FfB159cB0FcA61F5c9D250e60Eb70",
};

/** aToken contract on Arbitrum for member-coin slugs that map to a reserves. */
export function aTokenAddressForSlug(slug: string): Address | null {
  return ATOKEN_BY_SLUG[slug] ?? null;
}

/** True when a slug maps to a known Aave V3 reserve we can read rates for. */
export function isAaveReserveSlug(slug: string): boolean {
  return slug in RESERVE_BY_SLUG;
}

// Cache the (symbol -> underlying address) map only on a successful, non-empty
// read so a transient RPC failure is retried rather than memoized as empty.
let reservesCache: Map<string, Address> | null = null;

async function reserveAddressBySymbol(): Promise<Map<string, Address>> {
  if (reservesCache && reservesCache.size > 0) return reservesCache;
  const map = new Map<string, Address>();
  const c = getClient();
  if (!c) return map;
  try {
    const tokens = await c.readContract({
      address: DATA_PROVIDER,
      abi: DATA_PROVIDER_ABI,
      functionName: "getAllReservesTokens",
    });
    for (const t of tokens) map.set(t.symbol.toUpperCase(), t.tokenAddress);
    if (map.size > 0) reservesCache = map;
  } catch {
    // leave empty; callers fall back to pinned addresses
  }
  return map;
}

/** Read live supply/borrow APY + utilization for an Aave reserve underlying. */
export async function fetchReserveRates(
  underlying: Address,
  symbol?: string,
): Promise<LendingMarket | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const data = await c.readContract({
      address: DATA_PROVIDER,
      abi: DATA_PROVIDER_ABI,
      functionName: "getReserveData",
      args: [underlying],
    });
    const totalAToken = data[2];
    const totalStableDebt = data[3];
    const totalVariableDebt = data[4];
    const liquidityRate = data[5];
    const variableBorrowRate = data[6];

    const totalDebt = totalStableDebt + totalVariableDebt;
    const utilizationPct =
      totalAToken > 0n ? (Number(totalDebt) / Number(totalAToken)) * 100 : 0;

    return {
      supplyApyPct: rayRateToApyPct(liquidityRate),
      variableBorrowApyPct: rayRateToApyPct(variableBorrowRate),
      utilizationPct,
      underlyingSymbol: symbol ?? null,
      source: "aave",
      updatedAt: nowIso(),
    };
  } catch {
    return null;
  }
}

/** Resolve a member-coin slug to its reserve and read live rates; null if N/A. */
export async function fetchReserveRatesForSlug(slug: string): Promise<LendingMarket | null> {
  const cfg = RESERVE_BY_SLUG[slug];
  if (!cfg) return null;

  let underlying = cfg.underlying;
  let symbol = cfg.symbols[0];
  if (!underlying) {
    const map = await reserveAddressBySymbol();
    for (const s of cfg.symbols) {
      const found = map.get(s.toUpperCase());
      if (found) {
        underlying = found;
        symbol = s;
        break;
      }
    }
  }
  if (!underlying) return null;
  return fetchReserveRates(underlying, symbol);
}

export interface UserReservePosition {
  aTokenBalance: number;
  variableDebt: number;
  /** Market supply APY for the reserve (rate is not per-user). */
  supplyApyPct: number | null;
  source: "aave";
  updatedAt: string | null;
}

/**
 * PHASE 2 (not wired into the product yet) — a connected user's per-reserve Aave
 * position. The supply APY itself is the market rate (Aave pays every supplier
 * the same `liquidityRate`); a user's *effective* yield is that rate weighted by
 * the balances returned here. Surfacing this needs a wallet/address association
 * for the user, which CanHav's research-only model does not collect today. Kept
 * here so the on-chain plumbing is ready when personal positions are built.
 */
export async function fetchUserReserveData(
  underlying: Address,
  user: Address,
  decimals = 18,
): Promise<UserReservePosition | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const data = await c.readContract({
      address: DATA_PROVIDER,
      abi: DATA_PROVIDER_ABI,
      functionName: "getUserReserveData",
      args: [underlying, user],
    });
    const scale = 10 ** decimals;
    const market = await fetchReserveRates(underlying);
    return {
      aTokenBalance: Number(data[0]) / scale,
      variableDebt: Number(data[2]) / scale,
      supplyApyPct: market?.supplyApyPct ?? null,
      source: "aave",
      updatedAt: nowIso(),
    };
  } catch {
    return null;
  }
}

// Re-exported for symmetry / future per-user reads (silences unused-const lint).
export const AAVE_POOL = POOL;
