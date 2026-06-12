"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";

import type { AgentSuggestion } from "@/lib/agent/suggestions";

/**
 * Dismissible training nudges from the suggestions analyzer. Dismissals are
 * remembered per agent in localStorage; clicking a nudge scrolls to the
 * matching enrichment panel.
 */
export function AgentSuggestions({
  agentId,
  suggestions,
}: {
  agentId: string;
  suggestions: AgentSuggestion[];
}) {
  const storageKey = `agent-suggestions-dismissed:${agentId}`;
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore bad localStorage
    }
    setHydrated(true);
  }, [storageKey]);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  }

  const visible = hydrated ? suggestions.filter((s) => !dismissed.has(s.id)) : [];
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map((s) => (
        <div
          key={s.id}
          className="flex items-start gap-2.5 rounded-xl border border-neon-500/30 bg-neon-500/5 px-4 py-2.5"
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-neon-400" />
          <button
            type="button"
            onClick={() =>
              document
                .getElementById(`panel-${s.target}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            className="min-w-0 flex-1 text-left text-sm text-ink-200 transition-colors hover:text-ink-50"
          >
            {s.text}
          </button>
          <button
            type="button"
            aria-label="Dismiss suggestion"
            onClick={() => dismiss(s.id)}
            className="shrink-0 text-ink-500 transition-colors hover:text-ink-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
