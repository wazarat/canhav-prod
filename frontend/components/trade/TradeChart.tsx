"use client";

import { useEffect, useMemo, useState } from "react";

import { tradeDivider, tradeLabel, tradePanel } from "@/components/trade/tradeStyles";
import { buildSeries } from "@/lib/trade/priceFeed";
import { cn, formatPct } from "@/lib/utils";

type ChartRange = "1D" | "1W" | "1M";

const RANGE_CONFIG: Record<ChartRange, { points: number; stepMin: number }> = {
  "1D": { points: 96, stepMin: 15 },
  "1W": { points: 168, stepMin: 60 },
  "1M": { points: 180, stepMin: 240 },
};

const WIDTH = 900;
const HEIGHT = 320;
const COLOR = "#3D7BFF";

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
    <div className={cn(tradePanel, "flex h-full min-h-[360px] flex-col")}>
      <div className={cn("flex items-center justify-between border-b px-4 py-2.5", tradeDivider)}>
        <span className={tradeLabel}>Chart</span>
        <div className="flex gap-0.5">
          {(["1D", "1W", "1M"] as ChartRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-white/[0.08] text-white"
                  : "text-[#787B87] hover:text-[#A0A3AD]",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 px-2 pb-2 pt-1">
        {!mounted || series.length < 2 ? (
          <div className="grid h-full min-h-[280px] place-items-center text-sm text-[#787B87]">
            Loading chart…
          </div>
        ) : (
          <ChartSvg series={series} deltaPct={deltaPct} />
        )}
      </div>
    </div>
  );
}

function ChartSvg({
  series,
  deltaPct,
}: {
  series: { t: number; price: number }[];
  deltaPct: number;
}) {
  const padX = 48;
  const padY = 24;
  const innerW = WIDTH - padX - 8;
  const innerH = HEIGHT - padY * 2;

  const values = series.map((p) => p.price);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread = Math.max(dataMax - dataMin, 1e-9);
  const min = dataMin - spread * 0.12;
  const max = dataMax + spread * 0.12;

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

  const gridLines = [0.25, 0.5, 0.75].map((pct) => {
    const gy = padY + innerH * pct;
    return (
      <line
        key={pct}
        x1={padX}
        y1={gy}
        x2={WIDTH - 8}
        y2={gy}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={1}
      />
    );
  });

  return (
    <div className="space-y-1">
      <svg
        role="img"
        aria-label="JLP price chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: HEIGHT }}
      >
        <defs>
          <linearGradient id="jlp-gmx-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity="0.2" />
            <stop offset="100%" stopColor={COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines}
        <text x={4} y={y(dataMax) + 4} fill="#787B87" fontSize="10" fontFamily="monospace">
          ${dataMax.toFixed(4)}
        </text>
        <text x={4} y={y(dataMin) + 4} fill="#787B87" fontSize="10" fontFamily="monospace">
          ${dataMin.toFixed(4)}
        </text>
        <path d={areaPath} fill="url(#jlp-gmx-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke={COLOR}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="px-2 text-right text-[11px] text-[#787B87]">
        Period{" "}
        <span
          className={cn(
            "font-mono tabular-nums",
            deltaPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]",
          )}
        >
          {formatPct(deltaPct, 2)}
        </span>
      </p>
    </div>
  );
}
