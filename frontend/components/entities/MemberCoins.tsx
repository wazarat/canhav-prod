"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ExternalLink, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { CoinLiveData } from "@/lib/server/coin";
import {
  cn,
  formatNumberCompact,
  formatPct,
  formatUsdCompact,
  timeAgo,
  truncateAddress,
} from "@/lib/utils";

/**
 * Member-coin cards for an Entity. Each card opens a modal (not a new page)
 * showing the coin's live CoinGecko + Alchemy data, which was fetched
 * server-side and passed in as serializable props.
 */
export function MemberCoins({ coins }: { coins: CoinLiveData[] }) {
  const [active, setActive] = useState<CoinLiveData | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {coins.map((coin) => (
          <button
            key={coin.slug}
            type="button"
            onClick={() => setActive(coin)}
            className="group glass flex h-full flex-col gap-3 rounded-2xl border border-ink-700/60 p-5 text-left transition-all duration-200 hover:border-electric-500/50 hover:glow-ring"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-semibold tracking-tight text-ink-50">
                    {coin.name}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-electric-400" />
                </div>
                <span className="font-mono text-xs text-ink-400">{coin.symbol}</span>
              </div>
              <Badge tone={coin.category === "Token" ? "neon" : "electric"}>
                {coin.category}
              </Badge>
            </div>
            {coin.role && <p className="text-sm text-ink-300">{coin.role}</p>}
            <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-ink-300">
              <span>
                Price{" "}
                <span className="font-mono text-ink-100">
                  {coin.market?.currentPrice != null
                    ? `$${coin.market.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                    : "—"}
                </span>
              </span>
              <span>
                Mkt cap{" "}
                <span className="font-mono text-ink-100">
                  {formatUsdCompact(coin.market?.marketCap ?? null)}
                </span>
              </span>
            </div>
            <span className="text-xs font-medium text-electric-400">View live data →</span>
          </button>
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

function CoinModal({ coin, onClose }: { coin: CoinLiveData; onClose: () => void }) {
  // Close on Escape and lock background scroll while open.
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
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-700/70 p-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl font-semibold tracking-tight text-ink-50">
                {coin.name}
              </h3>
              <Badge tone="neutral" className="font-mono">
                {coin.symbol}
              </Badge>
              <Badge tone={coin.category === "Token" ? "neon" : "electric"}>
                {coin.category}
              </Badge>
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

        {/* Market data (CoinGecko) */}
        <Section title="Market" badge={m ? "CoinGecko · live" : "Not listed"}>
          {m ? (
            <div className="divide-y divide-ink-800/60">
              <ModalRow
                label="Price"
                value={
                  m.currentPrice === null
                    ? "—"
                    : `$${m.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
                }
              />
              <ModalRow label="Market cap" value={formatUsdCompact(m.marketCap)} />
              <ModalRow
                label="Rank"
                value={m.marketCapRank === null ? "—" : `#${m.marketCapRank}`}
              />
              <ModalRow label="24h volume" value={formatUsdCompact(m.totalVolume)} />
              <ModalRow label="Circulating" value={formatNumberCompact(m.circulatingSupply)} />
              <ModalRow
                label="24h change"
                value={<Badge tone={changeTone(m.priceChange24h)}>{formatPct(m.priceChange24h)}</Badge>}
              />
              <ModalRow
                label="7d change"
                value={<Badge tone={changeTone(m.priceChange7d)}>{formatPct(m.priceChange7d)}</Badge>}
              />
              <ModalRow
                label="ATH / ATL"
                value={
                  m.ath === null && m.atl === null
                    ? "—"
                    : `$${(m.ath ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} / $${(m.atl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                }
              />
            </div>
          ) : (
            <p className="text-sm text-ink-300">
              Not listed on CoinGecko yet, so live market data (price, market cap, volume)
              isn&apos;t available.
            </p>
          )}
        </Section>

        {/* On-chain data (Alchemy) */}
        <Section
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
            <div className="divide-y divide-ink-800/60">
              <ModalRow
                label="Circulating supply"
                value={
                  <span className="font-mono">
                    {coin.onchain?.supply != null ? formatNumberCompact(coin.onchain.supply) : "—"}
                    {coin.onchain?.symbol ? (
                      <span className="ml-1 text-ink-300">{coin.onchain.symbol}</span>
                    ) : null}
                  </span>
                }
              />
              <ModalRow label="Decimals" value={coin.onchain?.decimals ?? "—"} />
              <ModalRow
                label="Arbitrum contract"
                value={
                  <a
                    href={coin.links.arbiscan ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-electric-400 hover:underline"
                  >
                    {truncateAddress(coin.contractAddress)}
                  </a>
                }
              />
              <ModalRow
                label="Last refreshed"
                value={coin.onchain?.updatedAt ? timeAgo(coin.onchain.updatedAt) : "—"}
              />
            </div>
          ) : (
            <p className="text-sm text-ink-300">
              No public Arbitrum token contract is mapped for this coin yet, so live on-chain
              supply isn&apos;t available.
            </p>
          )}
        </Section>

        {/* Links */}
        <div className="mt-5 flex flex-wrap gap-2">
          <ModalLink label="Website" href={coin.links.website} />
          <ModalLink label="CoinGecko" href={coin.links.coingecko} />
          <ModalLink label="Arbiscan" href={coin.links.arbiscan} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold tracking-tight text-ink-100">{title}</h4>
        <Badge tone={badge.includes("live") ? "signal" : "neutral"}>{badge}</Badge>
      </div>
      {children}
    </div>
  );
}

function ModalRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-right text-sm font-medium text-ink-100">{value}</span>
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
