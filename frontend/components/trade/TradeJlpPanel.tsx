"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import {
  createDemoSmartAccount,
  quoteReplication,
  sepoliaExplorerTxHash,
  simulateOrderFlow,
  type DemoSmartAccount,
  type OrderFlowEvent,
  type ReplicationQuote,
} from "@/lib/demo/tradeDemo";
import type { TradeConfig } from "@/lib/types";
import { formatUsdCompact, truncateAddress } from "@/lib/utils";

interface TradeJlpPanelProps {
  tradeable: TradeConfig;
}

const LIVE_TRADE = process.env.NEXT_PUBLIC_LIVE_TRADE === "true";

export function TradeJlpPanel({ tradeable }: TradeJlpPanelProps) {
  const [account, setAccount] = useState<DemoSmartAccount | null>(null);
  const [usdAmount, setUsdAmount] = useState(1000);
  const [flow, setFlow] = useState<OrderFlowEvent[]>([]);
  const [executing, setExecuting] = useState(false);
  const [completed, setCompleted] = useState<ReplicationQuote | null>(null);

  const quote = useMemo(
    () => quoteReplication(usdAmount, tradeable.replicationBasket),
    [usdAmount, tradeable.replicationBasket],
  );

  const connect = useCallback(() => {
    setAccount(createDemoSmartAccount());
  }, []);

  const execute = useCallback(async () => {
    setExecuting(true);
    setCompleted(null);
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
    setCompleted(quote);
    setExecuting(false);
  }, [quote]);

  if (LIVE_TRADE) {
    return (
      <Card className="space-y-2">
        <CardTitle>Replicate JLP exposure on Arbitrum</CardTitle>
        <CardDescription>
          Live trading via GMX SDK + ZeroDev Kernel on Arbitrum Sepolia is coming soon.
        </CardDescription>
      </Card>
    );
  }

  if (tradeable.mode !== "demo" && tradeable.mode !== "live") return null;

  return (
    <Card id="trade-replicate" className="scroll-mt-24 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Replicate JLP exposure on Arbitrum</CardTitle>
          <Badge tone="signal">Arbitrum Sepolia · Gas-sponsored</Badge>
        </div>
        <CardDescription className="max-w-2xl leading-relaxed">
          JLP is a Solana-native token and is not tradable on GMX. This flow mirrors
          JLP&apos;s volatile basket (SOL/ETH/BTC) via GMX perps on Arbitrum Sepolia,
          settled through a ZeroDev smart account with passkey auth. ~36% stable weight
          is held as USDC collateral, not a GMX position.
        </CardDescription>
      </div>

      <div className="space-y-3 rounded-xl border border-ink-800/60 bg-ink-900/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Step 1 — Connect
        </p>
        {!account ? (
          <button
            type="button"
            onClick={connect}
            className="rounded-lg border border-electric-500/40 bg-electric-500/10 px-4 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
          >
            Sign in with passkey (ZeroDev)
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono text-ink-100">{truncateAddress(account.address)}</span>
            {account.gasSponsored && <Badge tone="positive">Gasless ✓</Badge>}
            {account.deployed && <Badge tone="neutral">Kernel deployed</Badge>}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-ink-800/60 bg-ink-900/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Step 2 — Size
        </p>
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-ink-300">USD amount</span>
          <input
            type="number"
            min={100}
            step={100}
            value={usdAmount}
            onChange={(e) => setUsdAmount(Number(e.target.value) || 0)}
            className="w-32 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 font-mono text-ink-100"
          />
        </label>
        <TableShell>
          <Table>
            <THead>
              <TR>
                <TH>Market</TH>
                <TH className="text-right">Weight</TH>
                <TH className="text-right">Size</TH>
                <TH className="text-right">Est. price</TH>
                <TH className="text-right">Fee</TH>
              </TR>
            </THead>
            <TBody>
              {quote.legs.map((leg) => (
                <TR key={leg.gmxMarket}>
                  <TD className="font-mono text-sm">{leg.gmxMarket}</TD>
                  <TD className="text-right">{leg.weightPct}%</TD>
                  <TD className="text-right">{formatUsdCompact(leg.usdSize)}</TD>
                  <TD className="text-right">${leg.estPrice.toLocaleString()}</TD>
                  <TD className="text-right">{formatUsdCompact(leg.estFeeUsd)}</TD>
                </TR>
              ))}
              <TR>
                <TD colSpan={2} className="text-ink-400">
                  USDC collateral (stable slice)
                </TD>
                <TD className="text-right">{formatUsdCompact(quote.stableCollateralUsd)}</TD>
                <TD colSpan={2} />
              </TR>
            </TBody>
          </Table>
        </TableShell>
      </div>

      <div className="space-y-3 rounded-xl border border-ink-800/60 bg-ink-900/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Step 3 — Execute
        </p>
        <button
          type="button"
          disabled={!account || executing || usdAmount < 100}
          onClick={execute}
          className="rounded-lg border border-signal-400/40 bg-signal-400/10 px-4 py-2 text-sm font-medium text-signal-400 transition-colors hover:bg-signal-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {executing ? "Opening positions…" : "Open positions"}
        </button>

        {flow.length > 0 && (
          <ol className="space-y-2">
            {flow.map((event) => (
              <li key={event.step} className="flex items-center gap-2 text-sm text-ink-200">
                {event.status === "done" ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-electric-400" />
                )}
                <span className="font-mono text-xs">{event.label}</span>
              </li>
            ))}
          </ol>
        )}

        {completed && (
          <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <p className="font-medium text-emerald-300">Positions opened</p>
            <a
              href={sepoliaExplorerTxHash(completed.expressTxHash)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-electric-400 hover:underline"
            >
              {truncateAddress(completed.expressTxHash)}
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
