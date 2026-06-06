"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { sepoliaExplorerTxHash } from "@/lib/demo/tradeDemo";
import type { ActivityItem } from "@/lib/trade/types";
import { truncateAddress } from "@/lib/utils";

interface ActivityLogProps {
  activity: ActivityItem[];
}

const KIND_TONE = {
  buy: "positive",
  sell: "warning",
  close: "neutral",
} as const;

export function ActivityLog({ activity }: ActivityLogProps) {
  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Your demo orders, newest first.</CardDescription>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-ink-400">No activity yet.</p>
      ) : (
        <TableShell>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Action</TH>
                <TH className="text-right">JLP</TH>
                <TH className="text-right">Price</TH>
                <TH className="text-right">Value</TH>
                <TH className="text-right">Fee</TH>
                <TH>Tx</TH>
              </TR>
            </THead>
            <TBody>
              {activity.map((item) => (
                <TR key={item.id}>
                  <TD className="text-xs text-ink-400">
                    {new Date(item.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TD>
                  <TD>
                    <Badge tone={KIND_TONE[item.kind]}>
                      {item.kind.charAt(0).toUpperCase() + item.kind.slice(1)}
                    </Badge>
                  </TD>
                  <TD className="text-right font-mono">{item.jlp.toFixed(4)}</TD>
                  <TD className="text-right font-mono">${item.priceUsd.toFixed(4)}</TD>
                  <TD className="text-right font-mono">${item.valueUsd.toFixed(2)}</TD>
                  <TD className="text-right font-mono">
                    {item.feeUsd > 0 ? `$${item.feeUsd.toFixed(2)}` : "—"}
                  </TD>
                  <TD>
                    <a
                      href={sepoliaExplorerTxHash(item.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-electric-400 hover:underline"
                    >
                      {truncateAddress(item.txHash)}
                    </a>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableShell>
      )}
    </Card>
  );
}
