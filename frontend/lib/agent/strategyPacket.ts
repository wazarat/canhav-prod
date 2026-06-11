import { skillMarkdownHash } from "@/lib/agent/skillHash";
import type { AgentSkill, StrategyPacket } from "@/lib/types";

/** Render a received StrategyPacket as Markdown for ingestion into agent memory. */
export function strategyPacketToMarkdown(packet: StrategyPacket): string {
  const lines: string[] = [];
  lines.push(`# Learned strategy: ${packet.title}`);
  lines.push(`> ${packet.summary}`);
  lines.push(`> Acquired from agent ${packet.producedByAgentId} (skill ${packet.skillId}).`);
  if (packet.steps.length) {
    lines.push("", "## Steps");
    packet.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  if (packet.facts.length) {
    lines.push("", "## Facts");
    for (const f of packet.facts) lines.push(`- **${f.key}:** ${f.value}`);
  }
  if (packet.sources.length) {
    lines.push("", "## Sources");
    for (const s of packet.sources) lines.push(`- [${s.label}](${s.url})`);
  }
  return lines.join("\n");
}

/**
 * Derive a typed StrategyPacket from a skill (pure; client- and server-safe).
 *
 * The packet is the ONLY thing a seller returns — a bounded, research-only
 * distillation of the skill (steps from its sections, plus facts + sources),
 * carrying the integrity `skillHash` the buyer verifies against the advertised
 * value before ingesting.
 */
export function buildStrategyPacket(
  skill: AgentSkill,
  opts: {
    producedByAgentId: string;
    paymentRef: string;
    maxAnswerTokens?: number;
  },
): StrategyPacket {
  // ~4 chars per token: convert the soft token cap to a character budget for steps.
  const charBudget = Math.max(400, (opts.maxAnswerTokens ?? 800) * 4);

  const steps: string[] = [];
  let used = 0;
  for (const section of skill.sections) {
    const step = section.body
      ? `${section.heading}: ${section.body}`
      : section.heading;
    if (used + step.length > charBudget && steps.length > 0) break;
    steps.push(step);
    used += step.length;
  }

  return {
    skillId: skill.id,
    producedByAgentId: opts.producedByAgentId,
    title: skill.title,
    summary: skill.summary,
    steps,
    facts: skill.facts,
    sources: skill.sources,
    skillHash: skillMarkdownHash(skill),
    paymentRef: opts.paymentRef,
    issuedAt: new Date().toISOString(),
  };
}
