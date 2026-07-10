"use client";

/**
 * SDK-free EncryptedIntents chain reads (FHE Phase 2). Deliberately does NOT
 * import @cofhe/sdk — display surfaces (the Trade Desk caps card) can check
 * on-chain cap state without pulling the TFHE WASM bundle. Keep every
 * ciphertext operation in ./client.ts.
 */

import { encryptedIntentsAbi } from "@/lib/agent/fhe/abi";
import { agentCapKey } from "@/lib/agent/fhe/agentKey";
import { fheIntentsAddress } from "@/lib/agent/fhe/config";

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

export interface OnchainCapsStatus {
  /** null = contract not configured (deploy pending). */
  configured: boolean;
  hasCaps: boolean;
  /** Unix seconds; 0 when caps were never set. */
  windowStart: number;
}

/** Read whether encrypted caps exist on-chain for (owner, agent). Soft-fails to "none". */
export async function readOnchainCaps(
  ownerAddress: string,
  agentId: string,
): Promise<OnchainCapsStatus> {
  const address = fheIntentsAddress();
  if (!address) return { configured: false, hasCaps: false, windowStart: 0 };

  const { createPublicClient, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(DEFAULT_RPC) });
  const agentKey = agentCapKey(agentId);
  try {
    const [hasCaps, windowStart] = await Promise.all([
      client.readContract({
        address,
        abi: encryptedIntentsAbi,
        functionName: "hasCaps",
        args: [ownerAddress as `0x${string}`, agentKey],
      }),
      client.readContract({
        address,
        abi: encryptedIntentsAbi,
        functionName: "capWindowStart",
        args: [ownerAddress as `0x${string}`, agentKey],
      }),
    ]);
    return { configured: true, hasCaps, windowStart: Number(windowStart) };
  } catch {
    return { configured: true, hasCaps: false, windowStart: 0 };
  }
}
