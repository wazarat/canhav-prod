import { NextResponse } from "next/server";

import {
  collabUsdcAsset,
  defaultCollabPriceUsdc,
  formatUsdc,
  parseUsdcToBaseUnits,
  USDC_DECIMALS,
} from "@/lib/agent/collab-config";
import { getAgentProfile, getAgentsForSkill } from "@/lib/agent/memory";
import { readAgentWallet } from "@/lib/agent/onchain";
import { buildStrategyPacket } from "@/lib/agent/strategyPacket";
import { generateTailoredBrief } from "@/lib/agent/tailoredBrief";
import { getUserSkill } from "@/lib/server/userSkills";
import {
  releasePaymentRef,
  tryConsumePaymentRef,
  verifyUsdcTransfer,
} from "@/lib/server/collabPayments";

/**
 * Seller endpoint (x402). A buyer agent requests a discoverable skill:
 *   - No / invalid `X-PAYMENT` -> 402 with a payment challenge.
 *   - Valid `X-PAYMENT` (a settling USDC transfer tx hash) -> verify the
 *     transfer on-chain (to the seller's verified wallet, >= price, recent,
 *     not previously consumed) and return the typed StrategyPacket.
 *
 * Standing-offer consent: the seller opted the agent into discovery and set a
 * price; paying it IS the agreement. There is no per-request seller approval.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SellerBody {
  skillId?: string;
  toAgentId?: string;
  fromAgentId?: string;
  objective?: string;
  constraints?: { maxAnswerTokens?: number };
}

export async function POST(req: Request) {
  let body: SellerBody;
  try {
    body = (await req.json()) as SellerBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const skillId = (body.skillId ?? "").trim();
  const toAgentId = (body.toAgentId ?? "").trim();
  if (!skillId || !toAgentId) {
    return NextResponse.json({ error: "skillId and toAgentId are required." }, { status: 400 });
  }

  // Resolve the offer: skill must be discoverable, agent must advertise it + be opted in.
  const skill = await getUserSkill(skillId);
  if (!skill || skill.visibility !== "discoverable") {
    return NextResponse.json({ error: "Skill is not discoverable." }, { status: 404 });
  }
  const seller = await getAgentProfile(toAgentId);
  if (!seller || !seller.discoverable) {
    return NextResponse.json({ error: "Seller agent is not discoverable." }, { status: 404 });
  }
  const advertisers = await getAgentsForSkill(skillId);
  if (!advertisers.includes(toAgentId)) {
    return NextResponse.json({ error: "Seller agent does not offer this skill." }, { status: 404 });
  }

  const payTo = (await readAgentWallet(toAgentId)) ?? seller.agentWallet;
  if (!payTo) {
    return NextResponse.json(
      { error: "Seller wallet is not verified on-chain yet." },
      { status: 503 },
    );
  }

  const priceHuman = seller.collabPriceUsdc ?? defaultCollabPriceUsdc();
  const asset = collabUsdcAsset();
  let amount: bigint;
  try {
    amount = parseUsdcToBaseUnits(priceHuman);
  } catch {
    return NextResponse.json({ error: "Seller price is misconfigured." }, { status: 500 });
  }

  const payment = req.headers.get("x-payment")?.trim();

  // No payment yet -> challenge (HTTP 402).
  if (!payment) {
    return NextResponse.json(
      {
        x402Version: 1,
        error: "Payment required.",
        accepts: [
          {
            scheme: "exact",
            network: "arbitrum-sepolia",
            asset,
            assetDecimals: USDC_DECIMALS,
            payTo,
            maxAmountRequired: amount.toString(),
            humanAmount: formatUsdc(amount),
            resource: skillId,
            description: `StrategyPacket for skill "${skill.title}"`,
          },
        ],
      },
      { status: 402 },
    );
  }

  // Bind the payment to the buyer's verified wallet when we can resolve it.
  const expectedFrom = body.fromAgentId ? await readAgentWallet(body.fromAgentId.trim()) : null;

  // Claim the payment reference first (atomic) to prevent double-spend of one tx.
  const claimed = await tryConsumePaymentRef(payment, `${skillId}|${toAgentId}|${Date.now()}`);
  if (!claimed) {
    return NextResponse.json(
      { error: "This payment reference was already used." },
      { status: 409 },
    );
  }

  const verification = await verifyUsdcTransfer({
    txHash: payment,
    asset,
    payTo,
    minAmount: amount,
    expectedFrom,
  });

  if (!verification.ok) {
    // Release the claim so a corrected retry (e.g. after confirmation) can settle.
    await releasePaymentRef(payment);
    return NextResponse.json({ error: verification.error }, { status: 402 });
  }

  const packet = buildStrategyPacket(skill, {
    producedByAgentId: toAgentId,
    paymentRef: payment,
    maxAnswerTokens: body.constraints?.maxAnswerTokens,
  });

  // Objective-aware addendum from the seller's unique training (config +
  // knowledge + memory). The base packet and its skillHash stay untouched;
  // degrades to base-packet-only when no LLM key or no objective was given.
  if (body.objective?.trim()) {
    packet.tailoredBrief = await generateTailoredBrief({
      sellerAgentId: toAgentId,
      skillTitle: skill.title,
      objective: body.objective,
    });
  }

  return NextResponse.json({
    ok: true,
    packet,
    payment: {
      paymentRef: payment,
      from: verification.from,
      to: verification.to,
      amount: verification.value.toString(),
      humanAmount: formatUsdc(verification.value),
    },
  });
}
