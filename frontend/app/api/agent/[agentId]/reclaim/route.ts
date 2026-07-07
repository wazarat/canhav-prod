import { NextResponse } from "next/server";

import { getAgentProfile } from "@/lib/agent/memory";
import { reclaimAgentByProof, userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";

/**
 * Re-link a minted agent to the signed-in user when Privy DID changed but the
 * same wallet still controls the agent.
 *
 * GET  -> reclaim eligibility (the browser just needs the connected wallet)
 * POST -> verify the connected wallet against the recorded mint signer, then
 *         migrate ownerUserId. Legacy kernel-era agents without a recorded
 *         signerAddress are no longer reclaimable (kernel derivation retired).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  const agentId = decodeURIComponent(params.agentId).trim();
  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }
  if (!profile.onChain || !profile.agentAddress) {
    return NextResponse.json(
      { ok: false, error: "Agent must be on-chain to reclaim." },
      { status: 400 },
    );
  }

  if (await userOwnsAgent(session.userId, agentId, profile.ownerUserId)) {
    return NextResponse.json({
      ok: true,
      alreadyOwned: true,
      agentId,
      agentAddress: profile.agentAddress,
    });
  }

  if (!profile.signerAddress) {
    return NextResponse.json(
      {
        ok: false,
        error: "This agent predates signer records and can no longer be reclaimed.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyOwned: false,
    agentId,
    agentAddress: profile.agentAddress,
    signerAddress: profile.signerAddress,
  });
}

export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  const agentId = decodeURIComponent(params.agentId).trim();

  let body: { signerAddress?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const signerAddress =
    typeof body.signerAddress === "string" ? body.signerAddress.trim() : "";
  if (!signerAddress) {
    return NextResponse.json({ ok: false, error: "signerAddress is required." }, { status: 400 });
  }

  const result = await reclaimAgentByProof(session.userId, agentId, { signerAddress });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true, agentId });
}
