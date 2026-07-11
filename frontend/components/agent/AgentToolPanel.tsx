"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Play, TerminalSquare } from "lucide-react";

import type { AgentProductRef } from "@/lib/agent/memory";

interface FrameRef {
  id: string;
  title: string;
}

interface RunResult {
  ok: boolean;
  summary?: string;
  result?: unknown;
  error?: string;
}

type PresetId =
  | "entity_profile"
  | "product_profile"
  | "peg_history"
  | "tvl_history"
  | "memory_recall"
  | "knowledge_search"
  | "frame_load";

interface Preset {
  id: PresetId;
  label: string;
  tool: string;
  needsProduct?: boolean;
  needsQuery?: boolean;
  needsFrame?: boolean;
  metric?: "peg" | "tvl";
}

function productTool(category: AgentProductRef["category"]): string {
  if (category === "Stablecoin") return "research_getStablecoin";
  if (category === "RWA") return "research_getRwa";
  return "research_getToken";
}

export function AgentToolPanel({
  agentId,
  entitySlug,
  entityName,
  associatedProducts,
  frames = [],
}: {
  agentId: string;
  entitySlug: string | null;
  entityName: string | null;
  associatedProducts: AgentProductRef[];
  frames?: FrameRef[];
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presetId, setPresetId] = useState<PresetId>(
    entitySlug ? "entity_profile" : associatedProducts[0] ? "product_profile" : "memory_recall",
  );
  const [productSlug, setProductSlug] = useState(associatedProducts[0]?.slug ?? "");
  const [frameId, setFrameId] = useState(frames[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [argsText, setArgsText] = useState("{}");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [argsError, setArgsError] = useState<string | null>(null);

  const presets = useMemo((): Preset[] => {
    const list: Preset[] = [];
    if (entitySlug) {
      list.push({
        id: "entity_profile",
        label: `Read entity profile (${entityName ?? entitySlug})`,
        tool: "research_getEntity",
      });
    }
    if (associatedProducts.length) {
      list.push({
        id: "product_profile",
        label: "Read member product profile",
        tool: "research_getToken",
        needsProduct: true,
      });
      const hasStableOrRwa = associatedProducts.some(
        (p) => p.category === "Stablecoin" || p.category === "RWA",
      );
      if (hasStableOrRwa) {
        list.push({
          id: "peg_history",
          label: "Peg history (stablecoin / RWA)",
          tool: "research_getHistory",
          needsProduct: true,
          metric: "peg",
        });
        list.push({
          id: "tvl_history",
          label: "TVL history (RWA)",
          tool: "research_getHistory",
          needsProduct: true,
          metric: "tvl",
        });
      }
    }
    list.push({
      id: "memory_recall",
      label: "Recall learned facts",
      tool: "memory_recall",
    });
    if (frames.length) {
      list.push({
        id: "frame_load",
        label: "Load pinned data frame",
        tool: "frame_load",
        needsFrame: true,
      });
    }
    list.push({
      id: "knowledge_search",
      label: "Search uploaded knowledge",
      tool: "knowledge_search",
      needsQuery: true,
    });
    return list;
  }, [associatedProducts, entityName, entitySlug, frames.length]);

  const preset = presets.find((p) => p.id === presetId) ?? presets[0]!;

  const buildArgs = useCallback((): Record<string, unknown> => {
    switch (preset.id) {
      case "entity_profile":
        return { slug: entitySlug };
      case "product_profile": {
        const prod = associatedProducts.find((p) => p.slug === productSlug) ?? associatedProducts[0];
        if (!prod) return { slug: productSlug };
        return { slug: prod.slug };
      }
      case "peg_history":
      case "tvl_history":
        return { slug: productSlug, metric: preset.metric ?? "peg" };
      case "memory_recall":
        return {};
      case "frame_load":
        return { frameId };
      case "knowledge_search":
        return { query: query.trim() || "yield", k: 4 };
      default:
        return {};
    }
  }, [associatedProducts, entitySlug, frameId, preset, productSlug, query]);

  const resolveTool = useCallback((): string => {
    if (preset.id === "product_profile") {
      const prod = associatedProducts.find((p) => p.slug === productSlug) ?? associatedProducts[0];
      return prod ? productTool(prod.category) : "research_getToken";
    }
    return preset.tool;
  }, [associatedProducts, preset, productSlug]);

  const run = useCallback(async () => {
    setArgsError(null);
    let args: unknown;
    let tool: string;
    if (showAdvanced) {
      try {
        args = argsText.trim() ? JSON.parse(argsText) : {};
      } catch {
        setArgsError("Args must be valid JSON.");
        return;
      }
      tool = resolveTool();
    } else {
      args = buildArgs();
      tool = resolveTool();
      if (preset.needsProduct && !productSlug) {
        setArgsError("Pick a member product.");
        return;
      }
      if (preset.needsFrame && !frameId) {
        setArgsError("Pick a data frame.");
        return;
      }
    }

    setRunning(true);
    try {
      const res = await fetch("/api/agent/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args, agentId }),
      });
      setResult((await res.json()) as RunResult);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "request failed" });
    } finally {
      setRunning(false);
    }
  }, [agentId, argsText, buildArgs, frameId, preset, productSlug, resolveTool, showAdvanced]);

  return (
    <div id="panel-tools" className="glass space-y-4 rounded-2xl p-6 scroll-mt-24">
      <div className="border-b border-ink-800/60 pb-3">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-50">
          <TerminalSquare className="h-4 w-4 text-signal-400" />
          Research tools
        </h3>
        <p className="mt-1 text-sm text-ink-300">
          {entitySlug
            ? `Run live CanHav data tools scoped to ${entityName ?? entitySlug}: same feeds the chat agent uses, no LLM required.`
            : "Run live CanHav data tools for this agent. No LLM required."}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Action</span>
        <select
          value={presetId}
          onChange={(e) => {
            setPresetId(e.target.value as PresetId);
            setResult(null);
          }}
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {preset.needsProduct && associatedProducts.length > 0 && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Member product
          </span>
          <select
            value={productSlug}
            onChange={(e) => setProductSlug(e.target.value)}
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60"
          >
            {associatedProducts.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.symbol} ({p.category}) · {p.slug}
              </option>
            ))}
          </select>
        </label>
      )}

      {preset.needsFrame && frames.length > 0 && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Data frame
          </span>
          <select
            value={frameId}
            onChange={(e) => setFrameId(e.target.value)}
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60"
          >
            {frames.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {preset.needsQuery && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Search query
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. peg stability, yield mechanics"
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60"
          />
        </label>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 transition-colors hover:text-ink-200"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        Advanced (raw JSON)
      </button>

      {showAdvanced && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Args override (JSON)
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
      )}

      {!showAdvanced && argsError && <p className="text-xs text-rose-300">{argsError}</p>}

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-1.5 rounded-lg border border-signal-400/40 bg-signal-400/10 px-3 py-1.5 text-xs font-medium text-signal-400 transition-colors hover:bg-signal-400/20 disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run"}
      </button>

      {result && (
        <div className="space-y-2">
          <p className={`text-sm ${result.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {result.summary ?? result.error}
          </p>
          <details className="rounded-xl border border-ink-800/60 bg-ink-950/60">
            <summary className="cursor-pointer px-4 py-2 text-xs text-ink-400">Raw response</summary>
            <pre className="max-h-64 overflow-auto border-t border-ink-800/60 p-4 text-xs leading-relaxed text-ink-200">
              <code>{JSON.stringify(result.result ?? result.error ?? null, null, 2)}</code>
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
