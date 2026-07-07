import { NextResponse } from "next/server";

import { agentOfferSkillId } from "@/lib/agent/agentOffer";
import {
  collabSettlement,
  defaultCollabPriceUsdc,
  formatAmount,
  parseAmountToBaseUnits,
} from "@/lib/agent/collab-config";
import { getAgentProfile } from "@/lib/agent/memory";
import { resolveAgentOffer } from "@/lib/agent/agentOffer";
import { getUserProfile } from "@/lib/auth/users";
import { resolveSellerPayTo } from "@/lib/server/collabPrepare";
import { buildStrategyPacket } from "@/lib/agent/strategyPacket";
import { generateTailoredBrief } from "@/lib/agent/tailoredBrief";
import { releasePaymentRef, tryConsumePaymentRef } from "@/lib/server/collabPayments";
import {
  buildPaymentChallenge,
  buildPaymentRequirements,
  decodePaymentHeader,
  encodePaymentResponseHeader,
  settlePayment,
  verifyPayment,
} from "@/lib/server/x402";

/**
 * Seller endpoint — canonical x402 v2 on Arbitrum Sepolia.
 *   - No / invalid `X-PAYMENT` -> HTTP 402 with a structured `accepts[]`
 *     payment challenge.
 *   - Valid `X-PAYMENT` (base64 payload carrying the settling tx hash) ->
 *     facilitator verify() proves the on-chain USDC transfer, settle() returns
 *     the StrategyPacket plus an `X-PAYMENT-RESPONSE` settlement header.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SellerBody {
  skillId?: string;
  toAgentId?: string;
  fromAgentId?: string;
  objective?: string;
  constraints?: { maxAnswerTokens?: number };
  /**
   * Drip disclosure for an agreement installment, set by the buyer orchestrator
   * (/api/collab/request) after it validated + consumed the agreement. Caps how
   * much the seller reveals in this single interaction.
   */
  drip?: { installmentIndex?: number; totalInstallments?: number; units?: number };
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

  const payTo = await resolveSellerPayTo(toAgentId);
  if (!payTo) {
    return NextResponse.json(
      {
        error:
          "Seller wallet is not verified on-chain yet. Only minted agents with real smart-account wallets can receive payments.",
      },
      { status: 503 },
    );
  }

  const settleAsset = collabSettlement();
  const priceHuman = seller.collabPriceUsdc ?? defaultCollabPriceUsdc();
  let amount: bigint;
  try {
    amount = parseAmountToBaseUnits(priceHuman, settleAsset.decimals);
  } catch {
    return NextResponse.json({ error: "Seller price is misconfigured." }, { status: 500 });
  }

  const requirements = buildPaymentRequirements({
    payTo,
    amount,
    resource: agentOfferSkillId(toAgentId),
    description: `StrategyPacket for agent "${seller.name}" (${offer.attachedSkillTitles.length} attached skills)`,
  });

  // No / invalid X-PAYMENT -> structured x402 v2 challenge.
  const decoded = decodePaymentHeader(req.headers.get("x-payment"));
  if (!decoded) {
    return NextResponse.json(buildPaymentChallenge(requirements), { status: 402 });
  }

  const payment = decoded.txHash;
  // The settlement is paid from the buyer owner's Privy treasury wallet, so the
  // expected payer is the owner's wallet (falling back to the header's `from`).
  let expectedFrom: string | null = null;
  if (body.fromAgentId) {
    const buyerAgent = await getAgentProfile(body.fromAgentId.trim());
    if (buyerAgent?.ownerUserId) {
      const owner = await getUserProfile(buyerAgent.ownerUserId);
      expectedFrom = owner?.address ?? decoded.from ?? null;
    } else {
      expectedFrom = decoded.from ?? null;
    }
  }

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

  // Facilitator verify(): prove the settling transfer on-chain.
  const verification = await verifyPayment({ payload: decoded, requirements, expectedFrom });
  if (!verification.ok) {
    await releasePaymentRef(payment);
    return NextResponse.json({ error: verification.error }, { status: 402 });
  }

  // Drip disclosure / anti-extraction. An agreement installment passes explicit
  // drip params; otherwise the seller's configured per-interaction ceiling
  // (`collabMaxUnits`) still caps a one-off disclosure as a single max-units
  // interaction. With no ceiling set, the full bundle is returned (legacy).
  const drip = resolveDrip(body.drip, seller.collabMaxUnits);

  const packet = buildStrategyPacket(offer.skill, {
    producedByAgentId: toAgentId,
    paymentRef: payment,
    maxAnswerTokens: body.constraints?.maxAnswerTokens,
    drip,
  });

  if (body.objective?.trim()) {
    packet.tailoredBrief = await generateTailoredBrief({
      sellerAgentId: toAgentId,
      skillTitle: offer.skill.title,
      objective: body.objective,
    });
  }

  // Facilitator settle(): settlement already happened on-chain; format the
  // confirmed result as the canonical X-PAYMENT-RESPONSE header.
  const settlement = settlePayment({ txHash: payment, verified: verification, requirements });

  const res = NextResponse.json({
    ok: true,
    packet,
    payment: {
      paymentRef: payment,
      from: verification.from,
      to: verification.to,
      amount: verification.value.toString(),
      humanAmount: formatAmount(verification.value, settleAsset.decimals),
    },
    settlement,
  });
  res.headers.set("X-PAYMENT-RESPONSE", encodePaymentResponseHeader(settlement));
  return res;
}

/**
 * Resolve the effective drip window for this interaction. An explicit
 * agreement installment wins; otherwise a seller ceiling clamps a one-off into
 * a single max-units slice; otherwise no drip (full disclosure).
 */
function resolveDrip(
  requested: SellerBody["drip"],
  sellerCeiling: number | null,
): { installmentIndex: number; totalInstallments: number; units: number } | undefined {
  if (requested && typeof requested.units === "number" && requested.units > 0) {
    const units = Math.floor(requested.units);
    const cappedUnits = sellerCeiling ? Math.min(units, sellerCeiling) : units;
    return {
      installmentIndex: Math.max(0, Math.floor(requested.installmentIndex ?? 0)),
      totalInstallments: Math.max(1, Math.floor(requested.totalInstallments ?? 1)),
      units: Math.max(1, cappedUnits),
    };
  }
  if (sellerCeiling && sellerCeiling > 0) {
    return { installmentIndex: 0, totalInstallments: 1, units: sellerCeiling };
  }
  return undefined;
}
