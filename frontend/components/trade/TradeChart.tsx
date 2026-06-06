"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardTitle } from "@/components/ui/Card";
import { buildSeries } from "@/lib/trade/priceFeed";
import { cn, formatPct } from "@/lib/utils";

type ChartRange = "1D" | "1W" | "1M";

const RANGE_CONFIG: Record<ChartRange, { points: number; stepMin: number }> = {
  "1D": { points: 96, stepMin: 15 },
  "1W": { points: 168, stepMin: 60 },
  "1M": { points: 180, stepMin: 240 },
};

const WIDTH = 720;
const HEIGHT = 220;
const COLOR = "#5C92FF";

export function TradeChart() {
  const [range, setRange] = useState<ChartRange>("1D");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const series = useMemo(() => {
    if (!mounted) return [];
    const { points, stepMin } = RANGE_CONFIG[range];
    return buildSeries(points, stepMin);
  }, [range, mounted]);

  const deltaPct =
    series.length >= 2
      ? ((series[series.length - 1].price - series[0].price) / series[0].price) * 100
      : 0;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Price</CardTitle>
        <div className="flex gap-1 rounded-full border border-ink-800/60 bg-ink-900/40 p-1">
          {(["1D", "1W", "1M"] as ChartRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-electric-500/15 text-electric-400"
                  : "text-ink-400 hover:text-ink-100",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!mounted || series.length < 2 ? (
        <div className="grid h-[220px] place-items-center text-sm text-ink-400">Loading chart…</div>
      ) : (
        <ChartSvg series={series} deltaPct={deltaPct} range={range} />
      )}
    </Card>
  );
}

function ChartSvg({
  series,
  deltaPct,
  range,
}: {
  series: { t: number; price: number }[];
  deltaPct: number;
  range: ChartRange;
}) {
  const padX = 8;
  const padY = 18;
  const innerW = WIDTH - padX * 2;
  const innerH = HEIGHT - padY * 2;

  const values = series.map((p) => p.price);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread = Math.max(dataMax - dataMin, 1e-9);
  const min = dataMin - spread * 0.15;
  const max = dataMax + spread * 0.15;

  const x = (i: number) => padX + (i / (series.length - 1)) * innerW;
  const y = (value: number) => padY + (1 - (value - min) / (max - min)) * innerH;

  const linePath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.price).toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M ${x(0).toFixed(2)} ${y(series[0].price).toFixed(2)} ` +
    series
      .slice(1)
      .map((p, i) => `L ${x(i + 1).toFixed(2)} ${y(p.price).toFixed(2)}`)
      .join(" ") +
    ` L ${x(series.length - 1).toFixed(2)} ${(HEIGHT - padY).toFixed(2)}` +
    ` L ${x(0).toFixed(2)} ${(HEIGHT - padY).toFixed(2)} Z`;

  return (
    <div className="space-y-2">
      <svg
        role="img"
        aria-label={`JLP price chart ${range}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: HEIGHT }}
      >
        <defs>
          <linearGradient id="jlp-trade-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity="0.28" />
            <stop offset="100%" stopColor={COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x={padX} y={y(dataMax) - 5} fill="#7C8499" fontSize="11" fontFamily="monospace">
          ${dataMax.toFixed(4)}
        </text>
        <text
          x={padX}
          y={HEIGHT - 4}
          fill="#7C8499"
          fontSize="11"
          fontFamily="monospace"
        >
          ${dataMin.toFixed(4)}
        </text>
        <path d={areaPath} fill="url(#jlp-trade-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke={COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-right text-xs text-ink-400">
        Period change{" "}
        <span
          className={cn(
            "font-mono",
            deltaPct >= 0 ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {formatPct(deltaPct, 2)}
        </span>
      </p>
    </div>
  );
}
