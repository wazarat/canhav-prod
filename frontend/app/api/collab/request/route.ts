import { NextResponse } from "next/server";

import { agentOfferHash, agentOfferSkillId } from "@/lib/agent/agentOffer";
import { collabRegistryAddress } from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { appendMemory, getAgentProfile, markSkillStudied } from "@/lib/agent/memory";
import { strategyPacketToMarkdown } from "@/lib/agent/strategyPacket";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { recordCollabExchange } from "@/lib/server/collabLog";
import { readSecret } from "@/lib/server/env";
import type { StrategyPacket } from "@/lib/types";

/**
 * Buyer-side orchestrator for agent-centric bundled offers.
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

  const toAgentId = (body.toAgentId ?? "").trim();
  const fromAgentId = (body.fromAgentId ?? "").trim();
  const paymentRef = (body.paymentRef ?? "").trim();
  if (!toAgentId || !fromAgentId || !paymentRef) {
    return NextResponse.json(
      { ok: false, error: "toAgentId, fromAgentId and paymentRef are required." },
      { status: 400 },
    );
  }

  const ownedIds = new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))]);
  if (!ownedIds.has(fromAgentId)) {
    return NextResponse.json({ ok: false, error: "Buyer agent isn't yours." }, { status: 403 });
  }
  if (toAgentId === fromAgentId) {
    return NextResponse.json({ ok: false, error: "An agent cannot buy from itself." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  let sellerRes: Response;
  try {
    sellerRes = await fetch(`${origin}/api/collab/strategy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PAYMENT": paymentRef },
      body: JSON.stringify({
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
  const offerId = agentOfferSkillId(toAgentId);
  const expected = await agentOfferHash(toAgentId);
  if (!expected || packet.skillHash.toLowerCase() !== expected.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: "Integrity check failed: packet does not match the agent's bundled offer." },
      { status: 422 },
    );
  }

  await appendMemory(fromAgentId, {
    text: strategyPacketToMarkdown(packet),
    source: `collab:${toAgentId}:offer`,
  });
  await markSkillStudied(fromAgentId, offerId);

  await recordCollabExchange({
    fromAgentId,
    toAgentId,
    skillId: offerId,
    skillHash: packet.skillHash,
    paymentRef,
    amount: sellerData.payment?.amount ?? "0",
    at: new Date().toISOString(),
  });

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
