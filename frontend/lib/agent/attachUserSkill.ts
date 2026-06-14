import "server-only";

import { appendMemory, attachSkillToAgent, markSkillStudied } from "@/lib/agent/memory";
import { skillMarkdownHash } from "@/lib/agent/skillHash";
import { skillToMarkdown } from "@/lib/agent/skillExport";
import type { UserSkill } from "@/lib/types";

/**
 * Ground a user-authored skill into an agent = "training". Shared by the attach
 * route and agent creation so both surfaces train identically:
 *   1. write the skill markdown into agent memory (the chat loop uses it),
 *   2. mark it studied, and
 *   3. record the advertised skill id + integrity hash (powers discovery +
 *      buyer verification).
 */
export async function groundUserSkillOnAgent(
  agentId: string,
  skill: UserSkill,
): Promise<{ skillId: string; skillHash: `0x${string}` }> {
  const markdown = skillToMarkdown(skill);
  const skillHash = skillMarkdownHash(skill);
  await appendMemory(agentId, { text: markdown, source: `skill:${skill.id}` });
  await markSkillStudied(agentId, skill.id);
  await attachSkillToAgent(agentId, skill.id, skillHash);
  return { skillId: skill.id, skillHash };
}
