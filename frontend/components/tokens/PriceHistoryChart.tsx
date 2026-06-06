import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import type { PriceHistory } from "@/lib/types";
import { formatPct } from "@/lib/utils";

interface PriceHistoryChartProps {
  history: PriceHistory;
  id: string;
  title?: string;
}

const WIDTH = 720;

export function PriceHistoryChart({
  history,
  id,
  title = "90-day price",
}: PriceHistoryChartProps) {
  const { points } = history;
  const height = 220;

  if (points.length < 2) {
    return (
      <Card>
        <CardTitle>{title}</CardTitle>
        <div className="grid h-40 place-items-center text-sm text-ink-300">
          No price history available.
        </div>
      </Card>
    );
  }

  const first = points[0].price;
  const last = points[points.length - 1].price;
  const changePct = first !== 0 ? ((last - first) / first) * 100 : null;
  const trend = changePct == null ? "stable" : changePct >= 3 ? "growing" : changePct <= -3 ? "declining" : "stable";

  const TREND_COLOR = {
    growing: "#34D399",
    stable: "#5C92FF",
    declining: "#FB7185",
  } as const;
  const color = TREND_COLOR[trend];

  const padX = 8;
  const padY = 18;
  const innerW = WIDTH - padX * 2;
  const innerH = height - padY * 2;

  const values = points.map((p) => p.price);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread = Math.max(dataMax - dataMin, 0.01);
  const min = dataMin - spread * 0.15;
  const max = dataMax + spread * 0.15;

  const x = (i: number) => padX + (i / (points.length - 1)) * innerW;
  const y = (value: number) => padY + (1 - (value - min) / (max - min)) * innerH;

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

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
            Latest ${last.toFixed(2)}
            {changePct != null && (
              <span className={changePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {formatPct(changePct)} over period
              </span>
            )}
          </CardDescription>
        </div>
        <DataSourceDot dataSource={history.dataSource} />
      </div>
      <svg
        role="img"
        aria-label={`Price chart, latest $${last.toFixed(2)}`}
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={`price-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#price-fill-${id})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </Card>
  );
}
