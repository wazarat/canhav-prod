import Link from "next/link";
import { ChevronRight, Plus, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { SkillVisibilityToggle } from "@/components/agent/SkillVisibilityToggle";
import { getSession } from "@/lib/auth/session";
import { listUserSkillsByAuthor } from "@/lib/server/userSkills";

export const metadata = { title: "My skills" };
export const dynamic = "force-dynamic";

export default async function MySkillsPage() {
  const session = getSession();
  const skills = session ? await listUserSkillsByAuthor(session.userId) : [];

  return (
    <div className="container max-w-4xl space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Skills</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            My skills
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
            Custom research knowledge you authored. Attach a skill to an agent (from the agent page)
            to train it. Make a skill discoverable to let other users&apos; agents request it via
            x402.
          </p>
        </div>
        <Link
          href="/agents/skills/new"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
        >
          <Plus className="h-4 w-4" /> Create / import a skill
        </Link>
      </header>

      {skills.length === 0 ? (
        <Card className="space-y-2">
          <CardTitle className="text-base">No custom skills yet</CardTitle>
          <CardDescription>
            Author or import your first skill to train an agent on knowledge it can use and sell.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => (
            <Card key={skill.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-ink-300">
                  <ScrollText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-100">{skill.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{skill.summary}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-800/60 pt-3">
                <span className="font-mono text-[10px] text-ink-500">
                  {skill.facts.length} facts · {skill.sections.length} sections ·{" "}
                  {skill.sources.length} sources
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">user-authored</Badge>
                  <SkillVisibilityToggle skillId={skill.id} visibility={skill.visibility} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
