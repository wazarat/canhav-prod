import { Card } from "@/components/ui/Card";
import { QuadrantSwitcher } from "@/components/networks/tabs/competitors/QuadrantSwitcher";
import {
  QUADRANT_AXES,
  type QuadrantAxesId,
  type QuadrantModel,
} from "@/lib/networks/competitorsTab";
import { formatUsdCompact } from "@/lib/utils";

/**
 * CAN-89 optional positioning quadrant: log-scale scatter of the tag cohort
 * on a selectable axis pair (TVL spans $53k to multi-billion, so a linear
 * axis collapses everything into one corner). All four charts render
 * server-side as plain SVG; the client only toggles visibility. The four
 * non-steady-state entities plot hollow with their status implied by the
 * legend so they read as winding down, not as weak competitors.
 */

const W = 640;
const H = 400;
const PAD = { top: 16, right: 24, bottom: 44, left: 64 };

function scale(v: number, min: number, max: number, log: boolean): number {
  if (log) {
    const lv = Math.log10(v);
    const lmin = Math.log10(min);
    const lmax = Math.log10(max);
    return lmax === lmin ? 0.5 : (lv - lmin) / (lmax - lmin);
  }
  return max === min ? 0.5 : (v - min) / (max - min);
}

function fmtAxis(v: number, usd: boolean): string {
  return usd ? formatUsdCompact(v) : String(Math.round(v));
}

function QuadrantChart({ model }: { model: QuadrantModel }) {
  if (model.points.length < 3) {
    return (
      <p className="text-xs text-ink-300">
        Too few cohort entities report both axes to plot ({model.points.length}).
      </p>
    );
  }
  const xs = model.points.map((p) => p.x);
  const ys = model.points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const px = (v: number) => PAD.left + scale(v, xMin, xMax, model.xLog) * innerW;
  const py = (v: number) => PAD.top + (1 - scale(v, yMin, yMax, model.yLog)) * innerH;
  const xUsd = model.xLabel.startsWith("TVL") || model.xLabel.startsWith("Total borrowed");
  const yUsd = model.yLabel.startsWith("TVL") || model.yLabel.startsWith("Total borrowed");
  // 2x2 split at the midpoint of the (log) domain.
  const midX = PAD.left + 0.5 * innerW;
  const midY = PAD.top + 0.5 * innerH;

  return (
    <figure className="space-y-2">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="min-w-[480px] w-full"
          role="img"
          aria-label={`Positioning quadrant: ${model.xLabel} against ${model.yLabel} for ${model.points.length} entities`}
        >
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="none"
            stroke="currentColor"
            className="text-ink-800"
          />
          <line x1={midX} y1={PAD.top} x2={midX} y2={PAD.top + innerH} stroke="currentColor" strokeDasharray="4 4" className="text-ink-800" />
          <line x1={PAD.left} y1={midY} x2={PAD.left + innerW} y2={midY} stroke="currentColor" strokeDasharray="4 4" className="text-ink-800" />
          {/* axis extents */}
          <text x={PAD.left} y={H - 22} className="fill-current text-ink-300" fontSize="10">
            {fmtAxis(xMin, xUsd)}
          </text>
          <text x={PAD.left + innerW} y={H - 22} textAnchor="end" className="fill-current text-ink-300" fontSize="10">
            {fmtAxis(xMax, xUsd)}
          </text>
          <text x={PAD.left - 6} y={PAD.top + innerH} textAnchor="end" className="fill-current text-ink-300" fontSize="10">
            {fmtAxis(yMin, yUsd)}
          </text>
          <text x={PAD.left - 6} y={PAD.top + 10} textAnchor="end" className="fill-current text-ink-300" fontSize="10">
            {fmtAxis(yMax, yUsd)}
          </text>
          <text x={PAD.left + innerW / 2} y={H - 6} textAnchor="middle" className="fill-current text-ink-200" fontSize="11">
            {model.xLabel}
          </text>
          <text
            x={12}
            y={PAD.top + innerH / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${PAD.top + innerH / 2})`}
            className="fill-current text-ink-200"
            fontSize="11"
          >
            {model.yLabel}
          </text>
          {model.points.map((p) => {
            const dot = (
              <>
                <circle
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r={p.self ? 7 : 5}
                  className={
                    p.self
                      ? "fill-electric-500 stroke-electric-300"
                      : p.nonSteadyState
                        ? "fill-none stroke-amber-300"
                        : "fill-ink-300 stroke-ink-500"
                  }
                  strokeWidth={p.self ? 2 : p.nonSteadyState ? 1.5 : 1}
                  strokeDasharray={p.nonSteadyState ? "3 2" : undefined}
                />
                <text
                  x={px(p.x) + 8}
                  y={py(p.y) - 6}
                  fontSize="10"
                  className={p.self ? "fill-current font-semibold text-electric-300" : "fill-current text-ink-300"}
                >
                  {p.name}
                </text>
                <title>{`${p.name}: ${fmtAxis(p.x, xUsd)} × ${fmtAxis(p.y, yUsd)}`}</title>
              </>
            );
            // Peers link to their entity page (CAN-89 done-when: clickable
            // points); the current entity's dot is not a self-link.
            return p.self ? (
              <g key={p.slug}>{dot}</g>
            ) : (
              <a
                key={p.slug}
                href={`/networks/${p.slug}`}
                aria-label={`Open ${p.name}`}
                className="cursor-pointer"
              >
                {dot}
              </a>
            );
          })}
        </svg>
      </div>
      <figcaption className="space-y-0.5 text-[11px] leading-relaxed text-ink-400">
        <span className="block">
          Filled electric dot = this entity. Hollow dashed dots = non-steady-state entities
          (winding down / dormant / sunset), plotted for completeness, not as weak rivals.
          Dashed lines split the (log) domain midpoints.
        </span>
        {model.coverageNote && <span className="block">{model.coverageNote}</span>}
        {model.asOf && <span className="block">Snapshot as of {model.asOf}.</span>}
      </figcaption>
    </figure>
  );
}

export function PositioningQuadrant({
  quadrants,
  initialAxes,
}: {
  quadrants: QuadrantModel[];
  initialAxes: QuadrantAxesId;
}) {
  const shortLabel: Record<QuadrantAxesId, string> = {
    "tvl-borrowed": "TVL × Borrowed",
    "tvl-chains": "TVL × Chains",
    "tvl-risk": "TVL × Risk",
    "borrowed-risk": "Borrowed × Risk",
  };
  return (
    <Card className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-ink-100">Positioning quadrant</h3>
        <p className="text-xs leading-relaxed text-ink-400">
          Tag cohort plotted on two selectable axes. Risk composite comes from the M7
          documented-risk derivation and is only defined for rated entities; it is a
          documented-risk load, not a safety score, and is never compared across tags.
        </p>
      </div>
      <QuadrantSwitcher
        options={QUADRANT_AXES.map((a) => ({ value: a.id, label: shortLabel[a.id] }))}
        initialAxes={initialAxes}
        panels={quadrants.map((q) => ({ id: q.axes, node: <QuadrantChart model={q} /> }))}
      />
    </Card>
  );
}
