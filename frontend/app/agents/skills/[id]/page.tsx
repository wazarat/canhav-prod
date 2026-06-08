import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getAgentSkillById, getAgentSkills } from "@/lib/agent/skills";
import { skillToJson, skillToMarkdown } from "@/lib/agent/skillExport";

export const revalidate = 300;

export async function generateStaticParams() {
  const skills = await getAgentSkills();
  return skills.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const skill = await getAgentSkillById(params.id);
  return { title: skill ? skill.title : "Skill not found" };
}

export default async function SkillPage({ params }: { params: { id: string } }) {
  const skill = await getAgentSkillById(params.id);
  if (!skill) notFound();

  const md = skillToMarkdown(skill);
  const json = skillToJson(skill);

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Skill</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            {skill.title}
          </h1>
          <Badge tone="neon">Agent Skill</Badge>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">{skill.summary}</p>
        <p className="font-mono text-xs text-ink-500">
          {skill.id} · v{skill.version}
          {skill.updatedAt ? ` · updated ${skill.updatedAt}` : ""}
        </p>
      </header>

      <Card className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Raw markdown</p>
        <pre className="max-h-[28rem] overflow-auto rounded-xl border border-ink-800/60 bg-ink-950/60 p-4 text-xs leading-relaxed text-ink-200">
          <code>{md}</code>
        </pre>
      </Card>

      <Card className="space-y-3">
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-wider text-ink-400">
            JSON (machine-readable)
          </summary>
          <pre className="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-ink-800/60 bg-ink-950/60 p-4 text-xs leading-relaxed text-ink-200">
            <code>{json}</code>
          </pre>
        </details>
      </Card>
    </div>
  );
}
