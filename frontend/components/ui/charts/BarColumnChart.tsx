import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";

import type { SeriesUnit } from "@/components/ui/charts/TimeSeriesAreaChart";
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

export interface BarColumnDatum {
  label: string;
  value: number;
}

/**
 * Categorical column chart (visx scale/shape/axis/group only, CAN-60 rules).
 * Pure render-to-SVG with no hooks: safe in server components. Used for the
 * notional-by-expiry maturity ladder (CAN-64) and the leverage-band /
 * liquidations histograms (CAN-68 / CAN-69).
 */
export function BarColumnChart({
  data,
  id,
  width = 720,
  height = 220,
  unit = "usd",
  color = "#5C92FF",
  emptyText = "No data available.",
  ariaLabel,
  className,
}: {
  data: BarColumnDatum[];
  id: string;
  width?: number;
  height?: number;
  unit?: SeriesUnit;
  color?: string;
  emptyText?: string;
  ariaLabel: string;
  className?: string;
}) {
  if (data.length === 0) {
    return <div className="grid h-40 place-items-center text-sm text-ink-300">{emptyText}</div>;
  }

  const padX = 56;
  const padY = 14;
  const padBottom = 30;
  const innerW = width - padX - 8;
  const innerH = height - padY - padBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const xScale = scaleBand<string>({
    domain: data.map((d) => d.label),
    range: [padX, padX + innerW],
    padding: 0.25,
  });
  const yScale = scaleLinear<number>({
    domain: [0, maxValue === 0 ? 1 : maxValue * 1.1],
    range: [padY + innerH, padY],
  });

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ width: "100%", height }}
    >
      <Group>
        {data.map((d) => {
          const x = xScale(d.label) ?? 0;
          const y = yScale(d.value) ?? 0;
          return (
            <Bar
              key={`${id}-${d.label}`}
              x={x}
              y={y}
              width={xScale.bandwidth()}
              height={Math.max(0, padY + innerH - y)}
              fill={color}
              opacity={0.85}
              rx={2}
            />
          );
        })}
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
          stroke={GRID_STROKE}
          tickStroke={GRID_STROKE}
          numTicks={Math.min(data.length, 8)}
          tickLabelProps={{
            fill: AXIS_COLOR,
            fontSize: 10,
            fontFamily: "monospace",
            textAnchor: "middle",
          }}
        />
      </Group>
    </svg>
  );
}
