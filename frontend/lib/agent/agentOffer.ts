import "server-only";

import { keccak256, toBytes } from "viem";

import { getAttachedSkillIds, getAgentProfile } from "@/lib/agent/memory";
import { skillToMarkdown } from "@/lib/agent/skillExport";
import { getUserSkill } from "@/lib/server/userSkills";
import type { AgentSkill, AgentSkillFact, AgentSkillSection, SourceRef } from "@/lib/types";

/**
 * Bundled agent offer — merges all attached private skills into one sellable
 * StrategyPacket. Discovery is agent-centric; skills stay training-only.
 */

export const AGENT_OFFER_SKILL_PREFIX = "offer:" as const;

export function agentOfferSkillId(agentId: string): string {
  return `${AGENT_OFFER_SKILL_PREFIX}${agentId}`;
}

export interface AgentOfferResolved {
  skill: AgentSkill;
  hash: `0x${string}`;
  attachedSkillIds: string[];
  attachedSkillTitles: string[];
}

function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const s of sources) {
    const k = s.url.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function dedupeFacts(facts: AgentSkillFact[]): AgentSkillFact[] {
  const seen = new Set<string>();
  const out: AgentSkillFact[] = [];
  for (const f of facts) {
    const k = f.key.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

/** Merge attached user skills into a synthetic AgentSkill for collaboration. */
export async function buildAgentOfferSkill(agentId: string): Promise<AgentSkill | null> {
  const profile = await getAgentProfile(agentId);
  if (!profile) return null;

  const attachedIds = (await getAttachedSkillIds(agentId)).sort();
  if (!attachedIds.length) return null;

  const skills = (
    await Promise.all(attachedIds.map((id) => getUserSkill(id)))
  ).filter((s): s is NonNullable<typeof s> => Boolean(s));

  if (!skills.length) return null;

  const facts: AgentSkillFact[] = [];
  const sections: AgentSkillSection[] = [];
  const sources: SourceRef[] = [];
  const glossary = skills.flatMap((s) => s.glossary ?? []);

  for (const skill of skills) {
    facts.push(...skill.facts);
    for (const section of skill.sections) {
      sections.push({
        heading: `${skill.title}: ${section.heading}`,
        body: section.body,
      });
    }
    sources.push(...skill.sources);
  }

  const entityLabel = profile.entitySlug ? ` (${profile.entitySlug})` : "";
  const summary =
    skills.length === 1
      ? skills[0]!.summary
      : `Bundled expertise from ${skills.length} attached skills${entityLabel}.`;

  return {
    id: agentOfferSkillId(agentId),
    title: `${profile.name} — bundled expertise`,
    summary,
    facts: dedupeFacts(facts),
    sections,
    actions: [],
    glossary: glossary.length ? glossary : undefined,
    sources: dedupeSources(sources),
    version: "1.0.0",
    updatedAt: profile.updatedAt,
  };
}

/** Canonical integrity hash for an agent's bundled offer. */
export function agentOfferHashFromSkill(skill: AgentSkill): `0x${string}` {
  return keccak256(toBytes(skillToMarkdown(skill)));
}

export async function agentOfferHash(agentId: string): Promise<`0x${string}` | null> {
  const skill = await buildAgentOfferSkill(agentId);
  if (!skill) return null;
  return agentOfferHashFromSkill(skill);
}

/**
 * Resolve a sellable offer for a discoverable agent. Returns null when the
 * agent is missing, not discoverable, or has no attached skills loaded.
 */
export async function resolveAgentOffer(agentId: string): Promise<AgentOfferResolved | null> {
  const profile = await getAgentProfile(agentId);
  if (!profile?.discoverable) return null;

  const attachedSkillIds = (await getAttachedSkillIds(agentId)).sort();
  if (!attachedSkillIds.length) return null;

  const skill = await buildAgentOfferSkill(agentId);
  if (!skill) return null;

  const attachedSkillTitles = (
    await Promise.all(attachedSkillIds.map((id) => getUserSkill(id)))
  )
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => s.title);

  return {
    skill,
    hash: agentOfferHashFromSkill(skill),
    attachedSkillIds,
    attachedSkillTitles,
  };
}
