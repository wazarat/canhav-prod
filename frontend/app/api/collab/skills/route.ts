import { NextResponse } from "next/server";

import { normalizeDraft, validateUserSkill } from "@/lib/agent/userSkill";
import { getSession } from "@/lib/auth/session";
import { listUserSkillsByAuthor, saveUserSkill } from "@/lib/server/userSkills";
import type { SkillVisibility } from "@/lib/types";

/**
 * User-authored skills collection.
 *   GET  -> the signed-in user's authored skills.
 *   POST -> validate + persist a new skill (form payload or an imported draft).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to manage skills." }, { status: 401 });
  }
  const skills = await listUserSkillsByAuthor(session.userId);
  return NextResponse.json({ skills });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to create a skill." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const draft = normalizeDraft((body ?? {}) as Record<string, unknown>);
  const result = validateUserSkill(draft);
  if (!result.ok) {
    return NextResponse.json({ error: "Invalid skill.", errors: result.errors }, { status: 400 });
  }

  const visibility: SkillVisibility =
    (body as { visibility?: string })?.visibility === "discoverable" ? "discoverable" : "private";

  const skill = await saveUserSkill({
    authorUserId: session.userId,
    title: draft.title,
    summary: draft.summary,
    facts: draft.facts,
    sections: draft.sections,
    actions: draft.actions,
    sources: draft.sources,
    glossary: draft.glossary,
    visibility,
  });

  return NextResponse.json({ ok: true, skill });
}
