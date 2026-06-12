import { NextResponse } from "next/server";

import { getAgentSkills } from "@/lib/agent/skills";

/**
 * Platform skill catalog for the client-side SkillPicker: every approved
 * entity / stablecoin / RWA / token rendered as a lightweight grouped option.
 * Read-only and derived from already-public approved profiles.
 */

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  const skills = await getAgentSkills();
  return NextResponse.json({
    ok: true,
    skills: skills.map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      group: s.group,
    })),
  });
}
