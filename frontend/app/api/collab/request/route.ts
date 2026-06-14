import { NextResponse } from "next/server";

import { keccak256, toHex } from "viem";

import { agentOfferHash, agentOfferSkillId } from "@/lib/agent/agentOffer";
import { collabAgreementAddress, collabRegistryAddress } from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { appendMemory, getAgentProfile, markSkillStudied } from "@/lib/agent/memory";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { strategyPacketToMarkdown } from "@/lib/agent/strategyPacket";
import { getSession } from "@/lib/auth/session";
import {
  consumeAgreementInteraction,
  getAgreement,
  validateInteraction,
} from "@/lib/server/collabAgreements";
import { recordCollabExchange } from "@/lib/server/collabLog";
import { checkRateLimit } from "@/lib/server/collabPayments";
import { readSecret } from "@/lib/server/env";
import { hasFactory, readTxGasWei, recordWorkOnLedger } from "@/lib/server/factory";
import {
  decodePaymentResponseHeader,
  encodePaymentHeader,
  X402_SCHEME,
  X402_NETWORK,
  X402_SETTLEMENT,
  X402_VERSION,
} from "@/lib/server/x402";
import { readAgentWallet } from "@/lib/agent/onchain";
import type { StrategyPacket } from "@/lib/types";

/**
 * Buyer-side orchestrator for agent-centric bundled offers.
 *
 * Two flows share this route:
 *   - One-off: no `agreementId`; the seller's per-interaction ceiling (if set)
 *     still bounds disclosure.
 *   - Agreement installment: `agreementId` + `units` -> validated against the
 *     human-approved agreement (cap, cooldown, installments), dripped slice
 *     returned, counters consumed, interaction recorded on-chain with its size.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per-buyer fixed-window rate limit on paid collab requests. */
const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60;

interface RequestBody {
  skillId?: string;
  toAgentId?: string;
  fromAgentId?: string;
  objective?: string;
  paymentRef?: string;
  agreementId?: string;
  units?: number;
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

  if (!(await userOwnsAgent(session.userId, fromAgentId))) {
    return NextResponse.json({ ok: false, error: "Buyer agent isn't yours." }, { status: 403 });
  }
  if (toAgentId === fromAgentId) {
    return NextResponse.json({ ok: false, error: "An agent cannot buy from itself." }, { status: 400 });
  }

  // Anti-extraction rate limit: throttle paid requests per buyer agent.
  const rate = await checkRateLimit("request", fromAgentId, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests — slow down.", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? RATE_WINDOW_SECONDS) } },
    );
  }

  // Agreement path: validate the installment BEFORE producing the packet
  // (cap, cooldown, installments remaining). The funds were already settled
  // client-side; the UI gates the pay button, this is the authoritative check.
  const agreementId = (body.agreementId ?? "").trim();
  let drip: { installmentIndex: number; totalInstallments: number; units: number } | undefined;
  let recordUnits = 1;
  let onChainAgreementId: `0x${string}` =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  // The REAL on-chain agreement id (set only once the agreement was anchored via
  // CollabAgreement.establish) — drives the per-period recordInteraction write.
  let anchoredAgreementOnChainId: `0x${string}` | null = null;

  if (agreementId) {
    const agreement = await getAgreement(agreementId);
    if (!agreement) {
      return NextResponse.json({ ok: false, error: "Agreement not found." }, { status: 404 });
    }
    if (agreement.sellerAgentId !== toAgentId || agreement.buyerAgentId !== fromAgentId) {
      return NextResponse.json(
        { ok: false, error: "Agreement does not match these agents." },
        { status: 409 },
      );
    }
    const requestedUnits = Math.floor(body.units ?? agreement.maxUnitsPerInteraction);
    const check = validateInteraction(agreement, requestedUnits, session.userId);
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: check.error, retryAt: check.retryAt },
        { status: 409 },
      );
    }
    recordUnits = requestedUnits;
    drip = {
      installmentIndex: check.installmentIndex ?? agreement.interactionCount,
      totalInstallments: agreement.totalInstallments,
      units: requestedUnits,
    };
    anchoredAgreementOnChainId = (agreement.onChainAgreementId as `0x${string}` | null) ?? null;
    onChainAgreementId = anchoredAgreementOnChainId ?? keccak256(toHex(agreement.agreementId));
  }

  // Build the canonical x402 v2 X-PAYMENT header: a base64 payload carrying the
  // settling tx hash from the buyer smart account's USDC transfer.
  const buyerWallet = await readAgentWallet(fromAgentId);
  const xPayment = encodePaymentHeader({
    x402Version: X402_VERSION,
    scheme: X402_SCHEME,
    network: X402_NETWORK,
    payload: { txHash: paymentRef, from: buyerWallet, settlement: X402_SETTLEMENT },
  });

  const origin = new URL(req.url).origin;
  let sellerRes: Response;
  try {
    sellerRes = await fetch(`${origin}/api/collab/strategy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PAYMENT": xPayment },
      body: JSON.stringify({
        toAgentId,
        fromAgentId,
        objective: body.objective,
        constraints: body.constraints,
        drip,
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

  // The seller returns the canonical X-PAYMENT-RESPONSE settlement header.
  const settlement = decodePaymentResponseHeader(sellerRes.headers.get("x-payment-response"));

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

  // Consume the agreement installment now that the exchange succeeded, so a
  // failed exchange never burns an installment. Re-validates atomically.
  let agreementState = null;
  if (agreementId) {
    const consumed = await consumeAgreementInteraction(agreementId, recordUnits, session.userId);
    if (!consumed.ok) {
      return NextResponse.json({ ok: false, error: consumed.error }, { status: 409 });
    }
    agreementState = consumed.agreement ?? null;
  }

  // The disclosed magnitude: the dripped slice size, or the count of items
  // actually revealed for a one-off, so the on-chain record reflects real size.
  const disclosedUnits = agreementId
    ? recordUnits
    : Math.max(1, packet.steps.length + packet.facts.length + packet.sources.length);

  await recordCollabExchange({
    fromAgentId,
    toAgentId,
    skillId: offerId,
    skillHash: packet.skillHash,
    paymentRef,
    amount: sellerData.payment?.amount ?? "0",
    at: new Date().toISOString(),
    units: disclosedUnits,
    agreementId: agreementId || null,
  });

  // Mirror the completed exchange onto both agents' on-chain ledgers via the
  // platform owner key (the CollabRegistry attestation below is untouched).
  // Additive + best-effort: sequential to avoid deployer-nonce collisions,
  // skips cleanly when the factory is unset or a ledger is missing, and never
  // blocks the exchange.
  if (hasFactory()) {
    try {
      const cnhvDelta = BigInt(sellerData.payment?.amount ?? "0");
      const gasWei = await readTxGasWei(paymentRef);
      await recordWorkOnLedger({
        agentId: toAgentId,
        counterpartyAgentId: fromAgentId,
        cnhvDelta,
        earned: true,
        gasWei,
      });
      await recordWorkOnLedger({
        agentId: fromAgentId,
        counterpartyAgentId: toAgentId,
        cnhvDelta,
        earned: false,
        gasWei,
      });
    } catch {
      /* ledger mirroring is additive — never block a completed exchange */
    }
  }

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
          agreementId: onChainAgreementId,
          units: Math.min(disclosedUnits, 0xffffffff),
          accountIndex: buyer.accountIndex,
          mintConfig: { zerodevRpc, rpcUrl, identityRegistry, securityRegistry },
        }
      : null;

  // Per-period agreement write (CollabAgreement.recordInteraction), in addition
  // to the CollabRegistry attestation above — so each period lands two on-chain
  // writes. Only when the agreement was actually anchored on-chain.
  const collabAgreement = collabAgreementAddress();
  const agreementRecord =
    anchoredAgreementOnChainId &&
    collabAgreement &&
    buyer?.onChain &&
    buyer.accountIndex != null &&
    hasZeroDev() &&
    zerodevRpc &&
    identityRegistry &&
    securityRegistry
      ? {
          collabAgreement,
          onChainAgreementId: anchoredAgreementOnChainId,
          units: Math.min(disclosedUnits, 0xffffffff),
          accountIndex: buyer.accountIndex,
          mintConfig: { zerodevRpc, rpcUrl, identityRegistry, securityRegistry },
        }
      : null;

  return NextResponse.json({
    ok: true,
    packet,
    record,
    agreementRecord,
    settlement,
    units: disclosedUnits,
    agreement: agreementState,
  });
}
