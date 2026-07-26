"use client";

import { useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";

const AXIS_COLOR = "#7C8499";
const GRID_STROKE = "rgba(124, 132, 153, 0.15)";
const CURVE_COLOR = "#5C92FF";
const ACTIVE_COLOR = "#22D3EE";
const BREAKEVEN_COLOR = "#F59E0B";

/** Serialized inputs (JSON-safe; assembled server-side). */
export interface LeverageCurveInputs {
  /** Base strategy APY at 1x, percent. */
  baseApyPct: number;
  /** Borrow APY on the looped debt, percent. */
  borrowApyPct: number;
  /** Protocol max leverage, e.g. 10. */
  maxLeverageX: number;
  /** Where the borrow APY came from ("curated", "DeFi Llama", ...). */
  borrowSourceLabel: string;
}

/** Net looping APY at leverage L: base*L - borrow*(L-1) (spec row LY4). */
function netApyAt(l: number, i: LeverageCurveInputs): number {
  return i.baseApyPct * l - i.borrowApyPct * (l - 1);
}

/**
 * Net looping APY vs leverage multiple: the defining Leveraged Yield chart
 * (CAN-68). Interactive: a keyboard-accessible slider recomputes net APY
 * live; the break-even multiple (net APY crossing zero) is marked. Client
 * component loaded lazily via next/dynamic (CAN-60 rules).
 */
export function LeverageCurve({
  inputs,
  id,
  width = 720,
  height = 240,
}: {
  inputs: LeverageCurveInputs;
  id: string;
  width?: number;
  height?: number;
}) {
  const [leverage, setLeverage] = useState(Math.min(2, inputs.maxLeverageX));

  const samples = useMemo(() => {
    const out: { l: number; apy: number }[] = [];
    const steps = 60;
    for (let s = 0; s <= steps; s++) {
      const l = 1 + ((inputs.maxLeverageX - 1) * s) / steps;
      out.push({ l, apy: netApyAt(l, inputs) });
    }
    return out;
  }, [inputs]);

  // Closed form: base*L - borrow*(L-1) = 0  =>  L = borrow / (borrow - base).
  const breakEven =
    inputs.borrowApyPct > inputs.baseApyPct
      ? inputs.borrowApyPct / (inputs.borrowApyPct - inputs.baseApyPct)
      : null;
  const breakEvenInRange =
    breakEven != null && breakEven > 1 && breakEven <= inputs.maxLeverageX ? breakEven : null;

  const padX = 56;
  const padY = 16;
  const padBottom = 30;
  const innerW = width - padX - 12;
  const innerH = height - padY - padBottom;

  const apys = samples.map((s) => s.apy);
  const minApy = Math.min(...apys, 0);
  const maxApy = Math.max(...apys, 0);
  const span = Math.max(maxApy - minApy, 0.1);

  const xScale = scaleLinear<number>({
    domain: [1, inputs.maxLeverageX],
    range: [padX, padX + innerW],
  });
  const yScale = scaleLinear<number>({
    domain: [minApy - span * 0.1, maxApy + span * 0.1],
    range: [padY + innerH, padY],
  });

  const currentApy = netApyAt(leverage, inputs);
  const zeroY = yScale(0) ?? 0;

  return (
    <div>
      <svg
        role="img"
        aria-label={`Net looping APY versus leverage multiple, currently ${currentApy.toFixed(2)} percent at ${leverage.toFixed(1)}x`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height }}
      >
        <Group>
          <line
            x1={padX}
            x2={padX + innerW}
            y1={zeroY}
            y2={zeroY}
            stroke={GRID_STROKE}
            strokeWidth={1}
          />
          <LinePath<{ l: number; apy: number }>
            data={samples}
            x={(s) => xScale(s.l) ?? 0}
            y={(s) => yScale(s.apy) ?? 0}
            stroke={CURVE_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {breakEvenInRange != null ? (
            <>
              <line
                x1={xScale(breakEvenInRange) ?? 0}
                x2={xScale(breakEvenInRange) ?? 0}
                y1={padY}
                y2={padY + innerH}
                stroke={BREAKEVEN_COLOR}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.8}
              />
              <text
                x={(xScale(breakEvenInRange) ?? 0) + 4}
                y={padY + 12}
                fill={BREAKEVEN_COLOR}
                fontSize={10}
                fontFamily="monospace"
              >
                break-even {breakEvenInRange.toFixed(1)}x
              </text>
            </>
          ) : null}
          <circle
            cx={xScale(leverage) ?? 0}
            cy={yScale(currentApy) ?? 0}
            r={5}
            fill={ACTIVE_COLOR}
          />
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
            numTicks={Math.min(Math.round(inputs.maxLeverageX), 10)}
            stroke={GRID_STROKE}
            tickStroke={GRID_STROKE}
            tickFormat={(v) => `${Number(v).toFixed(0)}x`}
            tickLabelProps={{
              fill: AXIS_COLOR,
              fontSize: 10,
              fontFamily: "monospace",
              textAnchor: "middle",
            }}
          />
        </Group>
      </svg>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          <label htmlFor={`leverage-slider-${id}`} className="text-xs text-ink-300">
            Leverage
          </label>
          <input
            id={`leverage-slider-${id}`}
            type="range"
            min={1}
            max={inputs.maxLeverageX}
            step={0.1}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="h-1.5 w-48 cursor-pointer accent-cyan-400"
            aria-valuetext={`${leverage.toFixed(1)}x leverage, net APY ${currentApy.toFixed(2)} percent`}
          />
          <span
            className="font-mono text-sm tabular-nums text-ink-100"
            aria-live="polite"
          >
            {leverage.toFixed(1)}x → {currentApy >= 0 ? "+" : ""}
            {currentApy.toFixed(2)}%
          </span>
        </div>
        <p className="text-xs text-ink-400">
          Net APY = base APY × L − borrow APY × (L − 1), with base{" "}
          {inputs.baseApyPct.toFixed(2)}% and borrow {inputs.borrowApyPct.toFixed(2)}% (
          {inputs.borrowSourceLabel}). Derived model, not a per-position quote.
        </p>
      </div>
    </div>
  );
}
