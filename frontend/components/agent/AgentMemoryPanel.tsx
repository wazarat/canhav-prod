import { Brain, GraduationCap, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

interface MemoryFact {
  id: string;
  ts: string;
  text: string;
  source?: string | null;
}

/** Mirror of memory.ts `agentLevel` (kept inline so this stays import-light). */
function level(memoryCount: number, skillCount: number): number {
  const score = memoryCount + skillCount * 3;
  return Math.max(1, Math.floor(score / 5) + 1);
}

export function AgentMemoryPanel({
  memory,
  studiedSkills,
}: {
  memory: MemoryFact[];
  studiedSkills: string[];
}) {
  const lvl = level(memory.length, studiedSkills.length);

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-neon-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Knowledge
          </h3>
        </div>
        <Badge tone="neon">
          <Sparkles className="h-3 w-3" /> Level {lvl}
        </Badge>
      </div>

      <p className="text-sm text-ink-300">
        Knows <span className="font-semibold text-ink-50">{memory.length}</span>{" "}
        {memory.length === 1 ? "fact" : "facts"} ·{" "}
        <GraduationCap className="mb-0.5 inline h-3.5 w-3.5 text-signal-400" /> Studied{" "}
        <span className="font-semibold text-ink-50">{studiedSkills.length}</span>{" "}
        {studiedSkills.length === 1 ? "skill" : "skills"}
      </p>

      {memory.length === 0 ? (
        <p className="text-sm text-ink-500">
          Nothing learned yet — chat with the agent and it will remember durable facts here.
        </p>
      ) : (
        <ul className="space-y-2">
          {memory
            .slice()
            .reverse()
            .slice(0, 12)
            .map((fact) => (
              <li
                key={fact.id}
                className="flex items-start gap-2.5 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300"
              >
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-neon-400" />
                <div className="min-w-0">
                  <p className="text-sm text-ink-100">{fact.text}</p>
                  {fact.source && (
                    <p className="mt-0.5 font-mono text-[10px] text-ink-500">{fact.source}</p>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
