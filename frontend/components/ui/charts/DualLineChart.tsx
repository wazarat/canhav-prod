import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";

import type { SeriesPoint, SeriesUnit } from "@/components/ui/charts/TimeSeriesAreaChart";
import { formatUsdCompact } from "@/lib/utils";

const AXIS_COLOR = "#7C8499";
const GRID_STROKE = "rgba(124, 132, 153, 0.15)";

function formatTick(value: number, unit: SeriesUnit): string {
  switch (unit) {
    case "usd":
      return formatUsdCompact(value);
    case "pct":
      return `${value.toFixed(1)}%`;
    case "ratio":
      return value.toFixed(2);
    case "price":
      return value >= 1000 ? formatUsdCompact(value) : `$${value.toFixed(2)}`;
    case "count":
    default:
      return value.toLocaleString();
  }
}

export interface NamedSeries {
  label: string;
  color: string;
  points: SeriesPoint[];
}

/**
 * Two-series comparison line chart (visx scale/shape/axis/group only, per the
 * CAN-60 charting decision). Pure render-to-SVG with no hooks: safe in server
 * components. Used for implied-vs-underlying APY spread and PT/YT price
 * convergence (CAN-64).
 */
export function DualLineChart({
  a,
  b,
  id,
  width = 720,
  height = 220,
  unit = "pct",
  emptyText = "No history available.",
  ariaLabel,
  className,
}: {
  a: NamedSeries;
  b: NamedSeries;
  id: string;
  width?: number;
  height?: number;
  unit?: SeriesUnit;
  emptyText?: string;
  ariaLabel: string;
  className?: string;
}) {
  if (a.points.length < 2 || b.points.length < 2) {
    return <div className="grid h-40 place-items-center text-sm text-ink-300">{emptyText}</div>;
  }

  const padX = 56;
  const padY = 18;
  const padBottom = 28;
  const innerW = width - padX - 8;
  const innerH = height - padY - padBottom;

  const all = [...a.points, ...b.points];
  const values = all.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread = Math.max(dataMax - dataMin, dataMax === 0 ? 1 : Math.abs(dataMax) * 0.001);
  const domainMin = dataMin - spread * 0.15;
  const domainMax = dataMax + spread * 0.15;

  const dates = all.map((p) => Date.parse(p.date)).sort((x, y) => x - y);
  const xScale = scaleTime<number>({
    domain: [new Date(dates[0]), new Date(dates[dates.length - 1])],
    range: [padX, padX + innerW],
  });
  const yScale = scaleLinear<number>({
    domain: [domainMin, domainMax],
    range: [padY + innerH, padY],
  });

  const getX = (p: SeriesPoint) => xScale(new Date(p.date)) ?? 0;
  const getY = (p: SeriesPoint) => yScale(p.value) ?? 0;

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
          <LinePath<SeriesPoint>
            data={a.points}
            x={getX}
            y={getY}
            stroke={a.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <LinePath<SeriesPoint>
            data={b.points}
            x={getX}
            y={getY}
            stroke={b.color}
            strokeWidth={2}
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <AxisLeft
            scale={yScale}
            left={padX}
            numTicks={4}
            stroke={GRID_STROKE}
            tickStroke={GRID_STROKE}
            tickFormat={(v) => formatTick(Number(v), unit)}
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
            tickFormat={(v) =>
              (v instanceof Date ? v : new Date(Number(v))).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
            tickLabelProps={{
              fill: AXIS_COLOR,
              fontSize: 10,
              fontFamily: "monospace",
              textAnchor: "middle",
            }}
          />
        </Group>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-300" id={`duallines-legend-${id}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: a.color }} aria-hidden />
          {a.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded border-b border-dashed"
            style={{ borderColor: b.color }}
            aria-hidden
          />
          {b.label}
        </span>
      </div>
    </div>
  );
}
