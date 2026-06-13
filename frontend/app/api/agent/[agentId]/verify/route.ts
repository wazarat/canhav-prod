import { NextResponse } from "next/server";

import { confirmAgentOnChain, getAgentProfile } from "@/lib/agent/memory";
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

  // Self-healing reconciliation: a mint persisted as pendingVerification (server
  // couldn't read the chain at spawn time) is promoted to a trusted on-chain
  // agent once ownerOf confirms the smart account owns the token.
  let reconciled = false;
  if (verification.verified && (!profile.onChain || profile.pendingVerification)) {
    await confirmAgentOnChain(agentId);
    reconciled = true;
  }

  // Reconcile the on-chain tokenURI against the expected hosted agent card so a
  // mismatched/forged URI is visible to anyone verifying the identity.
  const expectedTokenURI = profile.agentURI ?? null;
  const uriMatches =
    verification.tokenURI && expectedTokenURI
      ? verification.tokenURI === expectedTokenURI
      : null;

  return NextResponse.json({ ...verification, reconciled, expectedTokenURI, uriMatches });
}
