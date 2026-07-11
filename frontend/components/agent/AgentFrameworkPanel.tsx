"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, SlidersHorizontal, X } from "lucide-react";

import {
  AGENT_CONFIG_LIMITS,
  OUTPUT_STYLES,
  RISK_LENSES,
  TRADE_HITL_METHODS,
  type AgentConfig,
  type AgentGlossaryEntry,
  type AgentOutputStyle,
  type AgentRiskLens,
  type TradeHitlMethod,
} from "@/lib/agent/agentConfig";

/**
 * Owner-only "framework" editor: shape HOW this agent thinks — focus areas,
 * instructions, risk lens, output style, preferred sources, glossary. Saves via
 * PATCH /api/agent/[agentId]/config; the next chat answer reflects it.
 */
export function AgentFrameworkPanel({
  agentId,
  config,
}: {
  agentId: string;
  config: AgentConfig | null;
}) {
  const router = useRouter();
  const L = AGENT_CONFIG_LIMITS;

  const [focusAreas, setFocusAreas] = useState<string[]>(config?.focusAreas ?? []);
  const [focusDraft, setFocusDraft] = useState("");
  const [instructions, setInstructions] = useState(config?.instructions ?? "");
  const [riskLens, setRiskLens] = useState<AgentRiskLens>(config?.riskLens ?? "neutral");
  const [outputStyle, setOutputStyle] = useState<AgentOutputStyle>(
    config?.outputStyle ?? "brief",
  );
  const [sources, setSources] = useState<string[]>(config?.preferredSources ?? []);
  const [sourceDraft, setSourceDraft] = useState("");
  const [glossary, setGlossary] = useState<AgentGlossaryEntry[]>(config?.glossary ?? []);
  const [tradeHitlMethod, setTradeHitlMethod] = useState<TradeHitlMethod>(
    config?.tradeHitlMethod ?? "propose_approve",
  );
  const [tradeSpendingCapUsd, setTradeSpendingCapUsd] = useState(() => {
    const raw = config?.tradeSpendingCapUsd;
    if (!raw) return "";
    try {
      return String(Number(BigInt(raw) / 10n ** 30n));
    } catch {
      return "";
    }
  });
  const [tradeCumulativeCapUsd, setTradeCumulativeCapUsd] = useState(() => {
    const raw = config?.tradeCumulativeCapUsd;
    if (!raw) return "";
    try {
      return String(Number(BigInt(raw) / 10n ** 30n));
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addChip(
    draft: string,
    list: string[],
    max: number,
    set: (next: string[]) => void,
    clearDraft: () => void,
  ) {
    const value = draft.trim();
    if (!value || list.length >= max) return;
    if (list.some((x) => x.toLowerCase() === value.toLowerCase())) return;
    set([...list, value]);
    clearDraft();
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusAreas,
          instructions,
          riskLens,
          outputStyle,
          preferredSources: sources,
          glossary,
          tradeHitlMethod,
          tradeSpendingCapUsd: tradeSpendingCapUsd.trim()
            ? (BigInt(tradeSpendingCapUsd.trim()) * 10n ** 30n).toString()
            : null,
          tradeCumulativeCapUsd: tradeCumulativeCapUsd.trim()
            ? (BigInt(tradeCumulativeCapUsd.trim()) * 10n ** 30n).toString()
            : null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Save failed (${res.status}).`);
      setNotice("Framework saved. The next answer will reflect it.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const chipInputClass =
    "min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50";
  const addBtnClass =
    "inline-flex shrink-0 items-center rounded-lg border border-ink-700 px-2 py-1.5 text-ink-300 transition-colors hover:border-electric-500/40 hover:text-electric-300 disabled:opacity-50";
  const selectClass =
    "w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50";

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
        <SlidersHorizontal className="h-4 w-4 text-neon-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Framework
        </h3>
        <span className="ml-auto text-[11px] text-ink-500">shapes how this agent thinks</span>
      </div>

      {/* Focus areas */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Focus areas ({focusAreas.length}/{L.focusAreasMax})
        </span>
        <div className="flex flex-wrap gap-1.5">
          {focusAreas.map((area) => (
            <span
              key={area}
              className="inline-flex items-center gap-1 rounded-full border border-neon-500/40 bg-neon-500/10 px-2.5 py-0.5 text-xs text-neon-300"
            >
              {area}
              <button
                type="button"
                aria-label={`Remove ${area}`}
                onClick={() => setFocusAreas(focusAreas.filter((x) => x !== area))}
                disabled={busy}
                className="text-neon-400/70 hover:text-neon-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={focusDraft}
            onChange={(e) => setFocusDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChip(focusDraft, focusAreas, L.focusAreasMax, setFocusAreas, () =>
                  setFocusDraft(""),
                );
              }
            }}
            disabled={busy || focusAreas.length >= L.focusAreasMax}
            maxLength={L.focusAreaMaxChars}
            placeholder="e.g. peg stability"
            className={chipInputClass}
          />
          <button
            type="button"
            aria-label="Add focus area"
            onClick={() =>
              addChip(focusDraft, focusAreas, L.focusAreasMax, setFocusAreas, () =>
                setFocusDraft(""),
              )
            }
            disabled={busy || !focusDraft.trim() || focusAreas.length >= L.focusAreasMax}
            className={addBtnClass}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Risk lens + output style */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Risk lens
          </span>
          <select
            value={riskLens}
            onChange={(e) => setRiskLens(e.target.value as AgentRiskLens)}
            disabled={busy}
            className={selectClass}
          >
            {RISK_LENSES.map((lens) => (
              <option key={lens} value={lens}>
                {lens}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Output style
          </span>
          <select
            value={outputStyle}
            onChange={(e) => setOutputStyle(e.target.value as AgentOutputStyle)}
            disabled={busy}
            className={selectClass}
          >
            {OUTPUT_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Instructions */}
      <label className="block space-y-1.5">
        <span className="flex items-baseline justify-between text-xs font-medium uppercase tracking-wider text-ink-400">
          Instructions
          <span className="font-mono text-[10px] normal-case tracking-normal text-ink-500">
            {instructions.length}/{L.instructionsMaxChars}
          </span>
        </span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value.slice(0, L.instructionsMaxChars))}
          disabled={busy}
          rows={4}
          placeholder="Your framework, e.g. “Always check whether yield is fee-based or emissions-based before calling it sustainable.”"
          className="w-full resize-y rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
        />
      </label>

      {/* Preferred sources */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Preferred sources ({sources.length}/{L.preferredSourcesMax})
        </span>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-signal-500/40 bg-signal-500/10 px-2.5 py-0.5 text-xs text-signal-300"
            >
              {s}
              <button
                type="button"
                aria-label={`Remove ${s}`}
                onClick={() => setSources(sources.filter((x) => x !== s))}
                disabled={busy}
                className="text-signal-400/70 hover:text-signal-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={sourceDraft}
            onChange={(e) => setSourceDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChip(sourceDraft, sources, L.preferredSourcesMax, setSources, () =>
                  setSourceDraft(""),
                );
              }
            }}
            disabled={busy || sources.length >= L.preferredSourcesMax}
            maxLength={L.preferredSourceMaxChars}
            placeholder="e.g. Dune"
            className={chipInputClass}
          />
          <button
            type="button"
            aria-label="Add preferred source"
            onClick={() =>
              addChip(sourceDraft, sources, L.preferredSourcesMax, setSources, () =>
                setSourceDraft(""),
              )
            }
            disabled={busy || !sourceDraft.trim() || sources.length >= L.preferredSourcesMax}
            className={addBtnClass}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Glossary */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Glossary ({glossary.length}/{L.glossaryMax})
        </span>
        {glossary.map((g, i) => (
          <div key={`${g.term}-${i}`} className="flex items-start gap-1.5">
            <input
              value={g.term}
              onChange={(e) =>
                setGlossary(
                  glossary.map((row, j) =>
                    j === i ? { ...row, term: e.target.value.slice(0, L.glossaryTermMaxChars) } : row,
                  ),
                )
              }
              disabled={busy}
              placeholder="term"
              className="w-1/3 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
            <input
              value={g.definition}
              onChange={(e) =>
                setGlossary(
                  glossary.map((row, j) =>
                    j === i
                      ? { ...row, definition: e.target.value.slice(0, L.glossaryDefinitionMaxChars) }
                      : row,
                  ),
                )
              }
              disabled={busy}
              placeholder="definition"
              className={chipInputClass}
            />
            <button
              type="button"
              aria-label="Remove glossary row"
              onClick={() => setGlossary(glossary.filter((_, j) => j !== i))}
              disabled={busy}
              className={addBtnClass}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {glossary.length < L.glossaryMax && (
          <button
            type="button"
            onClick={() => setGlossary([...glossary, { term: "", definition: "" }])}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-electric-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add term
          </button>
        )}
      </div>

      {/* Trade HITL */}
      <div className="space-y-3 rounded-xl border border-electric-500/20 bg-electric-500/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-electric-300">
          GMX trade approval (Pathway B)
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs text-ink-400">Method</span>
          <select
            value={tradeHitlMethod}
            onChange={(e) => setTradeHitlMethod(e.target.value as TradeHitlMethod)}
            disabled={busy}
            className={selectClass}
          >
            {TRADE_HITL_METHODS.map((m) => (
              <option key={m} value={m}>
                {m === "manual"
                  ? "Manual (suggestion only)"
                  : m === "propose_approve"
                    ? "Propose → Approve (default)"
                    : "Spending caps (auto within limits)"}
              </option>
            ))}
          </select>
        </label>
        {tradeHitlMethod === "spending_cap" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs text-ink-400">Per-trade cap (USD)</span>
              <input
                value={tradeSpendingCapUsd}
                onChange={(e) => setTradeSpendingCapUsd(e.target.value.replace(/[^\d]/g, ""))}
                disabled={busy}
                placeholder="e.g. 50"
                className={chipInputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-ink-400">Daily cumulative cap (USD)</span>
              <input
                value={tradeCumulativeCapUsd}
                onChange={(e) => setTradeCumulativeCapUsd(e.target.value.replace(/[^\d]/g, ""))}
                disabled={busy}
                placeholder="optional"
                className={chipInputClass}
              />
            </label>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save framework
      </button>

      {notice && <p className="text-xs text-signal-300">{notice}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
