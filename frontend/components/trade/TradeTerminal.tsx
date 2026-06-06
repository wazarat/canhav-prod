"use client";

import { useCallback, useState } from "react";

import { ActivityLog } from "@/components/trade/ActivityLog";
import { MarketStatsRow } from "@/components/trade/MarketStatsRow";
import { OrderTicket } from "@/components/trade/OrderTicket";
import { PoolCompositionBar } from "@/components/trade/PoolCompositionBar";
import { PositionPanel } from "@/components/trade/PositionPanel";
import { TradeChart } from "@/components/trade/TradeChart";
import { TradePriceHeader } from "@/components/trade/TradePriceHeader";
import { TradeToast } from "@/components/trade/TradeToast";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { usePosition } from "@/lib/trade/usePosition";

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
  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge tone="signal">Arbitrum Sepolia · Demo · Gas-sponsored</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <TradePriceHeader mark={mark} />
          </Card>
          <TradeChart />
          <PoolCompositionBar />
          <MarketStatsRow />
        </div>

        <OrderTicket
          account={account}
          onConnect={connect}
          onDisconnect={disconnect}
          onOpen={open}
          onToast={setToast}
        />
      </div>

      <div className="space-y-6">
        <PositionPanel
          position={position}
          mark={mark}
          onClose={close}
          onToast={setToast}
        />
        <ActivityLog activity={activity} />
      </div>

      <TradeToast message={toast} onDismiss={dismissToast} />
    </>
  );
}
