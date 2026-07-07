import "server-only";

import { parseAmountToBaseUnits, TCNHV_DECIMALS } from "@/lib/agent/collab-config";
import { getUserProfile, markTcnhvGranted } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";
import {
  canMintTcnhv,
  ensureWalletTransferAllowed,
  mintTcnhvReward,
} from "@/lib/server/factory";

/**
 * Wallet-as-treasury starting grant.
 *
 * Each user's canonical Privy treasury wallet is seeded ONCE with
 * tCNHV so they can immediately pay sellers, fund their agents, and transfer
 * credits to other people. The mint is owner-signed (bypasses the transfer
 * allowlist), and the wallet is allowlisted so it can SEND afterwards.
 *
 * Idempotent: guarded by `UserProfile.tcnhvGranted`. Degrades cleanly (no-op)
 * when the token + deployer key aren't provisioned, so the flag is only set
 * after a real mint.
 */

const DEFAULT_STARTING_TCNHV = "10000";

export function startingTcnhvHuman(): string {
  return readSecret("STARTING_TCNHV") ?? DEFAULT_STARTING_TCNHV;
}

export function startingTcnhvBaseUnits(): bigint {
  try {
    return parseAmountToBaseUnits(startingTcnhvHuman(), TCNHV_DECIMALS);
  } catch {
    return 0n;
  }
}

export interface GrantResult {
  ok: boolean;
  /** True only when this call performed the mint (vs. already granted / skipped). */
  granted: boolean;
  reason?:
    | "no_profile"
    | "already_granted"
    | "not_configured"
    | "bad_address"
    | "zero_amount"
    | "mint_failed";
  txHash?: string;
  /** Granted amount in base units (18 decimals). */
  amount?: string;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Grant the one-time starting credits to a user's treasury wallet. Safe to call
 * on every login / page mount — it returns `granted:false` once delivered.
 */
export async function grantSignupCredits(params: {
  userId: string;
  address: string;
}): Promise<GrantResult> {
  const profile = await getUserProfile(params.userId);
  if (!profile) return { ok: false, granted: false, reason: "no_profile" };
  if (profile.tcnhvGranted) return { ok: true, granted: false, reason: "already_granted" };
  if (!canMintTcnhv()) return { ok: false, granted: false, reason: "not_configured" };

  const address = params.address?.trim() ?? "";
  if (!ADDRESS_RE.test(address)) return { ok: false, granted: false, reason: "bad_address" };

  const amount = startingTcnhvBaseUnits();
  if (amount <= 0n) return { ok: false, granted: false, reason: "zero_amount" };

  const mint = await mintTcnhvReward({ to: address, amount });
  if (!mint.ok) return { ok: false, granted: false, reason: "mint_failed" };

  // Allowlist the treasury so it can SEND credits to agents / peers afterwards.
  await ensureWalletTransferAllowed(address);
  await markTcnhvGranted(params.userId, address);

  return { ok: true, granted: true, txHash: mint.txHash, amount: amount.toString() };
}
