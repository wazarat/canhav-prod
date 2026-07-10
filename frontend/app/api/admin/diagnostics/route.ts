import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin";
import { getNetworkMemberCoins } from "@/lib/data";
import {
  computeCoverage,
  computeFieldCoverage,
  summarizeCoverage,
  type CoverageCtx,
  type FieldCoverage,
} from "@/lib/server/diagnostics/fieldCoverage";
import { readLiveStore } from "@/lib/server/store";
import type {
  NetworkProfile,
  ReceiptProfile,
  RwaProfile,
  StablecoinProfile,
  TokenProfile,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DiagnosticsItem {
  slug: string;
  name: string;
  symbol?: string;
  category: string;
  coinType?: string | null;
  receiptType?: string | null;
  entitySlug?: string | null;
  sector: string | null;
  tags: string[];
  coverage: FieldCoverage[];
  summary: ReturnType<typeof summarizeCoverage>;
}

type CoinProfile = StablecoinProfile | TokenProfile | RwaProfile;

/**
 * Normalize the `?category=` param to a bucket. Accepts the UI pill groups
 * ("Coins"/"Receipts"/"Networks") and the raw store categories.
 */
function resolveBucket(raw: string | null): "networks" | "coins" | "receipts" {
  const v = (raw ?? "").toLowerCase();
  if (v === "receipt" || v === "receipts") return "receipts";
  if (v === "coins" || v === "token" || v === "stablecoin" || v === "rwa") return "coins";
  return "networks";
}

/** Build the shared coverage context once per request from the whole store. */
function buildCtx(store: {
  stablecoins: StablecoinProfile[];
  rwas: RwaProfile[];
  tokens: TokenProfile[];
  receipts: ReceiptProfile[];
  networks: NetworkProfile[];
}): CoverageCtx {
  const knownSlugs = new Set<string>();
  for (const list of [store.stablecoins, store.rwas, store.tokens, store.receipts, store.networks]) {
    for (const p of list) knownSlugs.add(p.slug);
  }
  const memberOfByCoinSlug = new Map<string, string[]>();
  for (const net of store.networks) {
    for (const ref of net.memberCoins ?? []) {
      if (!ref?.slug) continue;
      const arr = memberOfByCoinSlug.get(ref.slug) ?? [];
      if (!arr.includes(net.slug)) arr.push(net.slug);
      memberOfByCoinSlug.set(ref.slug, arr);
    }
  }
  return { knownSlugs, memberOfByCoinSlug };
}

function coinItem(p: CoinProfile, ctx: CoverageCtx): DiagnosticsItem {
  const coverage = computeCoverage(p, ctx);
  return {
    slug: p.slug,
    name: p.name,
    symbol: p.symbol,
    category: p.category,
    coinType: "coinType" in p ? (p.coinType ?? null) : null,
    entitySlug: p.entitySlug ?? null,
    sector: ("sector" in p ? p.sector : null) ?? null,
    tags: [],
    coverage,
    summary: summarizeCoverage(coverage),
  };
}

function receiptItem(p: ReceiptProfile, ctx: CoverageCtx): DiagnosticsItem {
  const coverage = computeCoverage(p, ctx);
  return {
    slug: p.slug,
    name: p.name,
    symbol: p.symbol,
    category: p.category,
    receiptType: p.receiptType ?? null,
    entitySlug: p.entitySlug ?? null,
    sector: p.sector ?? null,
    tags: p.tag ? [p.tag] : [],
    coverage,
    summary: summarizeCoverage(coverage),
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Sign in as an admin or send a Bearer APPROVAL_TOKEN." },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const slugFilter = url.searchParams.get("slug");
  const bucket = resolveBucket(url.searchParams.get("category"));

  const store = await readLiveStore();
  const ctx = buildCtx(store);

  // --- Coins bucket (Token + Stablecoin + RWA, folded together) --------------
  if (bucket === "coins") {
    const all: CoinProfile[] = [...store.tokens, ...store.stablecoins, ...store.rwas];
    const selected = slugFilter ? all.filter((p) => p.slug === slugFilter) : all;
    if (slugFilter && selected.length === 0) {
      return NextResponse.json({ ok: false, error: `No coin found for slug "${slugFilter}".` }, { status: 404 });
    }
    return NextResponse.json({ ok: true, items: selected.map((p) => coinItem(p, ctx)) });
  }

  // --- Receipts bucket -------------------------------------------------------
  if (bucket === "receipts") {
    const selected = slugFilter
      ? store.receipts.filter((p) => p.slug === slugFilter)
      : store.receipts;
    if (slugFilter && selected.length === 0) {
      return NextResponse.json({ ok: false, error: `No receipt found for slug "${slugFilter}".` }, { status: 404 });
    }
    return NextResponse.json({ ok: true, items: selected.map((p) => receiptItem(p, ctx)) });
  }

  // --- Networks bucket (unchanged behavior) ----------------------------------
  const selected = slugFilter
    ? store.networks.filter((n) => n.slug === slugFilter)
    : store.networks;
  if (slugFilter && selected.length === 0) {
    return NextResponse.json({ ok: false, error: `No network found for slug "${slugFilter}".` }, { status: 404 });
  }

  const items: DiagnosticsItem[] = [];
  for (const network of selected) {
    // Resolve member coins (for dangling-ref detection) only for the detailed
    // single-slug view; the full list stays cheap.
    const memberCoins = slugFilter ? await getNetworkMemberCoins(network) : undefined;
    const coverage = computeFieldCoverage(network, memberCoins);
    items.push({
      slug: network.slug,
      name: network.name,
      category: "Network",
      sector: network.sector ?? null,
      tags: network.tags ?? [],
      coverage,
      summary: summarizeCoverage(coverage),
    });
  }

  return NextResponse.json({ ok: true, items });
}
