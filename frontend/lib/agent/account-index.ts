import "server-only";

import { createHash } from "node:crypto";

/**
 * Derive a deterministic ZeroDev sub-account salt for a (wallet, project) pair.
 *
 * Each agent a wallet creates lives on a distinct Entity ("project") and gets
 * its OWN smart-account address. The index salts the counterfactual address, so:
 *   - different projects under the same wallet   -> different addresses, and
 *   - re-spawning the SAME project               -> the SAME address (idempotent
 *     mint, no duplicate identities).
 *
 * Returns a 31-bit positive integer (widened to bigint in agent-service before
 * it reaches ZeroDev's `createKernelAccount({ index })`).
 */
export function deriveAccountIndex(userId: string, entitySlug: string): number {
  const digest = createHash("sha256").update(`${userId}:${entitySlug}`).digest();
  return digest.readUInt32BE(0) & 0x7fffffff;
}
