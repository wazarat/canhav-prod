import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";

import { formatUsdCompact } from "@/lib/utils";

/** One daily observation. `date` is an ISO date (YYYY-MM-DD or full ISO). */
export interface SeriesPoint {
  date: string;
  value: number;
}

export type SeriesUnit = "usd" | "pct" | "ratio" | "count" | "price";

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

const AXIS_COLOR = "#7C8499";
const GRID_STROKE = "rgba(124, 132, 153, 0.15)";

/**
 * Shared time-series area chart on @visx/{scale,shape,axis,group}: the
 * charting baseline chosen in CAN-60 (docs/credit/charting-decision.md).
 * Pure render-to-SVG with no hooks, so it works in server components; put
 * pointer interactivity in a client wrapper if a surface ever needs it.
 */
export function TimeSeriesAreaChart({
  points,
  id,
  width = 720,
  height = 220,
  unit = "usd",
  color = "#5C92FF",
  showAxes = false,
  showMaxLabel = false,
  showLatestDot = false,
  emptyText = "No history available.",
  ariaLabel,
  className,
}: {
  points: SeriesPoint[];
  /** Unique id so multiple charts on a page don't share <defs> gradients. */
  id: string;
  width?: number;
  height?: number;
  unit?: SeriesUnit;
  color?: string;
  /** Left/bottom axes with ticks (drill-down mode). */
  showAxes?: boolean;
  /** Max-value reference label in the top-left (legacy TvlChart look). */
  showMaxLabel?: boolean;
  /** Cyan marker on the latest point (legacy TvlChart look). */
  showLatestDot?: boolean;
  emptyText?: string;
  ariaLabel: string;
  className?: string;
}) {
  if (points.length < 2) {
    return <div className="grid h-40 place-items-center text-sm text-ink-300">{emptyText}</div>;
  }

  const padX = showAxes ? 56 : 8;
  const padY = 18;
  const padBottom = showAxes ? 28 : padY;
  const innerW = width - padX - 8;
  const innerH = height - padY - padBottom;

  const values = points.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread = Math.max(dataMax - dataMin, dataMax === 0 ? 1 : Math.abs(dataMax) * 0.001);
  const domainMin = dataMin - spread * 0.15;
  const domainMax = dataMax + spread * 0.15;

  const dates = points.map((p) => new Date(p.date));
  const xScale = scaleTime<number>({
    domain: [dates[0], dates[dates.length - 1]],
    range: [padX, padX + innerW],
  });
  const yScale = scaleLinear<number>({
    domain: [domainMin, domainMax],
    range: [padY + innerH, padY],
  });

  const getX = (p: SeriesPoint) => xScale(new Date(p.date)) ?? 0;
  const getY = (p: SeriesPoint) => yScale(p.value) ?? 0;
  const last = points[points.length - 1];

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={showAxes ? "xMidYMid meet" : "none"}
      className={className}
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id={`tsarea-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <Group>
        {showMaxLabel && (
          <text
            x={padX}
            y={(yScale(dataMax) ?? 0) - 5}
            fill={AXIS_COLOR}
            fontSize={11}
            fontFamily="monospace"
          >
            {formatTick(dataMax, unit)}
          </text>
        )}

        <AreaClosed<SeriesPoint>
          data={points}
          x={getX}
          y={getY}
          yScale={yScale}
          fill={`url(#tsarea-fill-${id})`}
        />
        <LinePath<SeriesPoint>
          data={points}
          x={getX}
          y={getY}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {showLatestDot && <circle cx={getX(last)} cy={getY(last)} r={3.5} fill="#22D3EE" />}

        {showAxes && (
          <>
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
          </>
        )}
      </Group>
    </svg>
  );
}
