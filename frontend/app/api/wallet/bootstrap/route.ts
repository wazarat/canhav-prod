import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { grantSignupCredits, startingTcnhvHuman } from "@/lib/server/credits";
import { canMintTcnhv } from "@/lib/server/factory";
import { readSecret } from "@/lib/server/env";

/**
 * Wallet treasury bootstrap.
 *
 * GET  -> whether the signed-in user still needs the one-time tCNHV grant, plus
 *         the ZeroDev mint config the browser needs to derive its canonical
 *         kernel (index 0) wallet address.
 * POST -> grants the starting credits to that wallet address (idempotent).
 *
 * The address is derived in the browser (the embedded signer lives client-side),
 * then posted here so the owner-keyed mint can run server-side.
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

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ needsGrant: false, error: "Sign in." }, { status: 401 });
  }

  const profile = await getUserProfile(session.userId);
  const cfg = mintConfig();
  const needsGrant = Boolean(
    profile && !profile.tcnhvGranted && canMintTcnhv() && hasZeroDev() && cfg,
  );

  return NextResponse.json({
    needsGrant,
    granted: Boolean(profile?.tcnhvGranted),
    startingAmount: startingTcnhvHuman(),
    mintConfig: needsGrant ? cfg : null,
  });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: { address?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ ok: false, error: "A valid wallet address is required." }, {
      status: 400,
    });
  }

  const result = await grantSignupCredits({ userId: session.userId, address });
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
