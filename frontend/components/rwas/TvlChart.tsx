import { TimeSeriesAreaChart } from "@/components/ui/charts/TimeSeriesAreaChart";
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

const TREND_COLOR = {
  growing: "#34D399",
  stable: "#5C92FF",
  declining: "#FB7185",
} as const;

/**
 * TVL area chart for RWA pages. Thin preset over the shared visx-based
 * TimeSeriesAreaChart (CAN-60 proof-of-concept migration): same gradient
 * area, max-value reference label, and latest-point marker as the previous
 * hand-rolled SVG.
 */
export function TvlChart({ points, id, trend = "stable", height = 220, className }: TvlChartProps) {
  const last = points[points.length - 1];
  return (
    <TimeSeriesAreaChart
      points={points}
      id={`tvl-${id}`}
      height={height}
      unit="usd"
      color={TREND_COLOR[trend]}
      showMaxLabel
      showLatestDot
      emptyText="No TVL history available."
      ariaLabel={`TVL chart, latest ${last ? formatUsdCompact(last.value) : "n/a"}`}
      className={className}
    />
  );
}
