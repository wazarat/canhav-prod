"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, Eye, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { DataPanel, DataRow } from "@/components/ui/DataPanel";
import type { CoinLiveData } from "@/lib/server/coin";
import { categoryBadgeTone } from "@/lib/categoryTone";
import {
  cn,
  formatNumberCompact,
  formatPct,
  formatUsdCompact,
  timeAgo,
  truncateAddress,
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

function MemberCoinCard({
  coin,
  onQuickView,
}: {
  coin: CoinLiveData;
  onQuickView: () => void;
}) {
  const change24h = coin.market?.priceChange24h;

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

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-300">
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

function CoinModal({ coin, onClose }: { coin: CoinLiveData; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const m = coin.market;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${coin.name} live data`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative z-10 max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-ink-700/70 p-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-semibold tracking-tight text-ink-50">
                {coin.name}
              </h3>
              <Badge tone="neutral" className="font-mono">
                {coin.symbol}
              </Badge>
              <Badge tone={categoryBadgeTone(coin.category)}>{coin.category}</Badge>
              {coin.subCategory && <Badge tone="neutral">{coin.subCategory}</Badge>}
            </div>
            {coin.role && <p className="text-sm text-ink-300">{coin.role}</p>}
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

        {coin.description && (
          <p className="mt-4 text-sm leading-relaxed text-ink-300">{coin.description}</p>
        )}

        <div className="mt-5 space-y-4">
          <DataPanel title="Market" badge={m ? (m.source === "curated" ? "Market data · live" : "CoinGecko · live") : "Not listed"}>
            {m ? (
              <>
                <DataRow
                  label="Price"
                  value={
                    m.currentPrice === null
                      ? "—"
                      : `$${m.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
                  }
                />
                <DataRow label="Market cap" value={formatUsdCompact(m.marketCap)} />
                <DataRow
                  label="Rank"
                  value={m.marketCapRank === null ? "—" : `#${m.marketCapRank}`}
                />
                <DataRow label="24h volume" value={formatUsdCompact(m.totalVolume)} />
                <DataRow label="Circulating" value={formatNumberCompact(m.circulatingSupply)} />
                <DataRow
                  label="24h change"
                  value={<Badge tone={changeTone(m.priceChange24h)}>{formatPct(m.priceChange24h)}</Badge>}
                />
                <DataRow
                  label="7d change"
                  value={<Badge tone={changeTone(m.priceChange7d)}>{formatPct(m.priceChange7d)}</Badge>}
                />
                <DataRow
                  label="ATH / ATL"
                  value={
                    m.ath === null && m.atl === null
                      ? "—"
                      : `$${(m.ath ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} / $${(m.atl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                  }
                />
              </>
            ) : (
              <p className="text-sm text-ink-300">
                Not listed on CoinGecko yet, so live market data isn&apos;t available.
              </p>
            )}
          </DataPanel>

          <DataPanel
            title="On-chain"
            badge={
              coin.contractAddress
                ? coin.hasAlchemy
                  ? "Alchemy · live"
                  : "Alchemy key not set"
                : "No public token"
            }
          >
            {coin.contractAddress ? (
              <>
                <DataRow
                  label="Circulating supply"
                  value={
                    <span className="font-mono">
                      {coin.onchain?.supply != null
                        ? formatNumberCompact(coin.onchain.supply)
                        : "—"}
                      {coin.onchain?.symbol ? (
                        <span className="ml-1 text-ink-300">{coin.onchain.symbol}</span>
                      ) : null}
                    </span>
                  }
                />
                <DataRow label="Decimals" value={coin.onchain?.decimals ?? "—"} />
                <DataRow
                  label={coin.links.explorerLabel}
                  value={
                    <a
                      href={coin.links.explorer ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-electric-400 hover:underline"
                    >
                      {truncateAddress(coin.contractAddress)}
                    </a>
                  }
                />
                <DataRow
                  label="Last refreshed"
                  value={coin.onchain?.updatedAt ? timeAgo(coin.onchain.updatedAt) : "—"}
                />
              </>
            ) : (
              <p className="text-sm text-ink-300">
                No public token contract is mapped for this coin yet.
              </p>
            )}
          </DataPanel>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={coin.profilePath}
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
          >
            Full profile
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <ModalLink label="Website" href={coin.links.website} />
          <ModalLink label="CoinGecko" href={coin.links.coingecko} />
          <ModalLink label={coin.links.explorerLabel} href={coin.links.explorer} />
        </div>
      </div>
    </div>
  );
}

function ModalLink({ label, href }: { label: string; href: string | null }) {
  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        href
          ? "border-ink-700 bg-ink-900/60 text-ink-200 hover:text-ink-50"
          : "pointer-events-none border-ink-800 bg-ink-900/30 text-ink-500",
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
