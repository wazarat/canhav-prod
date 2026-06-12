import { NextResponse } from "next/server";

import { agentOfferSkillId } from "@/lib/agent/agentOffer";
import {
  collabUsdcAsset,
  defaultCollabPriceUsdc,
  formatUsdc,
  parseUsdcToBaseUnits,
  USDC_DECIMALS,
} from "@/lib/agent/collab-config";
import { getAgentProfile } from "@/lib/agent/memory";
import { readAgentWallet } from "@/lib/agent/onchain";
import { resolveAgentOffer } from "@/lib/agent/agentOffer";
import { buildStrategyPacket } from "@/lib/agent/strategyPacket";
import { generateTailoredBrief } from "@/lib/agent/tailoredBrief";
import {
  releasePaymentRef,
  tryConsumePaymentRef,
  verifyUsdcTransfer,
} from "@/lib/server/collabPayments";

/**
 * Seller endpoint (x402). A buyer agent requests a discoverable agent's
 * bundled offer:
 *   - No / invalid `X-PAYMENT` -> 402 with a payment challenge.
 *   - Valid `X-PAYMENT` -> verify transfer and return StrategyPacket.
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

  const toAgentId = (body.toAgentId ?? "").trim();
  if (!toAgentId) {
    return NextResponse.json({ error: "toAgentId is required." }, { status: 400 });
  }

  const seller = await getAgentProfile(toAgentId);
  if (!seller || !seller.discoverable) {
    return NextResponse.json({ error: "Seller agent is not discoverable." }, { status: 404 });
  }

  const offer = await resolveAgentOffer(toAgentId);
  if (!offer) {
    return NextResponse.json(
      { error: "Seller agent has no attached skills to offer." },
      { status: 404 },
    );
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
            resource: agentOfferSkillId(toAgentId),
            description: `StrategyPacket for agent "${seller.name}" (${offer.attachedSkillTitles.length} attached skills)`,
          },
        ],
      },
      { status: 402 },
    );
  }

  const expectedFrom = body.fromAgentId ? await readAgentWallet(body.fromAgentId.trim()) : null;

  const claimed = await tryConsumePaymentRef(
    payment,
    `${agentOfferSkillId(toAgentId)}|${toAgentId}|${Date.now()}`,
  );
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
    await releasePaymentRef(payment);
    return NextResponse.json({ error: verification.error }, { status: 402 });
  }

  const packet = buildStrategyPacket(offer.skill, {
    producedByAgentId: toAgentId,
    paymentRef: payment,
    maxAnswerTokens: body.constraints?.maxAnswerTokens,
  });

  if (body.objective?.trim()) {
    packet.tailoredBrief = await generateTailoredBrief({
      sellerAgentId: toAgentId,
      skillTitle: offer.skill.title,
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
