"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ClassificationChips } from "@/components/shared/ClassificationChips";
import { CoinTypeBadge } from "@/components/shared/CoinTypeBadge";
import { ReceiptTypeBadge } from "@/components/shared/ReceiptTypeBadge";
import { DataPanel, DataRow } from "@/components/ui/DataPanel";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
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

function changeTone(value: number | null | undefined): "positive" | "danger" | "neutral" {
  if (value === null || value === undefined) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "danger";
  return "neutral";
}

export function CoinModal({ coin, onClose }: { coin: CoinLiveData; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useModalBehavior({ onClose, containerRef, initialFocusRef: closeButtonRef });

  const m = coin.market;
  const isReceipt = coin.category === "Receipt";
  const primaryChain = coin.chains[0] ?? "Ethereum";
  // PT/YT family placeholders are priced from the Pendle API, not CoinGecko
  // (see PENDLE_PTYT_SLUGS in lib/server/coin.ts).
  const marketSourceLabel = coin.slug.startsWith("pendle-ptyt")
    ? "Pendle API · live (5 min cache)"
    : "CoinGecko · live (5 min cache)";
  // apr already folds in yieldMechanics/lendingMarket server-side; when the
  // Aave lending panel renders, its Supply APY is the same quantity, so the
  // Yield panel suppresses its own APY row to keep every quantity single-source.
  const currentApy = coin.lendingMarket ? null : (coin.apr ?? null);
  const showYieldPanel =
    currentApy != null || coin.yieldMechanics != null || coin.underlyingTvlUsd != null;
  const showPegPanel =
    coin.pegDeviation != null ||
    coin.exchangeRateVsBase != null ||
    (coin.referencePrice != null && !isReceipt);
  const showOnchainPanel =
    coin.contractAddress != null || coin.onchain != null || !isReceipt;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass relative z-10 max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-ink-700/70 p-6 animate-fade-in-up"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="coin-modal-title"
                className="font-display text-xl font-semibold tracking-tight text-ink-50"
              >
                {coin.name}
              </h3>
              <Badge tone="neutral" className="font-mono">
                {coin.symbol}
              </Badge>
              <Badge tone={categoryBadgeTone(coin.category)}>{coin.category}</Badge>
              {coin.coinType && !isReceipt && <CoinTypeBadge coinType={coin.coinType} />}
              <ReceiptTypeBadge receiptType={coin.receiptType} />
              {/* For receipts subCategory carries the raw ReceiptType enum; the
                  badge above already renders its human label. */}
              {coin.subCategory && !coin.receiptType && (
                <Badge tone="neutral">{coin.subCategory}</Badge>
              )}
            </div>
            {coin.chains.length > 0 && (
              <p className="text-xs text-ink-400">{coin.chains.join(", ")}</p>
            )}
            {coin.role && <p className="text-sm text-ink-300">{coin.role}</p>}
            <ClassificationChips
              assetSubtype={coin.assetSubtype}
              pegMechanism={coin.pegMechanism}
            />
          </div>
          <button
            ref={closeButtonRef}
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
          {(m || !isReceipt) && (
            <DataPanel
              title="Price & market"
              badge={
                m ? marketSourceLabel : coin.isLive ? "Data not available" : "Not launched"
              }
            >
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
                  <DataRow
                    label="Circulating supply"
                    source="CoinGecko"
                    value={formatNumberCompact(m.circulatingSupply)}
                  />
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
                  {coin.isLive
                    ? "Not listed on CoinGecko yet, so live market data isn't available."
                    : "This coin hasn't launched yet, so there's no market data to show."}
                </p>
              )}
            </DataPanel>
          )}

          {showOnchainPanel && (
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
                  label={`Total supply (${primaryChain})`}
                  source="Alchemy"
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
                {coin.deployments.length > 1 && (
                  <p className="py-1 text-xs text-ink-500">
                    Primary deployment only; other chains not included.
                  </p>
                )}
                {coin.circulatingSupplyUsd != null && (
                  <DataRow
                    label="Supply value (USD)"
                    source="Derived"
                    value={formatUsdCompact(coin.circulatingSupplyUsd)}
                  />
                )}
                {!isReceipt && coin.tvlUsd != null && (
                  <DataRow
                    label={coin.category === "RWA" ? "TVL / AUM" : "TVL"}
                    source="Curated"
                    value={formatUsdCompact(coin.tvlUsd)}
                  />
                )}
                <DataRow label="Decimals" value={coin.onchain?.decimals ?? "—"} />
                <DataRow
                  label={coin.links.explorerLabel}
                  value={
                    coin.contractAddress ? (
                      <a
                        href={coin.links.explorer ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-electric-400 hover:underline"
                      >
                        {truncateAddress(coin.contractAddress)}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                {coin.deployments.length > 1 && (
                  <div className="space-y-2 border-t border-ink-800/60 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      Deployments
                    </p>
                    {coin.deployments.map((dep) => (
                      <DataRow
                        key={`${dep.chain}-${dep.address}`}
                        label={
                          dep.label ? `${dep.chain} (${dep.label})` : dep.chain
                        }
                        value={
                          <a
                            href={dep.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-electric-400 hover:underline"
                          >
                            {truncateAddress(dep.address)}
                          </a>
                        }
                      />
                    ))}
                  </div>
                )}
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
          )}

          {showYieldPanel && (
            <DataPanel title="Yield" badge={coin.yieldMechanics?.dataSource ?? "Curated"}>
              {currentApy != null && (
                <DataRow label="Current APY" value={`${currentApy.toFixed(2)}%`} />
              )}
              {coin.yieldMechanics?.apy7dPct != null && (
                <DataRow label="7d APY" value={`${coin.yieldMechanics.apy7dPct.toFixed(2)}%`} />
              )}
              {coin.yieldMechanics?.apy30dPct != null && (
                <DataRow label="30d APY" value={`${coin.yieldMechanics.apy30dPct.toFixed(2)}%`} />
              )}
              {coin.yieldMechanics?.yieldSource && (
                <DataRow label="Yield source" value={coin.yieldMechanics.yieldSource} />
              )}
              {coin.yieldMechanics?.payoutAsset && (
                <DataRow label="Payout asset" value={coin.yieldMechanics.payoutAsset} />
              )}
              {coin.yieldMechanics != null && (
                <DataRow
                  label="Auto-compounding"
                  value={coin.yieldMechanics.isAutoCompounding ? "Yes" : "No"}
                />
              )}
              {coin.yieldMechanics != null && coin.yieldMechanics.feeShareToHoldersPct > 0 && (
                <DataRow
                  label="Fee share to holders"
                  value={`${coin.yieldMechanics.feeShareToHoldersPct.toFixed(0)}%`}
                />
              )}
              {coin.yieldMechanics?.emissionsBased && (
                <DataRow label="Emissions-based" value="Yes" />
              )}
              {coin.underlyingTvlUsd != null && (
                <DataRow
                  label="Underlying TVL"
                  source="Curated"
                  value={formatUsdCompact(coin.underlyingTvlUsd)}
                />
              )}
            </DataPanel>
          )}

          {coin.lendingMarket && (
            <DataPanel title="Aave V3 lending" badge="On-chain · live">
              <DataRow
                label="Supply APY"
                value={
                  coin.lendingMarket.supplyApyPct != null
                    ? `${coin.lendingMarket.supplyApyPct.toFixed(2)}%`
                    : "—"
                }
              />
              <DataRow
                label="Borrow APY (variable)"
                value={
                  coin.lendingMarket.variableBorrowApyPct != null
                    ? `${coin.lendingMarket.variableBorrowApyPct.toFixed(2)}%`
                    : "—"
                }
              />
              <DataRow
                label="Utilization"
                value={
                  coin.lendingMarket.utilizationPct != null
                    ? `${coin.lendingMarket.utilizationPct.toFixed(2)}%`
                    : "—"
                }
              />
            </DataPanel>
          )}

          {showPegPanel && (
            <DataPanel title="Peg & exchange rate" badge="Reference">
              {coin.pegDeviation != null && (
                <DataRow
                  label="Peg deviation"
                  source="Curated"
                  value={`${(coin.pegDeviation * 100).toFixed(2)} bps`}
                />
              )}
              {coin.exchangeRateVsBase != null && (
                <DataRow
                  label="Exchange rate vs base"
                  value={coin.exchangeRateVsBase.toFixed(4)}
                />
              )}
              {coin.referencePrice != null && !isReceipt && (
                <DataRow
                  label={coin.referencePriceLabel ?? "Underlying ref. price"}
                  source="CoinGecko"
                  value={`$${coin.referencePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
                />
              )}
            </DataPanel>
          )}
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
