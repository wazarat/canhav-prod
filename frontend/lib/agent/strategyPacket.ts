import { skillMarkdownHash } from "@/lib/agent/skillHash";
import type { AgentSkill, StrategyPacket, StrategyPacketDrip } from "@/lib/types";

/** Render a received StrategyPacket as Markdown for ingestion into agent memory. */
export function strategyPacketToMarkdown(packet: StrategyPacket): string {
  const lines: string[] = [];
  lines.push(`# Learned strategy: ${packet.title}`);
  lines.push(`> ${packet.summary}`);
  lines.push(`> Acquired from agent ${packet.producedByAgentId} (skill ${packet.skillId}).`);
  if (packet.drip) {
    lines.push(`> Installment ${packet.drip.installmentIndex + 1}/${packet.drip.totalInstallments} — ${packet.drip.label}.`);
  }
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
  if (packet.tailoredBrief) {
    lines.push("", `## Tailored brief (for objective: ${packet.tailoredBrief.objective})`);
    lines.push(packet.tailoredBrief.brief);
    if (packet.tailoredBrief.basedOn.length) {
      lines.push(
        "",
        `_Based on: ${packet.tailoredBrief.basedOn.map((s) => s.label).join("; ")}_`,
      );
    }
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
    /**
     * Drip disclosure: when set, the packet returns only one installment's
     * slice of the skill (`units` items per category, windowed by
     * `installmentIndex`) instead of the full bundle, and carries a `drip`
     * descriptor. Anti-extraction: a single interaction can never reveal more
     * than the agreed `units`.
     */
    drip?: { installmentIndex: number; totalInstallments: number; units: number };
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

  let outSteps = steps;
  let outFacts = skill.facts;
  let outSources = skill.sources;
  let drip: StrategyPacketDrip | null = null;

  if (opts.drip) {
    const { installmentIndex, totalInstallments, units } = opts.drip;
    const start = installmentIndex * units;
    const end = start + units;
    outSteps = steps.slice(start, end);
    outFacts = skill.facts.slice(start, end);
    outSources = skill.sources.slice(start, end);

    const maxLen = Math.max(steps.length, skill.facts.length, skill.sources.length);
    const revealed = Math.min(end, maxLen);
    drip = {
      installmentIndex,
      totalInstallments,
      units,
      hasMore: installmentIndex + 1 < totalInstallments && revealed < maxLen,
      label:
        maxLen === 0
          ? `installment ${installmentIndex + 1} of ${totalInstallments}`
          : `slice ${Math.min(start + 1, maxLen)}–${revealed} of ${maxLen} (installment ${installmentIndex + 1}/${totalInstallments})`,
    };
  }

  return {
    skillId: skill.id,
    producedByAgentId: opts.producedByAgentId,
    title: skill.title,
    summary: skill.summary,
    steps: outSteps,
    facts: outFacts,
    sources: outSources,
    skillHash: skillMarkdownHash(skill),
    paymentRef: opts.paymentRef,
    issuedAt: new Date().toISOString(),
    drip,
  };
}
