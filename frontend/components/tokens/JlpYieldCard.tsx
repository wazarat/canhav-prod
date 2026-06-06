import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import { Sparkline } from "@/components/ui/Sparkline";
import type { YieldMechanics } from "@/lib/types";

interface JlpYieldCardProps {
  yieldMechanics: YieldMechanics;
}

export function JlpYieldCard({ yieldMechanics: y }: JlpYieldCardProps) {
  const apyValues = y.apyHistory?.map((p) => p.price) ?? [];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Yield mechanics</CardTitle>
          <CardDescription className="mt-1">{y.yieldSource}</CardDescription>
        </div>
        <DataSourceDot dataSource={y.dataSource} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="positive">Real yield</Badge>
        {y.isAutoCompounding && <Badge tone="electric">Auto-compounding</Badge>}
        {!y.emissionsBased && <Badge tone="neutral">No emissions</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <CardDescription>Current APY</CardDescription>
          <p className="mt-1 font-display text-xl font-semibold text-ink-50">
            {y.currentApyPct.toFixed(1)}%
          </p>
        </div>
        {y.apy7dPct != null && (
          <div>
            <CardDescription>7d avg</CardDescription>
            <p className="mt-1 font-display text-xl font-semibold text-ink-50">
              {y.apy7dPct.toFixed(1)}%
            </p>
          </div>
        )}
        {y.apy30dPct != null && (
          <div>
            <CardDescription>30d avg</CardDescription>
            <p className="mt-1 font-display text-xl font-semibold text-ink-50">
              {y.apy30dPct.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-ink-800/60 bg-ink-900/40 px-4 py-3">
        <p className="text-xs text-ink-400">Fee share to holders</p>
        <p className="mt-0.5 text-sm font-medium text-ink-100">
          {y.feeShareToHoldersPct}% of perp fees
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-400">{y.payoutAsset}</p>
      </div>

      {apyValues.length >= 2 && (
        <div className="space-y-1">
          <CardDescription>90d APY trend</CardDescription>
          <Sparkline id="jlp-apy-spark" values={apyValues} height={48} color="#34D399" />
        </div>
      )}
    </Card>
  );
}
