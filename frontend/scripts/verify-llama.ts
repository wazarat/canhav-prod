/**
 * Read-only verification for lib/server/defillama.ts (no store writes).
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/verify-llama.ts
 */
import {
  fetchLlamaProtocolTvl,
  fetchLlamaStablecoin,
  fetchLlamaStablecoinCharts,
} from "../lib/server/defillama";

async function main() {
  // 1. Monerium EURe — the headline recovery case (no Alchemy/CoinGecko supply).
  const monerium = await fetchLlamaStablecoin("monerium");
  console.log("[monerium] asset:", {
    symbol: monerium?.symbol,
    pegType: monerium?.pegType,
    pegMechanism: monerium?.pegMechanism,
    priceUsd: monerium?.priceUsd,
    totalCirculating: monerium?.totalCirculating,
    chains: monerium?.chainCirculating.slice(0, 4),
    audits: monerium?.auditLinks.length,
  });
  const moneriumCharts = await fetchLlamaStablecoinCharts("monerium", 90);
  console.log("[monerium] charts:", {
    supplyPoints: moneriumCharts?.supply.length,
    lastSupply: moneriumCharts?.supply.at(-1),
    pegPricePoints: moneriumCharts?.pegPrice.length, // expect 0 (EUR peg)
  });

  // 2. Pleasing USD (usdpm) — the other unresolvable slug.
  const pusdCharts = await fetchLlamaStablecoinCharts("usdpm", 90);
  console.log("[usdpm] charts:", {
    supplyPoints: pusdCharts?.supply.length,
    pegPricePoints: pusdCharts?.pegPrice.length,
    lastPeg: pusdCharts?.pegPrice.at(-1),
  });

  // 3. USD-pegged peg series (ethena USDe).
  const usdeCharts = await fetchLlamaStablecoinCharts("ethena", 90);
  console.log("[ethena] charts:", {
    pegPricePoints: usdeCharts?.pegPrice.length,
    lastPeg: usdeCharts?.pegPrice.at(-1),
  });

  // 4. RWA protocol TVL (centrifuge + dinari + estate-protocol).
  for (const slug of ["centrifuge", "dinari", "estate-protocol", "pgold"]) {
    const tvl = await fetchLlamaProtocolTvl(slug, 90);
    console.log(`[${slug}] tvl:`, {
      scope: tvl?.scope,
      points: tvl?.points.length,
      latest: tvl?.points.at(-1),
      chains: tvl?.chainTvls.slice(0, 3),
    });
  }

  // 5. Unmapped slug fails soft.
  const stably = await fetchLlamaStablecoin("stably");
  console.log("[stably] asset (expect null):", stably);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
