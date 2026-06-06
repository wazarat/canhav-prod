import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type { PoolComposition } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

interface JlpPoolCompositionProps {
  composition: PoolComposition;
}

const KIND_TONE = {
  stable: "signal",
  volatile: "electric",
} as const;

export function JlpPoolComposition({ composition }: JlpPoolCompositionProps) {
  const { assets, stablePct, volatilePct } = composition;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Pool composition</CardTitle>
          <CardDescription className="mt-1">
            Current weights across pool assets
          </CardDescription>
        </div>
        <DataSourceDot dataSource={composition.dataSource} />
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {assets.map((a) => (
          <div
            key={a.symbol}
            className={a.kind === "stable" ? "bg-signal-400" : "bg-electric-500"}
            style={{ width: `${a.currentWeightPct}%` }}
            title={`${a.symbol} ${a.currentWeightPct}%`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="signal">Stable {stablePct.toFixed(0)}%</Badge>
        <Badge tone="electric">Volatile {volatilePct.toFixed(0)}%</Badge>
      </div>

      <TableShell>
        <Table>
          <THead>
            <TR>
              <TH>Asset</TH>
              <TH className="text-right">Weight</TH>
              <TH className="text-right">Value</TH>
              <TH>Type</TH>
            </TR>
          </THead>
          <TBody>
            {assets.map((a) => (
              <TR key={a.symbol}>
                <TD>
                  <span className="font-medium text-ink-100">{a.symbol}</span>
                  <span className="ml-2 text-xs text-ink-400">{a.name}</span>
                </TD>
                <TD className="text-right">{a.currentWeightPct}%</TD>
                <TD className="text-right">{formatUsdCompact(a.valueUsd)}</TD>
                <TD>
                  <Badge tone={KIND_TONE[a.kind]} className="capitalize">
                    {a.kind}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </Card>
  );
}
