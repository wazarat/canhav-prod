import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import { creationSlotKey, deriveAccountIndex } from "@/lib/agent/account-index";
import { resolveEntityBinding } from "@/lib/agent/entity-binding";
import {
  getAgentProfile,
  isAgentCategory,
  markSkillStudied,
  seedAgentProfile,
  type AgentCategory,
} from "@/lib/agent/memory";
import { verifyAgentOnChain } from "@/lib/agent/onchain";
import { getAgentSkillById } from "@/lib/agent/skills";
import { groundUserSkillOnAgent } from "@/lib/agent/attachUserSkill";
import { getSession } from "@/lib/auth/session";
import { getUserEntityAgent, linkAgentToUser, setUserEntityAgent, updateUserProfile } from "@/lib/auth/users";
import { getUserSkill } from "@/lib/server/userSkills";
import { readSecret } from "@/lib/server/env";
import { ensureAgentLedger, hasFactory } from "@/lib/server/factory";

/**
 * ERC-8004 spawn persistence bridge.
 *
 * Minting runs in the **browser** (LaunchAgentButton + spawn-client.ts) because
 * the user's embedded-wallet signer lives client-side. This route only persists
 * a successful client mint into agent memory and links it to the signed-in user.
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
      { ok: false, error: "Sign in before launching an agent." },
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
    nonce?: string;
    mintResult?: unknown;
    name?: unknown;
    category?: unknown;
    extraSkillIds?: unknown;
    userSkillIds?: unknown;
    signerAddress?: unknown;
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

  const customName =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : null;
  const category: AgentCategory | null = isAgentCategory(body.category) ? body.category : null;
  const extraSkillIds = Array.isArray(body.extraSkillIds)
    ? body.extraSkillIds.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
  const userSkillIds = Array.isArray(body.userSkillIds)
    ? body.userSkillIds.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];

  if (!isMintResult(body.mintResult)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Mint must complete in the browser (wallet signing). Retry “Mint with your wallet”.",
      },
      { status: 400 },
    );
  }

  const skill = await getAgentSkillById(skillId);
  if (!skill) {
    return NextResponse.json({ ok: false, error: `Unknown skill "${skillId}".` }, { status: 404 });
  }

  // General agents (created on /agents) have no entity binding and carry a
  // per-create nonce; legacy entity-bound mints carry a real entity slug. The
  // slot key drives idempotency + the deterministic smart-account salt; the
  // stored profile.entitySlug is the REAL entity (null for general agents).
  const entitySlug =
    typeof body.entitySlug === "string" && body.entitySlug ? body.entitySlug : null;
  const nonce = typeof body.nonce === "string" && body.nonce ? body.nonce : null;
  const slotKey = creationSlotKey({ entitySlug, nonce, skillId });
  const binding = entitySlug ? await resolveEntityBinding(entitySlug) : null;
  const associatedProducts = binding?.associatedProducts ?? [];

  const existingAgentId = await getUserEntityAgent(session.userId, slotKey);
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
  const accountIndex = deriveAccountIndex(session.userId, slotKey);
  const registry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const arbiscanUrl = `https://sepolia.arbiscan.io/address/${agentAddress}`;
  const tokenUrl = registry
    ? `https://sepolia.arbiscan.io/token/${registry}?a=${agentId}`
    : null;

  // Trust, but verify. The mint runs in the browser, so the server independently
  // reconciles the client-reported result against the chain before claiming the
  // agent is on-chain ("are they as they seem"):
  //   - a GENUINE owner mismatch (ownerOf != the minted smart account) is
  //     rejected as likely spoofed and never persisted;
  //   - a transient read failure (RPC lag, not yet indexed) is persisted as
  //     pendingVerification and reconciled later by GET /api/agent/{id}/verify.
  const verification = await verifyAgentOnChain(agentId, agentAddress);
  if (
    verification.configured &&
    verification.owner &&
    verification.expectedOwner &&
    verification.owner.toLowerCase() !== verification.expectedOwner.toLowerCase()
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "owner_mismatch",
        error:
          "On-chain owner does not match the minted smart account; the agent was not persisted.",
      },
      { status: 409 },
    );
  }
  const confirmedOnChain = verification.verified;

  const signerAddress =
    typeof body.signerAddress === "string" && /^0x[0-9a-fA-F]{40}$/.test(body.signerAddress.trim())
      ? body.signerAddress.trim()
      : null;

  await seedAgentProfile({
    agentId,
    name: customName ?? skill.title,
    category,
    skillId,
    entitySlug,
    ownerUserId: session.userId,
    signerAddress,
    associatedProducts,
    accountIndex,
    agentAddress,
    agentURI,
    agentWallet,
    onChain: confirmedOnChain,
    pendingVerification: !confirmedOnChain,
  });
  await markSkillStudied(agentId, skillId);

  // Any additional platform skills the owner selected at creation are studied
  // immediately (unknown ids are skipped — never block a successful mint).
  for (const extraId of extraSkillIds) {
    if (extraId === skillId) continue;
    const extra = await getAgentSkillById(extraId);
    if (extra) await markSkillStudied(agentId, extraId);
  }

  // User-authored skills ("My Skills") the owner selected are fully grounded
  // into memory (the real "training"), mirroring the attach route. Unknown or
  // not-owned ids are skipped so they never block a successful mint.
  for (const userSkillId of userSkillIds) {
    try {
      const userSkill = await getUserSkill(userSkillId);
      if (userSkill && userSkill.authorUserId === session.userId) {
        await groundUserSkillOnAgent(agentId, userSkill);
      }
    } catch {
      /* additive — never block a successful mint */
    }
  }
  await linkAgentToUser(session.userId, agentId);
  await setUserEntityAgent(session.userId, slotKey, agentId);

  if (signerAddress) {
    await updateUserProfile(session.userId, { signerAddress });
  }

  // Auto-create the agent's on-chain ledger + allowlist its wallet for tCNHV,
  // signed with the platform owner key (agents never deploy). Best-effort: a
  // failure here is additive-only and must never fail a successful mint, but we
  // surface the outcome (ledger address) so a silent createLedger failure — e.g.
  // the deployer is out of gas — is visible in the response/logs.
  let ledger: string | null = null;
  if (hasFactory()) {
    try {
      const result = await ensureAgentLedger({
        agentId,
        owner: verification.owner ?? agentAddress,
        agentWallet: agentWallet ?? agentAddress,
      });
      ledger = result.ledger;
      if (!result.ok) {
        console.warn(`[spawn] ledger create failed for agent ${agentId} (check deployer gas)`);
      }
    } catch (e) {
      console.warn(`[spawn] ensureAgentLedger threw for agent ${agentId}:`, e);
    }
  }

  return NextResponse.json({
    ok: true,
    agentId,
    agentAddress,
    agentURI,
    arbiscanUrl,
    tokenUrl,
    agentWallet,
    walletVerified,
    onChain: confirmedOnChain,
    pendingVerification: !confirmedOnChain,
    ledger,
  });
}
