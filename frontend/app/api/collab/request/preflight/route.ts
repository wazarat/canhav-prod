import { NextResponse } from "next/server";

import { collabUsdcAsset, hasCollab } from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { readSecret } from "@/lib/server/env";

/**
 * Buyer preflight: returns the params the browser needs to sign a USDC transfer
 * from the buyer agent's smart account. Session-gated + ownership-checked so a
 * user can only spend from their own agent.
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

  const agentId = new URL(req.url).searchParams.get("agentId")?.trim() ?? "";
  if (!agentId) {
    return NextResponse.json({ configured: false, error: "agentId is required." }, { status: 400 });
  }

  const ownedIds = new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))]);
  if (!ownedIds.has(agentId)) {
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

  return NextResponse.json({
    configured: true,
    accountIndex: profile.accountIndex,
    asset: collabUsdcAsset(),
    mintConfig: { zerodevRpc, rpcUrl, identityRegistry, securityRegistry },
  });
}
