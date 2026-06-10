import "server-only";

import { createPublicClient, getAddress, http, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/config";
import { readSecret } from "@/lib/server/env";

/**
 * On-chain ERC-8004 identity verification (read-only).
 *
 * Lets the platform prove an agent's identity itself instead of depending on a
 * third-party explorer that may not index Arbitrum Sepolia (421614): we read
 * `ownerOf(agentId)` + `tokenURI(agentId)` from the deployed IdentityRegistry
 * and confirm the owner matches the agent's smart-account address. Everything
 * degrades gracefully — a missing registry/RPC returns `configured:false` rather
 * than throwing, so the research pillar is never blocked.
 */

const identityReadAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

export interface OnChainVerification {
  /** True only when an on-chain read succeeded AND the owner matches the agent. */
  verified: boolean;
  /** Whether the registry address is provisioned (else nothing can be read). */
  configured: boolean;
  agentId: string;
  chainId: number;
  registry: string | null;
  /** `ownerOf(agentId)` as read from chain. */
  owner: string | null;
  /** The agent's smart account we expect to own the token. */
  expectedOwner: string | null;
  /** `tokenURI(agentId)` (the agent card / registration URI). */
  tokenURI: string | null;
  /** Arbiscan link to the token on Arbitrum Sepolia. */
  arbiscanUrl: string | null;
  error?: string;
}

function rpcUrl(): string {
  return readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? DEFAULT_RPC;
}

function registryAddress(): Address | null {
  const addr = readSecret("IDENTITY_REGISTRY_ADDRESS");
  if (!addr) return null;
  try {
    return getAddress(addr);
  } catch {
    return null;
  }
}

function safeChecksum(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return getAddress(value as Address);
  } catch {
    return value;
  }
}

/**
 * Verify an agent's ERC-8004 identity on Arbitrum Sepolia. `agentId` must be the
 * numeric ERC-721 tokenId (minted agents); non-minted/local agents return
 * `verified:false` with an explanatory message.
 */
export async function verifyAgentOnChain(
  agentId: string,
  expectedAddress?: string | null,
): Promise<OnChainVerification> {
  const registry = registryAddress();
  const base: OnChainVerification = {
    verified: false,
    configured: Boolean(registry),
    agentId,
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    registry,
    owner: null,
    expectedOwner: safeChecksum(expectedAddress),
    tokenURI: null,
    arbiscanUrl: registry ? `https://sepolia.arbiscan.io/token/${registry}?a=${agentId}` : null,
  };

  if (!registry) {
    return { ...base, error: "IDENTITY_REGISTRY_ADDRESS not configured." };
  }

  let tokenId: bigint;
  try {
    tokenId = BigInt(agentId);
  } catch {
    return { ...base, error: "Agent has no on-chain tokenId yet (not minted)." };
  }

  try {
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
    const [owner, tokenURI] = await Promise.all([
      client.readContract({
        address: registry,
        abi: identityReadAbi,
        functionName: "ownerOf",
        args: [tokenId],
      }),
      client.readContract({
        address: registry,
        abi: identityReadAbi,
        functionName: "tokenURI",
        args: [tokenId],
      }),
    ]);

    const ownerStr = getAddress(owner);
    const verified = base.expectedOwner
      ? ownerStr.toLowerCase() === base.expectedOwner.toLowerCase()
      : true;

    return { ...base, owner: ownerStr, tokenURI, verified };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "On-chain read failed." };
  }
}
