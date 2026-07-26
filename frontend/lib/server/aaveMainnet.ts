import "server-only";

import { createPublicClient, http, fallback, type Address } from "viem";
import { mainnet } from "viem/chains";

import { readSecret } from "@/lib/server/env";

/**
 * Aave V3 ETHEREUM CORE market overview: the representative market for the
 * aave entity's Lending rows (M4 decision: the spec's source cheat-sheet says
 * eth-mainnet; the Arbitrum module in `aave.ts` stays for member-coin rates).
 *
 * Only the PoolAddressesProvider address is pinned (stable since launch,
 * bgd-labs address book); the data provider and price oracle are resolved
 * through it on-chain so Aave contract upgrades cannot silently break reads.
 * All reserves are read in a handful of Multicall3 batches. Everything fails
 * soft to null; callers render honest empties.
 */

// AaveV3Ethereum.POOL_ADDRESSES_PROVIDER (bgd-labs address book; stable).
const ADDRESSES_PROVIDER: Address = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

const DEFAULT_BASE_URL = "https://eth-mainnet.g.alchemy.com/v2";
const PUBLIC_FALLBACK_RPC = "https://ethereum-rpc.publicnode.com";

const RAY = 1e27;
const SECONDS_PER_YEAR = 31_536_000;
// Aave oracle prices are USD with 8 decimals.
const ORACLE_DECIMALS = 1e8;

const ADDRESSES_PROVIDER_ABI = [
  {
    type: "function",
    name: "getPoolDataProvider",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getPriceOracle",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const DATA_PROVIDER_ABI = [
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
    name: "getReserveConfigurationData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "decimals", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "liquidationThreshold", type: "uint256" },
      { name: "liquidationBonus", type: "uint256" },
      { name: "reserveFactor", type: "uint256" },
      { name: "usageAsCollateralEnabled", type: "bool" },
      { name: "borrowingEnabled", type: "bool" },
      { name: "stableBorrowRateEnabled", type: "bool" },
      { name: "isActive", type: "bool" },
      { name: "isFrozen", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getReserveCaps",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "borrowCap", type: "uint256" },
      { name: "supplyCap", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getDebtCeiling",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const ORACLE_ABI = [
  {
    type: "function",
    name: "getAssetPrice",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function mainnetRpcUrls(): string[] {
  const urls: string[] = [];
  const key = readSecret("ALCHEMY_API_KEY");
  if (key) {
    let base = readSecret("ALCHEMY_ETH_BASE_URL") || DEFAULT_BASE_URL;
    if (!/eth/i.test(base)) base = DEFAULT_BASE_URL;
    base = base.replace(/\/+$/, "");
    urls.push(base.endsWith(key) ? base : `${base}/${key}`);
  }
  urls.push(PUBLIC_FALLBACK_RPC);
  return urls;
}

let client: ReturnType<typeof createPublicClient> | null = null;

function getClient(): ReturnType<typeof createPublicClient> | null {
  if (client) return client;
  client = createPublicClient({
    chain: mainnet,
    transport: fallback(mainnetRpcUrls().map((u) => http(u))),
  });
  return client;
}

function rayRateToApyPct(rateRay: bigint): number {
  const apr = Number(rateRay) / RAY;
  return ((1 + apr / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1) * 100;
}

export interface AaveMarketOverview {
  /** Sum of aToken supply across reserves, USD (spec L1). */
  totalSuppliedUsd: number;
  /** Sum of stable + variable debt across reserves, USD (spec L2). */
  totalBorrowedUsd: number;
  /** Borrowed / supplied, percent (spec L4). */
  utilizationPct: number;
  /** Supply-weighted supply APY, percent (spec L5, base rate). */
  weightedSupplyApyPct: number | null;
  /** Debt-weighted variable borrow APY, percent (spec L7). */
  weightedVariableBorrowApyPct: number | null;
  /** Stable-debt-weighted stable borrow APY, percent; null when no stable debt (spec L8). */
  weightedStableBorrowApyPct: number | null;
  /** Supply-weighted max LTV of collateral-enabled reserves, percent (spec L10). */
  maxLtvPct: number | null;
  /** Supply-weighted liquidation threshold, percent (spec L16). */
  weightedLiquidationThresholdPct: number | null;
  /** Supply-weighted liquidation bonus, percent above par (spec L17). */
  weightedLiquidationBonusPct: number | null;
  /** Debt-weighted reserve factor, percent (spec L18). */
  weightedReserveFactorPct: number | null;
  /** Reserves accepted as collateral, largest supply first (spec L10). */
  collateralAssets: string[];
  /** Borrowable reserves, largest debt first (spec L11). */
  loanAssets: string[];
  /** Reserves in isolation mode (debt ceiling set) (spec L12). */
  isolatedMarketsCount: number;
  /** Sum of configured supply caps, USD; uncapped reserves excluded (spec L19). */
  supplyCapUsd: number | null;
  /** Sum of configured borrow caps, USD; uncapped reserves excluded (spec L19). */
  borrowCapUsd: number | null;
  /** Active, unfrozen reserves read. */
  reserveCount: number;
  updatedAt: string;
}

/**
 * Read the whole Ethereum core market in 1 + 4 batched calls. Roughly 30
 * reserves; Multicall3 keeps this to a handful of RPC round-trips.
 */
export async function fetchAaveMarketOverview(): Promise<AaveMarketOverview | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const [dataProvider, oracle] = await Promise.all([
      c.readContract({
        address: ADDRESSES_PROVIDER,
        abi: ADDRESSES_PROVIDER_ABI,
        functionName: "getPoolDataProvider",
      }),
      c.readContract({
        address: ADDRESSES_PROVIDER,
        abi: ADDRESSES_PROVIDER_ABI,
        functionName: "getPriceOracle",
      }),
    ]);

    const reserves = await c.readContract({
      address: dataProvider,
      abi: DATA_PROVIDER_ABI,
      functionName: "getAllReservesTokens",
    });
    if (!reserves.length) return null;

    const [dataRes, configRes, capsRes, ceilingRes, priceRes] = await Promise.all([
      c.multicall({
        contracts: reserves.map((r) => ({
          address: dataProvider,
          abi: DATA_PROVIDER_ABI,
          functionName: "getReserveData" as const,
          args: [r.tokenAddress] as const,
        })),
        allowFailure: true,
      }),
      c.multicall({
        contracts: reserves.map((r) => ({
          address: dataProvider,
          abi: DATA_PROVIDER_ABI,
          functionName: "getReserveConfigurationData" as const,
          args: [r.tokenAddress] as const,
        })),
        allowFailure: true,
      }),
      c.multicall({
        contracts: reserves.map((r) => ({
          address: dataProvider,
          abi: DATA_PROVIDER_ABI,
          functionName: "getReserveCaps" as const,
          args: [r.tokenAddress] as const,
        })),
        allowFailure: true,
      }),
      c.multicall({
        contracts: reserves.map((r) => ({
          address: dataProvider,
          abi: DATA_PROVIDER_ABI,
          functionName: "getDebtCeiling" as const,
          args: [r.tokenAddress] as const,
        })),
        allowFailure: true,
      }),
      c.multicall({
        contracts: reserves.map((r) => ({
          address: oracle,
          abi: ORACLE_ABI,
          functionName: "getAssetPrice" as const,
          args: [r.tokenAddress] as const,
        })),
        allowFailure: true,
      }),
    ]);

    let suppliedUsd = 0;
    let borrowedUsd = 0;
    let stableDebtUsd = 0;
    let supplyApyW = 0;
    let borrowApyW = 0;
    let stableApyW = 0;
    let ltvW = 0;
    let ltvWeight = 0;
    let liqThresholdW = 0;
    let liqBonusW = 0;
    let reserveFactorW = 0;
    let supplyCap = 0;
    let borrowCap = 0;
    let anyCap = false;
    let isolated = 0;
    let count = 0;
    const collateral: { symbol: string; usd: number }[] = [];
    const loans: { symbol: string; usd: number }[] = [];

    for (let i = 0; i < reserves.length; i++) {
      const data = dataRes[i];
      const config = configRes[i];
      if (data.status !== "success" || config.status !== "success") continue;
      const price = priceRes[i].status === "success" ? Number(priceRes[i].result) / ORACLE_DECIMALS : null;
      if (price == null || price <= 0) continue;

      const [decimalsBn, ltvBps, liqThresholdBps, liqBonusBps, reserveFactorBps, collateralEnabled, borrowingEnabled] =
        config.result;
      const decimals = Number(decimalsBn);
      const scale = 10 ** decimals;

      const totalAToken = Number(data.result[2]) / scale;
      const totalStableDebt = Number(data.result[3]) / scale;
      const totalVariableDebt = Number(data.result[4]) / scale;
      const supplyUsd = totalAToken * price;
      const debtUsd = (totalStableDebt + totalVariableDebt) * price;
      const sDebtUsd = totalStableDebt * price;

      suppliedUsd += supplyUsd;
      borrowedUsd += debtUsd;
      stableDebtUsd += sDebtUsd;
      count += 1;

      supplyApyW += rayRateToApyPct(data.result[5]) * supplyUsd;
      borrowApyW += rayRateToApyPct(data.result[6]) * debtUsd;
      if (sDebtUsd > 0) stableApyW += rayRateToApyPct(data.result[8]) * sDebtUsd;
      reserveFactorW += (Number(reserveFactorBps) / 100) * debtUsd;

      if (collateralEnabled && Number(ltvBps) > 0) {
        collateral.push({ symbol: reserves[i].symbol, usd: supplyUsd });
        ltvW += (Number(ltvBps) / 100) * supplyUsd;
        liqThresholdW += (Number(liqThresholdBps) / 100) * supplyUsd;
        // Liquidation bonus is stored as e.g. 10500 bps = 5% above par.
        liqBonusW += (Number(liqBonusBps) / 100 - 100) * supplyUsd;
        ltvWeight += supplyUsd;
      }
      if (borrowingEnabled) loans.push({ symbol: reserves[i].symbol, usd: debtUsd });

      const caps = capsRes[i];
      if (caps.status === "success") {
        const [bCap, sCap] = caps.result;
        if (sCap > 0n) {
          supplyCap += Number(sCap) * price;
          anyCap = true;
        }
        if (bCap > 0n) {
          borrowCap += Number(bCap) * price;
          anyCap = true;
        }
      }
      const ceiling = ceilingRes[i];
      if (ceiling.status === "success" && ceiling.result > 0n) isolated += 1;
    }

    if (count === 0 || suppliedUsd <= 0) return null;

    collateral.sort((a, b) => b.usd - a.usd);
    loans.sort((a, b) => b.usd - a.usd);

    return {
      totalSuppliedUsd: suppliedUsd,
      totalBorrowedUsd: borrowedUsd,
      utilizationPct: (borrowedUsd / suppliedUsd) * 100,
      weightedSupplyApyPct: suppliedUsd > 0 ? supplyApyW / suppliedUsd : null,
      weightedVariableBorrowApyPct: borrowedUsd > 0 ? borrowApyW / borrowedUsd : null,
      weightedStableBorrowApyPct: stableDebtUsd > 0 ? stableApyW / stableDebtUsd : null,
      maxLtvPct: ltvWeight > 0 ? ltvW / ltvWeight : null,
      weightedLiquidationThresholdPct: ltvWeight > 0 ? liqThresholdW / ltvWeight : null,
      weightedLiquidationBonusPct: ltvWeight > 0 ? liqBonusW / ltvWeight : null,
      weightedReserveFactorPct: borrowedUsd > 0 ? reserveFactorW / borrowedUsd : null,
      collateralAssets: collateral.map((x) => x.symbol),
      loanAssets: loans.filter((x) => x.usd > 0).map((x) => x.symbol),
      isolatedMarketsCount: isolated,
      supplyCapUsd: anyCap && supplyCap > 0 ? supplyCap : null,
      borrowCapUsd: anyCap && borrowCap > 0 ? borrowCap : null,
      reserveCount: count,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
