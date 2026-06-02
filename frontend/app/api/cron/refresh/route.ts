import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { fetchTotalSupply, fetchTotalValueLocked } from "@/lib/server/alchemy";
import { resolveForSlug, COINGECKO_IDS } from "@/lib/server/coingecko";
import { hasUpstash, putItem, readAllItemsFromRedis } from "@/lib/server/redis";

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
      { ok: false, error: "Upstash is not configured (UPSTASH_REDIS_REST_URL/TOKEN)." },
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

    // Skip the CoinGecko round-trip (and its delay) for unmapped protocols.
    if (!COINGECKO_IDS[slug]) {
      row.note = "no CoinGecko mapping";
      results.push(row);
      continue;
    }

    const resolution = await resolveForSlug(slug);
    await sleep(COINGECKO_DELAY_MS);

    if (!resolution) {
      row.note = "CoinGecko lookup failed";
      results.push(row);
      continue;
    }

    const { address, decimals, priceUsd } = resolution;
    row.address = address;
    item.ContractAddress = address;
    if (category === CATEGORY_RWA) {
      item.VaultAddresses = address ? [address] : [];
    }

    let mutated = true;
    if (!address) {
      row.note = "resolved coin, but no Arbitrum address";
    } else if (!hasAlchemy) {
      row.note = "address persisted; ALCHEMY_API_KEY missing (metric skipped)";
    } else if (category === CATEGORY_STABLECOIN) {
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
  revalidatePath("/stablecoins");
  revalidatePath("/rwas");
  revalidatePath("/staging");
  for (const { category, slug } of touchedSlugs) {
    revalidatePath(`${category === CATEGORY_RWA ? "/rwas" : "/stablecoins"}/${slug}`);
  }

  return NextResponse.json({
    ok: true,
    backend: "upstash",
    alchemy: hasAlchemy ? "present" : "missing",
    total: items.length,
    updated,
    results,
  });
}
