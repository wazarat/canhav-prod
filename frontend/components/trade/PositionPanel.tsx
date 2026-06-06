"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { accruedYield, pricePnl } from "@/lib/trade/engine";
import type { Position } from "@/lib/trade/types";
import { cn } from "@/lib/utils";

interface PositionPanelProps {
  position: Position | null;
  mark: number;
  onClose: (mark: number) => void;
  onToast: (message: string) => void;
}

export function PositionPanel({ position, mark, onClose, onToast }: PositionPanelProps) {
  const [confirming, setConfirming] = useState(false);

  if (!position) {
    return (
      <Card className="space-y-2">
        <CardTitle>Your position</CardTitle>
        <CardDescription>
          No open position. Buy JLP to start earning ~42% APY (demo).
        </CardDescription>
      </Card>
    );
  }

  const pnl = pricePnl(position, mark);
  const yieldUsd = accruedYield(position);
  const netValue = position.notionalUsd + pnl.usd + yieldUsd;
  const sideLabel = position.leverage > 1 ? position.side : "Spot";

  const handleClose = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onClose(mark);
    onToast(`Position closed · realized $${netValue.toFixed(2)}`);
    setConfirming(false);
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Your position</CardTitle>
        <Badge tone={position.side === "long" ? "positive" : "danger"}>
          {sideLabel === "Spot" ? "Long / Spot" : `${position.side} ${position.leverage}x`}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Size" value={`${position.jlpSize.toFixed(4)} JLP`} sub={`≈ $${position.notionalUsd.toFixed(2)}`} />
        <Stat label="Entry" value={`$${position.entryPrice.toFixed(4)}`} />
        <Stat
          label="Mark"
          value={`$${mark.toFixed(4)}`}
          className="text-ink-50"
          suppressHydrationWarning
        />
        <Stat label="Leverage" value={`${position.leverage}x`} />
        <Stat
          label="PnL"
          value={`${pnl.usd >= 0 ? "+" : ""}$${pnl.usd.toFixed(2)} (${pnl.pct >= 0 ? "+" : ""}${pnl.pct.toFixed(2)}%)`}
          className={cn(pnl.usd >= 0 ? "text-emerald-400" : "text-rose-400")}
        />
        <Stat
          label="Yield earned"
          value={`+$${yieldUsd.toFixed(2)}`}
          sub="Real-yield (fees) — demo"
          className="text-emerald-400"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-800/60 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-400">Net value</p>
          <p className="font-mono text-xl font-semibold text-ink-50">${netValue.toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          {confirming && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          )}
          <Button
            variant={confirming ? "primary" : "outline"}
            size="sm"
            className={confirming ? "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" : ""}
            onClick={handleClose}
          >
            {confirming ? "Confirm close" : "Close position"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  className,
  suppressHydrationWarning,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
  suppressHydrationWarning?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-ink-400">{label}</p>
      <p
        className={cn("mt-0.5 font-mono text-sm font-medium text-ink-100", className)}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}
