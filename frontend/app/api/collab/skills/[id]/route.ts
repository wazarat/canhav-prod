import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserSkill, setUserSkillVisibility } from "@/lib/server/userSkills";
import { collabEnabled } from "@/lib/collab-flag";

/**
 * Single user-authored skill.
 *   GET -> read it (any signed-in user).
 *   PATCH -> deprecated; skills are always private (attach to agent for collab).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }
  const skill = await getUserSkill(decodeURIComponent(params.id));
  if (!skill) return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  return NextResponse.json({ skill });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
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

  if (body.visibility === "discoverable") {
    return NextResponse.json(
      {
        error:
          "Skills are private training artifacts. Enable collaboration on the agent that has this skill attached.",
      },
      { status: 400 },
    );
  }

  const updated = await setUserSkillVisibility(
    decodeURIComponent(params.id),
    session.userId,
    "private",
  );
  if (!updated) {
    return NextResponse.json({ error: "Skill not found or not yours." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, skill: updated });
}
