"use client";

import { useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";

import type { FixedIncomeMarketRow } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

const AXIS_COLOR = "#7C8499";
const GRID_STROKE = "rgba(124, 132, 153, 0.15)";

interface CurvePoint extends FixedIncomeMarketRow {
  daysToMaturity: number;
}

/**
 * Interactive yield curve by maturity (CAN-64): implied fixed APY against
 * days to maturity across a protocol's active markets. Hover or focus a point
 * for the market detail; click (or Enter) pins it into the detail strip below.
 * Client component, loaded lazily via next/dynamic so the visx interactivity
 * stays out of the route's First Load JS (CAN-60 rules).
 */
export function YieldCurveChart({
  markets,
  id,
  width = 720,
  height = 260,
  ariaLabel,
}: {
  markets: FixedIncomeMarketRow[];
  id: string;
  width?: number;
  height?: number;
  ariaLabel: string;
}) {
  const [activeAddr, setActiveAddr] = useState<string | null>(null);
  const [pinnedAddr, setPinnedAddr] = useState<string | null>(null);

  const points = useMemo<CurvePoint[]>(() => {
    const nowMs = Date.now();
    return markets
      .filter((m) => m.impliedApyPct != null)
      .map((m) => ({ ...m, daysToMaturity: (Date.parse(m.expiry) - nowMs) / 86_400_000 }))
      .filter((m) => Number.isFinite(m.daysToMaturity) && m.daysToMaturity > 0)
      .sort((a, b) => a.daysToMaturity - b.daysToMaturity);
  }, [markets]);

  if (points.length < 2) {
    return (
      <div className="grid h-40 place-items-center text-sm text-ink-300">
        Not enough live markets to draw a curve.
      </div>
    );
  }

  const padX = 56;
  const padY = 16;
  const padBottom = 32;
  const innerW = width - padX - 12;
  const innerH = height - padY - padBottom;

  const maxDays = Math.max(...points.map((p) => p.daysToMaturity));
  const apys = points.map((p) => p.impliedApyPct as number);
  const minApy = Math.min(...apys, 0);
  const maxApy = Math.max(...apys);

  const xScale = scaleLinear<number>({
    domain: [0, maxDays * 1.05],
    range: [padX, padX + innerW],
  });
  const yScale = scaleLinear<number>({
    domain: [minApy, maxApy * 1.12 || 1],
    range: [padY + innerH, padY],
  });

  const maxLiquidity = Math.max(...points.map((p) => p.liquidityUsd ?? 0), 1);
  const dotR = (p: CurvePoint) => 3 + 5 * Math.sqrt((p.liquidityUsd ?? 0) / maxLiquidity);

  const active =
    points.find((p) => p.address === activeAddr) ??
    points.find((p) => p.address === pinnedAddr) ??
    null;

  return (
    <div>
      {/* role=group (not img): the curve contains focusable point buttons,
          and an img role may not own interactive children (axe nested-interactive). */}
      <svg
        role="group"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height }}
      >
        <Group>
          <LinePath<CurvePoint>
            data={points}
            x={(p) => xScale(p.daysToMaturity) ?? 0}
            y={(p) => yScale(p.impliedApyPct as number) ?? 0}
            stroke="#5C92FF"
            strokeWidth={1.5}
            strokeOpacity={0.6}
            strokeLinejoin="round"
          />
          {points.map((p) => {
            const isActive = p.address === active?.address;
            return (
              <circle
                key={p.address}
                cx={xScale(p.daysToMaturity) ?? 0}
                cy={yScale(p.impliedApyPct as number) ?? 0}
                r={isActive ? dotR(p) + 1.5 : dotR(p)}
                fill={isActive ? "#22D3EE" : "#5C92FF"}
                stroke={isActive ? "#22D3EE" : "transparent"}
                strokeWidth={1.5}
                fillOpacity={isActive ? 1 : 0.8}
                tabIndex={0}
                role="button"
                aria-label={`${p.name}: ${(p.impliedApyPct as number).toFixed(2)} percent implied APY, ${Math.round(p.daysToMaturity)} days to maturity`}
                style={{ cursor: "pointer", outline: "none" }}
                onMouseEnter={() => setActiveAddr(p.address)}
                onMouseLeave={() => setActiveAddr(null)}
                onFocus={() => setActiveAddr(p.address)}
                onBlur={() => setActiveAddr(null)}
                onClick={() => setPinnedAddr((cur) => (cur === p.address ? null : p.address))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPinnedAddr((cur) => (cur === p.address ? null : p.address));
                  }
                }}
              />
            );
          })}
          <AxisLeft
            scale={yScale}
            left={padX}
            numTicks={4}
            stroke={GRID_STROKE}
            tickStroke={GRID_STROKE}
            tickFormat={(v) => `${Number(v).toFixed(1)}%`}
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
            numTicks={6}
            stroke={GRID_STROKE}
            tickStroke={GRID_STROKE}
            tickFormat={(v) => `${Math.round(Number(v))}d`}
            tickLabelProps={{
              fill: AXIS_COLOR,
              fontSize: 10,
              fontFamily: "monospace",
              textAnchor: "middle",
            }}
          />
        </Group>
      </svg>
      <div
        className="mt-2 min-h-[3.25rem] rounded-lg border border-ink-800/70 bg-ink-900/40 px-3 py-2 text-xs text-ink-300"
        aria-live="polite"
        id={`yield-curve-detail-${id}`}
      >
        {active ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium text-ink-100">{active.name}</span>
            <span>Implied APY {(active.impliedApyPct as number).toFixed(2)}%</span>
            {active.underlyingApyPct != null ? (
              <span>Underlying {active.underlyingApyPct.toFixed(2)}%</span>
            ) : null}
            <span>{Math.round(active.daysToMaturity)}d to {active.expiry.slice(0, 10)}</span>
            {active.liquidityUsd != null ? (
              <span>Liquidity {formatUsdCompact(active.liquidityUsd)}</span>
            ) : null}
            {active.ptPriceInUnderlying != null ? (
              <span>PT {active.ptPriceInUnderlying.toFixed(4)}</span>
            ) : null}
            {active.ytPriceInUnderlying != null ? (
              <span>YT {active.ytPriceInUnderlying.toFixed(4)}</span>
            ) : null}
          </div>
        ) : (
          <span>
            Hover or focus a point for market detail; click to pin. Dot size tracks pool
            liquidity.
          </span>
        )}
      </div>
    </div>
  );
}
