import { NextResponse } from "next/server";

import { reputationEnabled, reputationRegistryAddress } from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { recordReputation } from "@/lib/agent/reputation";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { readSecret } from "@/lib/server/env";

/**
 * Buyer feedback after a completed exchange. Always updates the fast Redis read
 * model (which powers discovery ranking). When the on-chain reputation hook is
 * enabled (COLLAB_REPUTATION_ENABLED=1), also returns params for a client-signed
 * ReputationRegistry.giveFeedback — otherwise that step stays flag-off.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: { toAgentId?: string; fromAgentId?: string; rating?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const toAgentId = (body.toAgentId ?? "").trim();
  const fromAgentId = (body.fromAgentId ?? "").trim();
  const rating = Number(body.rating);
  if (!toAgentId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { ok: false, error: "toAgentId and a rating between 1 and 5 are required." },
      { status: 400 },
    );
  }

  // Only an owner of the buyer agent can rate (prevents ballot stuffing).
  const ownedIds = new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))]);
  if (fromAgentId && !ownedIds.has(fromAgentId)) {
    return NextResponse.json({ ok: false, error: "Buyer agent isn't yours." }, { status: 403 });
  }

  const summary = await recordReputation(toAgentId, rating);

  // Flag-off on-chain attestation params.
  const registry = reputationRegistryAddress();
  const buyer = fromAgentId ? await getAgentProfile(fromAgentId) : null;
  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  const onChain =
    reputationEnabled() &&
    registry &&
    buyer?.onChain &&
    buyer.accountIndex != null &&
    hasZeroDev() &&
    zerodevRpc &&
    identityRegistry &&
    securityRegistry
      ? {
          reputationRegistry: registry,
          toAgentId,
          value: Math.round(rating),
          valueDecimals: 0,
          accountIndex: buyer.accountIndex,
          mintConfig: { zerodevRpc, rpcUrl, identityRegistry, securityRegistry },
        }
      : null;

  return NextResponse.json({ ok: true, summary, onChain });
}
