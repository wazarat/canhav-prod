import { NextResponse } from "next/server";

import { groundUserSkillOnAgent } from "@/lib/agent/attachUserSkill";
import { getAgentProfile, getAttachedSkillIds } from "@/lib/agent/memory";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { getUserSkill } from "@/lib/server/userSkills";
import { readSecret } from "@/lib/server/env";
import { collabEnabled } from "@/lib/collab-flag";

/**
 * Attach a user-authored skill to one of the caller's agents = "training".
 *
 * Server-side it (1) grounds the skill into agent memory so the chat loop uses
 * it, (2) marks it studied, and (3) records the advertised skill + integrity
 * hash (powers discovery + buyer verification). On-chain advertising of the
 * skill ids / hashes via setMetadata is signed in the browser; this route hands
 * back the parameters needed for that best-effort step.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in to attach a skill." }, { status: 401 });
  }

  let body: { agentId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const agentId = typeof body.agentId === "string" ? body.agentId : "";
  if (!agentId) {
    return NextResponse.json({ ok: false, error: "agentId is required." }, { status: 400 });
  }

  // Load the profile first so the ownership check can honor the canonical
  // `ownerUserId` (set at mint) even when the Redis index is stale/missing.
  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }

  // Ownership: matches the agent page guard (profile owner OR Redis index OR
  // the caller's default research agent).
  if (!(await userOwnsAgent(session.userId, agentId, profile.ownerUserId))) {
    return NextResponse.json({ ok: false, error: "That agent isn't yours." }, { status: 403 });
  }

  const skillId = decodeURIComponent(params.id);
  const skill = await getUserSkill(skillId);
  if (!skill || skill.authorUserId !== session.userId) {
    return NextResponse.json({ ok: false, error: "Skill not found or not yours." }, { status: 404 });
  }

  // Train: ground the knowledge into memory + mark studied + record the advert.
  const { skillHash } = await groundUserSkillOnAgent(agentId, skill);

  const attachedSkillIds = await getAttachedSkillIds(agentId);

  // Parameters for the optional in-browser setMetadata advertise (only when the
  // agent is minted on-chain and the registry is provisioned).
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  const advertise =
    profile.onChain && identityRegistry
      ? {
          agentId,
          skillsCsv: attachedSkillIds.join(","),
          newSkill: { id: skillId, hash: skillHash },
          identityRegistry,
          rpcUrl,
        }
      : null;

  return NextResponse.json({
    ok: true,
    skill: { id: skill.id, title: skill.title },
    skillHash,
    attachedSkillIds,
    advertise,
  });
}
