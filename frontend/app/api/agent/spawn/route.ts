import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import { deriveAccountIndex } from "@/lib/agent/account-index";
import { resolveEntityBinding } from "@/lib/agent/entity-binding";
import { getAgentProfile, markSkillStudied, seedAgentProfile } from "@/lib/agent/memory";
import { getAgentSkillById } from "@/lib/agent/skills";
import { getSession } from "@/lib/auth/session";
import { getUserEntityAgent, linkAgentToUser, setUserEntityAgent } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";

/**
 * ERC-8004 spawn persistence bridge.
 *
 * Minting runs in the **browser** (PasskeySpawnButton + spawn-client.ts) because
 * passkey userOp signatures need WebAuthn (`window`). This route only persists a
 * successful client mint into agent memory and links it to the signed-in user.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface MintResultPayload {
  agentId?: string;
  agentAddress?: string;
  agentURI?: string;
  agentWallet?: string | null;
  walletVerified?: boolean;
}

function isMintResult(value: unknown): value is MintResultPayload & {
  agentId: string;
  agentAddress: string;
  agentURI: string;
} {
  const m = value as MintResultPayload | undefined;
  return Boolean(
    m &&
      typeof m.agentId === "string" &&
      /^\d+$/.test(m.agentId) &&
      typeof m.agentAddress === "string" &&
      m.agentAddress.startsWith("0x") &&
      typeof m.agentURI === "string" &&
      m.agentURI.length > 0,
  );
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

  let body: {
    skillId?: string;
    entitySlug?: string;
    mintResult?: unknown;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const skillId = typeof body.skillId === "string" ? body.skillId : "";
  if (!skillId) {
    return NextResponse.json({ ok: false, error: "skillId is required." }, { status: 400 });
  }

  if (!isMintResult(body.mintResult)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Mint must complete in the browser (passkey signing). Retry “Mint with your passkey”.",
      },
      { status: 400 },
    );
  }

  const skill = await getAgentSkillById(skillId);
  if (!skill) {
    return NextResponse.json({ ok: false, error: `Unknown skill "${skillId}".` }, { status: 404 });
  }

  const entitySlug =
    typeof body.entitySlug === "string" && body.entitySlug ? body.entitySlug : skillId;
  const binding = await resolveEntityBinding(entitySlug);
  const associatedProducts = binding?.associatedProducts ?? [];

  const existingAgentId = await getUserEntityAgent(session.userId, entitySlug);
  if (existingAgentId) {
    const existing = await getAgentProfile(existingAgentId);
    if (existing) {
      const reusedRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
      return NextResponse.json({
        ok: true,
        reused: true,
        agentId: existing.agentId,
        agentAddress: existing.agentAddress,
        agentURI: existing.agentURI,
        arbiscanUrl: existing.agentAddress
          ? `https://sepolia.arbiscan.io/address/${existing.agentAddress}`
          : null,
        tokenUrl:
          reusedRegistry && /^\d+$/.test(existing.agentId)
            ? `https://sepolia.arbiscan.io/token/${reusedRegistry}?a=${existing.agentId}`
            : null,
      });
    }
  }

  const { agentId, agentAddress, agentURI } = body.mintResult;
  const walletVerified = Boolean(body.mintResult.walletVerified);
  const agentWallet = walletVerified ? (body.mintResult.agentWallet ?? agentAddress) : null;
  const accountIndex = deriveAccountIndex(session.userId, entitySlug);
  const registry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const arbiscanUrl = `https://sepolia.arbiscan.io/address/${agentAddress}`;
  const tokenUrl = registry
    ? `https://sepolia.arbiscan.io/token/${registry}?a=${agentId}`
    : null;

  await seedAgentProfile({
    agentId,
    name: skill.title,
    skillId,
    entitySlug,
    associatedProducts,
    accountIndex,
    agentAddress,
    agentURI,
    agentWallet,
    onChain: true,
  });
  await markSkillStudied(agentId, skillId);
  await linkAgentToUser(session.userId, agentId);
  await setUserEntityAgent(session.userId, entitySlug, agentId);

  return NextResponse.json({
    ok: true,
    agentId,
    agentAddress,
    agentURI,
    arbiscanUrl,
    tokenUrl,
    agentWallet,
    walletVerified,
  });
}
