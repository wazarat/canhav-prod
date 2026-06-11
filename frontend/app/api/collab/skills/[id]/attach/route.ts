import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import {
  appendMemory,
  attachSkillToAgent,
  getAgentProfile,
  getAttachedSkillIds,
  markSkillStudied,
} from "@/lib/agent/memory";
import { skillMarkdownHash } from "@/lib/agent/skillHash";
import { skillToMarkdown } from "@/lib/agent/skillExport";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { getUserSkill } from "@/lib/server/userSkills";
import { readSecret } from "@/lib/server/env";

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

  // Ownership: the agent must be the caller's default agent or one they own.
  const ownedIds = new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))]);
  if (!ownedIds.has(agentId)) {
    return NextResponse.json({ ok: false, error: "That agent isn't yours." }, { status: 403 });
  }

  const skillId = decodeURIComponent(params.id);
  const skill = await getUserSkill(skillId);
  if (!skill || skill.authorUserId !== session.userId) {
    return NextResponse.json({ ok: false, error: "Skill not found or not yours." }, { status: 404 });
  }

  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }

  const markdown = skillToMarkdown(skill);
  const skillHash = skillMarkdownHash(skill);

  // Train: ground the knowledge into memory + mark studied + record the advert.
  await appendMemory(agentId, { text: markdown, source: `skill:${skillId}` });
  await markSkillStudied(agentId, skillId);
  await attachSkillToAgent(agentId, skillId, skillHash);

  const attachedSkillIds = await getAttachedSkillIds(agentId);

  // Parameters for the optional in-browser setMetadata advertise (only when the
  // agent is minted on-chain and the chain stack is provisioned).
  const zerodevRpc = readSecret("ZERODEV_RPC");
  const identityRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const securityRegistry = readSecret("SECURITY_REGISTRY_ADDRESS");
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  const advertise =
    profile.onChain &&
    profile.accountIndex != null &&
    hasZeroDev() &&
    zerodevRpc &&
    identityRegistry &&
    securityRegistry
      ? {
          agentId,
          accountIndex: profile.accountIndex,
          skillsCsv: attachedSkillIds.join(","),
          newSkill: { id: skillId, hash: skillHash },
          mintConfig: { zerodevRpc, rpcUrl, identityRegistry, securityRegistry },
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
