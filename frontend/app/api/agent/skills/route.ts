import { NextRequest, NextResponse } from "next/server";

import { getAgentSkills, suggestSkillsForEntity } from "@/lib/agent/skills";

/**
 * Platform skill catalog for the client-side SkillPicker: every approved
 * entity / stablecoin / RWA / token rendered as a lightweight grouped option.
 * Read-only and derived from already-public approved profiles.
 *
 * `?suggestFor={skillId}` returns launch suggestions for an entity core skill
 * instead of the catalog (same route so the client has one skills endpoint).
 */

export const runtime = "nodejs";
// Reading searchParams makes this handler dynamic in the App Router, so the
// previous revalidate window no longer applies. Store reads are memoized per
// request in lib/data and the route is fetched once per launch-card mount.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const suggestFor = request.nextUrl.searchParams.get("suggestFor");
  if (suggestFor) {
    // Only bare entity slugs have suggestion sources; namespaced product/user
    // ids and unknown slugs resolve to an empty list, never an error.
    const suggestions = suggestFor.includes(":")
      ? []
      : await suggestSkillsForEntity(suggestFor);
    return NextResponse.json({ ok: true, suggestions });
  }

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
