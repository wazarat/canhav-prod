import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserProfile, updateUserProfile } from "@/lib/auth/users";

/**
 * Read or update the signed-in user's thin profile (the human-readable name on
 * top of their self-custodial wallet). Privy social login remains the only
 * login — this just lets users be identified by name.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const profile = await getUserProfile(session.userId);
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  let body: { displayName?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.displayName !== "string") {
    return NextResponse.json({ error: "displayName (string) is required." }, { status: 400 });
  }

  const profile = await updateUserProfile(session.userId, {
    displayName: body.displayName.trim().slice(0, 80),
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, profile });
}
