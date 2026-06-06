import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import type { PoolComposition } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

interface AumGaugeProps {
  composition: PoolComposition;
}

export function AumGauge({ composition }: AumGaugeProps) {
  const { aumUsd, aumCapUsd, utilizationPct } = composition;
  const pct = Math.min(Math.max(utilizationPct, 0), 100);
  const nearCap = pct >= 80;
  const atCap = pct >= 99;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>AUM utilization</CardTitle>
          <CardDescription className="mt-1">
            Pool size vs soft cap — minting disables at cap
          </CardDescription>
        </div>
        <DataSourceDot dataSource={composition.dataSource} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-ink-300">{formatUsdCompact(aumUsd)} AUM</span>
          <span className="font-medium text-ink-100">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-ink-800">
          <div
            className={`h-full rounded-full transition-all ${
              atCap ? "bg-rose-500" : nearCap ? "bg-amber-400" : "bg-electric-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {aumCapUsd != null && (
          <p className="text-xs text-ink-400">Cap: {formatUsdCompact(aumCapUsd)}</p>
        )}
      </div>

      <Badge tone={atCap ? "danger" : nearCap ? "warning" : "positive"}>
        {atCap ? "At cap — minting disabled" : nearCap ? "Near cap" : "Minting open"}
      </Badge>
    </Card>
  );
}
