import "server-only";

import {
  createPublicClient,
  encodePacked,
  http,
  isAddressEqual,
  keccak256,
  recoverAddress,
  zeroAddress,
} from "viem";
import { arbitrumSepolia } from "viem/chains";

import { COFHE_TASK_MANAGER, cofheTaskManagerAbi, encryptedIntentsAbi } from "@/lib/agent/fhe/abi";
import { agentCapKey } from "@/lib/agent/fhe/agentKey";
import { fheIntentsAddress } from "@/lib/agent/fhe/config";
import { getAgentProfile } from "@/lib/agent/memory";
import type { EncryptedUsdCipherJson } from "@/lib/agent/trade/types";
import { readSecret } from "@/lib/server/env";

/**
 * FHE Phase 2: server-side verification of an ON-CHAIN encrypted cap check.
 *
 * The client claims "the registerAndCheck ebool for this proposal decrypts to
 * `within`", carrying the threshold network's attestation signature. The
 * server verifies WITHOUT learning size, caps, or spend:
 *
 *   1. Binding (contract read, fail closed): capCheckOf(sizeHandle) ties the
 *      envelope's registered size handle to (registrant owner, agentKey,
 *      okHandle). The registrant must be the agent owner's signer, the
 *      agentKey must derive from THIS agent's id, and the okHandle must match
 *      the claim — so an attestation for some other ciphertext (or agent, or
 *      wallet) can never be replayed here.
 *   2. Attestation (signature recovery, fail closed): the claim's signature
 *      must recover to TaskManager.decryptResultSigner() over the CoFHE
 *      result hash keccak256(cleartext ‖ utype ‖ chainId ‖ ctHash) — the same
 *      preimage @cofhe/sdk verifies. A zero signer (network not attesting)
 *      fails closed; it is nonzero on Arbitrum Sepolia today.
 *
 * Staleness is accepted by design: the ebool compared spend AT CHECK TIME.
 * The plaintext cap check at /api/agent/trade remains the enforcement
 * backstop when the owner signs.
 */

export interface CapCheckClaim {
  okHandle: string;
  within: boolean;
  signature: string;
}

export interface CapCheckVerification {
  ok: boolean;
  within?: boolean;
  error?: string;
}

/** CoFHE packs the FheType into ctHash bits 8..14 (see @cofhe/sdk). */
function utypeFromHandle(handle: bigint): number {
  return Number((handle >> 8n) & 0x7fn);
}

function publicClient() {
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  return createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl) });
}

export async function verifyCapCheckClaim(
  agentId: string,
  env: EncryptedUsdCipherJson,
  claim: CapCheckClaim,
): Promise<CapCheckVerification> {
  if (typeof claim.within !== "boolean") {
    return { ok: false, error: "Cap-check claim has no boolean verdict." };
  }
  if (typeof claim.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(claim.signature)) {
    return { ok: false, error: "Cap-check claim has no attestation signature." };
  }
  let okHandle: bigint;
  let sizeHandle: bigint;
  try {
    okHandle = BigInt(claim.okHandle);
    sizeHandle = BigInt(env.ctHash);
    if (okHandle <= 0n || sizeHandle <= 0n) throw new Error("non-positive");
  } catch {
    return { ok: false, error: "Cap-check claim handles are not valid bigints." };
  }
  if (env.capOkHandle != null && BigInt(env.capOkHandle) !== okHandle) {
    return { ok: false, error: "Cap-check claim does not match the envelope's ebool handle." };
  }

  const contract = fheIntentsAddress();
  if (!contract) {
    return { ok: false, error: "EncryptedIntents contract is not configured." };
  }

  const client = publicClient();

  // 1. Binding: the contract's own record of this size handle's cap check.
  let bound;
  try {
    bound = await client.readContract({
      address: contract,
      abi: encryptedIntentsAbi,
      functionName: "capCheckOf",
      args: [sizeHandle],
    });
  } catch {
    return { ok: false, error: "Could not read the on-chain cap-check binding." };
  }
  const [boundOwner, boundAgentKey, boundOkHandle] = bound;
  if (boundOkHandle === 0n || boundOwner === zeroAddress) {
    return { ok: false, error: "No on-chain cap check exists for this ciphertext." };
  }
  if (boundOkHandle !== okHandle) {
    return { ok: false, error: "Claimed ebool is not this proposal's cap-check result." };
  }
  if (boundAgentKey.toLowerCase() !== agentCapKey(agentId).toLowerCase()) {
    return { ok: false, error: "Cap check belongs to a different agent." };
  }
  const profile = await getAgentProfile(agentId);
  const signer = profile?.signerAddress ?? null;
  if (signer && !isAddressEqual(boundOwner, signer as `0x${string}`)) {
    return { ok: false, error: "Cap check was made by a different wallet." };
  }
  if (!signer) {
    console.warn(
      `[fheCapCheck] agent ${agentId} has no recorded signerAddress — ` +
        `accepting cap check bound to ${boundOwner} without owner binding.`,
    );
  }

  // 2. Attestation: recover the threshold network's signature over the result.
  let attestor: `0x${string}`;
  try {
    attestor = await client.readContract({
      address: COFHE_TASK_MANAGER,
      abi: cofheTaskManagerAbi,
      functionName: "decryptResultSigner",
    });
  } catch {
    return { ok: false, error: "Could not read the CoFHE attestation signer." };
  }
  if (isAddressEqual(attestor, zeroAddress)) {
    // @cofhe/sdk treats a zero signer as "verification unavailable → pass";
    // we fail closed instead — auto-execute needs a real attestation.
    return { ok: false, error: "CoFHE network does not attest decrypts here — cap check deferred." };
  }

  const resultHash = keccak256(
    encodePacked(
      ["uint256", "uint32", "uint64", "uint256"],
      [claim.within ? 1n : 0n, utypeFromHandle(okHandle), BigInt(arbitrumSepolia.id), okHandle],
    ),
  );
  let recovered: `0x${string}`;
  try {
    recovered = await recoverAddress({
      hash: resultHash,
      signature: claim.signature as `0x${string}`,
    });
  } catch {
    return { ok: false, error: "Cap-check attestation signature is malformed." };
  }
  if (!isAddressEqual(recovered, attestor)) {
    return { ok: false, error: "Cap-check attestation is not from the CoFHE network." };
  }

  return { ok: true, within: claim.within };
}
