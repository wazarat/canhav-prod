import { NextResponse } from "next/server";

import {
  getTradeProposal,
  updateTradeProposalStatus,
} from "@/lib/agent/memory";
import { tradeProposalToJson } from "@/lib/agent/trade/types";
import { requireOwnedAgent } from "@/lib/agent/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { agentId: string; proposalId: string } },
) {
  const agentId = decodeURIComponent(params.agentId);
  const proposalId = decodeURIComponent(params.proposalId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: { action?: string; reason?: string; txHash?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const existing = await getTradeProposal(agentId, proposalId);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
  }

  const action = body.action?.trim();
  if (action === "reject") {
    const updated = await updateTradeProposalStatus(agentId, proposalId, {
      status: "rejected",
      reason: typeof body.reason === "string" ? body.reason : "Rejected.",
    });
    return NextResponse.json({ ok: true, proposal: tradeProposalToJson(updated!) });
  }

  if (action === "executed" && typeof body.txHash === "string" && body.txHash) {
    const updated = await updateTradeProposalStatus(agentId, proposalId, {
      status: "executed",
      txHash: body.txHash as `0x${string}`,
    });
    return NextResponse.json({ ok: true, proposal: tradeProposalToJson(updated!) });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
