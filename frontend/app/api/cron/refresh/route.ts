import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { fetchReserveRatesForSlug, hasAave, isAaveReserveSlug } from "@/lib/server/aave";
import { fetchTotalSupply, fetchTotalValueLocked } from "@/lib/server/alchemy";
import {
  resolveForSlug,
  coinIdForSlug,
  fetchMarketChart,
  COINGECKO_IDS,
  type TokenResolution,
} from "@/lib/server/coingecko";
import {
  fetchLlamaProtocolTvl,
  fetchLlamaStablecoin,
  fetchLlamaStablecoinCharts,
} from "@/lib/server/defillama";
import { hasUpstash, putItem, readAllItemsFromRedis } from "@/lib/server/redis";
import { rwaTokenForSlug } from "@/lib/server/rwaRegistry";
import { pegVsCurrency } from "@/lib/server/series";
import type { StablecoinProfile } from "@/lib/types";

/**
 * Live-metrics refresh — Vercel Cron entrypoint (replaces the Render job).
 *
 * TS port of `backend/scripts/refresh_live.py`. For each protocol it resolves the
 * Arbitrum contract address + USD price via CoinGecko, then reads on-chain
 * supply via Alchemy (stablecoins -> TotalSupply; RWAs -> TVL proxy), and writes
 * the result back to the Upstash store.
 *
 * A second, keyless DeFi Llama pass then fills what CoinGecko/Alchemy can't:
 *   - HistoricalPegData (peg-price series; previously always empty)
 *   - HistoricalTvlData (protocol TVL series, Arbitrum slice preferred)
 *   - TotalSupply / TotalValueLocked fallbacks for unlisted coins
 *     (e.g. Monerium EURe, Pleasing USD)
 *   - ChainDistribution + IssuanceMeta (peg mechanism, mint/redeem, audits)
 *
 * Scheduled daily by `vercel.json` crons. Vercel attaches
 * `Authorization: Bearer ${CRON_SECRET}` to cron invocations; we require it so
 * the endpoint can't be triggered anonymously.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CATEGORY_STABLECOIN = "Stablecoin";
const CATEGORY_RWA = "RWA";
const CATEGORY_TOKEN = "Token";
const COINGECKO_DELAY_MS = 1_500; // free-tier etiquette between lookups
const HISTORY_DAYS = 90; // stored peg/TVL history window

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// Member coins whose live yield comes from an Aave V3 reserve. aTokens
// (aUSDC/aUSDT/aWETH) also get a live YieldMechanics so the existing token UI
// lights up; GHO (a stablecoin) surfaces rates via its LendingMarket card.
const AAVE_ATOKEN_SLUGS = new Set(["ausdc", "ausdt", "aweth"]);

/** Build a live TokenMarket block from a CoinGecko resolution (no extra call). */
function buildTokenMarket(r: TokenResolution) {
  const sourced = (value: number | null) => ({
    value,
    dataSource: "live" as const,
    sourceLabel: "CoinGecko",
    updatedAt: nowIso(),
  });
  return {
    priceUsd: sourced(r.priceUsd),
    marketCapUsd: sourced(r.marketCapUsd),
    volume24hUsd: sourced(r.volume24hUsd),
    change24hPct: sourced(r.change24hPct),
    fdvUsd: sourced(r.fdvUsd),
    circulatingSupply: sourced(r.circulatingSupply),
    totalSupply: sourced(r.totalSupplyUnits),
    maxSupply: sourced(r.maxSupply),
  };
}

/**
 * DeFi Llama enrichment for a stablecoin item. Runs whether or not an Arbitrum
 * address resolved (this is the recovery path for unlisted coins). Writes:
 * peg history, cross-chain distribution, issuance metadata, and a circulating
 * supply fallback when Alchemy produced nothing.
 */
async function refreshStablecoinExtras(item: Record<string, any>, slug: string): Promise<boolean> {
  let mutated = false;

  const asset = await fetchLlamaStablecoin(slug);
  if (asset) {
    if (asset.chainCirculating.length > 0) {
      item.ChainDistribution = {
        chains: asset.chainCirculating.map((c) => ({ chain: c.chain, value: c.circulating })),
        unit: "supply",
        source: "defillama",
        updatedAt: nowIso(),
      };
      mutated = true;
    }
    if (asset.pegMechanism || asset.mintRedeemDescription || asset.auditLinks.length > 0) {
      item.IssuanceMeta = {
        pegMechanism: asset.pegMechanism,
        mintRedeemDescription: asset.mintRedeemDescription,
        auditLinks: asset.auditLinks,
        source: "defillama",
        updatedAt: nowIso(),
      };
      mutated = true;
    }
    // Supply fallback: only when Alchemy has never produced a value (or a
    // previous Llama fallback is being refreshed). Alchemy stays preferred.
    const current = item.TotalSupply ?? {};
    if (
      asset.totalCirculating !== null &&
      (current.value == null || current.source === "defillama")
    ) {
      item.TotalSupply = {
        value: asset.totalCirculating,
        source: "defillama",
        updatedAt: nowIso(),
      };
      mutated = true;
    }
  }

  // Peg history: Llama's USD ratio for USD-pegged coins; CoinGecko market_chart
  // in the peg currency otherwise (e.g. EURe charted vs EUR).
  const charts = await fetchLlamaStablecoinCharts(slug, HISTORY_DAYS);
  if (charts && charts.pegPrice.length >= 2) {
    item.HistoricalPegData = {
      points: charts.pegPrice.map((p) => ({ date: p.date, price: p.value })),
      source: "defillama",
      updatedAt: nowIso(),
    };
    mutated = true;
  } else {
    const coinId = coinIdForSlug(slug);
    if (coinId) {
      const vsCurrency = pegVsCurrency((item.PegTarget ?? "USD") as StablecoinProfile["pegTarget"]);
      const chart = await fetchMarketChart(coinId, HISTORY_DAYS, { vsCurrency });
      await sleep(COINGECKO_DELAY_MS);
      if (chart && chart.prices.length >= 2) {
        item.HistoricalPegData = {
          points: chart.prices,
          source: "coingecko",
          updatedAt: nowIso(),
        };
        mutated = true;
      }
    }
  }

  return mutated;
}

/**
 * DeFi Llama enrichment for an RWA item: TVL history (Arbitrum slice
 * preferred), cross-chain TVL distribution, and TVL fallbacks (Llama latest ->
 * CoinGecko market cap) when the Alchemy supply x price proxy produced nothing.
 */
async function refreshRwaExtras(
  item: Record<string, any>,
  slug: string,
  resolution: TokenResolution | null,
): Promise<boolean> {
  let mutated = false;

  const llama = await fetchLlamaProtocolTvl(slug, HISTORY_DAYS);
  if (llama && llama.points.length >= 2) {
    item.HistoricalTvlData = {
      points: llama.points,
      source: "defillama",
      updatedAt: nowIso(),
    };
    if (llama.chainTvls.length > 0) {
      item.ChainDistribution = {
        chains: llama.chainTvls.map((c) => ({ chain: c.chain, value: c.tvlUsd })),
        unit: "usd",
        source: "defillama",
        updatedAt: nowIso(),
      };
    }
    const current = item.TotalValueLocked ?? {};
    if (current.value == null || current.source === "defillama") {
      item.TotalValueLocked = {
        value: llama.points[llama.points.length - 1].value,
        source: "defillama",
        updatedAt: nowIso(),
      };
    }
    mutated = true;
  } else {
    // CoinGecko market cap as the TVL proxy for tokenized assets Llama doesn't
    // track per-protocol (e.g. PGOLD, OUSG).
    const coinId = coinIdForSlug(slug);
    if (coinId) {
      const chart = await fetchMarketChart(coinId, HISTORY_DAYS);
      await sleep(COINGECKO_DELAY_MS);
      if (chart && chart.marketCaps.length >= 2) {
        item.HistoricalTvlData = {
          points: chart.marketCaps,
          source: "coingecko",
          updatedAt: nowIso(),
        };
        const current = item.TotalValueLocked ?? {};
        if (current.value == null || current.source !== "alchemy") {
          item.TotalValueLocked = {
            value: chart.marketCaps[chart.marketCaps.length - 1].value,
            source: "coingecko",
            updatedAt: nowIso(),
          };
        }
        mutated = true;
      }
    }
  }

  // Last resort: the spot market cap from the resolution pass (single point).
  const current = item.TotalValueLocked ?? {};
  if (current.value == null && resolution && resolution.marketCapUsd !== null) {
    item.TotalValueLocked = {
      value: resolution.marketCapUsd,
      source: "coingecko",
      updatedAt: nowIso(),
    };
    mutated = true;
  }

  return mutated;
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!authorized(req)) {
    // 500 if the secret isn't configured at all; 401 otherwise.
    const status = process.env.CRON_SECRET ? 401 : 500;
    const error = status === 500 ? "CRON_SECRET is not set." : "Unauthorized.";
    return NextResponse.json({ ok: false, error }, { status });
  }
  if (!hasUpstash()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Upstash is not configured (set KV_REST_API_URL/KV_REST_API_TOKEN from the " +
          "Vercel integration, or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN).",
      },
      { status: 400 },
    );
  }

  const hasAlchemy = Boolean(process.env.ALCHEMY_API_KEY);
  const items = await readAllItemsFromRedis();

  let updated = 0;
  const touchedSlugs: { category: string; slug: string }[] = [];
  const results: { slug: string; address: string | null; metric: number | null; note: string }[] =
    [];

  for (const item of items) {
    const slug: string = item.Slug || "";
    const category: string = item.Category || "";
    const row = { slug, address: null as string | null, metric: null as number | null, note: "" };

    let address: string | null = null;
    let decimals: number | null = null;
    let priceUsd: number | null = null;
    let resolution: TokenResolution | null = null;

    // 1. CoinGecko resolution (only when a coin id is mapped — saves the round-trip).
    if (COINGECKO_IDS[slug]) {
      resolution = await resolveForSlug(slug);
      await sleep(COINGECKO_DELAY_MS);
      if (resolution) {
        address = resolution.address;
        decimals = resolution.decimals;
        priceUsd = resolution.priceUsd;
      } else {
        row.note = "CoinGecko lookup failed";
      }
    }

    // 2. RWA registry fallback: most RWA tokens aren't on CoinGecko, so pin their
    //    Arbitrum address/price here. Only used when CoinGecko yielded no address.
    if (category === CATEGORY_RWA && !address) {
      const reg = rwaTokenForSlug(slug);
      if (reg) {
        address = reg.address.toLowerCase();
        decimals = reg.decimals ?? decimals;
        const regPrice = reg.pegged ? 1 : (reg.priceUsd ?? null);
        priceUsd = regPrice ?? priceUsd;
      }
    }

    let mutated = false;

    // Persist the CoinGecko market block on token profiles so it lives in the
    // store (agent-readable) instead of only being fetched at render time.
    // Independent of address resolution: Solana-side tokens (JUP, JLP) have
    // market data but no Arbitrum contract.
    if (category === CATEGORY_TOKEN && resolution && resolution.priceUsd !== null) {
      item.Market = buildTokenMarket(resolution);
      mutated = true;
      if (row.metric === null) row.metric = resolution.priceUsd;
      if (!row.note) row.note = "market block";
    }

    if (address) {
      row.address = address;
      item.ContractAddress = address;
      mutated = true;
      if (category === CATEGORY_RWA) {
        item.VaultAddresses = [address];
      }

      if (!hasAlchemy) {
        row.note = "address persisted; ALCHEMY_API_KEY missing (metric skipped)";
      } else if (category === CATEGORY_STABLECOIN || category === CATEGORY_TOKEN) {
        // Tokens, like stablecoins, expose circulating supply. Never overwrite
        // a good value (e.g. a Llama fallback) with a failed call's null.
        const result = await fetchTotalSupply(address, decimals);
        if (result.value !== null || (item.TotalSupply?.value ?? null) === null) {
          item.TotalSupply = { ...result };
        }
        row.metric = result.value;
        row.note = result.value !== null ? "TotalSupply" : "supply call failed";
      } else if (category === CATEGORY_RWA) {
        const result = await fetchTotalValueLocked([{ address, decimals, priceUsd }]);
        if (result.value !== null || (item.TotalValueLocked?.value ?? null) === null) {
          item.TotalValueLocked = { ...result };
        }
        row.metric = result.value;
        row.note = result.value !== null ? "TotalValueLocked" : "TVL calc failed";
      }
    } else if (!row.note) {
      row.note = COINGECKO_IDS[slug]
        ? "resolved coin, but no Arbitrum address"
        : "no CoinGecko mapping or registry entry";
    }

    // DeFi Llama enrichment — runs whether or not an address resolved, so
    // unlisted coins (Monerium EURe, Pleasing USD) and protocol TVL histories
    // are recovered from Llama's keyless APIs.
    if (category === CATEGORY_STABLECOIN) {
      const extra = await refreshStablecoinExtras(item, slug);
      if (extra) {
        mutated = true;
        row.note = row.note ? `${row.note}; llama extras` : "llama extras";
        if (row.metric === null) row.metric = item.TotalSupply?.value ?? null;
      }
    } else if (category === CATEGORY_RWA) {
      const extra = await refreshRwaExtras(item, slug, resolution);
      if (extra) {
        mutated = true;
        row.note = row.note ? `${row.note}; llama extras` : "llama extras";
        if (row.metric === null) row.metric = item.TotalValueLocked?.value ?? null;
      }
    }

    if (mutated) {
      item.UpdatedAt = nowIso();
      await putItem(item);
      updated += 1;
      if (slug) touchedSlugs.push({ category, slug });
    }
    results.push(row);
  }

  // --- Aave V3 lending rates (on-chain via Alchemy) -------------------------
  // Runs as its own pass so it isn't gated by CoinGecko address resolution
  // (aTokens like aUSDC have no CoinGecko mapping). Reserve coins get a
  // LendingMarket; aTokens also get a live YieldMechanics; the Aave entity's
  // headline APR is derived from the GHO supply APY.
  const aaveResults: { slug: string; supplyApyPct: number | null; borrowApyPct: number | null }[] =
    [];
  if (hasAave()) {
    for (const item of items) {
      const slug: string = item.Slug || "";
      const category: string = item.Category || "";

      if (isAaveReserveSlug(slug)) {
        const rates = await fetchReserveRatesForSlug(slug);
        if (rates && rates.supplyApyPct !== null) {
          item.LendingMarket = { ...rates };
          if (AAVE_ATOKEN_SLUGS.has(slug)) {
            const underlying = rates.underlyingSymbol ?? slug.replace(/^a/, "").toUpperCase();
            item.YieldMechanics = {
              currentApyPct: rates.supplyApyPct,
              feeShareToHoldersPct: 0,
              yieldSource: `Aave V3 supply APY on ${underlying} (interest paid by borrowers)`,
              isAutoCompounding: true,
              emissionsBased: false,
              payoutAsset:
                "Accrues continuously into the aToken balance (redeemable for the underlying + interest)",
              dataSource: "live",
            };
          }
          item.UpdatedAt = nowIso();
          await putItem(item);
          updated += 1;
          if (slug) touchedSlugs.push({ category, slug });
          aaveResults.push({
            slug,
            supplyApyPct: rates.supplyApyPct,
            borrowApyPct: rates.variableBorrowApyPct,
          });
        }
      } else if (category === "Entity" && slug === "aave") {
        const gho = await fetchReserveRatesForSlug("gho");
        if (gho && gho.supplyApyPct !== null) {
          item.CurrentScale = { ...(item.CurrentScale ?? {}), aprPct: gho.supplyApyPct };
          item.ScaleLabels = { ...(item.ScaleLabels ?? {}), apr: "GHO supply APY" };
          item.UpdatedAt = nowIso();
          await putItem(item);
          updated += 1;
          aaveResults.push({ slug: "aave", supplyApyPct: gho.supplyApyPct, borrowApyPct: null });
        }
      }
    }
  }

  // --- Entity headline TVL aggregation --------------------------------------
  // A few entities ship with CurrentScale.tvlUsd = null (e.g. Monerium, Pleasing
  // Market). Derive it from the member-coin metrics refreshed above so the value
  // is persisted and agent-readable. Curated static seeds are left untouched.
  const memberMetricUsd = (ref: { category?: string; slug?: string }): number | null => {
    const member = items.find(
      (it) => String(it.Slug ?? "") === String(ref.slug ?? "") && it.Category === ref.category,
    );
    if (!member) return null;
    if (ref.category === CATEGORY_STABLECOIN) return member.TotalSupply?.value ?? null;
    if (ref.category === CATEGORY_RWA) return member.TotalValueLocked?.value ?? null;
    if (ref.category === CATEGORY_TOKEN) return member.Market?.marketCapUsd?.value ?? null;
    return null;
  };
  for (const item of items) {
    if (item.Category !== "Entity") continue;
    if ((item.CurrentScale?.tvlUsd ?? null) != null) continue;
    const members: { category?: string; slug?: string }[] = item.MemberCoins ?? [];
    let total = 0;
    let found = false;
    for (const ref of members) {
      const value = memberMetricUsd(ref);
      if (value != null && value > 0) {
        total += value;
        found = true;
      }
    }
    if (!found) continue;
    item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd: total };
    item.UpdatedAt = nowIso();
    await putItem(item);
    updated += 1;
  }

  // Refresh public surfaces + each touched detail page.
  revalidatePath("/");
  revalidatePath("/entities");
  revalidatePath("/stablecoins");
  revalidatePath("/rwas");
  revalidatePath("/tokens");
  for (const { category, slug } of touchedSlugs) {
    const base =
      category === CATEGORY_RWA
        ? "/rwas"
        : category === CATEGORY_TOKEN
          ? "/tokens"
          : "/stablecoins";
    revalidatePath(`${base}/${slug}`);
  }
  // Entity detail pages embed member-coin live data, so refresh them too.
  revalidatePath("/entities/[slug]", "page");

  return NextResponse.json({
    ok: true,
    backend: "upstash",
    alchemy: hasAlchemy ? "present" : "missing",
    total: items.length,
    updated,
    results,
    aave: aaveResults,
  });
}
