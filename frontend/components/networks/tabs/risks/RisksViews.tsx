"use client";

import { useMemo, useState } from "react";

import { RiskDetailDrawer } from "@/components/networks/tabs/risks/RiskDetailDrawer";
import { RiskListView } from "@/components/networks/tabs/risks/RiskListView";
import { RiskMatrixView } from "@/components/networks/tabs/risks/RiskMatrixView";
import { SEVERITY_TONE } from "@/components/shared/riskTone";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { AxisLevel, RiskTabModel, RiskViewId } from "@/lib/networks/riskTab";
import type { RiskSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * CAN-79 client island: the list/matrix toggle (mirrored to ?view= via
 * history.replaceState — the AssetCoverageSegments mechanics, deep-linkable,
 * no navigation), the category/severity filters (state lives here, above both
 * views, so it survives the toggle; status and date-range filters are
 * unsupported by the data — recorded deviation), and the shared expansion
 * drawer. The 12-16-risk model is serialized across the RSC boundary once.
 */
export function RisksViews({
  model,
  initialView,
}: {
  model: RiskTabModel;
  initialView: RiskViewId;
}) {
  const [view, setView] = useState<RiskViewId>(initialView);
  const [categories, setCategories] = useState<string[]>([]);
  const [severities, setSeverities] = useState<RiskSeverity[]>([]);
  const [cell, setCell] = useState<{ likelihood: AxisLevel; impact: AxisLevel } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const onViewChange = (next: RiskViewId) => {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const visibleIdx = useMemo(() => {
    const out: number[] = [];
    model.risks.forEach((risk, idx) => {
      if (categories.length && !categories.includes(risk.category)) return;
      if (severities.length && !severities.includes(risk.severity)) return;
      if (cell && (risk.likelihood !== cell.likelihood || risk.impact !== cell.impact)) return;
      out.push(idx);
    });
    return out;
  }, [model.risks, categories, severities, cell]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const hasFilters = categories.length > 0 || severities.length > 0 || cell != null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="Risk view"
          options={[
            { value: "list" as const, label: "List", count: visibleIdx.length },
            { value: "matrix" as const, label: "Matrix", count: visibleIdx.length },
          ]}
          value={view}
          onChange={onViewChange}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setCategories([]);
              setSeverities([]);
              setCell(null);
            }}
            className="text-xs text-ink-400 hover:text-electric-300"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {model.filterDomain.categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={categories.includes(category)}
            onClick={() => setCategories((c) => toggle(c, category))}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition",
              categories.includes(category)
                ? "border-electric-500/60 bg-electric-500/10 text-electric-300"
                : "border-ink-700/80 text-ink-300 hover:border-ink-500",
            )}
          >
            {category}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-ink-800" />
        {model.filterDomain.severities.map((severity) => (
          <button
            key={severity}
            type="button"
            aria-pressed={severities.includes(severity)}
            onClick={() => setSeverities((s) => toggle(s, severity))}
            className={cn(
              "rounded-full transition",
              severities.includes(severity) ? "" : "opacity-55 hover:opacity-100",
            )}
          >
            <Badge tone={SEVERITY_TONE[severity]} className="text-[10px] uppercase">
              {severity}
            </Badge>
          </button>
        ))}
        {cell && (
          <button
            type="button"
            onClick={() => setCell(null)}
            className="rounded-full border border-electric-500/60 bg-electric-500/10 px-2.5 py-1 font-mono text-[10px] uppercase text-electric-300"
            title="Clear the matrix-cell filter"
          >
            {cell.likelihood} × {cell.impact} ✕
          </button>
        )}
      </div>

      {view === "list" ? (
        <RiskListView model={model} visibleIdx={visibleIdx} onSelect={setSelected} />
      ) : (
        <RiskMatrixView
          model={model}
          visibleIdx={visibleIdx}
          onSelect={setSelected}
          onCellFilter={(likelihood, impact) => {
            setCell({ likelihood, impact });
            onViewChange("list");
          }}
        />
      )}

      <RiskDetailDrawer
        open={selected != null}
        onClose={() => setSelected(null)}
        riskIdx={selected}
        model={model}
      />
    </section>
  );
}
