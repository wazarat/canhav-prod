import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { fetchReserveRatesForSlug, hasAave, isAaveReserveSlug } from "@/lib/server/aave";
import { fetchTotalSupply, fetchTotalValueLocked } from "@/lib/server/alchemy";
import { resolveForSlug, COINGECKO_IDS, type TokenResolution } from "@/lib/server/coingecko";
import { hasUpstash, putItem, readAllItemsFromRedis } from "@/lib/server/redis";
import { rwaTokenForSlug } from "@/lib/server/rwaRegistry";

/**
 * Live-metrics refresh — Vercel Cron entrypoint (replaces the Render job).
 *
 * TS port of `backend/scripts/refresh_live.py`. For each protocol it resolves the
 * Arbitrum contract address + USD price via CoinGecko, then reads on-chain
 * supply via Alchemy (stablecoins -> TotalSupply; RWAs -> TVL proxy), and writes
 * the result back to the Upstash store. History series (peg/TVL) are left
 * untouched (Dune still stubbed).
 *
 * Scheduled daily by `vercel.json` crons. Vercel attaches
 * `Authorization: Bearer ${CRON_SECRET}` to cron invocations; we require it so
 * the endpoint can't be triggered anonymously.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CATEGORY_STABLECOIN = "Stablecoin";
const CATEGORY_RWA = "RWA";
const CATEGORY_TOKEN = "Token";
const COINGECKO_DELAY_MS = 1_500; // free-tier etiquette between lookups

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
  };
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

    if (!address) {
      if (!row.note) {
        row.note = COINGECKO_IDS[slug]
          ? "resolved coin, but no Arbitrum address"
          : "no CoinGecko mapping or registry entry";
      }
      results.push(row);
      continue;
    }

    row.address = address;
    item.ContractAddress = address;
    if (category === CATEGORY_RWA) {
      item.VaultAddresses = [address];
    }

    // Persist the CoinGecko market block on token profiles so it lives in the
    // store (agent-readable) instead of only being fetched at render time.
    if (category === CATEGORY_TOKEN && resolution && resolution.priceUsd !== null) {
      item.Market = buildTokenMarket(resolution);
    }

    let mutated = true;
    if (!hasAlchemy) {
      row.note = "address persisted; ALCHEMY_API_KEY missing (metric skipped)";
    } else if (category === CATEGORY_STABLECOIN || category === CATEGORY_TOKEN) {
      // Tokens, like stablecoins, expose circulating supply.
      const result = await fetchTotalSupply(address, decimals);
      item.TotalSupply = { ...result };
      row.metric = result.value;
      row.note = result.value !== null ? "TotalSupply" : "supply call failed";
    } else if (category === CATEGORY_RWA) {
      const result = await fetchTotalValueLocked([{ address, decimals, priceUsd }]);
      item.TotalValueLocked = { ...result };
      row.metric = result.value;
      row.note = result.value !== null ? "TotalValueLocked" : "TVL calc failed";
    } else {
      mutated = false;
      row.note = `unknown category: ${category}`;
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

  // NOTE: peg/TVL history (HistoricalPegData / HistoricalTvlData) is still left
  // untouched — Dune is wired but inactive until saved query IDs are provided.

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
