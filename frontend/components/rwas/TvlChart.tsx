import type { TvlDataPoint } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

interface TvlChartProps {
  points: TvlDataPoint[];
  /** Unique id so multiple charts on a page don't share <defs> gradients. */
  id: string;
  /** "growing" tints emerald, "declining" tints rose, otherwise electric. */
  trend?: "growing" | "stable" | "declining";
  height?: number;
  className?: string;
}

const WIDTH = 720;

const TREND_COLOR = {
  growing: "#34D399",
  stable: "#5C92FF",
  declining: "#FB7185",
} as const;

/**
 * Lightweight, dependency-free TVL area chart rendered as inline SVG. Plots the
 * series scaled to its own min/max with a soft gradient fill, mirroring the
 * stablecoin peg chart so the two modules share a visual language.
 */
export function TvlChart({ points, id, trend = "stable", height = 220, className }: TvlChartProps) {
  if (points.length < 2) {
    return (
      <div className="grid h-40 place-items-center text-sm text-ink-300">
        No TVL history available.
      </div>
    );
  }

  const padX = 8;
  const padY = 18;
  const innerW = WIDTH - padX * 2;
  const innerH = height - padY * 2;

  const values = points.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread = Math.max(dataMax - dataMin, 1);
  const min = dataMin - spread * 0.15;
  const max = dataMax + spread * 0.15;

  const x = (i: number) => padX + (i / (points.length - 1)) * innerW;
  const y = (value: number) => padY + (1 - (value - min) / (max - min)) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.value).toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M ${x(0).toFixed(2)} ${y(points[0].value).toFixed(2)} ` +
    points
      .slice(1)
      .map((p, i) => `L ${x(i + 1).toFixed(2)} ${y(p.value).toFixed(2)}`)
      .join(" ") +
    ` L ${x(points.length - 1).toFixed(2)} ${(height - padY).toFixed(2)}` +
    ` L ${x(0).toFixed(2)} ${(height - padY).toFixed(2)} Z`;

  const last = points[points.length - 1];
  const color = TREND_COLOR[trend];

  return (
    <svg
      role="img"
      aria-label={`TVL chart, latest ${formatUsdCompact(last.value)}`}
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id={`tvl-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* max reference label */}
      <text x={padX} y={y(dataMax) - 5} fill="#7C8499" fontSize="11" fontFamily="monospace">
        {formatUsdCompact(dataMax)}
      </text>

      <path d={areaPath} fill={`url(#tvl-fill-${id})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <circle cx={x(points.length - 1)} cy={y(last.value)} r={3.5} fill="#22D3EE" />
    </svg>
  );
}
