import { fetchReserveRatesForSlug } from "@/lib/server/aave";
import { resolveCoin } from "@/lib/server/coingecko";
import type { RailAsset } from "./railDefs";
import { CardRailsPanel, type RailLiveInputs } from "./CardRailsPanel";

/**
 * Full-width Card Rails section for AAVE and ETH desks, rendered below the
 * desk grid so the guardrail cards and the historical backtest sit side by
 * side. Owns the live desk readings: the max-utilization Aave reserve (those
 * reserves are the ETH dependency markets, so they apply to both desks) and
 * the desk token's market data. Every read fails soft to null so the rails
 * and backtest work fully offline.
 */
export async function CardRailsSection({
  asset,
  agentId,
  isOwner = false,
}: {
  asset: RailAsset;
  /** When set with isOwner, tripping rails can file real trade proposals. */
  agentId?: string;
  isOwner?: boolean;
}) {
  const [reserves, market] = await Promise.all([
    Promise.all(["aweth", "ausdc", "ausdt", "gho"].map(fetchReserveRatesForSlug)).catch(
      () => null,
    ),
    resolveCoin(asset === "ETH" ? "ethereum" : "aave", 60).catch(() => null),
  ]);

  const hottest = (reserves ?? [])
    .filter(
      (r): r is NonNullable<typeof r> & { utilizationPct: number } =>
        r != null && r.utilizationPct != null,
    )
    .sort((a, b) => b.utilizationPct - a.utilizationPct)[0];

  const live: RailLiveInputs = {
    utilizationPct: hottest?.utilizationPct ?? null,
    utilizationSymbol: hottest?.underlyingSymbol ?? null,
    change24hPct: market?.change24hPct ?? null,
    priceUsd: market?.priceUsd ?? null,
  };

  return (
    <div className="card-surface glow-ring rounded-2xl border border-ink-800/60 p-5">
      <CardRailsPanel asset={asset} live={live} agentId={isOwner ? agentId : undefined} />
    </div>
  );
}
