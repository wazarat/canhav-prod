import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserSkill, setUserSkillVisibility } from "@/lib/server/userSkills";

/**
 * Single user-authored skill.
 *   GET   -> read it (any signed-in user; needed by buyers verifying a packet).
 *   PATCH -> owner-only: flip visibility (private <-> discoverable).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }
  const skill = await getUserSkill(decodeURIComponent(params.id));
  if (!skill) return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  return NextResponse.json({ skill });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }

  let body: { visibility?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.visibility !== "private" && body.visibility !== "discoverable") {
    return NextResponse.json(
      { error: "visibility must be 'private' or 'discoverable'." },
      { status: 400 },
    );
  }

  const updated = await setUserSkillVisibility(
    decodeURIComponent(params.id),
    session.userId,
    body.visibility,
  );
  if (!updated) {
    return NextResponse.json({ error: "Skill not found or not yours." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, skill: updated });
}
