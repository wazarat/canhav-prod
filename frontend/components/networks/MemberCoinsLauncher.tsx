"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Eye, X } from "lucide-react";

import { CoinModal } from "@/components/networks/CoinModal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { categoryBadgeTone } from "@/lib/categoryTone";
import type { CoinLiveData } from "@/lib/server/coin";
import { cn, formatPct, formatUsdCompact } from "@/lib/utils";

const PREVIEW_ROWS = 5;

function hasMarketData(coin: CoinLiveData): boolean {
  return coin.market != null && (coin.market.currentPrice != null || coin.market.marketCap != null);
}

function changeTone(value: number | null | undefined): "positive" | "danger" | "neutral" {
  if (value === null || value === undefined) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "danger";
  return "neutral";
}

function sortByMcap(coins: CoinLiveData[]): CoinLiveData[] {
  return [...coins].sort(
    (a, b) => (b.market?.marketCap ?? -1) - (a.market?.marketCap ?? -1),
  );
}

interface MemberCoinsLauncherProps {
  coins: CoinLiveData[];
  networkName: string;
}

export function MemberCoinsLauncher({ coins, networkName }: MemberCoinsLauncherProps) {
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState<CoinLiveData | null>(null);
  const sorted = useMemo(() => sortByMcap(coins), [coins]);
  const preview = sorted.slice(0, PREVIEW_ROWS);
  const remaining = sorted.length - preview.length;

  if (coins.length === 0) {
    return (
      <Card className="text-sm text-ink-300">
        Member coins are staged but not yet approved. They&apos;ll appear here (with live
        CoinGecko + Alchemy data) once approved.
      </Card>
    );
  }

  return (
    <>
      <Card id="member-coins" className="scroll-mt-24 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-ink-800/60 px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink-50">
              Coins under {networkName}
            </h3>
            <p className="mt-0.5 text-xs text-ink-400">
              Click a row for live on-chain + market data
            </p>
          </div>
          <Badge tone="neutral">{coins.length} coins</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-800/40 text-xs text-ink-400">
                <th className="px-5 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">24h</th>
                <th className="px-3 py-2 text-right font-medium">Mkt cap</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {preview.map((coin) => (
                <CoinRow key={coin.slug} coin={coin} onQuickView={() => setActive(coin)} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ink-800/60 px-5 py-3">
          {remaining > 0 ? (
            <p className="text-xs text-ink-400">+{remaining} more in full list</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
          >
            View all coins
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>

      {listOpen && (
        <CoinsListModal
          coins={sorted}
          networkName={networkName}
          onClose={() => setListOpen(false)}
          onSelect={(coin) => {
            setListOpen(false);
            setActive(coin);
          }}
        />
      )}

      {active && <CoinModal coin={active} onClose={() => setActive(null)} />}
    </>
  );
}

function CoinRow({
  coin,
  onQuickView,
}: {
  coin: CoinLiveData;
  onQuickView: () => void;
}) {
  const change24h = coin.market?.priceChange24h;
  const marketDataPresent = hasMarketData(coin);

  return (
    <tr className="group border-b border-ink-800/30 last:border-0 hover:bg-ink-900/40">
      <td className="px-5 py-2.5">
        <Link
          href={coin.profilePath}
          className="inline-flex items-center gap-1 font-mono font-medium text-ink-100 transition-colors group-hover:text-electric-400"
        >
          {coin.symbol}
          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <Badge tone={categoryBadgeTone(coin.category)} className="text-[10px]">
          {coin.category}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-ink-200">
        {marketDataPresent && coin.market?.currentPrice != null
          ? `$${coin.market.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
          : "—"}
      </td>
      <td className="px-3 py-2.5 text-right">
        {change24h != null ? (
          <Badge tone={changeTone(change24h)} className="text-[10px]">
            {formatPct(change24h)}
          </Badge>
        ) : (
          <span className="text-ink-500">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-ink-200">
        {formatUsdCompact(coin.market?.marketCap ?? null)}
      </td>
      <td className="px-3 py-2.5">
        <button
          type="button"
          onClick={onQuickView}
          aria-label={`Quick view ${coin.symbol}`}
          className="rounded-md border border-ink-700/60 p-1 text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-100"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function CoinsListModal({
  coins,
  networkName,
  onClose,
  onSelect,
}: {
  coins: CoinLiveData[];
  networkName: string;
  onClose: () => void;
  onSelect: (coin: CoinLiveData) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`All coins under ${networkName}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-ink-700/70 animate-fade-in-up">
        <div className="flex items-center justify-between gap-4 border-b border-ink-800/60 px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-50">
              Coins under {networkName}
            </h3>
            <p className="text-xs text-ink-400">{coins.length} member products</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-ink-400">
                <th className="px-4 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 text-right font-medium">Mkt cap</th>
                <th className="px-3 py-2 text-right font-medium">24h</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {coins.map((coin) => (
                <tr
                  key={coin.slug}
                  className={cn(
                    "cursor-pointer border-b border-ink-800/30 last:border-0",
                    "hover:bg-ink-900/50",
                  )}
                  onClick={() => onSelect(coin)}
                >
                  <td className="px-4 py-2.5 font-mono font-medium text-ink-100">
                    {coin.symbol}
                  </td>
                  <td className="px-3 py-2.5 text-ink-300">{coin.name}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-200">
                    {formatUsdCompact(coin.market?.marketCap ?? null)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {coin.market?.priceChange24h != null ? (
                      <Badge tone={changeTone(coin.market.priceChange24h)} className="text-[10px]">
                        {formatPct(coin.market.priceChange24h)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Eye className="h-3.5 w-3.5 text-ink-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
