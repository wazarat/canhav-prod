import { NextResponse } from "next/server";

import { collabUsdcAsset, hasCollab } from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { prepareCollabSettlement } from "@/lib/server/collabPrepare";
import { readSecret } from "@/lib/server/env";

/**
 * Buyer preflight: params to sign a settlement transfer from the buyer agent's
 * smart account. When `toAgentId` is supplied, also validates balance, seller
 * wallet, factory ledgers, and returns Arbiscan proof link targets.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ configured: false, error: "Sign in." }, { status: 401 });
  }
  if (!hasZeroDev() || !hasCollab()) {
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
  if (!profile || !profile.onChain || profile.accountIndex == null) {
    return NextResponse.json(
      { configured: false, error: "Buyer agent must be minted on-chain to pay." },
      { status: 400 },
    );
  }

  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  if (!zerodevRpc || !identityRegistry || !securityRegistry) {
    return NextResponse.json(
      { configured: false, error: "Registry or ZeroDev RPC not configured." },
      { status: 503 },
    );
  }

  const base = {
    configured: true,
    accountIndex: profile.accountIndex,
    asset: collabUsdcAsset(),
    mintConfig: { zerodevRpc, rpcUrl, identityRegistry, securityRegistry },
  };

  if (!toAgentId) {
    return NextResponse.json(base);
  }

  const prepared = await prepareCollabSettlement(agentId, toAgentId);

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
