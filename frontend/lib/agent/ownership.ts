import "server-only";

import { NextResponse } from "next/server";

import { getAgentProfile, setAgentOwner, type AgentProfile } from "@/lib/agent/memory";
import { readAgentWallet, verifyAgentOnChain } from "@/lib/agent/onchain";
import { userAgentId } from "@/lib/agent/user-agent";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import {
  getUserProfile,
  linkAgentToUser,
  listUserAgentIds,
  unlinkAgentFromUser,
} from "@/lib/auth/users";

/**
 * Shared owner-only guard for per-agent enrichment routes (config, data frames,
 * knowledge, custom tools, feedback) and owner-only UI surfaces (Dune panel,
 * Framework, etc.).
 *
 * A user owns an agent when ANY of these hold:
 *   1. `profile.ownerUserId` matches (set at mint — canonical), or
 *   2. the agent id is their default research agent (`userAgentId`), or
 *   3. the agent id is in `user:{userId}:agents` AND no other user is the
 *      canonical owner (`ownerUserId` is null or matches), or
 *   4. (recovery) the agent's on-chain footprint (its smart account / reserved
 *      wallet / ERC-8004 ownerOf) resolves to the user's canonical treasury
 *      wallet — which durably re-claims agents whose off-chain `ownerUserId`
 *      link was orphaned by an identity change (e.g. the passkey → Privy DID
 *      migration). Address equality is the only thing that can grant (4), so it
 *      can never leak across distinct wallets.
 */

export interface OwnedAgentGuard {
  session: SessionPayload | null;
  /** Non-null when the request must be rejected; return it directly. */
  error: NextResponse | null;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a === ZERO_ADDR || b === ZERO_ADDR) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Address-gated, false-positive-safe recovery: when the off-chain link is
 * orphaned (no/old `ownerUserId`), see whether the agent's on-chain footprint
 * (its smart account / reserved wallet / ERC-8004 ownerOf) resolves to the
 * user's canonical treasury wallet. Only address equality can grant access, so
 * distinct wallets never match. Best-effort — any read failure returns false.
 */
async function reconcileOnChainOwnership(
  userId: string,
  agentId: string,
  loaded?: AgentProfile | null,
): Promise<boolean> {
  try {
    if (!/^\d+$/.test(agentId)) return false; // only minted (numeric tokenId) agents
    const user = await getUserProfile(userId);
    const wallet = user?.address;
    if (!wallet) return false;

    const profile = loaded ?? (await getAgentProfile(agentId));
    if (!profile || !profile.onChain) return false;

    if (sameAddress(profile.agentAddress, wallet)) return true;
    if (sameAddress(profile.agentWallet, wallet)) return true;

    const [agentWallet, verification] = await Promise.all([
      readAgentWallet(agentId),
      verifyAgentOnChain(agentId, profile.agentAddress),
    ]);
    return sameAddress(agentWallet, wallet) || sameAddress(verification.owner, wallet);
  } catch {
    return false;
  }
}

/**
 * Remove minted agents from a user's Redis index when `profile.ownerUserId`
 * points at someone else AND on-chain ownership does NOT reconcile to this
 * user's wallet. Reconcilable agents (orphaned legacy links) are durably
 * re-claimed instead of unlinked, so a stale `ownerUserId` never permanently
 * hides an agent the user actually owns.
 */
export async function pruneStaleAgentLinks(userId: string): Promise<void> {
  const linked = await listUserAgentIds(userId);
  await Promise.all(
    linked.map(async (agentId) => {
      if (!/^\d+$/.test(agentId)) return;
      const profile = await getAgentProfile(agentId);
      if (!profile?.ownerUserId || profile.ownerUserId === userId) return;
      if (await reconcileOnChainOwnership(userId, agentId, profile)) {
        await setAgentOwner(agentId, userId);
        return;
      }
      await unlinkAgentFromUser(userId, agentId);
    }),
  );
}

/**
 * The canonical set of agent ids a user owns: their default research agent plus
 * every agent in the `user:{userId}:agents` Redis index that passes the
 * ownership gate. Stale cross-account links are pruned on each read.
 */
export async function listOwnedAgentIds(userId: string): Promise<string[]> {
  await pruneStaleAgentLinks(userId);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [userAgentId(userId), ...(await listUserAgentIds(userId))]) {
    if (seen.has(id)) continue;
    if (await userOwnsAgent(userId, id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Minted agents this user launched (`ownerUserId` matches). Used for seller
 * badges and excluding own listings from the buyer marketplace.
 */
export async function listCanonicalOwnedAgentIds(userId: string): Promise<string[]> {
  const owned = await listOwnedAgentIds(userId);
  const out: string[] = [];
  for (const id of owned) {
    const profile = await getAgentProfile(id);
    if (profile?.ownerUserId === userId) out.push(id);
  }
  return out;
}

/**
 * True when `userId` owns `agentId`. Pass `profileOwnerUserId` when the caller
 * already loaded the profile to avoid an extra Redis read.
 */
export async function userOwnsAgent(
  userId: string,
  agentId: string,
  profileOwnerUserId?: string | null,
): Promise<boolean> {
  if (agentId === userAgentId(userId)) return true;

  let ownerUserId = profileOwnerUserId;
  if (ownerUserId === undefined) {
    const profile = await getAgentProfile(agentId);
    ownerUserId = profile?.ownerUserId ?? null;
  }

  if (ownerUserId === userId) {
    await linkAgentToUser(userId, agentId);
    return true;
  }

  // A canonical owner is set, but it isn't this user. Block — UNLESS the agent's
  // on-chain footprint reconciles to this user's wallet (an orphaned legacy link
  // from the passkey → Privy DID migration). Address equality can't leak across
  // distinct wallets, so a match safely re-claims the agent for the current id.
  if (ownerUserId && ownerUserId !== userId) {
    if (await reconcileOnChainOwnership(userId, agentId)) {
      await setAgentOwner(agentId, userId);
      await linkAgentToUser(userId, agentId);
      return true;
    }
    return false;
  }

  // No canonical owner: honor the Redis index link, or recover via on-chain
  // address match (self-healing the canonical owner so it sticks).
  if ((await listUserAgentIds(userId)).includes(agentId)) return true;
  if (await reconcileOnChainOwnership(userId, agentId)) {
    await setAgentOwner(agentId, userId);
    await linkAgentToUser(userId, agentId);
    return true;
  }
  return false;
}

export async function requireOwnedAgent(agentId: string): Promise<OwnedAgentGuard> {
  const session = getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 }),
    };
  }
  if (!(await userOwnsAgent(session.userId, agentId))) {
    return {
      session,
      error: NextResponse.json({ ok: false, error: "That agent isn't yours." }, { status: 403 }),
    };
  }
  return { session, error: null };
}
