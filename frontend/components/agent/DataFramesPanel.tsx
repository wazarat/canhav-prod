"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import type { FrameMetricOption, ResolvedFrame } from "@/lib/agent/dataframes";
import type { DataFrame, DataFrameWindow } from "@/lib/types";

/**
 * Owner-only data-frame builder: pin compositions of existing live metrics
 * (peg / TVL / price / supply / Aave rates) the agent should always pull via
 * its `frame_load` tool. Options are constrained to the entity's member coins.
 */
export function DataFramesPanel({
  agentId,
  frames: initialFrames,
  options,
  max,
}: {
  agentId: string;
  frames: DataFrame[];
  options: FrameMetricOption[];
  max: number;
}) {
  const router = useRouter();
  const [frames, setFrames] = useState<DataFrame[]>(initialFrames);
  const [title, setTitle] = useState("");
  const [window, setWindow] = useState<DataFrameWindow>("30d");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [preview, setPreview] = useState<ResolvedFrame | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/agent/${encodeURIComponent(agentId)}/frames`;

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const metrics = [...selected].map((i) => {
        const opt = options[i];
        return opt.kind === "supply"
          ? { kind: opt.kind, address: opt.address, decimals: opt.decimals, label: opt.label }
          : { kind: opt.kind, slug: opt.slug };
      });
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, window, metrics }),
      });
      const data = (await res.json()) as { ok?: boolean; frame?: DataFrame; error?: string };
      if (!res.ok || !data.ok || !data.frame) {
        throw new Error(data.error ?? `Save failed (${res.status}).`);
      }
      setFrames([...frames, data.frame]);
      setTitle("");
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(frameId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${base}?frameId=${encodeURIComponent(frameId)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Delete failed (${res.status}).`);
      setFrames(frames.filter((f) => f.id !== frameId));
      if (preview?.frameId === frameId) setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(frameId: string) {
    setPreviewing(frameId);
    setError(null);
    try {
      const res = await fetch(`${base}?resolve=${encodeURIComponent(frameId)}`);
      const data = (await res.json()) as { ok?: boolean; resolved?: ResolvedFrame; error?: string };
      if (!res.ok || !data.ok || !data.resolved) {
        throw new Error(data.error ?? `Preview failed (${res.status}).`);
      }
      setPreview(data.resolved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setPreviewing(null);
    }
  }

  function fmt(v: unknown): string {
    if (typeof v !== "number") return "—";
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return v.toFixed(4).replace(/\.?0+$/, "");
  }

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
        <Database className="h-4 w-4 text-signal-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Data frames
        </h3>
        <span className="ml-auto text-[11px] text-ink-500">
          {frames.length}/{max} pinned
        </span>
      </div>

      {/* Existing frames */}
      {frames.length > 0 && (
        <ul className="space-y-2">
          {frames.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-lg border border-ink-800/60 bg-ink-900/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-100">{f.title}</p>
                <p className="text-[11px] text-ink-500">
                  {f.metrics.length} metric{f.metrics.length === 1 ? "" : "s"} · {f.window}
                </p>
              </div>
              <button
                type="button"
                aria-label="Refresh preview"
                onClick={() => refresh(f.id)}
                disabled={busy || previewing !== null}
                className="text-ink-400 transition-colors hover:text-signal-300 disabled:opacity-50"
              >
                {previewing === f.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="Delete frame"
                onClick={() => remove(f.id)}
                disabled={busy}
                className="text-ink-400 transition-colors hover:text-rose-300 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-1.5 rounded-lg border border-signal-500/30 bg-signal-500/5 px-3 py-2">
          <p className="text-xs font-medium text-signal-300">{preview.summary}</p>
          <ul className="space-y-0.5">
            {preview.metrics.map((m, i) => (
              <li key={i} className="flex justify-between gap-2 text-[11px] text-ink-300">
                <span className="truncate">{m.label}</span>
                <span className="shrink-0 font-mono text-ink-400">
                  {m.available
                    ? `${fmt(
                        (m.data.latest as number | undefined) ??
                          (m.data.totalSupply as number | undefined) ??
                          (m.data.supplyApyPct as number | undefined),
                      )}${m.source ? ` · ${m.source}` : ""}`
                    : "unavailable"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Builder */}
      {options.length === 0 ? (
        <p className="text-xs text-ink-500">
          No frame metrics available: this agent has no tracked member products.
        </p>
      ) : frames.length >= max ? (
        <p className="text-xs text-ink-500">Frame limit reached. Delete one to pin another.</p>
      ) : (
        <div className="space-y-3 border-t border-ink-800/60 pt-3">
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              disabled={busy}
              placeholder="Frame name, e.g. “JLP liquidity health”"
              className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
            <select
              value={window}
              onChange={(e) => setWindow(e.target.value as DataFrameWindow)}
              disabled={busy}
              className="shrink-0 rounded-lg border border-ink-700 bg-ink-900/60 px-2 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            >
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
            </select>
          </div>

          <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
            {options.map((opt, i) => (
              <label
                key={`${opt.kind}-${opt.slug ?? opt.address}-${i}`}
                className="flex items-center gap-2 text-sm text-ink-200"
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  disabled={busy || (!selected.has(i) && selected.size >= 6)}
                  className="h-4 w-4 rounded border-ink-600 bg-ink-900"
                />
                <span className="truncate">{opt.label}</span>
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-ink-500">
                  {opt.kind}
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={create}
            disabled={busy || !title.trim() || selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Pin frame
          </button>
        </div>
      )}

      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
