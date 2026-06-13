import { NextResponse } from "next/server";

import { creationSlotKey, deriveAccountIndex } from "@/lib/agent/account-index";
import { hasZeroDev } from "@/lib/agent/config";
import { canhavPublicOrigin } from "@/lib/agent/public-url";
import { resolveEntityBinding } from "@/lib/agent/entity-binding";
import { getAgentProfile } from "@/lib/agent/memory";
import { getAgentSkillById } from "@/lib/agent/skills";
import { getSession } from "@/lib/auth/session";
import { getUserEntityAgent } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Session-gated spawn preflight. Returns mint parameters for the browser path
 * (the embedded-wallet signer lives client-side) or an existing agent for reuse.
 */
export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ configured: false, error: "Not signed in." }, { status: 401 });
  }

  if (!hasZeroDev()) {
    return NextResponse.json(
      { configured: false, error: "On-chain identity not configured." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const skillId = url.searchParams.get("skillId")?.trim() ?? "";
  const entitySlugParam = url.searchParams.get("entitySlug")?.trim() || null;
  const nonceParam = url.searchParams.get("nonce")?.trim() || null;
  if (!skillId) {
    return NextResponse.json({ configured: false, error: "skillId is required." }, { status: 400 });
  }

  const skill = await getAgentSkillById(skillId);
  if (!skill) {
    return NextResponse.json({ configured: false, error: `Unknown skill "${skillId}".` }, { status: 404 });
  }

  // General agents (created on /agents) carry a per-create nonce and no entity;
  // legacy/entity-bound mints carry a real entity slug. The slot key drives both
  // the reuse check and the deterministic smart-account salt.
  const slotKey = creationSlotKey({ entitySlug: entitySlugParam, nonce: nonceParam, skillId });
  const entitySlug = entitySlugParam; // null for general agents
  const binding = entitySlug ? await resolveEntityBinding(entitySlug) : null;
  const associatedProducts = binding?.associatedProducts ?? [];

  const existingAgentId = await getUserEntityAgent(session.userId, slotKey);
  if (existingAgentId) {
    const existing = await getAgentProfile(existingAgentId);
    if (existing) {
      const registry = readSecret("IDENTITY_REGISTRY_ADDRESS");
      return NextResponse.json({
        configured: true,
        reused: true,
        agentId: existing.agentId,
        agentAddress: existing.agentAddress,
        agentURI: existing.agentURI,
        arbiscanUrl: existing.agentAddress
          ? `https://sepolia.arbiscan.io/address/${existing.agentAddress}`
          : null,
        tokenUrl:
          registry && /^\d+$/.test(existing.agentId)
            ? `https://sepolia.arbiscan.io/token/${registry}?a=${existing.agentId}`
            : null,
      });
    }
  }

  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  if (!zerodevRpc || !identityRegistry || !securityRegistry) {
    return NextResponse.json(
      { configured: false, error: "Registry or ZeroDev RPC not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    configured: true,
    accountIndex: deriveAccountIndex(session.userId, slotKey),
    skill,
    entitySlug,
    associatedProducts,
    baseUrl: canhavPublicOrigin(new URL(req.url).origin),
    mintConfig: {
      zerodevRpc,
      rpcUrl,
      identityRegistry,
      securityRegistry,
    },
  });
}
