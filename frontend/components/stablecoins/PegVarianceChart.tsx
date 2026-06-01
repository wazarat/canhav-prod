import type { PegDataPoint, PegTarget } from "@/lib/types";

interface PegVarianceChartProps {
  points: PegDataPoint[];
  pegTarget: PegTarget;
  /** Unique id so multiple charts on a page don't share <defs> gradients. */
  id: string;
  height?: number;
  className?: string;
}

const WIDTH = 720;

/**
 * Lightweight, dependency-free peg-variance line chart rendered as inline SVG.
 * Plots the series against a dashed 1.0 reference line, with a soft area fill.
 */
export function PegVarianceChart({
  points,
  pegTarget,
  id,
  height = 220,
  className,
}: PegVarianceChartProps) {
  if (points.length < 2) {
    return (
      <div className="grid h-40 place-items-center text-sm text-ink-300">
        No peg history available.
      </div>
    );
  }

  const padX = 8;
  const padY = 18;
  const innerW = WIDTH - padX * 2;
  const innerH = height - padY * 2;

  const prices = points.map((p) => p.price);
  const dataMin = Math.min(...prices, 1);
  const dataMax = Math.max(...prices, 1);
  // Keep the band centered on the 1.0 peg with a minimum visible range.
  const spread = Math.max(dataMax - dataMin, 0.01);
  const min = Math.min(dataMin, 1 - spread * 0.15) - spread * 0.1;
  const max = Math.max(dataMax, 1 + spread * 0.15) + spread * 0.1;

  const x = (i: number) => padX + (i / (points.length - 1)) * innerW;
  const y = (price: number) => padY + (1 - (price - min) / (max - min)) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.price).toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M ${x(0).toFixed(2)} ${y(points[0].price).toFixed(2)} ` +
    points
      .slice(1)
      .map((p, i) => `L ${x(i + 1).toFixed(2)} ${y(p.price).toFixed(2)}`)
      .join(" ") +
    ` L ${x(points.length - 1).toFixed(2)} ${(height - padY).toFixed(2)}` +
    ` L ${x(0).toFixed(2)} ${(height - padY).toFixed(2)} Z`;

  const pegY = y(1);
  const last = points[points.length - 1];
  const symbol = pegTarget === "EUR" ? "€" : "$";

  return (
    <svg
      role="img"
      aria-label={`Peg variance chart, latest ${last.price.toFixed(4)} ${pegTarget}`}
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id={`peg-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3D7BFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3D7BFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1.0 peg reference line */}
      <line
        x1={padX}
        x2={WIDTH - padX}
        y1={pegY}
        y2={pegY}
        stroke="#3A4255"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={padX} y={pegY - 5} fill="#7C8499" fontSize="11" fontFamily="monospace">
        {symbol}1.0000 peg
      </text>

      {/* area + line */}
      <path d={areaPath} fill={`url(#peg-fill-${id})`} />
      <path
        d={linePath}
        fill="none"
        stroke="#5C92FF"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* latest point marker */}
      <circle cx={x(points.length - 1)} cy={y(last.price)} r={3.5} fill="#22D3EE" />
    </svg>
  );
}
