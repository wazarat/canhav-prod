"use client";

import type { Signer } from "@zerodev/sdk/types";

import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/**
 * Derive a ZeroDev kernel smart-account address for the connected wallet signer.
 * Used to prove control of an agent sub-account during ownership reclaim.
 */
export async function deriveKernelAddress(
  signer: Signer,
  accountIndex: number,
  mintConfig: SpawnMintConfig,
): Promise<string> {
  const svc = await import("canhav-agent-service");
  const cfg = svc.createConfig({
    zerodevRpc: mintConfig.zerodevRpc,
    rpcUrl: mintConfig.rpcUrl,
    identityRegistry: mintConfig.identityRegistry,
    securityRegistry: mintConfig.securityRegistry,
  });
  const kernel = await svc.createEcdsaKernelAccount(cfg, signer, BigInt(accountIndex));
  return kernel.address;
}
