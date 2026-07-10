"use client";

/**
 * Browser-side CoFHE integration (FHE Phase 1). IMPORTANT: this module pulls
 * in @cofhe/sdk (TFHE WASM) — only ever load it via `await import(...)` from
 * client components under /agents, so the SDK never enters public-page
 * bundles (same scoping rule as the Privy bundle).
 *
 * Flow per encrypted proposal:
 *   encryptSizeUsd  — ZK-prove + CoFHE-verifier-sign the euint64 micro-USD
 *                     input (off-chain, ~5s first run incl. WASM/key init).
 *   registerIntent  — owner's Privy wallet calls EncryptedIntents.register()
 *                     (verifies the input on-chain and grants the owner ACL
 *                     access; without it decryptForView is permit_denied —
 *                     proven by scripts/fhe-spike.mjs).
 *   revealSizeUsd   — self-permit (one cached EIP-712 signature) + threshold-
 *                     network decrypt of the stored handle (~seconds).
 */

import type { ConnectedWallet } from "@privy-io/react-auth";

import { Encryptable, FheTypes } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { arbSepolia } from "@cofhe/sdk/chains";
import type { CofheClient } from "@cofhe/sdk";

import { buildPrivyWalletClient } from "@/lib/agent/privy-signer";
import { encryptedIntentsAbi } from "@/lib/agent/fhe/abi";
import { fheIntentsAddress } from "@/lib/agent/fhe/config";
import {
  microToUsd30,
  usd30ToMicro,
  type EncryptedUsdCipherJson,
} from "@/lib/agent/trade/types";

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

let cached: { address: string; client: CofheClient } | null = null;

async function getFheClient(wallet: ConnectedWallet): Promise<CofheClient> {
  if (cached?.address === wallet.address) return cached.client;

  const walletClient = await buildPrivyWalletClient(wallet);
  const { createPublicClient, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(DEFAULT_RPC),
  });

  const client = createCofheClient(
    createCofheConfig({ supportedChains: [arbSepolia] }),
  );
  await client.connect(publicClient, walletClient);
  cached = { address: wallet.address, client };
  return client;
}

/** Encrypt a 30-dec USD size as euint64 micro-USD. Off-chain; no gas. */
export async function encryptSizeUsd(
  wallet: ConnectedWallet,
  usd30: bigint,
  onStep?: (step: string) => void,
): Promise<EncryptedUsdCipherJson> {
  const client = await getFheClient(wallet);
  const micro = usd30ToMicro(usd30);
  const [input] = await client
    .encryptInputs([Encryptable.uint64(micro)])
    .setAccount(wallet.address)
    .onStep((step) => onStep?.(String(step)))
    .execute();
  return {
    v: 1,
    alg: "cofhe-euint64-micro",
    ctHash: input.ctHash.toString(),
    securityZone: input.securityZone,
    utype: input.utype,
    signature: input.signature,
  };
}

/**
 * Register the encrypted input on-chain (owner pays Sepolia gas) so the owner
 * can decrypt it later. Returns the envelope updated with the authoritative
 * emitted handle + register tx hash.
 */
export async function registerIntent(
  wallet: ConnectedWallet,
  cipher: EncryptedUsdCipherJson,
): Promise<EncryptedUsdCipherJson> {
  const address = fheIntentsAddress();
  if (!address) throw new Error("EncryptedIntents contract address is not configured.");

  const walletClient = await buildPrivyWalletClient(wallet);
  const { createPublicClient, decodeEventLog, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(DEFAULT_RPC),
  });

  // Same 3x fee headroom as executeTrade — wallet estimators quote the bare
  // base fee and get rejected when it ticks up; the chain only charges actual.
  const fees = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (fees.maxFeePerGas ?? 20_000_000n) * 3n;
  const maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 0n;

  const txHash = await walletClient.writeContract({
    address,
    abi: encryptedIntentsAbi,
    functionName: "register",
    args: [
      {
        ctHash: BigInt(cipher.ctHash),
        securityZone: cipher.securityZone,
        utype: cipher.utype,
        signature: cipher.signature as `0x${string}`,
      },
    ],
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("EncryptedIntents.register() reverted.");
  }

  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({
        abi: encryptedIntentsAbi,
        data: log.data,
        topics: log.topics,
      });
      if (ev.eventName === "IntentRegistered") {
        return {
          ...cipher,
          ctHash: ev.args.handle.toString(),
          registerTxHash: receipt.transactionHash,
        };
      }
    } catch {
      // not our event
    }
  }
  throw new Error("register() succeeded but emitted no IntentRegistered event.");
}

/** Owner-only reveal: self-permit + threshold-network decrypt → 30-dec USD. */
export async function revealSizeUsd(
  wallet: ConnectedWallet,
  ctHash: bigint,
): Promise<bigint> {
  const client = await getFheClient(wallet);
  await client.permits.getOrCreateSelfPermit();
  const micro = await client.decryptForView(ctHash, FheTypes.Uint64).execute();
  return microToUsd30(BigInt(micro));
}
