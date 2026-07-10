import { NextResponse } from "next/server";

import { listTradeProposals } from "@/lib/agent/memory";
import { execTradePropose } from "@/lib/agent/trade/propose";
import type { EncryptedUsdCipherJson, TradeSide } from "@/lib/agent/trade/types";
import { tradeProposalToJson } from "@/lib/agent/trade/types";
import { requireOwnedAgent } from "@/lib/agent/ownership";
import { fheEnabled } from "@/lib/fhe-flag";
import { verifyCapCheckClaim, type CapCheckClaim } from "@/lib/server/fheCapCheck";
import { validateEncryptedEnvelope } from "@/lib/server/fheValidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const proposals = await listTradeProposals(agentId);
  return NextResponse.json({
    ok: true,
    proposals: proposals.map(tradeProposalToJson),
  });
}

/**
 * Trade Desk entry point: propose a GMX trade outside chat. Same behavior as
 * the `trade_propose` chat tool — research gate, HITL method branching, and
 * size/leverage clamping all happen inside execTradePropose. Owner-session
 * gated only: no collab/marketplace objects are read anywhere in
 * lib/agent/trade/* — marketplace buyers can never reach trade execution.
 */
export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: {
    asset?: unknown;
    side?: unknown;
    sizeUsdHuman?: unknown;
    leverage?: unknown;
    sizeUsdEnc?: unknown;
    capClaim?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const asset = typeof body.asset === "string" ? body.asset : "";
  const side = body.side as TradeSide;
  const sizeUsdHuman =
    typeof body.sizeUsdHuman === "number" && Number.isFinite(body.sizeUsdHuman)
      ? body.sizeUsdHuman
      : undefined;
  const leverage =
    typeof body.leverage === "number" && Number.isFinite(body.leverage)
      ? body.leverage
      : undefined;

  // FHE Phase 1: encrypted size envelope (form path). Provenance-validated
  // here — the value itself is invisible to the server by design.
  let sizeUsdEnc: EncryptedUsdCipherJson | undefined;
  if (body.sizeUsdEnc != null) {
    if (!fheEnabled()) {
      return NextResponse.json(
        { ok: false, error: "Encrypted proposals are disabled." },
        { status: 400 },
      );
    }
    if (sizeUsdHuman !== undefined) {
      return NextResponse.json(
        { ok: false, error: "Send either sizeUsdHuman or sizeUsdEnc, not both." },
        { status: 400 },
      );
    }
    const env = body.sizeUsdEnc as EncryptedUsdCipherJson;
    const check = await validateEncryptedEnvelope(agentId, env);
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: 422 });
    }
    sizeUsdEnc = env;
  }

  // FHE Phase 2: optional attested on-chain cap-check verdict. A present but
  // unverifiable claim is tampering → 422 (same posture as the envelope);
  // an absent claim just defers caps to execute time as in Phase 1.
  let capCheckOnchain: { within: boolean } | undefined;
  if (body.capClaim != null) {
    if (!sizeUsdEnc) {
      return NextResponse.json(
        { ok: false, error: "capClaim requires an encrypted size." },
        { status: 400 },
      );
    }
    const verdict = await verifyCapCheckClaim(agentId, sizeUsdEnc, body.capClaim as CapCheckClaim);
    if (!verdict.ok) {
      return NextResponse.json({ ok: false, error: verdict.error }, { status: 422 });
    }
    capCheckOnchain = { within: verdict.within === true };
  }

  const result = await execTradePropose(agentId, {
    asset,
    side,
    sizeUsdHuman,
    leverage,
    sizeUsdEnc,
    capCheckOnchain,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
