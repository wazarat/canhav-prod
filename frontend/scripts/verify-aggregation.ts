/**
 * Read-only verification for the multi-product aggregation added to
 * lib/server/defillama.ts (no store writes).
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/verify-aggregation.ts
 */
import {
  fetchLlamaDexVolume,
  fetchLlamaFeesRevenue,
  fetchLlamaProtocolMeta,
  fetchLlamaProtocolTvl,
  llamaProtocolsForSlug,
} from "../lib/server/defillama";

const fmt = (n: number | null | undefined) =>
  n == null ? "null" : `$${Math.round(n).toLocaleString()}`;

async function childTvl(protocol: string): Promise<number | null> {
  const data = await fetch(`https://api.llama.fi/protocol/${protocol}`, {
    headers: { "User-Agent": "canhav-research/1.0" },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const tvl = data?.tvl;
  return Array.isArray(tvl) && tvl.length ? (tvl[tvl.length - 1].totalLiquidityUSD ?? null) : null;
}

async function main() {
  console.log("=== Multi-product TVL aggregation (meta.tvlUsdLatest ≈ Σ children) ===");
  const cases: Record<string, string[]> = {
    aave: ["aave-v3", "aave-v2"],
    compound: ["compound-v3", "compound-v2"],
    uniswap: ["uniswap-v3", "uniswap-v2"],
    aerodrome: ["aerodrome-v1", "aerodrome-slipstream"],
    notional: ["notional-v2", "notional-v3"],
  };
  for (const [slug, children] of Object.entries(cases)) {
    const meta = await fetchLlamaProtocolMeta(slug);
    const parts = await Promise.all(children.map(childTvl));
    const expected = parts.reduce<number | null>(
      (acc, v) => (v == null ? acc : (acc ?? 0) + v),
      null,
    );
    const ok =
      meta?.tvlUsdLatest != null &&
      expected != null &&
      Math.abs(meta.tvlUsdLatest - expected) / expected < 0.02;
    console.log(
      `[${slug}] resolved=${JSON.stringify(llamaProtocolsForSlug(slug))} ` +
        `agg=${fmt(meta?.tvlUsdLatest)} Σchildren=${fmt(expected)} ` +
        `(${children.map((c, i) => `${c}=${fmt(parts[i])}`).join(", ")}) ${ok ? "✅" : "❌"}`,
    );
  }

  console.log("\n=== spark (parent resolves) + tvl series ===");
  const spark = await fetchLlamaProtocolMeta("spark");
  const sparkTvl = await fetchLlamaProtocolTvl("spark", 7);
  console.log(
    `[spark] mcap=${fmt(spark?.mcapUsd)} gecko=${spark?.geckoId} agg=${fmt(spark?.tvlUsdLatest)} ` +
      `tvlSeriesPoints=${sparkTvl?.points.length} latest=${fmt(sparkTvl?.points.at(-1)?.value)}`,
  );

  console.log("\n=== fees aggregation (aave v3+v2) + aevo (expect null: no adapter) ===");
  const aaveFees = await fetchLlamaFeesRevenue("aave");
  console.log(
    `[aave fees] 24h=${fmt(aaveFees?.fees24hUsd)} 30d=${fmt(aaveFees?.fees30dUsd)} rev24h=${fmt(aaveFees?.revenue24hUsd)}`,
  );
  const aevoFees = await fetchLlamaFeesRevenue("aevo");
  console.log(`[aevo fees] result=${aevoFees === null ? "null ✅ (no-api-coverage)" : "NON-NULL ❌"}`);

  console.log("\n=== DEX volume (uniswap parent aggregate) ===");
  const uniVol = await fetchLlamaDexVolume("uniswap");
  console.log(`[uniswap dex] 24h=${fmt(uniVol?.volume24hUsd)} 30d=${fmt(uniVol?.volume30dUsd)}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
