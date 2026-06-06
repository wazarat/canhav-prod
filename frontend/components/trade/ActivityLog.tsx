"use client";

import { tradeDivider, tradePanel } from "@/components/trade/tradeStyles";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { sepoliaExplorerTxHash } from "@/lib/demo/tradeDemo";
import type { ActivityItem } from "@/lib/trade/types";
import { cn, truncateAddress } from "@/lib/utils";

interface ActivityLogProps {
  activity: ActivityItem[];
  embedded?: boolean;
}

export function ActivityLog({ activity, embedded }: ActivityLogProps) {
  if (activity.length === 0) {
    return (
      <div className={cn(!embedded && tradePanel, "px-4 py-8 text-center")}>
        <p className="text-sm text-[#787B87]">No trade history</p>
      </div>
    );
  }

  return (
    <div className={cn(!embedded && tradePanel, "overflow-x-auto")}>
      <TableShell>
        <Table>
          <THead>
            <TR className={cn("border-b text-[11px] uppercase tracking-wide text-[#787B87]", tradeDivider)}>
              <TH className="px-4 py-2.5">Time</TH>
              <TH className="px-4 py-2.5">Action</TH>
              <TH className="px-4 py-2.5 text-right">Size</TH>
              <TH className="px-4 py-2.5 text-right">Price</TH>
              <TH className="px-4 py-2.5 text-right">Value</TH>
              <TH className="px-4 py-2.5 text-right">Fee</TH>
              <TH className="px-4 py-2.5">Tx</TH>
            </TR>
          </THead>
          <TBody>
            {activity.map((item) => (
              <TR key={item.id} className="border-b border-white/[0.04] text-[#EAECEF]">
                <TD className="px-4 py-2.5 text-xs text-[#787B87]">
                  {new Date(item.at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TD>
                <TD className="px-4 py-2.5">
                  <span
                    className={cn(
                      "text-xs font-medium uppercase",
                      item.kind === "buy" && "text-[#0ECB81]",
                      item.kind === "sell" && "text-[#F6465D]",
                      item.kind === "close" && "text-[#A0A3AD]",
                    )}
                  >
                    {item.kind}
                  </span>
                </TD>
                <TD className="px-4 py-2.5 text-right font-mono tabular-nums">
                  {item.jlp.toFixed(4)}
                </TD>
                <TD className="px-4 py-2.5 text-right font-mono tabular-nums">
                  ${item.priceUsd.toFixed(4)}
                </TD>
                <TD className="px-4 py-2.5 text-right font-mono tabular-nums">
                  ${item.valueUsd.toFixed(2)}
                </TD>
                <TD className="px-4 py-2.5 text-right font-mono tabular-nums text-[#787B87]">
                  {item.feeUsd > 0 ? `$${item.feeUsd.toFixed(2)}` : "—"}
                </TD>
                <TD className="px-4 py-2.5">
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
    </div>
  );
}
