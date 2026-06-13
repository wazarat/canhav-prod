import "server-only";

import { createHash } from "node:crypto";

/**
 * Derive a deterministic ZeroDev sub-account salt for a (wallet, slot) pair.
 *
 * Each agent a wallet creates gets its OWN smart-account address. The `slot` is
 * the creation key — a per-agent creation nonce for general agents (created on
 * the Agents tab) or a legacy entity slug for older entity-bound mints. The
 * index salts the counterfactual address, so:
 *   - different slots under the same wallet -> different addresses, and
 *   - re-spawning the SAME slot              -> the SAME address (idempotent
 *     mint, no duplicate identities on retry).
 *
 * Returns a 31-bit positive integer (widened to bigint in agent-service before
 * it reaches ZeroDev's `createKernelAccount({ index })`).
 */
export function deriveAccountIndex(userId: string, slot: string): number {
  const digest = createHash("sha256").update(`${userId}:${slot}`).digest();
  return digest.readUInt32BE(0) & 0x7fffffff;
}

/**
 * Resolve the creation "slot" key used for idempotency + account-index salting.
 * A real entity slug keeps legacy entity-bound behavior; otherwise a per-create
 * nonce yields a unique general agent (so a wallet can own many agents).
 */
export function creationSlotKey(input: {
  entitySlug?: string | null;
  nonce?: string | null;
  skillId: string;
}): string {
  if (input.entitySlug) return input.entitySlug;
  if (input.nonce) return `general:${input.nonce}`;
  return input.skillId;
}
