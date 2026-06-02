interface SparklineProps {
  /** Y-values in chronological order. */
  values: number[];
  /** Unique id so multiple sparklines don't share <defs> gradients. */
  id: string;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Minimal, dependency-free area sparkline rendered as inline SVG. Scales to its
 * own min/max. Renders nothing meaningful below two points.
 */
export function Sparkline({
  values,
  id,
  color = "#5C92FF",
  width = 320,
  height = 56,
  className,
}: SparklineProps) {
  if (values.length < 2) {
    return <div className="h-14 text-xs text-ink-500">Not enough data.</div>;
  }

  const padY = 6;
  const innerH = height - padY * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1e-9);

  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => padY + (1 - (v - min) / spread) * innerH;

  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
    .join(" ");
  const area =
    `M ${x(0).toFixed(2)} ${y(values[0]).toFixed(2)} ` +
    values
      .slice(1)
      .map((v, i) => `L ${x(i + 1).toFixed(2)} ${y(v).toFixed(2)}`)
      .join(" ") +
    ` L ${width.toFixed(2)} ${(height - padY).toFixed(2)} L 0 ${(height - padY).toFixed(2)} Z`;

  return (
    <svg
      role="img"
      aria-label="Trend sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
