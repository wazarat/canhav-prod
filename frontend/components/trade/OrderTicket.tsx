"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { ConnectWalletButton } from "@/components/trade/ConnectWalletButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { simulateOrderFlow, type OrderFlowEvent } from "@/lib/demo/tradeDemo";
import { quoteBuy } from "@/lib/trade/engine";
import { MINT_FEE_PCT, SLIPPAGE_PCT } from "@/lib/trade/jlpMarket";
import type { Quote, Side, SmartAccount } from "@/lib/trade/types";
import { cn, truncateAddress } from "@/lib/utils";

const DEMO_BALANCE = 10_000;
const PAY_ASSETS = ["USDC", "SOL"] as const;

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
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  return (
    <Card className="sticky top-24 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Order</CardTitle>
        {account && (
          <button
            type="button"
            onClick={onDisconnect}
            className="flex items-center gap-2 text-xs text-ink-300 hover:text-ink-50"
          >
            <span className="font-mono">{truncateAddress(account.address)}</span>
            {account.gasSponsored && <Badge tone="positive">Gasless ✓</Badge>}
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-full border border-ink-800/60 bg-ink-900/40 p-1">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-electric-500/15 text-electric-400"
                : "text-ink-400 hover:text-ink-100",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-400">
        Balance: {DEMO_BALANCE.toLocaleString()} {payAsset}
      </p>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Pay
        </label>
        <div className="flex gap-2">
          <select
            value={payAsset}
            onChange={(e) => setPayAsset(e.target.value as (typeof PAY_ASSETS)[number])}
            className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
          >
            {PAY_ASSETS.map((a) => (
              <option key={a} value={a}>
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
            className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-ink-100"
          />
        </div>
        <div className="flex gap-2">
          {[25, 50, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => fillPct(pct)}
              className="rounded-full border border-ink-700 px-2.5 py-1 text-xs text-ink-300 hover:border-electric-500/40 hover:text-electric-400"
            >
              {pct === 100 ? "Max" : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Exposure · {leverage}x
          </label>
          {leverage > 1 && (
            <Badge tone="warning">Leveraged (GMX) — demo</Badge>
          )}
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-electric-500"
        />
        <div className="flex justify-between text-xs text-ink-500">
          <span>1x</span>
          <span>5x</span>
        </div>
      </div>

      {leverage > 1 && (
        <div className="flex gap-1 rounded-full border border-ink-800/60 bg-ink-900/40 p-1">
          {(["long", "short"] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition-colors",
                side === s
                  ? s === "long"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                  : "text-ink-400",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-ink-800/60 bg-ink-900/40 p-3">
        <p className="text-xs text-ink-400">Receive</p>
        <p className="font-mono text-lg text-ink-50">~{quote.jlpOut.toFixed(4)} JLP</p>
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs text-ink-400 hover:text-ink-200"
      >
        Order details
        {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {detailsOpen && (
        <dl className="space-y-2 text-xs">
          <DetailRow label="Entry price" value={`$${quote.entryPrice.toFixed(4)}`} />
          <DetailRow label="Mint fee" value={`${(MINT_FEE_PCT * 100).toFixed(2)}% ($${quote.feeUsd.toFixed(2)})`} />
          <DetailRow label="Price impact" value={`${quote.priceImpactPct.toFixed(3)}%`} />
          <DetailRow label="Slippage" value={`${(SLIPPAGE_PCT * 100).toFixed(1)}%`} />
          <DetailRow label="Network fee" value="Sponsored ✓ (ZeroDev)" />
        </dl>
      )}

      {!account ? (
        <ConnectWalletButton onConnect={onConnect} />
      ) : (
        <Button
          type="button"
          className={cn(
            "w-full",
            tab === "sell" && "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
          )}
          variant={tab === "sell" ? "outline" : "primary"}
          disabled={executing || amount <= 0 || tab === "sell"}
          onClick={handleSubmit}
        >
          {executing ? "Processing…" : tab === "buy" ? "Buy JLP" : "Sell JLP"}
        </Button>
      )}

      {flow.length > 0 && (
        <ol className="space-y-2 border-t border-ink-800/60 pt-3">
          {flow.map((event) => (
            <li key={event.step} className="flex items-center gap-2 text-sm text-ink-200">
              {event.status === "done" ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-electric-400" />
              )}
              <span className="font-mono text-xs">
                {event.step === "prepareOrder" && "Preparing order…"}
                {event.step === "signOrder" && "Signing with passkey…"}
                {event.step === "submitOrder" && "Submitting (Gelato relay)…"}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-ink-300">
        Demo — no real funds move. Simulates a GMX + ZeroDev integration on Arbitrum Sepolia.
      </p>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-400">{label}</dt>
      <dd className="font-mono text-ink-200">{value}</dd>
    </div>
  );
}
