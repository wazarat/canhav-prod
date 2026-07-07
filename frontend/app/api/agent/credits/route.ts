import { NextResponse } from "next/server";

import {
  collabSettlement,
  formatAmount,
  hasTcnhv,
  TCNHV_DECIMALS,
  tcnhvAssetAddress,
} from "@/lib/agent/collab-config";
import { getAgentProfile } from "@/lib/agent/memory";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { readFaucetStatus, readTcnhvBalance } from "@/lib/agent/onchain";
import { getSession } from "@/lib/auth/session";

/**
 * Credits readout + faucet state for an owned agent.
 *
 * Returns the agent treasury wallet's tCNHV balance (the spendable settlement
 * credit) and faucet cooldown state; the browser claims by calling `faucet()`
 * directly from the wallet that minted the agent. Session-gated +
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

  if (!(await userOwnsAgent(session.userId, agentId))) {
    return NextResponse.json({ configured: false, error: "That agent isn't yours." }, { status: 403 });
  }

  const profile = await getAgentProfile(agentId);
  if (!profile || !profile.onChain || !profile.agentAddress) {
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
    signerAddress: profile.signerAddress ?? null,
  });
}
