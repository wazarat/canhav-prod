import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import { markSkillStudied, seedAgentProfile } from "@/lib/agent/memory";
import { getAgentSkillById } from "@/lib/agent/skills";
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

interface SerializedWebAuthnKey {
  pubX: string;
  pubY: string;
  authenticatorId: string;
  authenticatorIdHash: string;
  rpID: string;
}

function reconstructWebAuthnKey(raw: unknown) {
  const k = raw as Partial<SerializedWebAuthnKey> | undefined;
  if (!k || k.pubX == null || k.pubY == null || !k.authenticatorId || !k.authenticatorIdHash || !k.rpID) {
    return null;
  }
  return {
    pubX: BigInt(k.pubX),
    pubY: BigInt(k.pubY),
    authenticatorId: k.authenticatorId,
    authenticatorIdHash: k.authenticatorIdHash as `0x${string}`,
    rpID: k.rpID,
  };
}

export async function POST(req: Request) {
  if (!hasZeroDev()) {
    return NextResponse.json(
      {
        configured: false,
        error: "On-chain identity not configured (ZERODEV_RPC + registry addresses).",
      },
      { status: 503 },
    );
  }

  let body: { skillId?: string; webAuthnKey?: unknown } = {};
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

  hydrateEnvFromSecrets();

  try {
    const svc = await import("canhav-agent-service");
    const cfg = svc.loadConfig();
    const result = await svc.spawnAgentFromSkill({ cfg, skill, webAuthnKey });

    const agentId = result.agentId.toString();
    const agentAddress = result.agentAddress;
    const agentURI = result.agentURI;
    const arbiscanUrl = `https://sepolia.arbiscan.io/address/${agentAddress}`;

    await seedAgentProfile({
      agentId,
      name: skill.title,
      skillId,
      agentAddress,
      agentURI,
      onChain: true,
    });
    await markSkillStudied(agentId, skillId);

    return NextResponse.json({ ok: true, agentId, agentAddress, agentURI, arbiscanUrl });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Spawn failed." },
      { status: 500 },
    );
  }
}
