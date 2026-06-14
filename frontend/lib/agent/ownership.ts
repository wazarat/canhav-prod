import "server-only";

import { NextResponse } from "next/server";

import { getAgentProfile } from "@/lib/agent/memory";
import { userAgentId } from "@/lib/agent/user-agent";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import {
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
 *      canonical owner (`ownerUserId` is null or matches).
 *
 * Cross-account leaks are blocked by always honoring `ownerUserId` when set.
 */

export interface OwnedAgentGuard {
  session: SessionPayload | null;
  /** Non-null when the request must be rejected; return it directly. */
  error: NextResponse | null;
}

/**
 * Remove minted agents from a user's Redis index when `profile.ownerUserId`
 * points at someone else (stale links from the old wallet-reconcile path).
 */
export async function pruneStaleAgentLinks(userId: string): Promise<void> {
  const linked = await listUserAgentIds(userId);
  await Promise.all(
    linked.map(async (agentId) => {
      if (!/^\d+$/.test(agentId)) return;
      const profile = await getAgentProfile(agentId);
      if (profile?.ownerUserId && profile.ownerUserId !== userId) {
        await unlinkAgentFromUser(userId, agentId);
      }
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

  // Canonical owner wins — never grant access to another user's minted agent.
  if (ownerUserId && ownerUserId !== userId) return false;

  if (ownerUserId === userId) {
    await linkAgentToUser(userId, agentId);
    return true;
  }

  return (await listUserAgentIds(userId)).includes(agentId);
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
