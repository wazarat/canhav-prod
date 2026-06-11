import { NextResponse } from "next/server";

import { verifyPrivyToken } from "@/lib/auth/privy";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { upsertUserFromPrivy } from "@/lib/auth/users";
import { hasPrivy } from "@/lib/agent/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Privy login bridge — verifies the Privy access token from the client social
 * login and issues an httpOnly session cookie keyed by the Privy DID (the stable
 * user id). Replaces the old WebAuthn/passkey route.
 */
export async function POST(req: Request) {
  if (!hasPrivy()) {
    return NextResponse.json(
      {
        configured: false,
        error: "Privy not configured (NEXT_PUBLIC_PRIVY_APP_ID + PRIVY_APP_SECRET).",
      },
      { status: 503 },
    );
  }

  let body: { accessToken?: unknown; displayName?: unknown; email?: unknown; address?: unknown } =
    {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const bearer =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;
  const token = (typeof body.accessToken === "string" && body.accessToken) || bearer;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing Privy access token." }, { status: 400 });
  }

  const verified = await verifyPrivyToken(token);
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired Privy session." },
      { status: 401 },
    );
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : null;
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : null;
  const address =
    typeof body.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(body.address)
      ? body.address
      : null;

  const profile = await upsertUserFromPrivy({
    userId: verified.userId,
    displayName,
    email,
    address,
  });

  const sessionToken = createSessionToken(verified.userId);
  const res = NextResponse.json({ ok: true, userId: verified.userId, profile });
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
