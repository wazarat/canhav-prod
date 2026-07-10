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
import { agentCapKey } from "@/lib/agent/fhe/agentKey";
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

/** Envelope input tuple for register/setCaps/registerAndCheck calls. */
function toInEuint64(cipher: EncryptedUsdCipherJson) {
  return {
    ctHash: BigInt(cipher.ctHash),
    securityZone: cipher.securityZone,
    utype: cipher.utype,
    signature: cipher.signature as `0x${string}`,
  };
}

/**
 * Send an EncryptedIntents write and return the decoded receipt events.
 * Same 3x fee headroom as executeTrade — wallet estimators quote the bare
 * base fee and get rejected when it ticks up; the chain only charges actual.
 */
async function writeIntents(
  wallet: ConnectedWallet,
  functionName: "register" | "setCaps" | "registerAndCheck" | "recordSpend",
  args: readonly unknown[],
): Promise<{
  txHash: `0x${string}`;
  events: { eventName: string; args: Record<string, unknown> }[];
}> {
  const address = fheIntentsAddress();
  if (!address) throw new Error("EncryptedIntents contract address is not configured.");

  const walletClient = await buildPrivyWalletClient(wallet);
  const { createPublicClient, decodeEventLog, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(DEFAULT_RPC),
  });

  const fees = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (fees.maxFeePerGas ?? 20_000_000n) * 3n;
  const maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 0n;

  const txHash = await walletClient.writeContract({
    address,
    abi: encryptedIntentsAbi,
    functionName,
    // Viem cannot narrow a dynamic functionName across this ABI union.
    args: args as never,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`EncryptedIntents.${functionName}() reverted.`);
  }

  const events: { eventName: string; args: Record<string, unknown> }[] = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== address.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({
        abi: encryptedIntentsAbi,
        data: log.data,
        topics: log.topics,
      });
      events.push({ eventName: ev.eventName, args: ev.args as Record<string, unknown> });
    } catch {
      // not our event
    }
  }
  return { txHash: receipt.transactionHash, events };
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
  const { txHash, events } = await writeIntents(wallet, "register", [toInEuint64(cipher)]);
  const registered = events.find((e) => e.eventName === "IntentRegistered");
  if (!registered) {
    throw new Error("register() succeeded but emitted no IntentRegistered event.");
  }
  return {
    ...cipher,
    ctHash: (registered.args.handle as bigint).toString(),
    registerTxHash: txHash,
  };
}

/**
 * FHE Phase 2: encrypt both caps (euint64 micro-USD) and store them on-chain
 * for (owner wallet, agentId). One wallet signature; testnet gas.
 */
export async function setCapsOnchain(
  wallet: ConnectedWallet,
  agentId: string,
  perTradeUsd30: bigint,
  cumulativeUsd30: bigint,
  onStep?: (step: string) => void,
): Promise<`0x${string}`> {
  const client = await getFheClient(wallet);
  const [perTrade, cumulative] = await client
    .encryptInputs([
      Encryptable.uint64(usd30ToMicro(perTradeUsd30)),
      Encryptable.uint64(usd30ToMicro(cumulativeUsd30)),
    ])
    .setAccount(wallet.address)
    .onStep((step) => onStep?.(String(step)))
    .execute();
  const { txHash } = await writeIntents(wallet, "setCaps", [
    agentCapKey(agentId),
    { ctHash: perTrade.ctHash, securityZone: perTrade.securityZone, utype: perTrade.utype, signature: perTrade.signature },
    { ctHash: cumulative.ctHash, securityZone: cumulative.securityZone, utype: cumulative.utype, signature: cumulative.signature },
  ]);
  return txHash;
}

/**
 * FHE Phase 2: register an encrypted size AND compare it to the on-chain
 * encrypted caps in one tx. Returns the updated envelope plus the ebool
 * handle whose (owner-only) decryption says "within caps".
 */
export async function registerAndCheckIntent(
  wallet: ConnectedWallet,
  agentId: string,
  cipher: EncryptedUsdCipherJson,
): Promise<{ envelope: EncryptedUsdCipherJson; okHandle: bigint }> {
  const { txHash, events } = await writeIntents(wallet, "registerAndCheck", [
    agentCapKey(agentId),
    toInEuint64(cipher),
  ]);
  const checked = events.find((e) => e.eventName === "CapChecked");
  if (!checked) {
    throw new Error("registerAndCheck() succeeded but emitted no CapChecked event.");
  }
  const okHandle = checked.args.okHandle as bigint;
  return {
    envelope: {
      ...cipher,
      ctHash: (checked.args.sizeHandle as bigint).toString(),
      registerTxHash: txHash,
      capOkHandle: okHandle.toString(),
    },
    okHandle,
  };
}

/**
 * Decrypt the cap-check ebool via the threshold network in attested form:
 * the returned signature lets ANYONE (the CanHav server) verify that this
 * handle decrypts to this boolean — without seeing size, caps, or spend.
 */
export async function attestCapCheck(
  wallet: ConnectedWallet,
  okHandle: bigint,
): Promise<{ within: boolean; signature: `0x${string}` }> {
  const client = await getFheClient(wallet);
  await client.permits.getOrCreateSelfPermit();
  const result = await client.decryptForTx(okHandle).withPermit().execute();
  return { within: BigInt(result.decryptedValue) !== 0n, signature: result.signature };
}

/**
 * FHE Phase 2: add an executed intent's size to the encrypted 24h spend
 * counter. Owner-initiated by design — call best-effort after a GMX fill.
 */
export async function recordSpendOnchain(
  wallet: ConnectedWallet,
  agentId: string,
  sizeHandle: bigint,
): Promise<`0x${string}`> {
  const { txHash } = await writeIntents(wallet, "recordSpend", [agentCapKey(agentId), sizeHandle]);
  return txHash;
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
