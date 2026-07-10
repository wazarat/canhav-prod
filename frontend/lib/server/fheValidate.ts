import "server-only";

import { createPublicClient, decodeEventLog, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { encryptedIntentsAbi } from "@/lib/agent/fhe/abi";
import { fheIntentsAddress } from "@/lib/agent/fhe/config";
import { getAgentProfile } from "@/lib/agent/memory";
import type { EncryptedUsdCipherJson } from "@/lib/agent/trade/types";
import { readSecret } from "@/lib/server/env";

/** FheTypes.Uint64 in @cofhe/sdk (confirmed by scripts/fhe-spike.mjs). */
const FHE_UTYPE_UINT64 = 5;

export interface EnvelopeValidation {
  ok: boolean;
  error?: string;
}

function publicClient() {
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  return createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl) });
}

/**
 * Validate a CoFHE ciphertext envelope before storing it as a proposal size.
 *
 * The server can only ever validate PROVENANCE, never the value: the size,
 * whether it is within caps, and even whether the ciphertext encodes USD at
 * all are invisible here by design. Caps + MAX_SIZE_USD are enforced at
 * /api/agent/trade execute time, where plaintext legitimately exists.
 *
 * Checks (fail closed):
 *   1. Shape: v/alg/utype/securityZone/ctHash/signature.
 *   2. Binding: registerTxHash is a successful EncryptedIntents.register()
 *      tx whose IntentRegistered event matches this ctHash, and whose owner
 *      is the agent owner's recorded signer address (warn-only when the
 *      profile has no signerAddress — legacy agents predate its recording).
 */
export async function validateEncryptedEnvelope(
  agentId: string,
  env: EncryptedUsdCipherJson,
): Promise<EnvelopeValidation> {
  if (env.v !== 1 || env.alg !== "cofhe-euint64-micro") {
    return { ok: false, error: "Unsupported encrypted-size envelope version." };
  }
  if (env.utype !== FHE_UTYPE_UINT64) {
    return { ok: false, error: "Encrypted size must be euint64." };
  }
  if (env.securityZone !== 0) {
    return { ok: false, error: "Unexpected CoFHE security zone." };
  }
  let ctHash: bigint;
  try {
    ctHash = BigInt(env.ctHash);
    if (ctHash <= 0n) throw new Error("non-positive");
  } catch {
    return { ok: false, error: "Encrypted size handle is not a valid bigint." };
  }
  if (typeof env.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(env.signature)) {
    return { ok: false, error: "Encrypted size envelope has no verifier signature." };
  }

  const contract = fheIntentsAddress();
  if (!contract) {
    return { ok: false, error: "EncryptedIntents contract is not configured." };
  }
  if (!env.registerTxHash || !/^0x[0-9a-fA-F]{64}$/.test(env.registerTxHash)) {
    return { ok: false, error: "Encrypted size is not registered on-chain." };
  }

  let receipt;
  try {
    receipt = await publicClient().getTransactionReceipt({ hash: env.registerTxHash });
  } catch {
    return { ok: false, error: "Could not read the register() receipt." };
  }
  if (receipt.status !== "success") {
    return { ok: false, error: "register() transaction reverted." };
  }
  if (receipt.to?.toLowerCase() !== contract.toLowerCase()) {
    return { ok: false, error: "register() was not sent to EncryptedIntents." };
  }

  let registeredOwner: string | null = null;
  let handleMatches = false;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({
        abi: encryptedIntentsAbi,
        data: log.data,
        topics: log.topics,
      });
      if (ev.eventName === "IntentRegistered" && ev.args.handle === ctHash) {
        handleMatches = true;
        registeredOwner = ev.args.owner;
        break;
      }
    } catch {
      // not our event
    }
  }
  if (!handleMatches) {
    return { ok: false, error: "register() receipt does not cover this ciphertext handle." };
  }

  const profile = await getAgentProfile(agentId);
  const signer = profile?.signerAddress ?? null;
  if (signer && registeredOwner && signer.toLowerCase() !== registeredOwner.toLowerCase()) {
    return { ok: false, error: "Ciphertext was registered by a different wallet." };
  }
  if (!signer) {
    console.warn(
      `[fheValidate] agent ${agentId} has no recorded signerAddress — ` +
        `accepting envelope registered by ${registeredOwner} without owner binding.`,
    );
  }

  return { ok: true };
}
