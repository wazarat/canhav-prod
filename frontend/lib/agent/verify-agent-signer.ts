"use client";

import type { Signer } from "@zerodev/sdk/types";

import { deriveKernelAddress } from "@/lib/agent/kernel-address";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/**
 * Ensure the connected signer controls the agent smart account that holds
 * spendable credits (profile.agentAddress).
 */
export async function assertAgentKernelMatch(params: {
  signer: Signer;
  accountIndex: number;
  mintConfig: SpawnMintConfig;
  expectedAgentAddress: string;
}): Promise<void> {
  const derived = await deriveKernelAddress(
    params.signer,
    params.accountIndex,
    params.mintConfig,
  );
  if (derived.toLowerCase() !== params.expectedAgentAddress.toLowerCase()) {
    throw new Error(
      `Your connected wallet controls ${derived.slice(0, 6)}…${derived.slice(-4)}, but this agent's credits live at ${params.expectedAgentAddress.slice(0, 6)}…${params.expectedAgentAddress.slice(-4)}. Switch to the wallet that minted the agent.`,
    );
  }
}
