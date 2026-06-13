import "server-only";

import { getAgentProfile } from "@/lib/agent/memory";
import { userAgentId } from "@/lib/agent/user-agent";
import { hasDuneWrite } from "@/lib/server/dune";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";
import { listUserAgentIds } from "@/lib/auth/users";

/**
 * Off-chain gate for the `dune_publishVerdict` tool. The platform's on-chain
 * `assertTargetAllowed` gate (agent-service) only applies to contract targets
 * signed by a browser session-key — it cannot gate a server-side HTTP write.
 * So a verdict write is gated here on three conditions:
 *
 *   1. writes are enabled in this environment (`DUNE_WRITE_ENABLED=1` + key),
 *   2. the owner opted this agent in (`config.publishToDune === true`), and
 *   3. the caller owns the agent (when a session user id is supplied).
 */

export interface VerdictGateResult {
  ok: boolean;
  reason?: string;
}

export async function canPublishVerdict(
  agentId: string,
  ownerUserId?: string | null,
): Promise<VerdictGateResult> {
  if (!hasDuneWrite()) {
    return { ok: false, reason: "Publishing to Dune is not enabled in this environment." };
  }

  const profile = await getAgentProfile(agentId);
  if (!profile) return { ok: false, reason: "Agent not found." };
  if (!profile.config?.publishToDune) {
    return { ok: false, reason: "Publishing to Dune is turned off for this agent." };
  }

  // Ownership: only the owner may publish on an agent's behalf. When no session
  // user id is threaded through, deny rather than write on an unverified caller.
  if (!ownerUserId) {
    return { ok: false, reason: "Sign in as the agent owner to publish verdicts." };
  }
  const ownedIds = new Set([userAgentId(ownerUserId), ...(await listUserAgentIds(ownerUserId))]);
  if (!ownedIds.has(agentId)) {
    return { ok: false, reason: "Only the agent owner can publish its verdicts." };
  }

  return { ok: true };
}

/** Per-agent + asset publish cooldown (seconds). Throttles inserts/credits. */
export const VERDICT_COOLDOWN_SECONDS = 300;

function cooldownKey(agentId: string, asset: string): string {
  const slug = asset.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "asset";
  return `agent:${agentId}:dune:verdict:${slug}`;
}

/**
 * Atomically claim a publish slot for (agent, asset). Returns false when a
 * verdict for the same asset was published within the cooldown window, so the
 * model can't spam inserts (and burn Dune credits) in a single chat. Best-effort
 * in offline dev (allows the write when Upstash is not configured).
 */
export async function claimVerdictSlot(agentId: string, asset: string): Promise<boolean> {
  if (!hasUpstash()) return true;
  try {
    const res = await getRedisClient().set(cooldownKey(agentId, asset), Date.now(), {
      nx: true,
      ex: VERDICT_COOLDOWN_SECONDS,
    });
    return res === "OK";
  } catch {
    // A storage hiccup must not block the research pillar — allow the write.
    return true;
  }
}
