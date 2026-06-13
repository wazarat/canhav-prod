import { NextResponse } from "next/server";

import { reputationEnabled, reputationRegistryAddress } from "@/lib/agent/collab-config";
import { hasZeroDev } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { recordReputation } from "@/lib/agent/reputation";
import { appendReview, MAX_REVIEW_COMMENT_LEN } from "@/lib/agent/reviews";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { listCollabExchanges } from "@/lib/server/collabLog";
import { tryConsumeRatingRef } from "@/lib/server/collabPayments";
import { readSecret } from "@/lib/server/env";

/**
 * Buyer feedback after a completed exchange — EXCHANGE-VERIFIED reputation.
 * A rating must carry the `paymentRef` of a settled exchange in `collab:log`
 * for this exact buyer/seller pair, and each paymentRef can be rated once.
 * This closes the unverified-reputation gap: discovery ranking now reflects
 * real, paid collaboration quality.
 *
 * Always updates the fast Redis read model (which powers discovery ranking).
 * When the on-chain reputation hook is enabled (COLLAB_REPUTATION_ENABLED=1),
 * also returns params for a client-signed ReputationRegistry.giveFeedback —
 * otherwise that step stays flag-off.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: {
    toAgentId?: string;
    fromAgentId?: string;
    rating?: number;
    paymentRef?: string;
    comment?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const toAgentId = (body.toAgentId ?? "").trim();
  const fromAgentId = (body.fromAgentId ?? "").trim();
  const paymentRef = (body.paymentRef ?? "").trim();
  const comment = (body.comment ?? "").trim().slice(0, MAX_REVIEW_COMMENT_LEN);
  const rating = Number(body.rating);
  if (!toAgentId || !fromAgentId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { ok: false, error: "toAgentId, fromAgentId and a rating between 1 and 5 are required." },
      { status: 400 },
    );
  }
  if (!paymentRef) {
    return NextResponse.json(
      { ok: false, error: "paymentRef of the settled exchange is required to rate." },
      { status: 400 },
    );
  }

  // Only an owner of the buyer agent can rate (prevents ballot stuffing).
  const ownedIds = new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))]);
  if (!ownedIds.has(fromAgentId)) {
    return NextResponse.json({ ok: false, error: "Buyer agent isn't yours." }, { status: 403 });
  }

  // Exchange-verified: the paymentRef must belong to a settled exchange in
  // collab:log for THIS buyer/seller pair.
  const exchanges = await listCollabExchanges(200);
  const exchange = exchanges.find(
    (e) =>
      e.paymentRef.toLowerCase() === paymentRef.toLowerCase() &&
      e.toAgentId === toAgentId &&
      e.fromAgentId === fromAgentId,
  );
  if (!exchange) {
    return NextResponse.json(
      { ok: false, error: "No settled exchange found for this paymentRef and agent pair." },
      { status: 403 },
    );
  }

  // One rating per settled exchange.
  const fresh = await tryConsumeRatingRef(paymentRef, `${fromAgentId}|${toAgentId}|${rating}`);
  if (!fresh) {
    return NextResponse.json(
      { ok: false, error: "This exchange was already rated." },
      { status: 409 },
    );
  }

  const summary = await recordReputation(toAgentId, rating);
  const buyer = fromAgentId ? await getAgentProfile(fromAgentId) : null;

  // Persist the exchange-verified text review (newest first) for the seller
  // marketplace view. The reviewer handle is the buyer agent's name.
  const review = await appendReview({
    agentId: toAgentId,
    fromAgentId,
    reviewerHandle: buyer?.name ?? "A buyer agent",
    rating,
    comment,
    paymentRef,
  });

  // Flag-off on-chain attestation params.
  const registry = reputationRegistryAddress();
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

  return NextResponse.json({ ok: true, summary, review, onChain });
}
