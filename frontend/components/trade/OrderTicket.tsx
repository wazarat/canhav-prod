"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { ConnectWalletButton } from "@/components/trade/ConnectWalletButton";
import {
  tradeDivider,
  tradeLabel,
  tradeLeverageBtn,
  tradePanel,
  tradePanelInset,
  tradeSegmentTab,
} from "@/components/trade/tradeStyles";
import { simulateOrderFlow, type OrderFlowEvent } from "@/lib/demo/tradeDemo";
import { quoteBuy } from "@/lib/trade/engine";
import { MINT_FEE_PCT, SLIPPAGE_PCT } from "@/lib/trade/jlpMarket";
import type { Quote, Side, SmartAccount } from "@/lib/trade/types";
import { cn, truncateAddress } from "@/lib/utils";

const DEMO_BALANCE = 10_000;
const PAY_ASSETS = ["USDC", "SOL"] as const;
const LEVERAGE_OPTIONS = [1, 2, 3, 5] as const;

interface OrderTicketProps {
  account: SmartAccount | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpen: (quote: Quote) => void;
  onToast: (message: string) => void;
}

export function OrderTicket({
  account,
  onConnect,
  onDisconnect,
  onOpen,
  onToast,
}: OrderTicketProps) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [payAsset, setPayAsset] = useState<(typeof PAY_ASSETS)[number]>("USDC");
  const [amount, setAmount] = useState(1000);
  const [leverage, setLeverage] = useState(1);
  const [side, setSide] = useState<Side>("long");
  const [executing, setExecuting] = useState(false);
  const [flow, setFlow] = useState<OrderFlowEvent[]>([]);

  const quote = useMemo(
    () => quoteBuy(amount, leverage, side),
    [amount, leverage, side],
  );

  const fillPct = useCallback(
    (pct: number) => setAmount(Math.floor((DEMO_BALANCE * pct) / 100)),
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!account) return;
    setExecuting(true);
    setFlow([]);
    await simulateOrderFlow((event) => {
      setFlow((prev) => {
        const idx = prev.findIndex((e) => e.step === event.step);
        if (idx === -1) return [...prev, event];
        const next = [...prev];
        next[idx] = event;
        return next;
      });
    });
    onOpen(quote);
    onToast("Position opened");
    setExecuting(false);
    setFlow([]);
  }, [account, onOpen, onToast, quote]);

  const isLong = tab === "buy";

  return (
    <div className={cn(tradePanel, "flex h-full flex-col")}>
      <div className={cn("flex items-center justify-between border-b px-4 py-3", tradeDivider)}>
        <span className="text-sm font-medium text-white">Swap</span>
        {account ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="font-mono text-xs text-[#787B87] hover:text-[#A0A3AD]"
          >
            {truncateAddress(account.address)}
          </button>
        ) : (
          <span className={tradeLabel}>Not connected</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className={cn(tradePanelInset, "grid grid-cols-2 overflow-hidden")}>
          <button
            type="button"
            onClick={() => {
              setTab("buy");
              setSide("long");
            }}
            className={tradeSegmentTab(isLong, "long")}
          >
            Long
          </button>
          <button
            type="button"
            onClick={() => setTab("sell")}
            className={tradeSegmentTab(!isLong, "short")}
          >
            Short
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={tradeLabel}>Available</span>
          <span className="font-mono tabular-nums text-[#EAECEF]">
            {DEMO_BALANCE.toLocaleString()} {payAsset}
          </span>
        </div>

        <div className="space-y-2">
          <label className={tradeLabel}>Pay</label>
          <div className={cn(tradePanelInset, "flex overflow-hidden")}>
            <select
              value={payAsset}
              onChange={(e) => setPayAsset(e.target.value as (typeof PAY_ASSETS)[number])}
              className="border-r border-white/[0.06] bg-transparent px-3 py-3 text-sm text-[#EAECEF] outline-none"
            >
              {PAY_ASSETS.map((a) => (
                <option key={a} value={a} className="bg-[#0B0D12]">
                  {a}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={DEMO_BALANCE}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-right font-mono text-lg text-white outline-none"
            />
          </div>
          <div className="flex gap-1">
            {[25, 50, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => fillPct(pct)}
                className={tradeLeverageBtn(false)}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className={tradeLabel}>Leverage</label>
          <div className="flex flex-wrap gap-1">
            {LEVERAGE_OPTIONS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLeverage(lv)}
                className={tradeLeverageBtn(leverage === lv)}
              >
                {lv}x
              </button>
            ))}
          </div>
        </div>

        {leverage > 1 && (
          <div className={cn(tradePanelInset, "grid grid-cols-2 overflow-hidden")}>
            {(["long", "short"] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={tradeSegmentTab(side === s, s === "long" ? "long" : "short")}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div className={cn(tradePanelInset, "space-y-1 px-3 py-2.5")}>
          <div className="flex justify-between text-xs">
            <span className={tradeLabel}>Receive</span>
            <span className="font-mono tabular-nums text-[#EAECEF]">
              ~{quote.jlpOut.toFixed(4)} JLP
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#787B87]">Entry price</span>
            <span className="font-mono tabular-nums text-[#787B87]">
              ${quote.entryPrice.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#787B87]">Fees</span>
            <span className="font-mono tabular-nums text-[#787B87]">
              {(MINT_FEE_PCT * 100).toFixed(2)}% · ${quote.feeUsd.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#787B87]">Slippage</span>
            <span className="font-mono tabular-nums text-[#787B87]">
              {(SLIPPAGE_PCT * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#787B87]">Price impact</span>
            <span className="font-mono tabular-nums text-[#787B87]">
              {quote.priceImpactPct.toFixed(3)}%
            </span>
          </div>
        </div>

        {!account ? (
          <ConnectWalletButton onConnect={onConnect} />
        ) : (
          <button
            type="button"
            disabled={executing || amount <= 0 || tab === "sell"}
            onClick={handleSubmit}
            className={cn(
              "w-full rounded py-3.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40",
              isLong ? "bg-[#0ECB81] text-white hover:opacity-90" : "bg-[#F6465D] text-white hover:opacity-90",
            )}
          >
            {executing
              ? "Processing…"
              : isLong
                ? `Long JLP`
                : `Short JLP`}
          </button>
        )}

        {flow.length > 0 && (
          <ol className={cn("space-y-2 border-t pt-3", tradeDivider)}>
            {flow.map((event) => (
              <li key={event.step} className="flex items-center gap-2 text-xs text-[#A0A3AD]">
                {event.status === "done" ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0ECB81]" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-electric-400" />
                )}
                <span>
                  {event.step === "prepareOrder" && "Preparing order…"}
                  {event.step === "signOrder" && "Signing with passkey…"}
                  {event.step === "submitOrder" && "Submitting order…"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
