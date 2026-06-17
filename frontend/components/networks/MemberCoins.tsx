"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Eye } from "lucide-react";

import { CoinModal } from "@/components/networks/CoinModal";

import { Badge } from "@/components/ui/Badge";
import { ClassificationChips } from "@/components/shared/ClassificationChips";
import type { CoinLiveData } from "@/lib/server/coin";
import { categoryBadgeTone } from "@/lib/categoryTone";
import {
  formatPct,
  formatUsdCompact,
} from "@/lib/utils";

/**
 * Member-coin cards for an Entity. Card click navigates to full profile;
 * "Quick view" opens modal with live CoinGecko + Alchemy data.
 */
export function MemberCoins({ coins }: { coins: CoinLiveData[] }) {
  const [active, setActive] = useState<CoinLiveData | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {coins.map((coin) => (
          <MemberCoinCard key={coin.slug} coin={coin} onQuickView={() => setActive(coin)} />
        ))}
      </div>

      {active && <CoinModal coin={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function changeTone(value: number | null | undefined): "positive" | "danger" | "neutral" {
  if (value === null || value === undefined) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "danger";
  return "neutral";
}

/**
 * Whether a coin has any usable live market data (price or market cap). Coins
 * that are not yet launched / not listed yet (e.g. sGHO) have none, and we label
 * them explicitly instead of rendering bare "—" placeholders.
 */
function hasMarketData(coin: CoinLiveData): boolean {
  return coin.market != null && (coin.market.currentPrice != null || coin.market.marketCap != null);
}

/** Explicit empty-state copy for a coin with no live market data. */
function missingDataLabel(coin: CoinLiveData): string {
  return coin.isLive ? "Data not available" : "Not launched yet";
}

function MemberCoinCard({
  coin,
  onQuickView,
}: {
  coin: CoinLiveData;
  onQuickView: () => void;
}) {
  const change24h = coin.market?.priceChange24h;
  const marketDataPresent = hasMarketData(coin);

  return (
    <div className="group glass flex h-full flex-col gap-3 rounded-2xl border border-ink-700/60 p-5 transition-all duration-200 hover:border-electric-500/50 hover:glow-ring">
      <div className="flex items-start justify-between gap-2">
        <Link href={coin.profilePath} className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold tracking-tight text-ink-50 transition-colors group-hover:text-electric-400">
              {coin.name}
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-electric-400" />
          </div>
          <span className="font-mono text-xs text-ink-400">{coin.symbol}</span>
        </Link>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={categoryBadgeTone(coin.category)}>{coin.category}</Badge>
          {coin.subCategory && (
            <Badge tone="neutral" className="text-[10px]">
              {coin.subCategory}
            </Badge>
          )}
        </div>
      </div>

      {coin.role && <p className="text-sm text-ink-300">{coin.role}</p>}

      <ClassificationChips
        assetSubtype={coin.assetSubtype}
        pegMechanism={coin.pegMechanism}
        size="xs"
      />

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-300">
        {marketDataPresent ? (
          <>
            <span>
              Price{" "}
              <span className="font-mono text-ink-100">
                {coin.market?.currentPrice != null
                  ? `$${coin.market.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                  : "—"}
              </span>
            </span>
            {change24h != null && (
              <Badge tone={changeTone(change24h)}>{formatPct(change24h)} 24h</Badge>
            )}
            <span>
              Mkt cap{" "}
              <span className="font-mono text-ink-100">
                {formatUsdCompact(coin.market?.marketCap ?? null)}
              </span>
            </span>
          </>
        ) : (
          <Badge tone="neutral">{missingDataLabel(coin)}</Badge>
        )}
        {coin.lendingMarket?.supplyApyPct != null && (
          <Badge tone="positive">
            {coin.lendingMarket.supplyApyPct.toFixed(2)}% supply APY
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-800/60 pt-3">
        <Link
          href={coin.profilePath}
          className="inline-flex items-center gap-1 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
        >
          Full profile
          <ArrowUpRight className="h-3 w-3" />
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onQuickView();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-ink-700/60 bg-ink-900/40 px-2 py-1 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
        >
          <Eye className="h-3 w-3" />
          Quick view
        </button>
      </div>
    </div>
  );
}
