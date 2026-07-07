import Link from "next/link";
import { ArrowRight, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { SKILL_GROUPS, type PlatformSkill } from "@/lib/agent/skills";

/** The "Your custom skills" actions card + the grouped platform skill catalog. */
export function SkillCatalogCard({ skills }: { skills: PlatformSkill[] }) {
  return (
    <>
      <Card id="agents-skills" className="scroll-mt-32 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
          <div>
            <CardTitle className="text-base">Your custom skills</CardTitle>
            <CardDescription className="mt-1">
              Author or import your own research knowledge and attach it to an agent to train it.
              Enable collaboration on the agent to sell its bundled expertise.
            </CardDescription>
          </div>
          <Badge tone="neutral">user-authored</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/agents/skills/new"
            className="group inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
          >
            Create / import a skill
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/agents/skills"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-electric-500/40"
          >
            My skills
          </Link>
          <Link
            href="/collab"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-electric-500/40"
          >
            Discover agents
          </Link>
        </div>
      </Card>

      <Card id="agents-catalog" className="scroll-mt-32 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
          <div>
            <CardTitle className="text-base">Skills</CardTitle>
            <CardDescription className="mt-1">
              Machine-readable protocol knowledge an agent can study and register from.
            </CardDescription>
          </div>
          <Badge tone="neutral">{skills.length} available</Badge>
        </div>
        {skills.length === 0 ? (
          <p className="text-sm text-ink-400">No skills yet — seed entities into the store.</p>
        ) : (
          <div className="space-y-5">
            {SKILL_GROUPS.map((group) => {
              const groupSkills = skills.filter((s: PlatformSkill) => s.group === group.id);
              if (groupSkills.length === 0) return null;
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                      {group.label}
                    </h3>
                    <span className="font-mono text-[10px] text-ink-500">
                      {groupSkills.length}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {groupSkills.map((skill) => (
                      <Link
                        key={skill.id}
                        href={`/agents/skills/${encodeURIComponent(skill.id)}`}
                        className="group flex items-start gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3 transition-colors hover:border-electric-500/40 hover:bg-ink-900/60"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-ink-300">
                          <ScrollText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-100">{skill.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{skill.summary}</p>
                          <p className="mt-1 font-mono text-[10px] text-ink-500">
                            {skill.facts.length} facts · {skill.actions.length} actions
                          </p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-electric-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
