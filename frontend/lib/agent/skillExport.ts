import type { AgentSkill } from "@/lib/types";

export function skillToMarkdown(skill: AgentSkill): string {
  const lines: string[] = [
    `# ${skill.title}`,
    "",
    `> ${skill.summary}`,
    "",
    `- **ID:** ${skill.id}`,
    `- **Version:** ${skill.version}`,
    `- **Updated:** ${skill.updatedAt}`,
    "",
    "## Facts",
    "",
    ...skill.facts.map((f) => `- **${f.key}:** ${f.value}`),
    "",
    "## Sections",
    "",
    ...skill.sections.flatMap((s) => [`### ${s.heading}`, "", s.body, ""]),
    "## Actions",
    "",
    ...skill.actions.map(
      (a) =>
        `- **${a.name}** (${a.readOnly ? "read-only" : "write"}): ${a.description}\n  \`${a.signature}\``,
    ),
  ];

  if (skill.glossary?.length) {
    lines.push("", "## Glossary", "");
    skill.glossary.forEach((g) => {
      lines.push(`- **${g.term}:** ${g.definition}`);
    });
  }

  if (skill.sources.length) {
    lines.push("", "## Sources", "");
    skill.sources.forEach((s) => {
      lines.push(`- [${s.label}](${s.url})`);
    });
  }

  return lines.join("\n");
}

export function skillToJson(skill: AgentSkill): string {
  return JSON.stringify(skill, null, 2);
}
