export const DONUT_COLORS = ["#5C92FF", "#34D399", "#A78BFA", "#FBBF24", "#64748B"];

export interface DonutChartSegment {
  label: string;
  value: number;
}

/**
 * Dependency-free composition donut (lifted from TvlFlowWidget per CAN-61).
 * Segments are drawn clockwise from 12 o'clock in the order given, colored
 * from `colors`: key legends off the same array (export DONUT_COLORS) so
 * chart and legend can never desync.
 *
 * `total` sets the denominator for segment shares. Defaults to the sum of
 * segment values (full ring); pass a larger population total to render an
 * honest gap for the untracked share (the TvlFlowWidget behavior).
 */
export function DonutChart({
  segments,
  total,
  size = 88,
  strokeWidth = 14,
  colors = DONUT_COLORS,
  ariaLabel,
  className,
}: {
  segments: DonutChartSegment[];
  total?: number;
  size?: number;
  strokeWidth?: number;
  colors?: string[];
  ariaLabel: string;
  className?: string;
}) {
  if (segments.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth / 2 - 3;
  const denominator = total && total > 0 ? total : segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${size} ${size}`}
      className={className ?? `h-[${size}px] w-[${size}px] shrink-0`}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        const dash = (seg.value / denominator) * circumference;
        const el = (
          <circle
            key={seg.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}
