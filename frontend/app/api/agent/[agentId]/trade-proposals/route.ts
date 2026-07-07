import { NextResponse } from "next/server";

import { listTradeProposals } from "@/lib/agent/memory";
import { execTradePropose } from "@/lib/agent/trade/propose";
import type { TradeSide } from "@/lib/agent/trade/types";
import { tradeProposalToJson } from "@/lib/agent/trade/types";
import { requireOwnedAgent } from "@/lib/agent/ownership";

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

  const result = await execTradePropose(agentId, { asset, side, sizeUsdHuman, leverage });
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
