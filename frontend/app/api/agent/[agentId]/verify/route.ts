import { NextResponse } from "next/server";

import { getAgentProfile } from "@/lib/agent/memory";
import { verifyAgentOnChain } from "@/lib/agent/onchain";

/**
 * Public ERC-8004 identity verifier.
 *
 * Reads `ownerOf(agentId)` + `tokenURI(agentId)` from the IdentityRegistry on
 * Arbitrum Sepolia and confirms the owner matches the agent's smart account.
 * Open (no session) so the identity can be verified by anyone — the same way an
 * explorer would. Powers the on-platform "Identity verified on-chain" badge.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ error: `Unknown agent "${agentId}".` }, { status: 404 });
  }

  const verification = await verifyAgentOnChain(agentId, profile.agentAddress);
  return NextResponse.json(verification);
}
