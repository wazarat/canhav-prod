"use client";

import { CATEGORY_COLOR, CATEGORY_COLOR_FALLBACK } from "@/components/shared/riskTone";
import type { AxisLevel, RiskTabModel } from "@/lib/networks/riskTab";
import { AXIS_LEVELS } from "@/lib/networks/riskTab";
import { cn } from "@/lib/utils";

/**
 * CAN-79 severity matrix: the dataset's 3-point likelihood x impact
 * assessments as a 3x3 grid (rebinned at render from the typed risks — the
 * dataset's pre-binned matrix is the verification oracle, not the source).
 * Dots wrap deterministically inside their cell (no jitter: stable layout and
 * real hit-targets beat scatter aesthetics at <=6 dots per cell); the corner
 * count badge doubles as "filter to this cell and open the list". Empty cells
 * render as honest empty states — Spark and Extra Finance genuinely have no
 * high-likelihood/high-impact rows, which is a finding, not a gap.
 */

/** Corner-cell triage labels (CAN-79's quadrant vocabulary). */
const QUADRANT_LABELS: Partial<Record<`${AxisLevel}|${AxisLevel}`, string>> = {
  "low|low": "accept",
  "high|low": "monitor",
  "low|high": "mitigate",
  "high|high": "escalate",
};

const IMPACT_ROWS: AxisLevel[] = ["high", "medium", "low"];

export function RiskMatrixView({
  model,
  visibleIdx,
  onSelect,
  onCellFilter,
}: {
  model: RiskTabModel;
  visibleIdx: number[];
  onSelect: (idx: number) => void;
  /** Count-badge click: filter to this cell's risks and flip to the list view. */
  onCellFilter: (likelihood: AxisLevel, impact: AxisLevel) => void;
}) {
  const visible = new Set(visibleIdx);
  const categoriesShown = new Set<string>();
  for (const i of visibleIdx) categoriesShown.add(model.risks[i].category);

  return (
    <figure className="space-y-3">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[26rem] gap-1.5"
          style={{ gridTemplateColumns: "auto repeat(3, minmax(7rem, 1fr))" }}
        >
          <div />
          {AXIS_LEVELS.map((likelihood) => (
            <p
              key={likelihood}
              className="pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-ink-300"
            >
              {likelihood}
            </p>
          ))}
          {IMPACT_ROWS.map((impact) => (
            <div key={impact} className="contents">
              <p className="flex items-center justify-end pr-2 font-mono text-[10px] uppercase tracking-wider text-ink-300">
                {impact}
              </p>
              {AXIS_LEVELS.map((likelihood) => {
                const idxs = model.matrix.cells[likelihood][impact].filter((i) =>
                  visible.has(i),
                );
                const quadrant = QUADRANT_LABELS[`${likelihood}|${impact}`];
                return (
                  <div
                    key={likelihood}
                    className={cn(
                      "relative min-h-[4.5rem] rounded-xl border p-2",
                      idxs.length
                        ? "border-ink-800/60 bg-ink-950/40"
                        : "border-dashed border-ink-800/50",
                    )}
                  >
                    {quadrant && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute bottom-1 right-2 font-mono text-[9px] uppercase tracking-wider text-ink-300"
                      >
                        {quadrant}
                      </span>
                    )}
                    {idxs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onCellFilter(likelihood, impact)}
                        title={`Filter the list to likelihood ${likelihood} x impact ${impact}`}
                        className="absolute right-1.5 top-1.5 rounded-md border border-ink-700/80 bg-ink-900/80 px-1.5 py-0.5 font-mono text-[10px] text-ink-300 transition hover:border-electric-500/50 hover:text-electric-300"
                      >
                        {idxs.length}
                      </button>
                    )}
                    {idxs.length ? (
                      <div className="flex max-w-[calc(100%-1.75rem)] flex-wrap gap-1.5">
                        {idxs.map((i) => {
                          const risk = model.risks[i];
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => onSelect(i)}
                              aria-label={`${risk.name ?? risk.category} — ${risk.category}, ${risk.severity}, likelihood ${likelihood}, impact ${impact}`}
                              title={`${risk.name ?? risk.category} (${risk.severity})`}
                              className={cn(
                                "h-3.5 w-3.5 rounded-full transition hover:scale-125",
                                CATEGORY_COLOR[risk.category] ?? CATEGORY_COLOR_FALLBACK,
                                risk.severity === "critical" &&
                                  "ring-2 ring-rose-500/80 ring-offset-1 ring-offset-ink-950",
                              )}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <span className="sr-only">
                        No risks at likelihood {likelihood}, impact {impact}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {[...categoriesShown].map((category) => (
          <span key={category} className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
            <span
              aria-hidden
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                CATEGORY_COLOR[category] ?? CATEGORY_COLOR_FALLBACK,
              )}
            />
            {category}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full bg-ink-700 ring-2 ring-rose-500/80 ring-offset-1 ring-offset-ink-950"
          />
          critical
        </span>
      </div>
      {model.matrix.unplacedIdx.length > 0 && (
        <details className="group/unplaced text-[11px] text-ink-300">
          <summary className="cursor-pointer list-none hover:text-ink-300 [&::-webkit-details-marker]:hidden">
            {model.matrix.unplacedIdx.length} risk(s) without a likelihood/impact assessment —
            listed, never dropped
          </summary>
          <ul className="mt-1 list-inside list-disc">
            {model.matrix.unplacedIdx.map((i) => (
              <li key={i}>{model.risks[i].name ?? model.risks[i].category}</li>
            ))}
          </ul>
        </details>
      )}
      <figcaption className="text-[11px] leading-relaxed text-ink-300">
        Likelihood (columns) × impact (rows), the dataset&apos;s own 3-point assessments,
        rebinned from the typed risks at render time. Ring marks critical severity; corner
        labels are the standard triage quadrants.
      </figcaption>
    </figure>
  );
}
