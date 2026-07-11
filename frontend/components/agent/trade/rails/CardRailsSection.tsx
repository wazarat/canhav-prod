import { fetchReserveRatesForSlug } from "@/lib/server/aave";
import { resolveCoin } from "@/lib/server/coingecko";
import { CardRailsPanel, type RailLiveInputs } from "./CardRailsPanel";

/**
 * Full-width Card Rails section for AAVE desks, rendered below the desk grid
 * so the guardrail cards and the historical backtest sit side by side. Owns
 * the live desk readings (max-utilization Aave reserve + AAVE market data);
 * every read fails soft to null so the rails and backtest work fully offline.
 */
export async function CardRailsSection() {
  const [reserves, market] = await Promise.all([
    Promise.all(["aweth", "ausdc", "ausdt", "gho"].map(fetchReserveRatesForSlug)).catch(
      () => null,
    ),
    resolveCoin("aave", 60).catch(() => null),
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
      <CardRailsPanel live={live} />
    </div>
  );
}
