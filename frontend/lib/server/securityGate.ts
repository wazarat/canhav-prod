import "server-only";

import { createPublicClient, http, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";
import { readSecret } from "@/lib/server/env";

/** Minimal SecurityRegistry ABI — mirrors agent-service/src/abi/registries.ts */
const securityRegistryAbi = [
  {
    type: "function",
    name: "isAllowed",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function registryAddress(): Address | null {
  const raw = readSecret("SECURITY_REGISTRY_ADDRESS");
  if (!raw || !/^0x[0-9a-fA-F]{40}$/.test(raw)) return null;
  return raw as Address;
}

function publicClient() {
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });
}

/** Read the on-chain SecurityRegistry allowlist for a target. */
export async function isTargetAllowed(target: Address): Promise<boolean> {
  const registry = registryAddress();
  if (!registry) return false;
  return publicClient().readContract({
    address: registry,
    abi: securityRegistryAbi,
    functionName: "isAllowed",
    args: [target],
  });
}

/** Arbitrum Sepolia-only guard for trade paths. */
export function assertArbitrumSepoliaChain(chainId = ARBITRUM_SEPOLIA_CHAIN_ID): void {
  if (chainId !== ARBITRUM_SEPOLIA_CHAIN_ID) {
    throw new Error(`Trades are Arbitrum Sepolia (${ARBITRUM_SEPOLIA_CHAIN_ID}) only.`);
  }
}
