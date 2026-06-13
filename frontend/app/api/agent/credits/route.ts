import { NextResponse } from "next/server";

import {
  collabSettlement,
  formatAmount,
  hasTcnhv,
  TCNHV_DECIMALS,
  tcnhvAssetAddress,
} from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { readFaucetStatus, readTcnhvBalance } from "@/lib/agent/onchain";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { readSecret } from "@/lib/server/env";

/**
 * Credits readout + faucet-claim params for an owned agent.
 *
 * Returns the agent smart account's tCNHV balance (the spendable settlement
 * credit), faucet cooldown state, and the params the browser needs to send a
 * gas-sponsored `faucet()` userOp from that same account. Session-gated +
 * ownership-checked; degrades to `configured:false` when tCNHV is unset so the
 * UI hides the faucet entirely.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ configured: false, error: "Sign in." }, { status: 401 });
  }
  if (!hasTcnhv()) {
    return NextResponse.json({ configured: false });
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
  if (!profile || !profile.onChain || profile.accountIndex == null || !profile.agentAddress) {
    return NextResponse.json(
      { configured: false, error: "Agent must be on-chain to hold credits." },
      { status: 400 },
    );
  }
  const account = profile.agentAddress;

  const [balanceRaw, faucet] = await Promise.all([
    readTcnhvBalance(account),
    readFaucetStatus(account),
  ]);

  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  const claimable = hasZeroDev() && Boolean(zerodevRpc && identityRegistry && securityRegistry);

  return NextResponse.json({
    configured: true,
    account,
    token: tcnhvAssetAddress(),
    assetName: collabSettlement().name,
    balance: formatAmount(BigInt(balanceRaw ?? "0"), TCNHV_DECIMALS),
    balanceRaw: balanceRaw ?? "0",
    canClaim: faucet?.canClaim ?? false,
    nextClaimAt: faucet?.nextClaimAt ?? 0,
    cooldownSeconds: faucet?.cooldownSeconds ?? 0,
    accountIndex: profile.accountIndex,
    mintConfig: claimable ? { zerodevRpc, rpcUrl, identityRegistry, securityRegistry } : null,
  });
}
