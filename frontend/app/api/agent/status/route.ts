import { NextResponse } from "next/server";

import { agentConfigStatus, probeZeroDevPaymaster } from "@/lib/agent/config";
import { readSecret } from "@/lib/server/env";

/**
 * Agent-layer configuration readout.
 *
 * Reports which capabilities are live in this environment (LLM / memory /
 * on-chain identity) so the UI and external checks can see what is provisioned
 * without leaking any secret values. Always Arbitrum Sepolia.
 *
 * Add `?probe=1` to also run a live ZeroDev paymaster check against the running
 * deployment's real `ZERODEV_RPC` (the exact `pm_getPaymasterStubData` call the
 * mint makes). Because that can count against the project's daily request
 * budget, the probe is gated behind `Authorization: Bearer <APPROVAL_TOKEN>`
 * when a token is configured (the same convention as the admin ops endpoints).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = readSecret("APPROVAL_TOKEN");
  // No token configured (local dev) -> allow the probe for convenience.
  if (!token) return true;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function GET(req: Request) {
  const status = agentConfigStatus();

  const url = new URL(req.url);
  if (url.searchParams.get("probe") !== "1") {
    return NextResponse.json(status);
  }

  if (!authorized(req)) {
    return NextResponse.json({
      ...status,
      paymasterProbe: {
        ok: false,
        httpStatus: 401,
        chainId: status.zerodevChain,
        error: "Unauthorized. Send Authorization: Bearer <APPROVAL_TOKEN> to run the probe.",
      },
    });
  }

  const paymasterProbe = await probeZeroDevPaymaster();
  return NextResponse.json({ ...status, paymasterProbe });
}
