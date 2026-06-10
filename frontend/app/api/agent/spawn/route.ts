import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import { deriveAccountIndex } from "@/lib/agent/account-index";
import { resolveEntityBinding } from "@/lib/agent/entity-binding";
import { getAgentProfile, markSkillStudied, seedAgentProfile } from "@/lib/agent/memory";
import { getAgentSkillById } from "@/lib/agent/skills";
import { reconstructWebAuthnKey } from "@/lib/auth/webauthn";
import { getSession } from "@/lib/auth/session";
import { getUserEntityAgent, linkAgentToUser, setUserEntityAgent } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";

/**
 * ERC-8004 spawn bridge.
 *
 * Given a passkey `webAuthnKey` (from the client WebAuthn ceremony) and a
 * `skillId`, mints the agent's on-chain identity by dynamically importing the
 * standalone `agent-service` and calling `spawnAgentFromSkill`. The agent's
 * smart account is passkey-owned (no seed phrase) and the mint is gas-sponsored
 * by ZeroDev. On success the agent is seeded into memory so it has a home.
 *
 * Returns 503 { configured: false } until ZeroDev + the registries are
 * provisioned — the build and every other surface never depend on it.
 */

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const REGISTRY_ENV = [
  "ZERODEV_RPC",
  "IDENTITY_REGISTRY_ADDRESS",
  "SECURITY_REGISTRY_ADDRESS",
  "ARBITRUM_SEPOLIA_RPC_URL",
  "ARBISCAN_API_KEY",
] as const;

/**
 * agent-service `loadConfig()` reads `process.env`; locally these may live in
 * backend/.env (read via readSecret). Mirror them into process.env so the
 * dynamically-imported service sees them without changing its contract.
 */
function hydrateEnvFromSecrets(): void {
  for (const name of REGISTRY_ENV) {
    if (!process.env[name]) {
      const value = readSecret(name);
      if (value) process.env[name] = value;
    }
  }
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sign in with your passkey before launching an agent." },
      { status: 401 },
    );
  }

  if (!hasZeroDev()) {
    return NextResponse.json(
      {
        configured: false,
        error: "On-chain identity not configured (ZERODEV_RPC + registry addresses).",
      },
      { status: 503 },
    );
  }

  let body: { skillId?: string; entitySlug?: string; webAuthnKey?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const skillId = typeof body.skillId === "string" ? body.skillId : "";
  const webAuthnKey = reconstructWebAuthnKey(body.webAuthnKey);
  if (!skillId || !webAuthnKey) {
    return NextResponse.json(
      { ok: false, error: "skillId and a valid webAuthnKey are required." },
      { status: 400 },
    );
  }

  const skill = await getAgentSkillById(skillId);
  if (!skill) {
    return NextResponse.json({ ok: false, error: `Unknown skill "${skillId}".` }, { status: 404 });
  }

  // Skills are 1:1 with Entities, so the project slug defaults to the skill id.
  const entitySlug =
    typeof body.entitySlug === "string" && body.entitySlug ? body.entitySlug : skillId;
  const binding = await resolveEntityBinding(entitySlug);
  const associatedProducts = binding?.associatedProducts ?? [];

  // Idempotency: one agent per (wallet, project). If the wallet already has an
  // agent for this entity, return it instead of minting a duplicate identity.
  const existingAgentId = await getUserEntityAgent(session.userId, entitySlug);
  if (existingAgentId) {
    const existing = await getAgentProfile(existingAgentId);
    if (existing) {
      return NextResponse.json({
        ok: true,
        reused: true,
        agentId: existing.agentId,
        agentAddress: existing.agentAddress,
        agentURI: existing.agentURI,
        arbiscanUrl: existing.agentAddress
          ? `https://sepolia.arbiscan.io/address/${existing.agentAddress}`
          : null,
      });
    }
  }

  const accountIndex = deriveAccountIndex(session.userId, entitySlug);

  hydrateEnvFromSecrets();

  try {
    const svc = await import("canhav-agent-service");
    const cfg = svc.loadConfig();
    const result = await svc.spawnAgentFromSkill({
      cfg,
      skill,
      webAuthnKey,
      index: BigInt(accountIndex),
      entity: binding?.entitySlug ?? entitySlug,
      associatedProducts,
    });

    const agentId = result.agentId.toString();
    const agentAddress = result.agentAddress;
    const agentURI = result.agentURI;
    const arbiscanUrl = `https://sepolia.arbiscan.io/address/${agentAddress}`;

    await seedAgentProfile({
      agentId,
      name: skill.title,
      skillId,
      entitySlug,
      associatedProducts,
      accountIndex,
      agentAddress,
      agentURI,
      onChain: true,
    });
    await markSkillStudied(agentId, skillId);
    await linkAgentToUser(session.userId, agentId);
    await setUserEntityAgent(session.userId, entitySlug, agentId);

    return NextResponse.json({ ok: true, agentId, agentAddress, agentURI, arbiscanUrl });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Spawn failed." },
      { status: 500 },
    );
  }
}
