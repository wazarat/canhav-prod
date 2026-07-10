import { NextResponse } from "next/server";

import { hasPrivyWallet } from "@/lib/agent/config";
import { getSession } from "@/lib/auth/session";
import { getUserProfile, updateUserProfile } from "@/lib/auth/users";
import { grantSignupCredits, startingTcnhvHuman } from "@/lib/server/credits";
import { canMintTcnhv } from "@/lib/server/factory";
import { collabEnabled } from "@/lib/collab-flag";

/**
 * Wallet treasury bootstrap.
 *
 * GET  -> whether the signed-in user still needs the one-time tCNHV grant.
 * POST -> grants the starting credits to the user's Privy wallet address (idempotent).
 *
 * The address comes from the browser (Privy embedded wallet); the owner-keyed
 * mint runs server-side.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ needsGrant: false, error: "Sign in." }, { status: 401 });
  }

  const profile = await getUserProfile(session.userId);
  const granted = Boolean(profile?.tcnhvGranted);
  const needsGrant = Boolean(profile && !granted && canMintTcnhv() && hasPrivyWallet());

  // Explain *why* a grant isn't offered so the UI can show an actionable
  // message instead of a generic "not available in this environment".
  let reason:
    | "needs_grant"
    | "already_granted"
    | "no_profile"
    | "mint_unconfigured"
    | "identity_unconfigured" = "needs_grant";
  if (needsGrant) reason = "needs_grant";
  else if (!profile) reason = "no_profile";
  else if (granted) reason = "already_granted";
  else if (!canMintTcnhv()) reason = "mint_unconfigured";
  else reason = "identity_unconfigured";

  return NextResponse.json({
    needsGrant,
    granted,
    reason,
    startingAmount: startingTcnhvHuman(),
  });
}

export async function POST(req: Request) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: { address?: unknown; signerAddress?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const signerAddress =
    typeof body.signerAddress === "string" ? body.signerAddress.trim() : "";

  if (signerAddress && /^0x[0-9a-fA-F]{40}$/.test(signerAddress)) {
    await updateUserProfile(session.userId, { signerAddress });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    if (signerAddress && /^0x[0-9a-fA-F]{40}$/.test(signerAddress)) {
      return NextResponse.json({ ok: true, signerPersisted: true });
    }
    return NextResponse.json({ ok: false, error: "A valid wallet address is required." }, {
      status: 400,
    });
  }

  const result = await grantSignupCredits({ userId: session.userId, address });
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
