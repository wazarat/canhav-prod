import "server-only";

import { NextResponse } from "next/server";

import { userAgentId } from "@/lib/agent/user-agent";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";

/**
 * Shared owner-only guard for per-agent enrichment routes (config, data frames,
 * knowledge, custom tools, feedback). A user owns their default research agent
 * (`userAgentId`) plus every agent in `user:{userId}:agents`.
 */
export interface OwnedAgentGuard {
  session: SessionPayload | null;
  /** Non-null when the request must be rejected; return it directly. */
  error: NextResponse | null;
}

export async function requireOwnedAgent(agentId: string): Promise<OwnedAgentGuard> {
  const session = getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 }),
    };
  }
  const ownedIds = new Set([
    userAgentId(session.userId),
    ...(await listUserAgentIds(session.userId)),
  ]);
  if (!ownedIds.has(agentId)) {
    return {
      session,
      error: NextResponse.json({ ok: false, error: "That agent isn't yours." }, { status: 403 }),
    };
  }
  return { session, error: null };
}
