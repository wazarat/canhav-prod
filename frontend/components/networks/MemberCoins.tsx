"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Eye } from "lucide-react";

import { CoinModal } from "@/components/networks/CoinModal";
import { CoinTypeBadge } from "@/components/shared/CoinTypeBadge";
import { ReceiptTypeBadge } from "@/components/shared/ReceiptTypeBadge";

import { Badge } from "@/components/ui/Badge";
import { ClassificationChips } from "@/components/shared/ClassificationChips";
import type { CoinLiveData } from "@/lib/server/coin";
import { categoryBadgeTone } from "@/lib/categoryTone";
import {
  formatPct,
  formatUsdCompact,
} from "@/lib/utils";

function splitCoins(coins: CoinLiveData[]) {
  const primary = coins.filter((c) => c.category !== "Receipt");
  const receipts = coins.filter((c) => c.category === "Receipt");
  return { primary, receipts };
}

/**
 * Member-coin cards for an Entity — split into primary coins and receipt tokens.
 */
export function MemberCoins({ coins }: { coins: CoinLiveData[] }) {
  const [active, setActive] = useState<CoinLiveData | null>(null);
  const { primary, receipts } = splitCoins(coins);

  return (
    <div className="space-y-8">
      {primary.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-ink-50">Coins</h3>
          <CoinGrid coins={primary} onQuickView={setActive} variant="coin" />
        </section>
      )}
      {receipts.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-ink-50">Receipt Tokens</h3>
          <CoinGrid coins={receipts} onQuickView={setActive} variant="receipt" />
        </section>
      )}
      {active && <CoinModal coin={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function CoinGrid({
  coins,
  onQuickView,
  variant,
}: {
  coins: CoinLiveData[];
  onQuickView: (c: CoinLiveData) => void;
  variant: "coin" | "receipt";
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {coins.map((coin) => (
        <MemberCoinCard
          key={coin.slug}
          coin={coin}
          onQuickView={() => onQuickView(coin)}
          variant={variant}
        />
      ))}
    </div>
  );
}

function changeTone(value: number | null | undefined): "positive" | "danger" | "neutral" {
  if (value === null || value === undefined) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "danger";
  return "neutral";
}

function hasSpotMarketData(coin: CoinLiveData): boolean {
  return (
    coin.market != null &&
    (coin.market.currentPrice != null || coin.market.marketCap != null)
  );
}

function supplyApyPct(coin: CoinLiveData): number | null {
  if (coin.lendingMarket?.supplyApyPct != null) return coin.lendingMarket.supplyApyPct;
  if (coin.yieldMechanics?.currentApyPct != null) return coin.yieldMechanics.currentApyPct;
  return null;
}

function hasSupplyMetric(coin: CoinLiveData): boolean {
  return (
    coin.circulatingSupplyUsd != null ||
    (coin.onchain?.supply != null && coin.onchain.supply > 0)
  );
}

function hasTvlMetric(coin: CoinLiveData): boolean {
  return coin.tvlUsd != null && coin.tvlUsd > 0;
}

/** True when the card can show price/mcap, yield, ref price, supply, or TVL. */
function hasCoinMetrics(coin: CoinLiveData): boolean {
  return (
    hasSpotMarketData(coin) ||
    supplyApyPct(coin) != null ||
    coin.referencePrice != null ||
    hasSupplyMetric(coin) ||
    hasTvlMetric(coin)
  );
}

/** Explicit empty-state copy for a coin with no live market data. */
function missingDataLabel(coin: CoinLiveData): string {
  return coin.isLive ? "Data not available" : "Not launched yet";
}

function MemberCoinCard({
  coin,
  onQuickView,
  variant = "coin",
}: {
  coin: CoinLiveData;
  onQuickView: () => void;
  variant?: "coin" | "receipt";
}) {
  const change24h = coin.market?.priceChange24h;
  const metricsPresent = hasCoinMetrics(coin);
  const apy = supplyApyPct(coin);
  const isReceipt = variant === "receipt";

  return (
    <div
      className={`group glass flex h-full flex-col gap-3 rounded-2xl border p-5 transition-all duration-200 hover:glow-ring ${
        isReceipt
          ? "border-dashed border-ink-600/70 hover:border-signal-500/50"
          : "border-ink-700/60 hover:border-electric-500/50"
      }`}
    >
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
          {coin.coinType && !isReceipt && <CoinTypeBadge coinType={coin.coinType} />}
          {coin.receiptType && isReceipt && <ReceiptTypeBadge receiptType={coin.receiptType} />}
          {coin.subCategory && !isReceipt && (
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
        {metricsPresent ? (
          <>
            {hasSpotMarketData(coin) ? (
              <>
                <span>
                  Price{" "}
                  <span className="font-mono text-ink-100">
                    {coin.market?.currentPrice != null
                      ? `$${coin.market.currentPrice.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}`
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
            ) : apy != null ? (
              <span>
                Supply APY{" "}
                <span className="font-mono text-ink-100">{apy.toFixed(2)}%</span>
              </span>
            ) : hasTvlMetric(coin) || coin.underlyingTvlUsd != null ? (
              <span>
                {isReceipt ? "Underlying " : ""}TVL{" "}
                <span className="font-mono text-ink-100">
                  {formatUsdCompact(coin.underlyingTvlUsd ?? coin.tvlUsd)}
                </span>
              </span>
            ) : hasSupplyMetric(coin) ? (
              <span>
                Supply{" "}
                <span className="font-mono text-ink-100">
                  {formatUsdCompact(coin.circulatingSupplyUsd)}
                </span>
              </span>
            ) : null}
            {coin.pegDeviation != null && (
              <span>
                Peg dev{" "}
                <span className="font-mono text-ink-100">
                  {(coin.pegDeviation * 100).toFixed(2)} bps
                </span>
              </span>
            )}
            {coin.exchangeRateVsBase != null && (
              <span>
                Rate{" "}
                <span className="font-mono text-ink-100">
                  {coin.exchangeRateVsBase.toFixed(4)}
                </span>
              </span>
            )}
            {coin.referencePrice != null && coin.referencePriceLabel && (
              <span>
                {coin.referencePriceLabel}{" "}
                <span className="font-mono text-ink-100">
                  ${coin.referencePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
              </span>
            )}
          </>
        ) : (
          <Badge tone="neutral">{missingDataLabel(coin)}</Badge>
        )}
        {apy != null && hasSpotMarketData(coin) && (
          <Badge tone="positive">{apy.toFixed(2)}% supply APY</Badge>
        )}
        {apy != null && !hasSpotMarketData(coin) && coin.referencePrice != null && (
          <Badge tone="positive">{apy.toFixed(2)}% APY</Badge>
        )}
        {hasSupplyMetric(coin) && hasSpotMarketData(coin) && (
          <span>
            Supply{" "}
            <span className="font-mono text-ink-100">
              {formatUsdCompact(coin.circulatingSupplyUsd)}
            </span>
          </span>
        )}
        {hasTvlMetric(coin) && hasSpotMarketData(coin) && (
          <span>
            TVL{" "}
            <span className="font-mono text-ink-100">
              {formatUsdCompact(coin.tvlUsd)}
            </span>
          </span>
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
