import { NextResponse } from "next/server";

import { collabUsdcAsset, hasCollab } from "@/lib/agent/collab-config";
import { hasPrivy } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { prepareCollabSettlement } from "@/lib/server/collabPrepare";
import { readSecret } from "@/lib/server/env";
import { collabEnabled } from "@/lib/collab-flag";

/**
 * Buyer preflight: params to sign a settlement transfer from the buyer's Privy
 * wallet. When `toAgentId` is supplied, also validates balance, seller wallet,
 * factory ledgers, and returns Arbiscan proof link targets.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ configured: false, error: "Sign in." }, { status: 401 });
  }
  if (!hasCollab() || !hasPrivy()) {
    return NextResponse.json(
      { configured: false, error: "Collaboration is not configured in this environment." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId")?.trim() ?? "";
  const toAgentId = url.searchParams.get("toAgentId")?.trim() ?? "";

  if (!agentId) {
    return NextResponse.json({ configured: false, error: "agentId is required." }, { status: 400 });
  }

  if (!(await userOwnsAgent(session.userId, agentId))) {
    return NextResponse.json({ configured: false, error: "That agent isn't yours." }, { status: 403 });
  }

  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ configured: false, error: "Buyer agent not found." }, { status: 404 });
  }

  const userProfile = await getUserProfile(session.userId);
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  const payerAddress = userProfile?.address ?? null;

  const base = {
    configured: true,
    agentAddress: profile.agentAddress ?? null,
    signerAddress: profile.signerAddress ?? userProfile?.signerAddress ?? null,
    payerAddress,
    asset: collabUsdcAsset(),
    rpcUrl,
  };

  if (!toAgentId) {
    return NextResponse.json(base);
  }

  const prepared = await prepareCollabSettlement(agentId, toAgentId, { payerAddress });

  return NextResponse.json({
    ...base,
    settlementReady: prepared.ready,
    sufficient: prepared.sufficient,
    humanRequired: prepared.humanRequired,
    humanBalance: prepared.humanBalance,
    assetName: prepared.assetName,
    requiredAmountRaw: prepared.requiredAmountRaw,
    buyerBalanceRaw: prepared.buyerBalanceRaw,
    proof: prepared.proof,
    error: prepared.error,
  });
}
