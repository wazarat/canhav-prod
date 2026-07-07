import { NextResponse } from "next/server";

import {
  listTradeProposals,
  updateTradeProposalStatus,
  getTradeProposal,
} from "@/lib/agent/memory";
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
