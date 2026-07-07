import { CheckCircle2, CircleDashed } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface ChecklistStep {
  /** In-page anchor on the Train tab, or a full href for cross-tab steps. */
  href: string;
  label: string;
  done: boolean;
  hint: string;
}

/**
 * Guided training progress strip at the top of the Train tab. Each chip jumps
 * to the panel where that step is completed — computed entirely from data the
 * page already loads (no extra fetches).
 */
export function TrainingChecklist({
  agentId,
  frameworkConfigured,
  knowledgeDocs,
  skillsStudied,
  framesPinned,
  corrections,
}: {
  agentId: string;
  frameworkConfigured: boolean;
  knowledgeDocs: number;
  skillsStudied: number;
  framesPinned: number;
  corrections: number;
}) {
  const steps: ChecklistStep[] = [
    {
      href: "#panel-framework",
      label: "Set the framework",
      done: frameworkConfigured,
      hint: "Focus areas, risk lens, and owner instructions shape every answer.",
    },
    {
      href: "#panel-knowledge",
      label: "Add knowledge",
      done: knowledgeDocs > 0,
      hint: "Paste notes, upload files, or add URLs the agent can retrieve from.",
    },
    {
      href: "#panel-skills",
      label: "Study skills",
      done: skillsStudied > 0,
      hint: "Platform skills ground the agent in protocol facts and actions.",
    },
    {
      href: "#panel-frames",
      label: "Pin data frames",
      done: framesPinned > 0,
      hint: "Pinned metric snapshots the agent loads during research.",
    },
    {
      // Chat lives on the Trade & research tab — full href so the hash
      // redirect lands it on the right tab.
      href: `/agents/${encodeURIComponent(agentId)}#panel-chat`,
      label: "Correct it in chat",
      done: corrections > 0,
      hint: "Thumbs-down + corrections in research chat are stored as memory.",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Training progress</CardTitle>
          <CardDescription className="mt-1">
            Work down the list — each step levels the agent up and sharpens its research.
          </CardDescription>
        </div>
        <span className="font-mono text-xs text-ink-400">
          {doneCount}/{steps.length}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step) => (
          <a
            key={step.href}
            href={step.href}
            title={step.hint}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors",
              step.done
                ? "border-neon-500/30 bg-neon-500/5 text-neon-400"
                : "border-ink-800/60 bg-ink-900/30 text-ink-300 hover:border-electric-500/40 hover:text-ink-100",
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <CircleDashed className="h-3.5 w-3.5 shrink-0" />
            )}
            {step.label}
          </a>
        ))}
      </div>
    </Card>
  );
}
