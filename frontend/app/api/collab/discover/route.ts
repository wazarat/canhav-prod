import { NextResponse } from "next/server";

import { discoverAgentsForSkill, listCapabilities } from "@/lib/server/collabDiscovery";
import { getSession } from "@/lib/auth/session";

/**
 * Skill-indexed discovery.
 *   GET ?skill=<userSkillId> -> discoverable agents advertising that skill.
 *   GET (no skill)           -> the full capability manifest.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to discover agents." }, { status: 401 });
  }

  const skillId = new URL(req.url).searchParams.get("skill")?.trim();
  if (skillId) {
    const agents = await discoverAgentsForSkill(skillId);
    return NextResponse.json({ skillId, agents });
  }

  const capabilities = await listCapabilities();
  return NextResponse.json({ capabilities });
}
