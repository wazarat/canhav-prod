import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { CANONICAL_LENDING_SLUGS } from "@/data/credit-seed";
import { CANONICAL_PERP_DEX_SLUGS } from "@/data/derivatives-seed";
import { CANONICAL_LIQUIDITY_POOL_SLUGS, LIQUIDITY_SEED } from "@/data/liquidity-seed";
import { repoRoot } from "@/lib/server/env";
import { hasUpstash, readAllItemsFromRedis } from "@/lib/server/redis";
import {
  DERIVATIVES_TAG_TO_KEY,
  LIQUIDITY_TAG_TO_KEY,
  OTHER_TAG_TO_KEY,
  RWA_SUBSECTOR_TO_KEY,
  STAKING_TAG_TO_KEY,
} from "@/lib/server/tagMetricsOverlay";
import type {
  DerivativesSubSector,
  DerivativesTagMetrics,
  LiquiditySubSector,
  LiquidityTagMetrics,
  NetworkProfile,
  NetworkRisk,
  NetworkSector,
  OtherSubSector,
  OtherTagMetrics,
  ReceiptProfile,
  RiskCategory,
  RwaProfile,
  RwaSecondaryTag,
  RwaSubSector,
  RwaTagMetrics,
  SectorAggregate,
  StakingSubSector,
  StakingTagMetrics,
  StablecoinProfile,
  TokenProfile,
} from "@/lib/types";

/**
 * Server-only unified reader for the backend store.
 *
 * Primary source is Upstash Redis (hash `canhav:store`), read at request/build
 * time so every page reflects the live store and an approval flip via
 * When Upstash env vars are absent
 * (pure offline dev with the Python LocalAdapter), it falls back to reading
 * `backend/data/store.json` from disk. Items map PascalCase -> camelCase here.
 */

interface StoreFile {
  items?: Record<string, Record<string, unknown>>;
}

function storePath(): string {
  return path.join(repoRoot(), "backend", "data", "store.json");
}

function readItemsFromDisk(): Record<string, unknown>[] {
  try {
    const raw = readFileSync(storePath(), "utf-8");
    const parsed = JSON.parse(raw) as StoreFile;
    return Object.values(parsed.items ?? {});
  } catch {
    return [];
  }
}

/** Invalidate with `revalidateTag(STORE_CACHE_TAG)` after any store write. */
export const STORE_CACHE_TAG = "canhav-store";

// Cross-request cache of the raw items array. TTL matches the pages'
// `revalidate = 300`, so freshness is unchanged; force-dynamic routes drop from
// one HGETALL per request to at most one per 5 minutes. The serialized entry is
// ~1MB today — Vercel caps unstable_cache entries at 2MB; if the store grows
// near that, split the entry per Category instead. On overflow Next logs a
// cache-set failure and serves uncached (degraded, not broken).
const readItemsShared = unstable_cache(
  async (): Promise<Record<string, unknown>[]> => {
    if (hasUpstash()) {
      const fromRedis = await readAllItemsFromRedis();
      // Upstash creds are often set locally before the hash is seeded. Fall back to
      // the on-disk store so dev isn't blank after demo overlays were removed.
      if (fromRedis.length > 0) return fromRedis;
    }
    return readItemsFromDisk();
  },
  ["canhav-store-items"],
  { revalidate: 300, tags: [STORE_CACHE_TAG] },
);

// react `cache()`: one store read per render pass, no matter how many
// accessors (homepage fires six) ask for it.
const readItems = cache(() => readItemsShared());

/**
 * Offline-dev fallback writer: flip a protocol's status directly in
 * `backend/data/store.json` (mirrors the Python LocalAdapter). Only used when
 * Upstash env vars are absent; production always goes through Redis. Returns the
 * updated item, or `null` if the protocol was not found.
 */
export function setStatusLocal(
  category: string,
  slug: string,
  status: "APPROVED" | "PENDING_APPROVAL",
): Record<string, any> | null {
  const file = storePath();
  let parsed: StoreFile & Record<string, unknown>;
  try {
    parsed = JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
  const items = (parsed.items ?? {}) as Record<string, Record<string, any>>;
  const field = `CATEGORY#${category}|PROTOCOL#${slug}`;
  const item = items[field];
  if (!item) return null;
  item.Status = status;
  item.UpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  return item;
}

/**
 * Offline-dev store accessors for the admin content editor (mirrors
 * `setStatusLocal`). Only used when Upstash isn't configured; production goes
 * through Redis. Reads/writes `backend/data/store.json` by `<PK>|<SK>` field.
 */
export function readNetworkItemLocal(
  slug: string,
): { field: string; item: Record<string, any> } | null {
  let parsed: StoreFile;
  try {
    parsed = JSON.parse(readFileSync(storePath(), "utf-8")) as StoreFile;
  } catch {
    return null;
  }
  const items = (parsed.items ?? {}) as Record<string, Record<string, any>>;
  for (const category of ["Network", "Entity"]) {
    const field = `CATEGORY#${category}|PROTOCOL#${slug}`;
    if (items[field]) return { field, item: items[field] };
  }
  return null;
}

export function writeNetworkItemLocal(field: string, item: Record<string, any>): boolean {
  let parsed: StoreFile & Record<string, unknown>;
  try {
    parsed = JSON.parse(readFileSync(storePath(), "utf-8"));
  } catch {
    return false;
  }
  const items = (parsed.items ?? {}) as Record<string, Record<string, any>>;
  items[field] = item;
  parsed.items = items;
  writeFileSync(storePath(), `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  return true;
}

/**
 * Load every store item from the on-disk `backend/data/store.json`. Used by the
 * live-metrics cron in offline mode (no Upstash) so it can refresh against the
 * same file the frontend reads. Returns [] if the file is missing/unparseable.
 */
export function loadLocalStoreItems(): Record<string, unknown>[] {
  return readItemsFromDisk();
}

/**
 * Offline-dev batch writer that mirrors `putItem` (Upstash) against the on-disk
 * store. The cron mutates existing items in place AND creates new ones (sector
 * aggregates), so we seed a keyed map with the loaded items and overwrite/insert
 * on every `put`, then serialize the whole store once via `flush`. Keeping the
 * single flush avoids re-reading/re-writing the multi-MB file on every put.
 */
export interface LocalStoreWriter {
  put(item: Record<string, any>): Promise<void>;
  flush(): void;
  count(): number;
}

export function createLocalStoreWriter(seed: Record<string, unknown>[]): LocalStoreWriter {
  const map = new Map<string, Record<string, unknown>>();
  for (const it of seed) {
    const pk = (it as Record<string, unknown>).PK;
    const sk = (it as Record<string, unknown>).SK;
    if (pk && sk) map.set(`${String(pk)}|${String(sk)}`, it);
  }
  return {
    async put(item: Record<string, any>): Promise<void> {
      const { PK, SK } = item;
      if (!PK || !SK) throw new Error("Item must include both 'PK' and 'SK'.");
      map.set(`${String(PK)}|${String(SK)}`, item);
    },
    flush(): void {
      const file = storePath();
      let meta: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(readFileSync(file, "utf-8")) as { _meta?: Record<string, unknown> };
        meta = parsed._meta ?? {};
      } catch {
        // No existing file / meta — start fresh.
      }
      const items: Record<string, unknown> = {};
      for (const [k, v] of map) items[k] = v;
      const out = {
        _meta: {
          ...meta,
          backend: "local",
          updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
          count: map.size,
        },
        items,
      };
      writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
    },
    count(): number {
      return map.size;
    },
  };
}

function parseRisks(raw: unknown): NetworkRisk[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return { category: "Systemic" as RiskCategory, description: item };
    }
    const r = item as Record<string, string>;
    return {
      category: (r.category ?? "Systemic") as RiskCategory,
      description: r.description ?? "",
    };
  });
}

/**
 * Map any legacy RWA secondary tag to the narrowed 5-tag set on ingest, so stale
 * store/seed data can't reintroduce a dropped tag. Mirrors the migration in the
 * RWA sector revamp: Compliance-Heavy + Permissioned -> Institutional-Gated;
 * Hybrid-Chain -> Multi-Chain; Multi-Currency / Non-EVM / Wound-Down dropped.
 */
const RWA_TAG_MIGRATION: Record<string, RwaSecondaryTag | null> = {
  "Compliance-Heavy": "Institutional-Gated",
  Permissioned: "Institutional-Gated",
  "Hybrid-Chain": "Multi-Chain",
  "Multi-Currency": null,
  "Non-EVM": null,
  "Wound-Down": null,
  // Pass-through for the 5 kept tags.
  "Institutional-Gated": "Institutional-Gated",
  "Yield-Bearing": "Yield-Bearing",
  "Real-World-Custody": "Real-World-Custody",
  "DAO-Governed": "DAO-Governed",
  "Multi-Chain": "Multi-Chain",
};

const CANONICAL_LENDING_SLUG_SET = new Set<string>(CANONICAL_LENDING_SLUGS);
const CANONICAL_PERP_DEX_SLUG_SET = new Set<string>(CANONICAL_PERP_DEX_SLUGS);
const CANONICAL_LIQUIDITY_POOL_SLUG_SET = new Set<string>(CANONICAL_LIQUIDITY_POOL_SLUGS);
const LIQUIDITY_SEED_BY_SLUG = new Map(LIQUIDITY_SEED.map((s) => [s.slug, s]));

/** Map legacy Dex block onto Liquidity metrics when Redis still has pre-migration rows. */
function liquidityBlockFromItem(item: Record<string, unknown>, slug: string): Record<string, unknown> | null {
  const liquidity = item.Liquidity as Record<string, unknown> | null | undefined;
  if (liquidity && typeof liquidity === "object") return liquidity;

  if (!CANONICAL_LIQUIDITY_POOL_SLUG_SET.has(slug)) return null;
  const dex = item.Dex as Record<string, unknown> | null | undefined;
  if (!dex || typeof dex !== "object") return null;

  const mapped: Record<string, unknown> = {};
  if (dex.auditHistory) mapped.auditHistory = dex.auditHistory;
  if (dex.deployment) mapped.deployment = dex.deployment;
  if (dex.tvlUsd) mapped.tvlUsd = dex.tvlUsd;
  if (dex.volume30dUsd) mapped.volume24hUsd = dex.volume30dUsd;
  return Object.keys(mapped).length > 0 ? mapped : null;
}

/** Normalize Credit → Lending taxonomy at read time (handles stale Redis records). */
function normalizeNetworkTaxonomy(item: Record<string, unknown>): {
  sector: NetworkProfile["sector"];
  secondarySectors: string[] | undefined;
  subSector: string | null;
  tags: string[];
} {
  const slug = String(item.Slug ?? "");
  const rawSecondary = Array.isArray(item.SecondarySectors)
    ? (item.SecondarySectors as string[])
    : undefined;

  if (CANONICAL_LENDING_SLUG_SET.has(slug)) {
    const secondarySectors = rawSecondary?.filter(
      (s) => s !== "Stablecoin" && s !== "Lending",
    );
    return {
      sector: "Credit",
      secondarySectors: secondarySectors?.length ? secondarySectors : undefined,
      subSector: "Lending",
      tags: ["Lending"],
    };
  }

  if (CANONICAL_PERP_DEX_SLUG_SET.has(slug)) {
    return {
      sector: "Derivatives",
      secondarySectors: undefined,
      subSector: "Perp DEX",
      tags: [],
    };
  }

  if (CANONICAL_LIQUIDITY_POOL_SLUG_SET.has(slug)) {
    const seed = LIQUIDITY_SEED_BY_SLUG.get(slug);
    return {
      sector: "Liquidity",
      secondarySectors: undefined,
      subSector: "Pools",
      tags: [],
    };
  }

  const sector = (item.Sector as NetworkProfile["sector"] | null | undefined) ?? null;
  let tags = Array.isArray(item.Tags)
    ? [...(item.Tags as string[])]
    : item.SubSector
      ? [String(item.SubSector)]
      : [];
  tags = tags.filter((t) => t !== "Lending");

  return {
    sector,
    secondarySectors: rawSecondary,
    subSector: (item.SubSector as string | null) ?? null,
    tags,
  };
}

function normalizeRwaTags(raw: unknown): RwaSecondaryTag[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = new Set<RwaSecondaryTag>();
  for (const tag of raw) {
    const mapped = RWA_TAG_MIGRATION[String(tag)];
    if (mapped) out.add(mapped);
  }
  return out.size ? [...out] : undefined;
}

/** Fallback: derive tag-keyed metrics from monolithic sector blocks when cron has not run yet. */
function hydrateStakingTagMetrics(item: Record<string, unknown>): StakingTagMetrics | null {
  const existing = item.StakingTagMetrics as StakingTagMetrics | null | undefined;
  if (existing) return existing;
  const sub = (item.StakingSubSector ?? item.SubSector) as StakingSubSector | null | undefined;
  const block = item.Staking;
  if (!sub || !block || typeof block !== "object") return null;
  const key = STAKING_TAG_TO_KEY[sub];
  if (!key) return null;
  return { [key]: block } as StakingTagMetrics;
}

function hydrateLiquidityTagMetrics(item: Record<string, unknown>): LiquidityTagMetrics | null {
  const existing = item.LiquidityTagMetrics as LiquidityTagMetrics | null | undefined;
  if (existing) return existing;
  const sub = (item.LiquiditySubSector ?? item.SubSector) as LiquiditySubSector | null | undefined;
  const block = liquidityBlockFromItem(item, String(item.Slug ?? ""));
  if (!sub || !block) return null;
  const key = LIQUIDITY_TAG_TO_KEY[sub];
  if (!key) return null;
  return { [key]: block } as LiquidityTagMetrics;
}

function hydrateDerivativesTagMetrics(item: Record<string, unknown>): DerivativesTagMetrics | null {
  const existing = item.DerivativesTagMetrics as DerivativesTagMetrics | null | undefined;
  if (existing) return existing;
  const sub = (item.DerivativesSubSector ?? item.SubSector) as DerivativesSubSector | null | undefined;
  const block = item.Derivatives;
  if (!sub || !block || typeof block !== "object") return null;
  const key = DERIVATIVES_TAG_TO_KEY[sub];
  if (!key) return null;
  return { [key]: block } as DerivativesTagMetrics;
}

function hydrateOtherTagMetrics(item: Record<string, unknown>): OtherTagMetrics | null {
  const existing = item.OtherTagMetrics as OtherTagMetrics | null | undefined;
  if (existing) return existing;
  const sub = (item.OtherSubSector ?? item.SubSector) as OtherSubSector | null | undefined;
  const block = item.Other;
  if (!sub || !block || typeof block !== "object") return null;
  const key = OTHER_TAG_TO_KEY[sub];
  if (!key) return null;
  return { [key]: block } as OtherTagMetrics;
}

function hydrateRwaTagMetrics(item: Record<string, unknown>): RwaTagMetrics | null {
  const existing = item.RwaTagMetrics as RwaTagMetrics | null | undefined;
  if (existing) return existing;
  const sub = item.RwaSubSector as RwaSubSector | null | undefined;
  const rwa = item.Rwa as Record<string, unknown> | null | undefined;
  if (!sub || !rwa) return null;
  const key = RWA_SUBSECTOR_TO_KEY[sub];
  if (!key) return null;
  const subMetrics = rwa.subSectorMetrics;
  return {
    [key]: {
      ...(rwa.aumUsd != null ? { aumUsd: rwa.aumUsd } : {}),
      ...(subMetrics && typeof subMetrics === "object" ? subMetrics : {}),
    },
  } as RwaTagMetrics;
}

function common(item: Record<string, any>) {
  return {
    slug: String(item.Slug ?? ""),
    name: String(item.Name ?? ""),
    symbol: String(item.Symbol ?? ""),
    status: (item.Status ?? "APPROVED") as StablecoinProfile["status"],
    description: String(item.Description ?? ""),
    website: item.Website ?? null,
    twitter: item.Twitter ?? null,
    discord: item.Discord ?? null,
    github: item.GitHub ?? null,
    coingecko: item.CoinGecko ?? null,
    auditUrl: item.AuditURL ?? null,
    contractAddress: item.ContractAddress ?? null,
    deployments: item.Deployments ?? undefined,
    entitySlug: item.EntitySlug ?? null,
    // Fine-grained classification + provenance (additive; absent on old records).
    assetSubtype: item.AssetSubtype ?? null,
    pegMechanism: item.PegMechanism ?? null,
    offchainFacts: item.OffchainFacts ?? undefined,
    // Protocol fees/revenue (DeFi Llama; written by the cron). Shared by
    // stablecoins, RWAs, and tokens.
    protocolFeesRevenue: item.ProtocolFeesRevenue ?? undefined,
    arbitrumPortalMetadata: item.ArbitrumPortalMetadata ?? {
      portalUrl: null,
      logoUrl: null,
      bannerUrl: null,
      chains: [],
      subCategory: null,
      isLive: false,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: String(item.CreatedAt ?? ""),
    updatedAt: String(item.UpdatedAt ?? ""),
  };
}

function coinTaxonomyFields(item: Record<string, any>) {
  return {
    coinType: item.CoinType ?? null,
    isStablecoin: item.IsStablecoin ?? undefined,
    pegDeviation: item.PegDeviation ?? null,
    stakingApr: item.StakingApr ?? null,
    backing: item.Backing ?? null,
    sector: item.Sector ?? null,
  };
}

export interface LiveStore {
  stablecoins: StablecoinProfile[];
  rwas: RwaProfile[];
  tokens: TokenProfile[];
  receipts: ReceiptProfile[];
  networks: NetworkProfile[];
}

// react `cache()`: parse/map the 350+ raw items once per render pass instead of
// once per accessor call.
export const readLiveStore = cache(async (): Promise<LiveStore> => {
  const stablecoins: StablecoinProfile[] = [];
  const rwas: RwaProfile[] = [];
  const tokens: TokenProfile[] = [];
  const receipts: ReceiptProfile[] = [];
  const networks: NetworkProfile[] = [];

  for (const raw of await readItems()) {
    const item = raw as Record<string, any>;
    if (item.Category === "Stablecoin") {
      stablecoins.push({
        category: "Stablecoin",
        ...common(item),
        pegTarget: (item.PegTarget ?? "USD") as StablecoinProfile["pegTarget"],
        subCategory: item.SubCategory ?? null,
        totalSupply: item.TotalSupply ?? { value: null, source: "alchemy", updatedAt: null },
        historicalPegData: item.HistoricalPegData ?? {
          points: [],
          source: "dune",
          updatedAt: null,
        },
        chainDistribution: item.ChainDistribution ?? undefined,
        issuanceMeta: item.IssuanceMeta ?? undefined,
        lendingMarket: item.LendingMarket ?? undefined,
        market: item.Market ?? undefined,
        yieldMechanics: item.YieldMechanics ?? undefined,
        ...coinTaxonomyFields(item),
      } as StablecoinProfile);
    } else if (item.Category === "Receipt") {
      receipts.push({
        category: "Receipt",
        ...common(item),
        receiptType: item.ReceiptType ?? "YieldVault",
        entitySlug: String(item.EntitySlug ?? ""),
        baseAsset: item.BaseAsset ?? null,
        tag: item.Tag ?? null,
        notes: item.Notes ?? null,
        priceUsd: item.PriceUsd ?? null,
        exchangeRateVsBase: item.ExchangeRateVsBase ?? null,
        pegDeviation: item.PegDeviation ?? null,
        underlyingTvlUsd: item.UnderlyingTvlUsd ?? null,
        apr: item.Apr ?? null,
        navPerShare: item.NavPerShare ?? null,
        maturityDate: item.MaturityDate ?? null,
        impliedApy: item.ImpliedApy ?? null,
        aumUsd: item.AumUsd ?? null,
        underlyingYield: item.UnderlyingYield ?? null,
        holders: item.Holders ?? null,
        market: item.Market ?? undefined,
        yieldMechanics: item.YieldMechanics ?? undefined,
        lendingMarket: item.LendingMarket ?? undefined,
        assetSubtype: item.AssetSubtype ?? null,
        pegMechanism: item.PegMechanism ?? null,
        arbitrumPortalMetadata: item.ArbitrumPortalMetadata ?? {
          portalUrl: null,
          logoUrl: null,
          bannerUrl: null,
          chains: [],
          subCategory: null,
          isLive: true,
          isArbitrumNative: false,
          isPubliclyAudited: false,
          foundedDate: null,
        },
      } as ReceiptProfile);
    } else if (item.Category === "RWA") {
      rwas.push({
        category: "RWA",
        ...common(item),
        assetClass: (item.AssetClass ?? "Multi-Asset") as RwaProfile["assetClass"],
        vaultAddresses: item.VaultAddresses ?? null,
        totalValueLocked: item.TotalValueLocked ?? {
          value: null,
          source: "alchemy",
          updatedAt: null,
        },
        historicalTvlData: item.HistoricalTvlData ?? {
          points: [],
          source: "dune",
          updatedAt: null,
        },
        chainDistribution: item.ChainDistribution ?? undefined,
        market: item.Market ?? undefined,
      } as RwaProfile);
    } else if (item.Category === "Token") {
      tokens.push({
        category: "Token",
        ...common(item),
        tokenType: (item.TokenType ?? "Governance") as TokenProfile["tokenType"],
        subCategory: item.SubCategory ?? null,
        totalSupply: item.TotalSupply ?? { value: null, source: "alchemy", updatedAt: null },
        // Rich detail-page fields (additive; surfaced when seeded, else undefined).
        longDescription: item.LongDescription ?? undefined,
        market: item.Market ?? undefined,
        priceHistory: item.PriceHistory ?? undefined,
        poolComposition: item.PoolComposition ?? undefined,
        yieldMechanics: item.YieldMechanics ?? undefined,
        lendingMarket: item.LendingMarket ?? undefined,
        dexVolume: item.DexVolume ?? undefined,
        typedRisks: item.TypedRisks ?? undefined,
        tokenomics: item.Tokenomics ?? undefined,
        audits: item.Audits ?? undefined,
        sources: item.Sources ?? undefined,
        offchainFacts: item.OffchainFacts ?? undefined,
        agentSkill: item.AgentSkill ?? undefined,
        ...coinTaxonomyFields(item),
      } as TokenProfile);
    } else if (item.Category === "Network" || item.Category === "Entity") {
      const taxonomy = normalizeNetworkTaxonomy(item);
      const slug = String(item.Slug ?? "");
      const isCanonicalPerpDex = CANONICAL_PERP_DEX_SLUG_SET.has(slug);
      const isCanonicalLiquidityPool = CANONICAL_LIQUIDITY_POOL_SLUG_SET.has(slug);
      const seed = LIQUIDITY_SEED_BY_SLUG.get(slug);
      const liquidityBlock = liquidityBlockFromItem(item, slug);
      const liquiditySubSector =
        (item.LiquiditySubSector as NetworkProfile["liquiditySubSector"]) ??
        (taxonomy.sector === "Liquidity" && item.SubSector
          ? (item.SubSector as NetworkProfile["liquiditySubSector"])
          : isCanonicalLiquidityPool
            ? "Pools"
            : null);
      const liquiditySecondaryTags =
        (item.LiquiditySecondaryTags as NetworkProfile["liquiditySecondaryTags"]) ??
        (isCanonicalLiquidityPool && seed ? seed.secondaryTags : undefined);
      // Accept legacy "Entity" records until the prod store is re-seeded.
      networks.push({
        category: "Network",
        slug: slug,
        name: String(item.Name ?? ""),
        symbol: String(item.Symbol ?? ""),
        status: (item.Status ?? "APPROVED") as NetworkProfile["status"],
        tagline: String(item.Tagline ?? ""),
        description: String(item.Description ?? ""),
        differentiator: String(item.Differentiator ?? ""),
        officialDocs: item.OfficialDocs ?? null,
        website: item.Website ?? null,
        twitter: item.Twitter ?? null,
        discord: item.Discord ?? null,
        github: item.GitHub ?? null,
        components: item.Components ?? [],
        faq: item.Faq ?? [],
        orgStructure: item.OrgStructure ?? [],
        tradFiComparison: item.TradFiComparison ?? [],
        risks: parseRisks(item.Risks),
        events: item.Events ?? [],
        investmentRounds: item.InvestmentRounds ?? [],
        partnerships: item.Partnerships ?? [],
        scaleLabels: item.ScaleLabels ?? undefined,
        subCategory: item.SubCategory ?? null,
        sector: taxonomy.sector,
        secondarySectors: taxonomy.secondarySectors,
        subSector: taxonomy.subSector,
        tags: taxonomy.tags,
        competitors: item.Competitors ?? [],
        lending: item.Lending ?? null,
        creditMetrics: item.CreditMetrics ?? null,
        creditTagMetrics: item.CreditTagMetrics ?? null,
        stakingTagMetrics: hydrateStakingTagMetrics(item),
        liquidityTagMetrics: hydrateLiquidityTagMetrics(item),
        derivativesTagMetrics: hydrateDerivativesTagMetrics(item),
        otherTagMetrics: hydrateOtherTagMetrics(item),
        rwaTagMetrics: hydrateRwaTagMetrics(item),
        rwaGeneral: (item.RwaGeneral as NetworkProfile["rwaGeneral"]) ?? null,
        rwaCharacteristics:
          (item.RwaCharacteristics as NetworkProfile["rwaCharacteristics"]) ?? null,
        stablecoinSubSector: item.StablecoinSubSector ?? null,
        stablecoinSecondaryTags: item.StablecoinSecondaryTags ?? undefined,
        stablecoin: item.Stablecoin ?? null,
        dexSubSector: isCanonicalPerpDex || isCanonicalLiquidityPool ? null : (item.DexSubSector ?? null),
        dexSecondaryTags:
          isCanonicalPerpDex || isCanonicalLiquidityPool
            ? undefined
            : (item.DexSecondaryTags ?? undefined),
        dex: isCanonicalLiquidityPool ? null : (item.Dex ?? null),
        rwaSubSector: item.RwaSubSector ?? null,
        rwaSecondaryTags: normalizeRwaTags(item.RwaSecondaryTags),
        rwa: item.Rwa ?? null,
        stakingSubSector: item.StakingSubSector ?? null,
        stakingSecondaryTags: item.StakingSecondaryTags ?? undefined,
        staking: item.Staking ?? null,
        liquiditySubSector,
        liquiditySecondaryTags,
        liquidity: liquidityBlock,
        derivativesSubSector: isCanonicalPerpDex
          ? "Perp DEX"
          : ((item.DerivativesSubSector as NetworkProfile["derivativesSubSector"]) ??
            (taxonomy.sector === "Derivatives" && taxonomy.subSector
              ? (taxonomy.subSector as NetworkProfile["derivativesSubSector"])
              : null)),
        derivativesSecondaryTags: isCanonicalPerpDex
          ? []
          : (item.DerivativesSecondaryTags ?? undefined),
        derivatives: item.Derivatives ?? null,
        otherSubSector: item.OtherSubSector ?? null,
        otherSecondaryTags: item.OtherSecondaryTags ?? undefined,
        other: item.Other ?? null,
        childEntities: item.ChildEntities ?? undefined,
        currentScale: {
          tvlUsd: null,
          users: null,
          aprPct: null,
          targetAprPct: null,
          marketCapUsd: null,
          volume24hUsd: null,
          loanPipelineUsd: null,
          partnerships: null,
          ...((item.CurrentScale as Record<string, unknown> | undefined) ?? {}),
        },
        memberCoins: item.MemberCoins ?? [],
        arbitrumPortalMetadata: item.ArbitrumPortalMetadata ?? {
          portalUrl: null,
          logoUrl: null,
          bannerUrl: null,
          chains: [],
          subCategory: null,
          isLive: false,
          isArbitrumNative: false,
          isPubliclyAudited: false,
          foundedDate: null,
        },
        // DeFi Llama overlays (written by the cron). Options/OI are scaffolded
        // for the coming-soon options/perpetuals categories.
        protocolFeesRevenue: item.ProtocolFeesRevenue ?? undefined,
        universalMetrics: item.UniversalMetrics ?? undefined,
        dexVolume: item.DexVolume ?? undefined,
        optionsVolume: item.OptionsVolume ?? undefined,
        openInterest: item.OpenInterest ?? undefined,
        // Rich detail-page fields (additive; surfaced when seeded, else undefined).
        longDescription: item.LongDescription ?? undefined,
        market: item.Market ?? undefined,
        priceHistory: item.PriceHistory ?? undefined,
        tokenomics: item.Tokenomics ?? undefined,
        typedRisks: item.TypedRisks ?? undefined,
        audits: item.Audits ?? undefined,
        sources: item.Sources ?? undefined,
        offchainFacts: item.OffchainFacts ?? undefined,
        timeline: item.Timeline ?? undefined,
        agentSkill: item.AgentSkill ?? undefined,
        createdAt: String(item.CreatedAt ?? ""),
        updatedAt: String(item.UpdatedAt ?? ""),
      } as NetworkProfile);
    }
  }

  stablecoins.sort((a, b) => a.name.localeCompare(b.name));
  rwas.sort((a, b) => a.name.localeCompare(b.name));
  tokens.sort((a, b) => a.name.localeCompare(b.name));
  receipts.sort((a, b) => a.name.localeCompare(b.name));
  networks.sort((a, b) => a.name.localeCompare(b.name));
  return { stablecoins, rwas, tokens, receipts, networks };
});

function mapSectorAggregateItem(item: Record<string, unknown>): SectorAggregate {
  return {
    sector: String(item.Sector ?? item.Slug ?? "") as NetworkSector,
    totalTvlUsd: item.TotalTvlUsd as SectorAggregate["totalTvlUsd"],
    tvlChangePct: (item.TvlChangePct as SectorAggregate["tvlChangePct"]) ?? null,
    protocolCount: item.ProtocolCount as SectorAggregate["protocolCount"],
    dominancePct: item.DominancePct as SectorAggregate["dominancePct"],
    topProtocols: (item.TopProtocols as SectorAggregate["topProtocols"]) ?? [],
    chainsCovered: (item.ChainsCovered as string[]) ?? [],
    feesRevenue: (item.FeesRevenue as SectorAggregate["feesRevenue"]) ?? null,
    totalSuppliedUsd: item.TotalSuppliedUsd as SectorAggregate["totalSuppliedUsd"],
    totalBorrowedUsd: item.TotalBorrowedUsd as SectorAggregate["totalBorrowedUsd"],
    utilizationPct: item.UtilizationPct as SectorAggregate["utilizationPct"],
    totalOpenInterestUsd: item.TotalOpenInterestUsd as SectorAggregate["totalOpenInterestUsd"],
    perpVolume24hUsd: item.PerpVolume24hUsd as SectorAggregate["perpVolume24hUsd"],
    optionsNotional24hUsd: item.OptionsNotional24hUsd as SectorAggregate["optionsNotional24hUsd"],
    dexVolume24hUsd: item.DexVolume24hUsd as SectorAggregate["dexVolume24hUsd"],
    totalStakedUsd: item.TotalStakedUsd as SectorAggregate["totalStakedUsd"],
    restakingTvlUsd: item.RestakingTvlUsd as SectorAggregate["restakingTvlUsd"],
    totalAumUsd: item.TotalAumUsd as SectorAggregate["totalAumUsd"],
    coverageCapacityUsd: item.CoverageCapacityUsd as SectorAggregate["coverageCapacityUsd"],
    treasuryUsd: item.TreasuryUsd as SectorAggregate["treasuryUsd"],
    syncedAt: String(item.SyncedAt ?? item.UpdatedAt ?? ""),
  };
}

/** Read sector-level aggregate snapshots written by the cron sector pass. */
export const getSectorAggregates = cache(async (): Promise<SectorAggregate[]> => {
  const items = await readItems();
  return items
    .filter((it) => String(it.Category ?? "") === "SectorAggregate")
    .map((it) => mapSectorAggregateItem(it as Record<string, unknown>))
    .sort((a, b) => a.sector.localeCompare(b.sector));
});
