"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Database, Plus, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface MemoryFact {
  id: string;
  ts: string;
  text: string;
  source?: string | null;
}

interface MemorySnapshot {
  agentId: string;
  persistent: boolean;
  memory: MemoryFact[];
  studiedSkills: string[];
  runs: { id: string }[];
}

function level(memoryCount: number, skillCount: number): number {
  const score = memoryCount + skillCount * 3;
  return Math.max(1, Math.floor(score / 5) + 1);
}

const DEFAULT_AGENT_ID = "sandbox";

export function MemoryInspector({ agentId = DEFAULT_AGENT_ID }: { agentId?: string }) {
  const [data, setData] = useState<MemorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/memory?agentId=${encodeURIComponent(agentId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setData((await res.json()) as MemorySnapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const seed = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/agent/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setData((await res.json()) as MemorySnapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to seed");
    } finally {
      setBusy(false);
    }
  }, [agentId]);

  const memoryCount = data?.memory.length ?? 0;
  const skillCount = data?.studiedSkills.length ?? 0;

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Memory inspector
          </h3>
          <p className="mt-1 text-sm text-ink-300">
            Learned facts persist across sessions — seed one and reload to prove it.
          </p>
        </div>
        <Badge tone={data?.persistent ? "positive" : "neutral"}>
          <Database className="h-3 w-3" />
          {data?.persistent ? "Upstash" : "local fallback"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-ink-400">Facts</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{memoryCount}</p>
        </div>
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-ink-400">Skills</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{skillCount}</p>
        </div>
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-ink-400">Level</p>
          <p className="mt-1 flex items-center gap-1.5 font-display text-2xl font-semibold text-ink-50">
            <Sparkles className="h-4 w-4 text-neon-400" />
            {level(memoryCount, skillCount)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Seed a fact
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:text-ink-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {error && <p className="text-xs text-rose-300">Error: {error}</p>}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-ink-400">Loading memory…</p>
        ) : memoryCount === 0 ? (
          <p className="text-sm text-ink-400">
            No facts yet. Click <span className="text-ink-200">Seed a fact</span> to write one.
          </p>
        ) : (
          <ul className="space-y-2">
            {data!.memory
              .slice()
              .reverse()
              .map((fact) => (
                <li
                  key={fact.id}
                  className="flex items-start gap-2.5 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-2.5 animate-in fade-in slide-in-from-bottom-1"
                >
                  <Brain className="mt-0.5 h-4 w-4 shrink-0 text-neon-400" />
                  <div className="min-w-0">
                    <p className="text-sm text-ink-100">{fact.text}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                      {fact.source ? `${fact.source} · ` : ""}
                      {fact.ts}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
