"use client";

import { useCallback, useState } from "react";

import { ActivityLog } from "@/components/trade/ActivityLog";
import { OrderTicket } from "@/components/trade/OrderTicket";
import { PoolCompositionBar } from "@/components/trade/PoolCompositionBar";
import { PositionPanel } from "@/components/trade/PositionPanel";
import { TradeChart } from "@/components/trade/TradeChart";
import { TradePriceHeader } from "@/components/trade/TradePriceHeader";
import { TradeToast } from "@/components/trade/TradeToast";
import { tradeBottomTab, tradeDivider, tradePanel } from "@/components/trade/tradeStyles";
import { usePosition } from "@/lib/trade/usePosition";

type BottomTab = "positions" | "trades";

export function TradeTerminal() {
  const {
    account,
    connect,
    disconnect,
    position,
    mark,
    open,
    close,
    activity,
  } = usePosition();

  const [toast, setToast] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("positions");
  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <div className="space-y-3">
      <TradePriceHeader mark={mark} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <TradeChart />
        <OrderTicket
          account={account}
          onConnect={connect}
          onDisconnect={disconnect}
          onOpen={open}
          onToast={setToast}
        />
      </div>

      <PoolCompositionBar />

      <div className={tradePanel}>
        <div className={`flex border-b ${tradeDivider}`}>
          <button
            type="button"
            onClick={() => setBottomTab("positions")}
            className={tradeBottomTab(bottomTab === "positions")}
          >
            Positions
            {position && (
              <span className="ml-1.5 rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-[#A0A3AD]">
                1
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setBottomTab("trades")}
            className={tradeBottomTab(bottomTab === "trades")}
          >
            Trades
            {activity.length > 0 && (
              <span className="ml-1.5 rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-[#A0A3AD]">
                {activity.length}
              </span>
            )}
          </button>
        </div>

        {bottomTab === "positions" ? (
          <PositionPanel
            embedded
            position={position}
            mark={mark}
            onClose={close}
            onToast={setToast}
          />
        ) : (
          <ActivityLog embedded activity={activity} />
        )}
      </div>

      <TradeToast message={toast} onDismiss={dismissToast} />
    </div>
  );
}
