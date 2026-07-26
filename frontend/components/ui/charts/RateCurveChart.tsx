import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";

import type { LendingRateModel } from "@/lib/types";

const AXIS_COLOR = "#7C8499";
const GRID_STROKE = "rgba(124, 132, 153, 0.15)";
const BORROW_COLOR = "#F59E0B";
const SUPPLY_COLOR = "#5C92FF";
const KINK_COLOR = "#22D3EE";

interface CurveSample {
  u: number;
  borrow: number;
  supply: number;
}

/** Aave-style two-slope rate model evaluated at utilization u (0-100). */
function borrowRateAt(u: number, m: LendingRateModel): number {
  if (u <= m.optimalUsagePct) {
    return m.baseRatePct + (m.slope1Pct * u) / Math.max(m.optimalUsagePct, 0.0001);
  }
  const excess = (u - m.optimalUsagePct) / Math.max(100 - m.optimalUsagePct, 0.0001);
  return m.baseRatePct + m.slope1Pct + m.slope2Pct * excess;
}

/**
 * Supply vs borrow APY as a function of utilization, computed from the
 * protocol's interest-rate-model params with the kink and the current
 * utilization marked (CAN-69 charts 1+2 fold: "the single most informative
 * lending chart"). Pure render-to-SVG with no hooks: safe in server
 * components (CAN-60 rules). Source is "derived (rate model)": the curve is
 * the protocol's governance-set rate function, not a fabricated series.
 */
export function RateCurveChart({
  model,
  currentUtilizationPct,
  id,
  width = 720,
  height = 240,
  ariaLabel,
  className,
}: {
  model: LendingRateModel;
  currentUtilizationPct: number | null;
  id: string;
  width?: number;
  height?: number;
  ariaLabel: string;
  className?: string;
}) {
  const reserveFactor = (model.reserveFactorPct ?? 0) / 100;
  const samples: CurveSample[] = [];
  for (let u = 0; u <= 100; u += 1) {
    const borrow = borrowRateAt(u, model);
    samples.push({ u, borrow, supply: borrow * (u / 100) * (1 - reserveFactor) });
  }

  const padX = 56;
  const padY = 16;
  const padBottom = 30;
  const innerW = width - padX - 12;
  const innerH = height - padY - padBottom;

  const maxRate = Math.max(...samples.map((s) => s.borrow));
  const xScale = scaleLinear<number>({ domain: [0, 100], range: [padX, padX + innerW] });
  const yScale = scaleLinear<number>({
    domain: [0, maxRate * 1.08 || 1],
    range: [padY + innerH, padY],
  });

  const kinkX = xScale(model.optimalUsagePct) ?? 0;
  const current =
    currentUtilizationPct != null && currentUtilizationPct >= 0 && currentUtilizationPct <= 100
      ? {
          x: xScale(currentUtilizationPct) ?? 0,
          y: yScale(borrowRateAt(currentUtilizationPct, model)) ?? 0,
        }
      : null;

  return (
    <div className={className}>
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height }}
      >
        <Group>
          <line
            x1={kinkX}
            x2={kinkX}
            y1={padY}
            y2={padY + innerH}
            stroke={KINK_COLOR}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.7}
          />
          <text x={kinkX + 4} y={padY + 10} fill={KINK_COLOR} fontSize={10} fontFamily="monospace">
            kink {model.optimalUsagePct}%
          </text>
          <LinePath<CurveSample>
            data={samples}
            x={(s) => xScale(s.u) ?? 0}
            y={(s) => yScale(s.borrow) ?? 0}
            stroke={BORROW_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <LinePath<CurveSample>
            data={samples}
            x={(s) => xScale(s.u) ?? 0}
            y={(s) => yScale(s.supply) ?? 0}
            stroke={SUPPLY_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {current ? (
            <>
              <circle cx={current.x} cy={current.y} r={4} fill={KINK_COLOR} />
              <text
                x={Math.min(current.x + 6, width - 90)}
                y={current.y - 8}
                fill={KINK_COLOR}
                fontSize={10}
                fontFamily="monospace"
              >
                now {currentUtilizationPct!.toFixed(1)}%
              </text>
            </>
          ) : null}
          <AxisLeft
            scale={yScale}
            left={padX}
            numTicks={4}
            stroke={GRID_STROKE}
            tickStroke={GRID_STROKE}
            tickFormat={(v) => `${Number(v).toFixed(1)}%`}
            tickLabelProps={{
              fill: AXIS_COLOR,
              fontSize: 10,
              fontFamily: "monospace",
              textAnchor: "end",
              dx: -4,
              dy: 3,
            }}
          />
          <AxisBottom
            scale={xScale}
            top={padY + innerH}
            numTicks={5}
            stroke={GRID_STROKE}
            tickStroke={GRID_STROKE}
            tickFormat={(v) => `${Number(v)}%`}
            tickLabelProps={{
              fill: AXIS_COLOR,
              fontSize: 10,
              fontFamily: "monospace",
              textAnchor: "middle",
            }}
          />
        </Group>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-300" id={`rate-curve-legend-${id}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: BORROW_COLOR }} aria-hidden />
          Borrow APY
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: SUPPLY_COLOR }} aria-hidden />
          Supply APY
        </span>
        {model.marketLabel ? <span>Rate model: {model.marketLabel}</span> : null}
      </div>
    </div>
  );
}
