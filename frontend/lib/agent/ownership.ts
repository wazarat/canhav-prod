import "server-only";

import { NextResponse } from "next/server";

import { getAgentProfile } from "@/lib/agent/memory";
import { userAgentId } from "@/lib/agent/user-agent";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { linkAgentToUser, listUserAgentIds } from "@/lib/auth/users";

/**
 * Shared owner-only guard for per-agent enrichment routes (config, data frames,
 * knowledge, custom tools, feedback) and owner-only UI surfaces (Dune panel,
 * Framework, etc.).
 *
 * A user owns an agent when ANY of these hold:
 *   1. `profile.ownerUserId` matches (set at mint — canonical), or
 *   2. the agent id is in `user:{userId}:agents` (Redis index), or
 *   3. the agent id is their default research agent (`userAgentId`).
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

  const ownedIds = new Set([userAgentId(userId), ...(await listUserAgentIds(userId))]);
  if (ownedIds.has(agentId)) return true;

  // Fallback: read ownerUserId from the stored profile.
  if (profileOwnerUserId === undefined) {
    const profile = await getAgentProfile(agentId);
    if (profile?.ownerUserId === userId) {
      await linkAgentToUser(userId, agentId);
      return true;
    }
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
