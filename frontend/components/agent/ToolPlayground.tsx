"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, TerminalSquare } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

interface ToolCatalogEntry {
  name: string;
  description: string;
  sample: Record<string, unknown>;
}

interface RunResult {
  ok: boolean;
  summary?: string;
  result?: unknown;
  error?: string;
}

export function ToolPlayground() {
  const [catalog, setCatalog] = useState<ToolCatalogEntry[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [argsText, setArgsText] = useState<string>("{}");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [argsError, setArgsError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/agent/tools", { cache: "no-store" });
        const data = (await res.json()) as { tools: ToolCatalogEntry[] };
        setCatalog(data.tools);
        if (data.tools.length) {
          setSelected(data.tools[0].name);
          setArgsText(JSON.stringify(data.tools[0].sample, null, 2));
        }
      } catch {
        // catalog stays empty; UI shows a hint
      }
    })();
  }, []);

  const current = useMemo(
    () => catalog.find((t) => t.name === selected) ?? null,
    [catalog, selected],
  );

  const onSelect = useCallback(
    (name: string) => {
      setSelected(name);
      setResult(null);
      const entry = catalog.find((t) => t.name === name);
      setArgsText(JSON.stringify(entry?.sample ?? {}, null, 2));
    },
    [catalog],
  );

  const run = useCallback(async () => {
    let args: unknown;
    try {
      args = argsText.trim() ? JSON.parse(argsText) : {};
      setArgsError(null);
    } catch {
      setArgsError("Args must be valid JSON.");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/agent/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: selected, args }),
      });
      setResult((await res.json()) as RunResult);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "request failed" });
    } finally {
      setRunning(false);
    }
  }, [argsText, selected]);

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-50">
            <TerminalSquare className="h-4 w-4 text-signal-400" />
            Run a tool
          </h3>
          <p className="mt-1 text-sm text-ink-300">
            Invoke a single agent tool against live CanHav data — no model required.
          </p>
        </div>
        <Badge tone="neutral">{catalog.length} tools</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Tool</span>
          <select
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60"
          >
            {catalog.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          {current && <p className="text-xs text-ink-500">{current.description}</p>}
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Args (JSON)
          </span>
          <textarea
            value={argsText}
            onChange={(e) => setArgsText(e.target.value)}
            spellCheck={false}
            rows={4}
            className="w-full rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-2 font-mono text-xs text-ink-100 outline-none focus:border-electric-500/60"
          />
          {argsError && <p className="text-xs text-rose-300">{argsError}</p>}
        </label>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={running || !selected}
        className="inline-flex items-center gap-1.5 rounded-lg border border-signal-400/40 bg-signal-400/10 px-3 py-1.5 text-xs font-medium text-signal-400 transition-colors hover:bg-signal-400/20 disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run tool"}
      </button>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={result.ok ? "positive" : "danger"}>{result.ok ? "ok" : "error"}</Badge>
            <p className="text-sm text-ink-100">{result.summary ?? result.error}</p>
          </div>
          <pre className="max-h-80 overflow-auto rounded-xl border border-ink-800/60 bg-ink-950/60 p-4 text-xs leading-relaxed text-ink-200">
            <code>{JSON.stringify(result.result ?? result.error ?? null, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
