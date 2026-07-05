import { NextResponse } from "next/server";

import {
  collabSettlement,
  formatAmount,
  hasTcnhv,
  TCNHV_DECIMALS,
  tcnhvAssetAddress,
} from "@/lib/agent/collab-config";
import { hasPrivyWallet, zeroDevEnabled } from "@/lib/agent/config";
import { readTcnhvBalance } from "@/lib/agent/onchain";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";

/**
 * Wallet treasury credits readout.
 *
 * Returns the signed-in user's Privy wallet tCNHV balance —
 * the spendable pool they pay sellers, fund agents, and transfer to peers from.
 * No agent-ownership gate (it's the user's own wallet). The wallet address can
 * come from the stored profile or, before it's persisted, a client-derived
 * `?address=` (read-only balance lookup).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ configured: false, error: "Sign in." }, { status: 401 });
  }
  if (!hasTcnhv()) {
    return NextResponse.json({ configured: false });
  }

  const profile = await getUserProfile(session.userId);
  const queryAddress = new URL(req.url).searchParams.get("address")?.trim() ?? "";
  const address = ADDRESS_RE.test(queryAddress)
    ? queryAddress
    : profile?.address && ADDRESS_RE.test(profile.address)
      ? profile.address
      : null;

  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  const canTransact = hasPrivyWallet();

  const balanceRaw = address ? await readTcnhvBalance(address) : null;

  return NextResponse.json({
    configured: true,
    address,
    token: tcnhvAssetAddress(),
    assetName: collabSettlement().name,
    decimals: TCNHV_DECIMALS,
    balance: formatAmount(BigInt(balanceRaw ?? "0"), TCNHV_DECIMALS),
    balanceRaw: balanceRaw ?? "0",
    granted: Boolean(profile?.tcnhvGranted),
    rpcUrl: canTransact ? rpcUrl : null,
    mintConfig:
      canTransact && zeroDevEnabled() && zerodevRpc && identityRegistry && securityRegistry
        ? { zerodevRpc, rpcUrl, identityRegistry, securityRegistry }
        : null,
  });
}
