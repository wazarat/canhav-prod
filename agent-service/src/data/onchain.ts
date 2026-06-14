import { createPublicClient, http, type Address } from "viem";
import { arbitrum } from "viem/chains";

import type { WatchedAsset } from "../types";

const erc20Abi = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

/** Minimal Curve pool ABI for reserve reads (balanceOf on pool tokens). */
const curvePoolAbi = [
  {
    type: "function",
    name: "balances",
    stateMutability: "view",
    inputs: [{ name: "i", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

function readRpcUrl(): string {
  return (
    process.env.ARBITRUM_ONE_RPC_URL ??
    process.env.ALCHEMY_ARBITRUM_ONE_RPC ??
    "https://arb1.arbitrum.io/rpc"
  );
}

function client() {
  return createPublicClient({
    chain: arbitrum,
    transport: http(readRpcUrl()),
  });
}

/** Read ERC-20 totalSupply for the asset token (read-only, Arbitrum One). */
export async function readTotalSupply(asset: WatchedAsset): Promise<bigint | null> {
  try {
    return await client().readContract({
      address: asset.token,
      abi: erc20Abi,
      functionName: "totalSupply",
    });
  } catch {
    return null;
  }
}

export interface PoolReserves {
  pool: Address;
  balances: bigint[];
}

/** Read pool reserve balances when a Curve-style pool is configured. */
export async function readPoolReserves(asset: WatchedAsset): Promise<PoolReserves[]> {
  const results: PoolReserves[] = [];
  for (const pool of asset.pools) {
    if (pool === "0x0000000000000000000000000000000000000000") continue;
    try {
      const balances: bigint[] = [];
      for (let i = 0; i < 2; i++) {
        const bal = await client().readContract({
          address: pool,
          abi: curvePoolAbi,
          functionName: "balances",
          args: [BigInt(i)],
        });
        balances.push(bal);
      }
      results.push({ pool, balances });
    } catch {
      /* pool read failed — caller falls back to off-chain price */
    }
  }
  return results;
}

export interface CoreState {
  totalSupply: bigint | null;
  poolTvl: bigint | null;
}

/** Aggregate protocol-level on-chain state from token + pools. */
export async function readCoreState(asset: WatchedAsset): Promise<CoreState> {
  const [supply, pools] = await Promise.all([readTotalSupply(asset), readPoolReserves(asset)]);
  let poolTvl: bigint | null = null;
  if (pools.length) {
    poolTvl = pools.reduce((sum, p) => sum + p.balances.reduce((a, b) => a + b, 0n), 0n);
  }
  return { totalSupply: supply, poolTvl };
}
