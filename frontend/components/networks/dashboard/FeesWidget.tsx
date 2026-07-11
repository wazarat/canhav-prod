import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { FeesSummary } from "@/lib/networks/metrics";
import { formatPct, formatUsdCompact, timeAgo } from "@/lib/utils";

/**
 * Fees / revenue / DEX-volume widget sourced from the DeFi Llama overlays the
 * daily cron writes onto a network. Shows an honest empty state when a network
 * isn't mapped to a Llama protocol (no fabricated figures).
 */
export function FeesWidget({ fees }: { fees: FeesSummary }) {
  if (!fees.hasData) {
    return (
      <Card className="flex h-full flex-col gap-2 p-5">
        <Header category={null} updatedAt={null} />
        <p className="mt-2 text-sm text-ink-400">
          No fee or volume data: this network isn&apos;t mapped to a DeFi Llama protocol
          yet.
        </p>
      </Card>
    );
  }

  const upFees = (fees.feesChange1dPct ?? 0) >= 0;
  const upVol = (fees.volumeChange1dPct ?? 0) >= 0;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <Header category={fees.llamaCategory} updatedAt={fees.updatedAt} />

      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-2xl font-semibold tracking-tight text-ink-50">
          {formatUsdCompact(fees.fees24hUsd)}
        </span>
        <span className="text-xs text-ink-500">fees · 24h</span>
        {fees.feesChange1dPct != null && (
          <Badge tone={upFees ? "positive" : "danger"}>{formatPct(fees.feesChange1dPct)}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Row label="Fees · 7d" value={formatUsdCompact(fees.fees7dUsd)} />
        <Row label="Fees · 30d" value={formatUsdCompact(fees.fees30dUsd)} />
        <Row label="Revenue · 24h" value={formatUsdCompact(fees.revenue24hUsd)} />
        {fees.volume24hUsd != null && (
          <Row
            label="DEX vol · 24h"
            value={
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-ink-100">
                  {formatUsdCompact(fees.volume24hUsd)}
                </span>
                {fees.volumeChange1dPct != null && (
                  <span className={upVol ? "text-emerald-400" : "text-rose-400"}>
                    {formatPct(fees.volumeChange1dPct)}
                  </span>
                )}
              </span>
            }
          />
        )}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-400">{label}</span>
      <span className="font-mono text-ink-100">{value}</span>
    </div>
  );
}

function Header({
  category,
  updatedAt,
}: {
  category: string | null;
  updatedAt: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-ink-100">Fees paid (24h)</h3>
        <p className="text-xs text-ink-500">
          {category ? `DeFi Llama · ${category}` : "DeFi Llama"}
          {updatedAt ? ` · ${timeAgo(updatedAt)}` : ""}
        </p>
      </div>
    </div>
  );
}
