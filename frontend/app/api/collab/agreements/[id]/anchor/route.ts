import { NextResponse } from "next/server";

import {
  collabAgreementAddress,
  collabSettlement,
  hasCollabAgreement,
  parseAmountToBaseUnits,
} from "@/lib/agent/collab-config";
import { getAgentProfile } from "@/lib/agent/memory";
import { getSession } from "@/lib/auth/session";
import {
  anchorAgreement,
  getAgreement,
  type AgreementCadence,
  type AgreementMode,
} from "@/lib/server/collabAgreements";
import { readSecret } from "@/lib/server/env";
import { collabEnabled } from "@/lib/collab-flag";

/**
 * On-chain anchoring for a human-approved agreement (CollabAgreement.establish).
 *   GET  -> establish params the buyer browser needs to sign (preflight).
 *   POST -> persist the resulting on-chain agreement id + tx hash.
 *
 * Everything degrades gracefully when COLLAB_AGREEMENT_ADDRESS is unset (or an
 * agent isn't minted): GET returns { configured: false } and the off-chain
 * enforcement in collabAgreements remains the source of truth.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isNumericId = (id: string): boolean => /^\d+$/.test(id);

function modeEnum(mode: AgreementMode): number {
  return mode === "recurring" ? 1 : 0;
}

function cadenceEnum(cadence: AgreementCadence): number {
  switch (cadence) {
    case "daily":
      return 1;
    case "weekly":
      return 2;
    case "monthly":
      return 3;
    default:
      return 0;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ configured: false, error: "Sign in." }, { status: 401 });
  }
  const { id } = await params;
  const agreement = await getAgreement(id);
  if (!agreement) {
    return NextResponse.json({ configured: false, error: "Agreement not found." }, { status: 404 });
  }
  if (agreement.buyerUserId !== session.userId) {
    return NextResponse.json(
      { configured: false, error: "Only the buyer can anchor this agreement." },
      { status: 403 },
    );
  }

  // Graceful degradation: when the contract isn't deployed, the agents aren't
  // minted, or the agreement is already anchored, there's nothing to sign.
  const collabAgreement = collabAgreementAddress();
  if (!hasCollabAgreement() || !collabAgreement) {
    return NextResponse.json({ configured: false, reason: "contract-unset" });
  }
  if (agreement.onChainAgreementId) {
    return NextResponse.json({ configured: false, reason: "already-anchored" });
  }
  if (agreement.status !== "active") {
    return NextResponse.json({ configured: false, reason: "not-active" });
  }
  if (!isNumericId(agreement.buyerAgentId) || !isNumericId(agreement.sellerAgentId)) {
    return NextResponse.json({ configured: false, reason: "agents-not-minted" });
  }

  const buyer = await getAgentProfile(agreement.buyerAgentId);
  if (!buyer || !buyer.onChain) {
    return NextResponse.json({ configured: false, reason: "buyer-not-minted" });
  }

  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  if (!securityRegistry) {
    return NextResponse.json({ configured: false, reason: "registry-unset" });
  }

  const { decimals } = collabSettlement();
  let pricePerInstallment: string;
  try {
    pricePerInstallment = parseAmountToBaseUnits(
      agreement.pricePerInstallmentUsdc,
      decimals,
    ).toString();
  } catch {
    pricePerInstallment = "0";
  }

  const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const termsHash =
    agreement.termsHash && /^0x[0-9a-fA-F]{64}$/.test(agreement.termsHash)
      ? agreement.termsHash
      : ZERO_HASH;

  return NextResponse.json({
    configured: true,
    establish: {
      collabAgreement,
      buyerAgentId: agreement.buyerAgentId,
      sellerAgentId: agreement.sellerAgentId,
      maxUnitsPerInteraction: agreement.maxUnitsPerInteraction,
      installments: agreement.totalInstallments,
      pricePerInstallment,
      minInteractionInterval: agreement.cooldownSeconds,
      expiry: 0,
      mode: modeEnum(agreement.mode),
      cadence: cadenceEnum(agreement.cadence),
      // Richer terms committed on-chain (token/call counts are unscaled integers).
      callBudgetPerPeriod: agreement.callBudgetPerPeriod,
      tokenBudgetPerPeriod: String(agreement.tokenBudgetPerPeriod),
      updatesPerPeriod: agreement.updatesPerPeriod,
      duneLinked: agreement.duneLinked,
      termsHash,
      rpcUrl,
      securityRegistry,
    },
  });
}

interface AnchorBody {
  onChainAgreementId?: string;
  establishTx?: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }
  const { id } = await params;

  let body: AnchorBody;
  try {
    body = (await req.json()) as AnchorBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const onChainAgreementId = (body.onChainAgreementId ?? "").trim();
  const establishTx = (body.establishTx ?? "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(onChainAgreementId)) {
    return NextResponse.json(
      { ok: false, error: "A valid on-chain agreement id (bytes32) is required." },
      { status: 400 },
    );
  }

  const agreement = await getAgreement(id);
  if (!agreement) {
    return NextResponse.json({ ok: false, error: "Agreement not found." }, { status: 404 });
  }
  if (agreement.buyerUserId !== session.userId) {
    return NextResponse.json(
      { ok: false, error: "Only the buyer can anchor this agreement." },
      { status: 403 },
    );
  }

  const updated = await anchorAgreement(id, onChainAgreementId, establishTx);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Could not persist the anchor." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, agreement: updated });
}
