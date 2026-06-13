import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SkillComposer } from "@/components/agent/SkillComposer";

export const metadata = { title: "Create a skill" };
export const dynamic = "force-dynamic";

export default function NewSkillPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const returnAgentId = searchParams.agent ? decodeURIComponent(searchParams.agent) : null;
  return (
    <div className="container max-w-3xl space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/agents/skills" className="transition-colors hover:text-ink-50">
          Skills
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Create</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Create a skill
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
          Author custom research knowledge and attach it to your agent to train it. Skills are
          read-only — they teach the agent, they never trade or transact.
          {returnAgentId && (
            <span className="mt-1 block text-electric-400">
              After saving, you&apos;ll return to your agent with this skill ready to attach.
            </span>
          )}
        </p>
      </header>

      <SkillComposer returnAgentId={returnAgentId} />
    </div>
  );
}
