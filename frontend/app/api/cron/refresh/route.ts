import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { fetchTotalSupply, fetchTotalValueLocked } from "@/lib/server/alchemy";
import { resolveForSlug, COINGECKO_IDS } from "@/lib/server/coingecko";
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

    // 1. CoinGecko resolution (only when a coin id is mapped — saves the round-trip).
    if (COINGECKO_IDS[slug]) {
      const resolution = await resolveForSlug(slug);
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

  // Refresh public surfaces + each touched detail page.
  revalidatePath("/");
  revalidatePath("/entities");
  revalidatePath("/stablecoins");
  revalidatePath("/rwas");
  revalidatePath("/tokens");
  revalidatePath("/staging");
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
  });
}
