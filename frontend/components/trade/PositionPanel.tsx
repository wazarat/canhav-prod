"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { tradeDivider, tradePanel } from "@/components/trade/tradeStyles";
import { accruedYield, pricePnl } from "@/lib/trade/engine";
import type { Position } from "@/lib/trade/types";
import { cn } from "@/lib/utils";

interface PositionPanelProps {
  position: Position | null;
  mark: number;
  onClose: (mark: number) => void;
  onToast: (message: string) => void;
  embedded?: boolean;
}

export function PositionPanel({
  position,
  mark,
  onClose,
  onToast,
  embedded,
}: PositionPanelProps) {
  const [confirming, setConfirming] = useState(false);

  if (!position) {
    return (
      <div className={cn(!embedded && tradePanel, "px-4 py-8 text-center")}>
        <p className="text-sm text-[#787B87]">No open positions</p>
      </div>
    );
  }

  const pnl = pricePnl(position, mark);
  const yieldUsd = accruedYield(position);
  const netValue = position.notionalUsd + pnl.usd + yieldUsd;

  const handleClose = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onClose(mark);
    onToast(`Position closed · $${netValue.toFixed(2)}`);
    setConfirming(false);
  };

  return (
    <div className={cn(!embedded && tradePanel, "overflow-x-auto")}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className={cn("border-b text-[11px] uppercase tracking-wide text-[#787B87]", tradeDivider)}>
            <th className="px-4 py-2.5 font-medium">Market</th>
            <th className="px-4 py-2.5 font-medium">Size</th>
            <th className="px-4 py-2.5 font-medium">Entry</th>
            <th className="px-4 py-2.5 font-medium">Mark</th>
            <th className="px-4 py-2.5 font-medium">Leverage</th>
            <th className="px-4 py-2.5 font-medium">PnL</th>
            <th className="px-4 py-2.5 font-medium">Yield</th>
            <th className="px-4 py-2.5 font-medium">Net</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-white/[0.04] text-[#EAECEF]">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-gradient-to-br from-electric-600 to-neon-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  JLP
                </span>
                <span
                  className={cn(
                    "text-xs font-medium uppercase",
                    position.side === "long" ? "text-[#0ECB81]" : "text-[#F6465D]",
                  )}
                >
                  {position.leverage > 1 ? position.side : "Long"}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 font-mono tabular-nums">
              {position.jlpSize.toFixed(4)}
              <span className="ml-1 text-xs text-[#787B87]">JLP</span>
            </td>
            <td className="px-4 py-3 font-mono tabular-nums">${position.entryPrice.toFixed(4)}</td>
            <td className="px-4 py-3 font-mono tabular-nums" suppressHydrationWarning>
              ${mark.toFixed(4)}
            </td>
            <td className="px-4 py-3 font-mono tabular-nums">{position.leverage}x</td>
            <td
              className={cn(
                "px-4 py-3 font-mono tabular-nums",
                pnl.usd >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]",
              )}
            >
              {pnl.usd >= 0 ? "+" : ""}${pnl.usd.toFixed(2)} ({pnl.pct >= 0 ? "+" : ""}
              {pnl.pct.toFixed(2)}%)
            </td>
            <td className="px-4 py-3 font-mono tabular-nums text-[#0ECB81]">
              +${yieldUsd.toFixed(2)}
            </td>
            <td className="px-4 py-3 font-mono tabular-nums text-white">
              ${netValue.toFixed(2)}
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                {confirming && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-[#787B87]"
                    onClick={() => setConfirming(false)}
                  >
                    Cancel
                  </Button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className={cn(
                    "rounded border px-3 py-1.5 text-xs font-medium transition-colors",
                    confirming
                      ? "border-[#F6465D] bg-[#F6465D]/15 text-[#F6465D]"
                      : "border-white/[0.12] text-[#A0A3AD] hover:border-white/[0.2] hover:text-white",
                  )}
                >
                  {confirming ? "Confirm" : "Close"}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
