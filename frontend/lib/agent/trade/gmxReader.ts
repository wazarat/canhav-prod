import "server-only";

import { createPublicClient, http, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { readerAbi } from "@/lib/agent/trade/abi/gmx";
import { DATA_STORE, READER } from "@/lib/agent/trade/gmx";
import { readSecret } from "@/lib/server/env";

function publicClient() {
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });
}

export interface GmxMarketInfo {
  marketToken: Address;
  indexToken: Address;
  longToken: Address;
  shortToken: Address;
}

/** Fetch GMX markets from Reader (paginated). */
export async function listGmxMarkets(start = 0, end = 20): Promise<GmxMarketInfo[]> {
  const client = publicClient();
  try {
    const markets = await client.readContract({
      address: READER,
      abi: readerAbi,
      functionName: "getMarkets",
      args: [DATA_STORE, BigInt(start), BigInt(end)],
    });
    return markets.map((m) => ({
      marketToken: m.marketToken,
      indexToken: m.indexToken,
      longToken: m.longToken,
      shortToken: m.shortToken,
    }));
  } catch {
    return [];
  }
}

/**
 * Resolve a market token for trading. Prefers a market whose shortToken matches
 * collateral (USDC) when index hint is WETH/ETH.
 */
export async function resolveGmxMarket(params: {
  marketIndexToken: string;
  collateralToken: Address;
}): Promise<Address | null> {
  const markets = await listGmxMarkets(0, 32);
  if (!markets.length) return null;

  const hint = params.marketIndexToken.toLowerCase();
  const collateral = params.collateralToken.toLowerCase();

  const withCollateral = markets.filter((m) => m.shortToken.toLowerCase() === collateral);
  const pool = withCollateral.length ? withCollateral : markets;

  if (hint === "weth" || hint === "eth") {
    return pool[0]?.marketToken ?? null;
  }

  return pool[0]?.marketToken ?? null;
}
