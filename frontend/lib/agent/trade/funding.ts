import "server-only";

import { createPublicClient, formatEther, http, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { USDC_SG } from "@/lib/agent/trade/gmx";
import { readSecret } from "@/lib/server/env";

const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export interface TradeFunding {
  address: Address;
  /** Sepolia ETH (gas + GMX execution fee), formatted to 4 decimals. */
  ethBalance: string;
  /** USDC.SG collateral (6 decimals), formatted to 2 decimals. */
  usdcSgBalance: string;
  /** Raw USDC.SG base units — lets the UI warn on zero collateral. */
  usdcSgRaw: bigint;
  ethRaw: bigint;
}

/**
 * Live funding readout for the owner's treasury wallet: the Sepolia ETH that
 * pays gas + the GMX execution fee, and the USDC.SG the markets take as
 * collateral (tCNHV is marketplace credit only — never trade collateral).
 * Fails soft to null so an RPC hiccup never breaks the Trade Desk.
 */
export async function readTradeFunding(address: Address): Promise<TradeFunding | null> {
  try {
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(
        readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc",
      ),
    });
    const [ethRaw, usdcSgRaw] = await Promise.all([
      client.getBalance({ address }),
      client.readContract({
        address: USDC_SG,
        abi: erc20BalanceAbi,
        functionName: "balanceOf",
        args: [address],
      }),
    ]);
    return {
      address,
      ethBalance: Number(formatEther(ethRaw)).toFixed(4),
      usdcSgBalance: (Number(usdcSgRaw) / 1e6).toFixed(2),
      usdcSgRaw,
      ethRaw,
    };
  } catch {
    return null;
  }
}
