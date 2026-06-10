import { NextResponse } from "next/server";

import { reconstructWebAuthnKey, userIdFromWebAuthnKey } from "@/lib/auth/webauthn";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { upsertUserFromPasskey } from "@/lib/auth/users";
import { hasPasskeyServer } from "@/lib/agent/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Passkey register/login — issues an httpOnly session cookie keyed by
 * authenticatorIdHash (stable user id).
 */
export async function POST(req: Request) {
  if (!hasPasskeyServer()) {
    return NextResponse.json(
      {
        configured: false,
        error: "Passkey server not configured (NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER).",
      },
      { status: 503 },
    );
  }

  let body: { mode?: string; webAuthnKey?: unknown; displayName?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode === "login" ? "login" : body.mode === "register" ? "register" : null;
  const webAuthnKey = reconstructWebAuthnKey(body.webAuthnKey);
  if (!mode || !webAuthnKey) {
    return NextResponse.json(
      { ok: false, error: 'mode ("register" | "login") and a valid webAuthnKey are required.' },
      { status: 400 },
    );
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : null;

  const userId = userIdFromWebAuthnKey(webAuthnKey);
  const profile = await upsertUserFromPasskey({
    userId,
    authenticatorId: webAuthnKey.authenticatorId,
    displayName,
  });

  const token = createSessionToken(userId);
  const res = NextResponse.json({
    ok: true,
    mode,
    userId,
    profile,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
