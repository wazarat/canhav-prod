"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { JLP_MARKET } from "@/lib/trade/jlpMarket";
import { cn, formatNumberCompact, formatPct } from "@/lib/utils";

interface TradePriceHeaderProps {
  mark: number;
}

export function TradePriceHeader({ mark }: TradePriceHeaderProps) {
  const prevRef = useRef(mark);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (mark > prevRef.current) setFlash("up");
    else if (mark < prevRef.current) setFlash("down");
    prevRef.current = mark;

    const id = setTimeout(() => setFlash(null), 400);
    return () => clearTimeout(id);
  }, [mark]);

  const changePositive = JLP_MARKET.change24hPct >= 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">JLP / USD</p>
          <p
            className={cn(
              "font-mono text-4xl font-semibold tracking-tight transition-colors duration-300",
              flash === "up" && "text-emerald-400",
              flash === "down" && "text-rose-400",
              !flash && "text-ink-50",
            )}
            suppressHydrationWarning
          >
            ${mark.toFixed(4)}
          </p>
        </div>
        <Badge tone={changePositive ? "positive" : "danger"}>
          {formatPct(JLP_MARKET.change24hPct, 2)} 24h
        </Badge>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-ink-300">
        <span>
          Virtual price anchor{" "}
          <span className="font-mono text-ink-100">${JLP_MARKET.priceUsd.toFixed(2)}</span>
        </span>
        <span>
          Holders{" "}
          <span className="font-mono text-ink-100">
            {formatNumberCompact(JLP_MARKET.holders)}
          </span>
        </span>
      </div>
    </div>
  );
}
