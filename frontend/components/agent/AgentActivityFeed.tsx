"use client";

import { AlertCircle, CheckCircle2, Loader2, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ActivityStep {
  id: string;
  /** Tool name without the `tool-` prefix, e.g. "research_getEntity". */
  tool: string;
  /** AI SDK tool-part state: input-streaming | input-available | output-available | output-error. */
  state: string;
  summary?: string;
}

export function AgentActivityFeed({ steps }: { steps: ActivityStep[] }) {
  return (
    <div className="glass space-y-3 rounded-2xl p-5">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-2">
        <Wrench className="h-4 w-4 text-signal-400" />
        <h3 className="font-display text-sm font-semibold tracking-tight text-ink-50">
          Activity
        </h3>
        <span className="ml-auto font-mono text-[10px] text-ink-500">{steps.length} steps</span>
      </div>

      {steps.length === 0 ? (
        <p className="text-sm text-ink-500">Tool calls stream here as the agent works.</p>
      ) : (
        <ul className="space-y-1.5">
          {steps.map((step) => {
            const done = step.state === "output-available";
            const errored = step.state === "output-error";
            const running = !done && !errored;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border border-ink-800/60 bg-ink-900/30 px-3 py-2",
                  running && "animate-pulse-soft border-electric-500/30",
                )}
              >
                {running ? (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-electric-400" />
                ) : errored ? (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                )}
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ink-100">{step.tool}</p>
                  {step.summary && <p className="mt-0.5 text-xs text-ink-400">{step.summary}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
