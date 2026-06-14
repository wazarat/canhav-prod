import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { reclaimAgentByProof, userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { readSecret } from "@/lib/server/env";

/**
 * Re-link a minted agent to the signed-in user when Privy DID changed but the
 * same wallet still controls the agent kernel.
 *
 * GET  -> params the browser needs to derive the agent kernel and prove control
 * POST -> verify derived address + optional signer, then migrate ownerUserId
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mintConfig() {
  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  if (!zerodevRpc || !identityRegistry || !securityRegistry) return null;
  return { zerodevRpc, rpcUrl, identityRegistry, securityRegistry };
}

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
  if (!profile.onChain || profile.accountIndex == null || !profile.agentAddress) {
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
      accountIndex: profile.accountIndex,
    });
  }

  const cfg = mintConfig();
  if (!hasZeroDev() || !cfg) {
    return NextResponse.json(
      { ok: false, error: "On-chain identity not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyOwned: false,
    agentId,
    agentAddress: profile.agentAddress,
    accountIndex: profile.accountIndex,
    mintConfig: cfg,
  });
}

export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  const agentId = decodeURIComponent(params.agentId).trim();

  let body: { agentAddress?: unknown; signerAddress?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const agentAddress = typeof body.agentAddress === "string" ? body.agentAddress.trim() : "";
  if (!agentAddress) {
    return NextResponse.json({ ok: false, error: "agentAddress is required." }, { status: 400 });
  }

  const signerAddress =
    typeof body.signerAddress === "string" ? body.signerAddress.trim() : undefined;

  const result = await reclaimAgentByProof(session.userId, agentId, {
    agentAddress,
    signerAddress,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true, agentId });
}
