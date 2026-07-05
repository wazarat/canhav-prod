import { NextResponse } from "next/server";

import { collabUsdcAsset, hasCollab } from "@/lib/agent/collab-config";
import { hasPrivy, zeroDevEnabled } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { prepareCollabSettlement } from "@/lib/server/collabPrepare";
import { readSecret } from "@/lib/server/env";

/**
 * Buyer preflight: params to sign a settlement transfer from the buyer's Privy
 * wallet (default) or buyer agent kernel (USE_ZERODEV=true). When `toAgentId` is
 * supplied, also validates balance, seller wallet, factory ledgers, and returns
 * Arbiscan proof link targets.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ configured: false, error: "Sign in." }, { status: 401 });
  }
  if (!hasCollab() || (!hasPrivy() && !zeroDevEnabled())) {
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

  if (zeroDevEnabled() && (!profile.onChain || profile.accountIndex == null)) {
    return NextResponse.json(
      { configured: false, error: "Buyer agent must be minted on-chain to pay." },
      { status: 400 },
    );
  }

  const userProfile = await getUserProfile(session.userId);
  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  if (zeroDevEnabled() && (!zerodevRpc || !identityRegistry || !securityRegistry)) {
    return NextResponse.json(
      { configured: false, error: "Registry or ZeroDev RPC not configured." },
      { status: 503 },
    );
  }

  const payerAddress = !zeroDevEnabled() ? (userProfile?.address ?? null) : null;

  const base = {
    configured: true,
    accountIndex: profile.accountIndex ?? null,
    agentAddress: profile.agentAddress ?? null,
    signerAddress: profile.signerAddress ?? userProfile?.signerAddress ?? null,
    payerAddress,
    asset: collabUsdcAsset(),
    rpcUrl,
    mintConfig:
      zeroDevEnabled() && zerodevRpc && identityRegistry && securityRegistry
        ? { zerodevRpc, rpcUrl, identityRegistry, securityRegistry }
        : null,
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
