"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Signer } from "@zerodev/sdk/types";

import { resolveActiveWallet } from "@/lib/agent/privy-signer";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/** Privy wallet address used as the user treasury when ZeroDev is off. */
export function resolveTreasuryAddress(wallets: ConnectedWallet[]): string | null {
  return resolveActiveWallet(wallets)?.address ?? null;
}

/**
 * Derive a ZeroDev kernel smart-account address for the connected wallet signer.
 * Used to prove control of an agent sub-account during ownership reclaim (legacy
 * ZeroDev path only — set USE_ZERODEV=true).
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
