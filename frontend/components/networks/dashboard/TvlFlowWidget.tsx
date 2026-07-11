import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import type { TvlFlow } from "@/lib/networks/metrics";
import { formatPct, formatUsdCompact } from "@/lib/utils";

const DONUT_COLORS = ["#5C92FF", "#34D399", "#A78BFA", "#FBBF24", "#64748B"];
const TOP_SEGMENTS = 4;

interface DonutSegment {
  symbol: string;
  valueUsd: number;
  pct: number;
}

function buildDonutSegments(flow: TvlFlow): DonutSegment[] {
  const withValue = flow.contributions.filter((c) => c.valueUsd != null && c.valueUsd > 0);
  const top = withValue.slice(0, TOP_SEGMENTS);
  const otherUsd = withValue.slice(TOP_SEGMENTS).reduce((s, c) => s + (c.valueUsd ?? 0), 0);
  const total = flow.totalUsd || 1;

  const segments: DonutSegment[] = top.map((c) => ({
    symbol: c.symbol,
    valueUsd: c.valueUsd!,
    pct: ((c.valueUsd ?? 0) / total) * 100,
  }));

  if (otherUsd > 0) {
    segments.push({
      symbol: "Other",
      valueUsd: otherUsd,
      pct: (otherUsd / total) * 100,
    });
  }

  return segments;
}

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  if (segments.length === 0) return null;

  const size = 88;
  const cx = size / 2;
  const cy = size / 2;
  const r = 34;
  const stroke = 14;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg
      role="img"
      aria-label="Member coin composition"
      viewBox={`0 0 ${size} ${size}`}
      className="h-[88px] w-[88px] shrink-0"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(30,41,59,0.8)"
        strokeWidth={stroke}
      />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * circumference;
        const el = (
          <circle
            key={seg.symbol}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth={stroke}
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

function sparklineValues(
  flow: TvlFlow,
  tvlSeries?: number[],
): { values: number[]; label: string } {
  if (tvlSeries && tvlSeries.length >= 2) {
    return { values: tvlSeries, label: "Protocol TVL · 30d" };
  }
  if (flow.change24hPct != null && flow.totalUsd > 0) {
    const start = flow.totalUsd / (1 + flow.change24hPct / 100);
    return { values: [start, flow.totalUsd], label: "Implied 24h mcap move" };
  }
  return { values: [], label: "" };
}

/**
 * 24h value-flow widget with composition donut + sparkline. Fixed height so the
 * right rail never grows unbounded with coin count.
 */
export function TvlFlowWidget({
  flow,
  tvlSeries,
}: {
  flow: TvlFlow;
  tvlSeries?: number[];
}) {
  if (!flow.hasData) {
    return (
      <Card className="flex max-h-[220px] flex-col gap-2 p-5">
        <Header />
        <p className="mt-2 text-sm text-ink-400">
          No live 24h market data for this network&apos;s coins yet. The value flow will
          appear once a member coin is tracked.
        </p>
      </Card>
    );
  }

  const up = (flow.change24hPct ?? 0) >= 0;
  const tone = flow.change24hPct == null ? "neutral" : up ? "positive" : "danger";
  const segments = buildDonutSegments(flow);
  const { values: sparkValues, label: sparkLabel } = sparklineValues(flow, tvlSeries);
  const legendItems = segments.slice(0, 3);

  return (
    <Card className="flex max-h-[220px] flex-col gap-3 overflow-hidden p-5">
      <Header />
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-xl font-semibold tracking-tight text-ink-50">
          {formatUsdCompact(flow.totalUsd)}
        </span>
        {flow.change24hPct != null && (
          <Badge tone={tone} className="text-[10px]">
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPct(flow.change24hPct)} 24h
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        <DonutChart segments={segments} />
        <div className="min-w-0 flex-1 space-y-2">
          {sparkValues.length >= 2 && (
            <div className="space-y-1">
              <p className="text-[10px] text-ink-500">{sparkLabel}</p>
              <Sparkline
                id="value-flow"
                values={sparkValues}
                height={40}
                color={up ? "#34D399" : "#F87171"}
              />
            </div>
          )}
          {flow.netFlow24hUsd != null && (
            <p className="text-[10px] text-ink-400">
              {up ? "+" : "−"}
              {formatUsdCompact(Math.abs(flow.netFlow24hUsd))} net flow
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {legendItems.map((seg, i) => (
              <span key={seg.symbol} className="flex items-center gap-1 text-[10px] text-ink-400">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="font-mono text-ink-300">{seg.symbol}</span>
                <span>{seg.pct.toFixed(0)}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Header() {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-semibold text-ink-100">Value flow (24h)</h3>
      <p className="text-xs text-ink-500">Market-cap-weighted move across member coins</p>
    </div>
  );
}
