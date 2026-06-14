import "server-only";

import { NextResponse } from "next/server";

import { getAgentProfile, type AgentProfile } from "@/lib/agent/memory";
import { readAgentWallet, verifyAgentOnChain } from "@/lib/agent/onchain";
import { userAgentId } from "@/lib/agent/user-agent";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { getUserProfile, linkAgentToUser, listUserAgentIds } from "@/lib/auth/users";

/**
 * Shared owner-only guard for per-agent enrichment routes (config, data frames,
 * knowledge, custom tools, feedback) and owner-only UI surfaces (Dune panel,
 * Framework, etc.).
 *
 * A user owns an agent when ANY of these hold:
 *   1. `profile.ownerUserId` matches (set at mint — canonical), or
 *   2. the agent id is in `user:{userId}:agents` (Redis index), or
 *   3. the agent id is their default research agent (`userAgentId`), or
 *   4. (last resort) the agent's on-chain identity/smart-account/wallet resolves
 *      to the user's canonical treasury wallet.
 *
 * (1) is checked first so a stale/missing Redis index never hides owner panels
 * for a minted ERC-8004 agent the user actually created.
 */

export interface OwnedAgentGuard {
  session: SessionPayload | null;
  /** Non-null when the request must be rejected; return it directly. */
  error: NextResponse | null;
}

/**
 * The canonical set of agent ids a user owns: their default research agent plus
 * every agent in the `user:{userId}:agents` Redis index. This is the SINGLE
 * source of truth shared by the buyer dropdown (`/collab`, `/agents`) and the
 * ownership gate, so the list a user can pick from never drifts from the list
 * the server accepts payments / writes from.
 */
export async function listOwnedAgentIds(userId: string): Promise<string[]> {
  const ids = new Set<string>([userAgentId(userId), ...(await listUserAgentIds(userId))]);
  return [...ids];
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a === ZERO_ADDR || b === ZERO_ADDR) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Additive, false-positive-safe reconciliation: when local links all miss, see
 * whether the agent's on-chain footprint (its smart account / reserved wallet /
 * ERC-8004 ownerOf) resolves to the user's canonical treasury wallet. Recovers
 * agents whose off-chain `ownerUserId` link was orphaned (e.g. the passkey ->
 * Privy DID migration) while keeping address equality the only thing that can
 * grant access. Best-effort — any read failure simply returns false.
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
 * True when `userId` owns `agentId`. Pass `profileOwnerUserId` when the caller
 * already loaded the profile to avoid an extra Redis read.
 */
export async function userOwnsAgent(
  userId: string,
  agentId: string,
  profileOwnerUserId?: string | null,
): Promise<boolean> {
  if (profileOwnerUserId && profileOwnerUserId === userId) {
    // Self-heal the Redis index when the canonical owner field matches but the
    // set lookup would fail (e.g. linkAgentToUser missed at mint time).
    await linkAgentToUser(userId, agentId);
    return true;
  }

  const ownedIds = new Set(await listOwnedAgentIds(userId));
  if (ownedIds.has(agentId)) return true;

  // Fallback: read ownerUserId from the stored profile.
  let profile: AgentProfile | null = null;
  if (profileOwnerUserId === undefined) {
    profile = await getAgentProfile(agentId);
    if (profile?.ownerUserId === userId) {
      await linkAgentToUser(userId, agentId);
      return true;
    }
  }

  // Last resort: reconcile against on-chain ownership and self-heal the link.
  if (await reconcileOnChainOwnership(userId, agentId, profile)) {
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
