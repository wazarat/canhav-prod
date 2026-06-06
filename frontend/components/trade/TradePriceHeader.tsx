"use client";

import { useEffect, useRef, useState } from "react";

import { JLP_MARKET } from "@/lib/trade/jlpMarket";
import { tradeDivider, tradeLabel, tradeMuted, tradePanel } from "@/components/trade/tradeStyles";
import { cn, formatNumberCompact, formatPct, formatUsdCompact } from "@/lib/utils";

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
    <div className={cn(tradePanel, "flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3")}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-electric-600 to-neon-600 text-xs font-bold text-white">
          JLP
        </div>
        <div>
          <p className="text-sm font-medium text-white">JLP / USD</p>
          <p className={tradeMuted}>Jupiter Perps LP</p>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <p
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums transition-colors duration-300",
            flash === "up" && "text-[#0ECB81]",
            flash === "down" && "text-[#F6465D]",
            !flash && "text-white",
          )}
          suppressHydrationWarning
        >
          ${mark.toFixed(2)}
        </p>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            changePositive ? "text-[#0ECB81]" : "text-[#F6465D]",
          )}
        >
          {formatPct(JLP_MARKET.change24hPct, 2)}
        </span>
      </div>

      <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />

      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <MarketStat label="Market cap" value={formatUsdCompact(JLP_MARKET.marketCapUsd)} />
        <MarketStat label="24h volume" value={formatUsdCompact(JLP_MARKET.volume24hUsd)} />
        <MarketStat label="Yield" value={`${JLP_MARKET.apyPct.toFixed(2)}%`} accent />
        <MarketStat label="Holders" value={formatNumberCompact(JLP_MARKET.holders)} />
      </div>
    </div>
  );
}

function MarketStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className={tradeLabel}>{label}</p>
      <p
        className={cn(
          "font-mono text-sm tabular-nums",
          accent ? "text-[#0ECB81]" : "text-[#EAECEF]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
