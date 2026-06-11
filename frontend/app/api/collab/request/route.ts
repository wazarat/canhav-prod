import { NextResponse } from "next/server";

import { collabRegistryAddress } from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { appendMemory, getAgentProfile, markSkillStudied } from "@/lib/agent/memory";
import { skillMarkdownHash } from "@/lib/agent/skillHash";
import { strategyPacketToMarkdown } from "@/lib/agent/strategyPacket";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { recordCollabExchange } from "@/lib/server/collabLog";
import { getUserSkill } from "@/lib/server/userSkills";
import { readSecret } from "@/lib/server/env";
import type { StrategyPacket } from "@/lib/types";

/**
 * Buyer-side orchestrator. The browser has already settled payment (a USDC
 * transfer userOp); this route completes the x402 exchange:
 *   1. call the seller's /api/collab/strategy with `X-PAYMENT` = the tx hash,
 *   2. verify the returned packet's `skillHash` matches the skill (integrity),
 *   3. ingest the packet into the buyer agent's memory (= training),
 *   4. return params for the optional client-signed CollabRegistry attestation.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  skillId?: string;
  toAgentId?: string;
  fromAgentId?: string;
  objective?: string;
  paymentRef?: string;
  constraints?: { maxAnswerTokens?: number };
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const skillId = (body.skillId ?? "").trim();
  const toAgentId = (body.toAgentId ?? "").trim();
  const fromAgentId = (body.fromAgentId ?? "").trim();
  const paymentRef = (body.paymentRef ?? "").trim();
  if (!skillId || !toAgentId || !fromAgentId || !paymentRef) {
    return NextResponse.json(
      { ok: false, error: "skillId, toAgentId, fromAgentId and paymentRef are required." },
      { status: 400 },
    );
  }

  // Ownership: the caller can only spend from / train their own buyer agent.
  const ownedIds = new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))]);
  if (!ownedIds.has(fromAgentId)) {
    return NextResponse.json({ ok: false, error: "Buyer agent isn't yours." }, { status: 403 });
  }
  if (toAgentId === fromAgentId) {
    return NextResponse.json({ ok: false, error: "An agent cannot buy from itself." }, { status: 400 });
  }

  // Complete the x402 exchange against the seller route (the real 402 wire).
  const origin = new URL(req.url).origin;
  let sellerRes: Response;
  try {
    sellerRes = await fetch(`${origin}/api/collab/strategy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PAYMENT": paymentRef },
      body: JSON.stringify({
        skillId,
        toAgentId,
        fromAgentId,
        objective: body.objective,
        constraints: body.constraints,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Seller request failed." },
      { status: 502 },
    );
  }

  const sellerData = (await sellerRes.json()) as {
    ok?: boolean;
    packet?: StrategyPacket;
    payment?: { amount?: string };
    error?: string;
  };
  if (!sellerRes.ok || !sellerData.ok || !sellerData.packet) {
    return NextResponse.json(
      { ok: false, error: sellerData.error ?? "Seller declined the request." },
      { status: sellerRes.status === 402 ? 402 : 502 },
    );
  }

  const packet = sellerData.packet;

  // Integrity: the packet hash MUST match the skill we paid for.
  const skill = await getUserSkill(skillId);
  if (!skill) {
    return NextResponse.json({ ok: false, error: "Skill no longer exists." }, { status: 404 });
  }
  const expected = skillMarkdownHash(skill);
  if (packet.skillHash.toLowerCase() !== expected.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: "Integrity check failed: packet does not match the advertised skill." },
      { status: 422 },
    );
  }

  // Ingest = train the buyer agent.
  await appendMemory(fromAgentId, {
    text: strategyPacketToMarkdown(packet),
    source: `collab:${toAgentId}:${skillId}`,
  });
  await markSkillStudied(fromAgentId, skillId);

  await recordCollabExchange({
    fromAgentId,
    toAgentId,
    skillId,
    skillHash: packet.skillHash,
    paymentRef,
    amount: sellerData.payment?.amount ?? "0",
    at: new Date().toISOString(),
  });

  // Optional client-signed on-chain attestation (CollabRegistry).
  const registry = collabRegistryAddress();
  const buyer = await getAgentProfile(fromAgentId);
  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  const record =
    registry &&
    buyer?.onChain &&
    buyer.accountIndex != null &&
    hasZeroDev() &&
    zerodevRpc &&
    identityRegistry &&
    securityRegistry
      ? {
          collabRegistry: registry,
          fromAgentId,
          toAgentId,
          skillHash: packet.skillHash,
          paymentRef,
          accountIndex: buyer.accountIndex,
          mintConfig: { zerodevRpc, rpcUrl, identityRegistry, securityRegistry },
        }
      : null;

  return NextResponse.json({ ok: true, packet, record });
}
