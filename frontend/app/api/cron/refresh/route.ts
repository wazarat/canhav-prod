import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { fetchReserveRatesForSlug, hasAave, isAaveReserveSlug, aTokenAddressForSlug } from "@/lib/server/aave";
import { fetchTotalSupply, fetchTotalValueLocked, hasAlchemy, probeErc20Standard } from "@/lib/server/alchemy";
import {
  coinIdForSlug,
  coinIdForNetworkSlug,
  fetchMarketChart,
  COINGECKO_IDS,
  CoinGeckoCronCache,
  type TokenResolution,
} from "@/lib/server/coingecko";
import {
  aggregateLendingBorrow,
  fetchLlamaBorrowPools,
  fetchLlamaCoinChart,
  fetchLlamaCoinPercentage,
  fetchLlamaCoinPrice,
  llamaCoinKeysForAddress,
  fetchLlamaDexVolume,
  fetchLlamaFeesRevenue,
  fetchLlamaOpenInterest,
  fetchLlamaOptionsVolume,
  fetchLlamaPools,
  fetchLlamaProtocolMeta,
  fetchLlamaProtocolTvl,
  fetchLlamaStablecoin,
  fetchLlamaStablecoinCharts,
  fetchLlamaStablecoinPrices,
  fetchLlamaYieldChart,
  llamaLendingProjectForSlug,
  llamaOptionsProtocolForSlug,
  llamaProtocolForSlug,
  type LlamaPool,
  type LlamaProtocolMeta,
  resolveLlamaYieldPool,
} from "@/lib/server/defillama";
import { fetchHeliusTokenSupply, hasHelius, KMNO_MINT } from "@/lib/server/helius";
import {
  fetchKaminoLiveMetrics,
  kaminoMetricsToLendingOverlay,
} from "@/lib/server/kamino";
import {
  fetchMorphoLiveMetrics,
  morphoMetricsToLendingOverlay,
  morphoMetricsToTagOverlay,
} from "@/lib/server/morpho";
import { hasUpstash, putItem, readAllItemsFromRedis } from "@/lib/server/redis";
import { rwaTokenForSlug } from "@/lib/server/rwaRegistry";
import { collectAllStakingMetrics } from "@/lib/server/staking";
import { STAKING_SEED } from "@/data/staking-seed";
import { collectAllLiquidityMetrics } from "@/lib/server/liquidity";
import { LIQUIDITY_SEED } from "@/data/liquidity-seed";
import { collectAllDerivativesMetrics } from "@/lib/server/derivatives";
import { DERIVATIVES_SEED } from "@/data/derivatives-seed";
import { collectAllOtherMetrics } from "@/lib/server/other";
import { OTHER_SEED } from "@/data/other-seed";
import { pegVsCurrency } from "@/lib/server/series";
import {
  fetchJustLendLiveMetrics,
  hasTronGrid,
  justLendMetricsToLendingOverlay,
} from "@/lib/server/trongrid";
import type {
  Sourced,
  StablecoinProfile,
  TokenDeployment,
  UniversalIdentity,
  UniversalMarket,
  UniversalMetrics,
  UniversalTvl,
} from "@/lib/types";

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
// Networks were renamed from "Entity"; accept the legacy value until the prod
// store is re-seeded (mirrors lib/server/store.ts).
const CATEGORY_NETWORK = "Network";
const CATEGORY_NETWORK_LEGACY = "Entity";
const isNetworkCategory = (c: string) =>
  c === CATEGORY_NETWORK || c === CATEGORY_NETWORK_LEGACY;
const COINGECKO_DELAY_MS = 1_500; // free-tier etiquette between lookups
const HISTORY_DAYS = 90; // stored peg/TVL history window

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** RWA coin TVL: history series tail, then cron-written TotalValueLocked. */
function rwaLatestTvlUsd(member: Record<string, any>): number | null {
  const points = member.HistoricalTvlData?.points;
  if (Array.isArray(points) && points.length > 0) {
    const last = points[points.length - 1]?.value;
    if (typeof last === "number" && last > 0) return last;
  }
  const tvl = member.TotalValueLocked?.value;
  if (typeof tvl === "number" && tvl > 0) return tvl;
  return null;
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

function isNullishNumber(v: number | null | undefined): boolean {
  return v == null;
}

function isEmptyArray<T>(v: T[] | null | undefined): boolean {
  return !v || v.length === 0;
}

/** Keep prior live value when a refresh fetch returns empty/null. */
function mergeSourced<T>(
  fresh: Sourced<T>,
  prior: Sourced<T> | undefined,
  isEmpty: (v: T) => boolean,
): Sourced<T> {
  if (prior && isEmpty(fresh.value) && !isEmpty(prior.value)) {
    return { ...prior, updatedAt: fresh.updatedAt };
  }
  return fresh;
}

/** Sync universal TVL from an authoritative CurrentScale write (integration / supply pass). */
function syncUniversalTvlFromCurrentScale(
  item: Record<string, any>,
  sourceLabel: string,
): boolean {
  const scaleTvl = item.CurrentScale?.tvlUsd;
  if (scaleTvl == null || typeof scaleTvl !== "number") return false;
  const u = item.UniversalMetrics as UniversalMetrics | undefined;
  if (!u?.tvl) return false;
  if (u.tvl.tvlUsd.value === scaleTvl) return false;
  const now = nowIso();
  u.tvl = {
    ...u.tvl,
    tvlUsd: {
      value: scaleTvl,
      dataSource: "live",
      sourceLabel,
      updatedAt: now,
    },
  };
  item.UniversalMetrics = u;
  return true;
}

interface UniversalRefreshContext {
  meta: LlamaProtocolMeta | null;
  cgCache: CoinGeckoCronCache;
  feesGithub?: string | null;
}

/** Normalize Llama / CoinGecko twitter handles to profile link URLs. */
function normalizeTwitterUrl(handle: string): string {
  const trimmed = handle.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://x.com/${trimmed.replace(/^@/, "")}`;
}

/** Promote universal identity links to top-level profile fields when curated copy is empty. */
function promoteIdentityToProfileFields(
  item: Record<string, any>,
  identity: UniversalIdentity,
  feesGithub?: string | null,
): void {
  if (!item.Website && identity.url?.value) {
    item.Website = identity.url.value;
  }
  if (!item.Twitter && identity.twitter?.value) {
    item.Twitter = normalizeTwitterUrl(identity.twitter.value);
  }
  const github =
    identity.github?.value ??
    feesGithub ??
    (item.GitHub && String(item.GitHub).trim() ? String(item.GitHub) : null);
  if (!item.GitHub && github) {
    item.GitHub = github;
  }

  const portal = (item.ArbitrumPortalMetadata ?? {}) as Record<string, any>;
  if (!portal.logoUrl && identity.logo?.value) {
    item.ArbitrumPortalMetadata = { ...portal, logoUrl: identity.logo.value };
  }

  const auditUrls = identity.auditLinks?.value ?? [];
  if (!item.Audits?.length && auditUrls.length > 0) {
    item.Audits = auditUrls.map((url: string) => ({
      firm: "DeFi Llama",
      date: "",
      url,
    }));
  }
  if (!item.AuditURL && auditUrls[0]) {
    item.AuditURL = auditUrls[0];
  }
}

function arbDeploymentFromContracts(contracts: TokenDeployment[]): TokenDeployment | null {
  const arb =
    contracts.find((c) => c.chain === "arbitrum-one") ??
    contracts.find((c) => c.chain.toLowerCase() === "arbitrum");
  return arb ?? (contracts[0] ?? null);
}

function isPerpetualsNetwork(item: Record<string, any>): boolean {
  const sector = String(item.Sector ?? "");
  const subSector = String(item.SubSector ?? "");
  const derivSub = String(item.DerivativesSubSector ?? "");
  const secondary = (item.SecondarySectors as string[] | undefined) ?? [];
  return (
    sector === "Perpetuals" ||
    subSector === "Perpetuals" ||
    secondary.includes("Perpetuals") ||
    (sector === "Derivatives" && derivSub === "Perp DEX")
  );
}

function isOptionsNetwork(item: Record<string, any>): boolean {
  const sector = String(item.Sector ?? "");
  const subSector = String(item.SubSector ?? "");
  return sector === "Options" || subSector === "Options";
}

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
 * Tier-1 universal metrics pass — runs for EVERY network so the cross-network
 * data block is consistent regardless of sector. Llama meta is pre-fetched;
 * CoinGecko market data comes from the cron cache (batch markets + platforms).
 */
async function refreshUniversalMetrics(
  item: Record<string, any>,
  slug: string,
  ctx: UniversalRefreshContext,
): Promise<{ tvlUsd: number | null; priceUsd: number | null; note: string; wrote: boolean }> {
  const now = nowIso();
  const notes: string[] = [];
  const sourced = <T,>(
    value: T,
    sourceLabel: string,
    dataSource: "live" | "derived" = "live",
  ): Sourced<T> => ({ value, dataSource, sourceLabel, updatedAt: now });

  const { meta, cgCache, feesGithub } = ctx;
  if (meta) notes.push("llama meta");

  const llamaSlug = llamaProtocolForSlug(slug);
  const geckoId = meta?.geckoId ?? coinIdForNetworkSlug(slug);
  let resolution: TokenResolution | null = null;
  if (geckoId) {
    resolution = await cgCache.resolve(geckoId, { platforms: true });
    if (resolution) notes.push("cg market");
  }

  const contracts: TokenDeployment[] = resolution
    ? Object.entries(resolution.platforms)
        .filter(([, address]) => address)
        .map(([chain, address]) => ({ chain, address }))
    : [];

  const portalMeta = (item.ArbitrumPortalMetadata ?? {}) as Record<string, any>;
  const prior = (item.UniversalMetrics ?? {}) as Partial<UniversalMetrics>;
  const priorIdentity = prior.identity;

  const llamaLive = meta != null;
  const llamaLabel = llamaLive ? "DeFi Llama" : "Unavailable";
  const cgLive = resolution != null;

  const foundedFresh = sourced(
    meta?.listedAtIso ?? (portalMeta.foundedDate ?? null),
    meta?.listedAtIso ? "DeFi Llama" : "Curated",
    meta?.listedAtIso ? "live" : "derived",
  );
  const chainsFresh = sourced(
    meta?.chains?.length ? meta.chains : ((portalMeta.chains as string[] | undefined) ?? []),
    meta?.chains?.length ? "DeFi Llama" : "Curated",
    meta?.chains?.length ? "live" : "derived",
  );
  const contractsFresh = sourced(
    contracts.length > 0 ? contracts : [],
    cgLive ? "CoinGecko" : "Unavailable",
    cgLive ? "live" : "derived",
  );
  const llamaCategoryFresh = sourced(
    meta?.category ?? null,
    llamaLabel,
    llamaLive ? "live" : "derived",
  );

  const identity: UniversalIdentity = {
    foundedDate: mergeSourced(foundedFresh, priorIdentity?.foundedDate, (v) => v == null),
    chains: mergeSourced(chainsFresh, priorIdentity?.chains, isEmptyArray),
    contracts: mergeSourced(contractsFresh, priorIdentity?.contracts, isEmptyArray),
    llamaCategory: mergeSourced(llamaCategoryFresh, priorIdentity?.llamaCategory, (v) => v == null),
    ...(llamaLive && meta?.url != null
      ? { url: sourced(meta.url, "DeFi Llama") }
      : priorIdentity?.url
        ? { url: priorIdentity.url }
        : {}),
    ...(llamaLive && meta?.twitter != null
      ? { twitter: sourced(meta.twitter, "DeFi Llama") }
      : priorIdentity?.twitter
        ? { twitter: priorIdentity.twitter }
        : {}),
    ...(llamaLive && meta?.auditLinks?.length
      ? { auditLinks: sourced(meta.auditLinks, "DeFi Llama") }
      : priorIdentity?.auditLinks
        ? { auditLinks: priorIdentity.auditLinks }
        : {}),
    ...(llamaLive && meta?.logo != null
      ? { logo: sourced(meta.logo, "DeFi Llama") }
      : priorIdentity?.logo
        ? { logo: priorIdentity.logo }
        : {}),
    ...(feesGithub
      ? { github: sourced(feesGithub, "DeFi Llama") }
      : priorIdentity?.github
        ? { github: priorIdentity.github }
        : {}),
    ...(priorIdentity?.tokenStandard ? { tokenStandard: priorIdentity.tokenStandard } : {}),
    ...(priorIdentity?.jurisdiction ? { jurisdiction: priorIdentity.jurisdiction } : {}),
    ...(priorIdentity?.hq ? { hq: priorIdentity.hq } : {}),
    ...(priorIdentity?.entityType ? { entityType: priorIdentity.entityType } : {}),
  };

  const marketCapUsd = resolution?.marketCapUsd ?? meta?.mcapUsd ?? null;
  const marketCapSource =
    resolution?.marketCapUsd != null ? "CoinGecko" : llamaLive ? "DeFi Llama" : "Unavailable";

  const marketFresh: UniversalMarket = {
    priceUsd: sourced(
      resolution?.priceUsd ?? null,
      cgLive ? "CoinGecko" : "Unavailable",
      cgLive ? "live" : "derived",
    ),
    marketCapUsd: sourced(
      marketCapUsd,
      marketCapSource,
      marketCapUsd != null ? "live" : "derived",
    ),
    fdvUsd: sourced(
      resolution?.fdvUsd ?? null,
      cgLive ? "CoinGecko" : "Unavailable",
      cgLive ? "live" : "derived",
    ),
    circulatingSupply: sourced(
      resolution?.circulatingSupply ?? null,
      cgLive ? "CoinGecko" : "Unavailable",
      cgLive ? "live" : "derived",
    ),
    totalSupply: sourced(
      resolution?.totalSupplyUnits ?? null,
      cgLive ? "CoinGecko" : "Unavailable",
      cgLive ? "live" : "derived",
    ),
    priceChangePct: {
      d1: sourced(
        resolution?.change24hPct ?? null,
        cgLive ? "CoinGecko" : "Unavailable",
        cgLive ? "live" : "derived",
      ),
      d7: sourced(
        resolution?.priceChange7dPct ?? null,
        cgLive ? "CoinGecko" : "Unavailable",
        cgLive ? "live" : "derived",
      ),
      d30: sourced(
        resolution?.priceChange30dPct ?? null,
        cgLive ? "CoinGecko" : "Unavailable",
        cgLive ? "live" : "derived",
      ),
    },
    marketCapRank: sourced(
      resolution?.marketCapRank ?? null,
      cgLive ? "CoinGecko" : "Unavailable",
      cgLive ? "live" : "derived",
    ),
  };

  const priorMarket = prior.market;
  const market: UniversalMarket = {
    priceUsd: mergeSourced(marketFresh.priceUsd, priorMarket?.priceUsd, isNullishNumber),
    marketCapUsd: mergeSourced(marketFresh.marketCapUsd, priorMarket?.marketCapUsd, isNullishNumber),
    fdvUsd: mergeSourced(marketFresh.fdvUsd, priorMarket?.fdvUsd, isNullishNumber),
    circulatingSupply: mergeSourced(
      marketFresh.circulatingSupply,
      priorMarket?.circulatingSupply,
      isNullishNumber,
    ),
    totalSupply: mergeSourced(marketFresh.totalSupply, priorMarket?.totalSupply, isNullishNumber),
    priceChangePct: {
      d1: mergeSourced(marketFresh.priceChangePct.d1, priorMarket?.priceChangePct?.d1, isNullishNumber),
      d7: mergeSourced(marketFresh.priceChangePct.d7, priorMarket?.priceChangePct?.d7, isNullishNumber),
      d30: mergeSourced(
        marketFresh.priceChangePct.d30,
        priorMarket?.priceChangePct?.d30,
        isNullishNumber,
      ),
    },
    marketCapRank: mergeSourced(
      marketFresh.marketCapRank,
      priorMarket?.marketCapRank,
      isNullishNumber,
    ),
  };

  // Alchemy supply + ERC-20 probe when CoinGecko market data is unavailable.
  if (hasAlchemy()) {
    const arbDeploy = arbDeploymentFromContracts(contracts);
    if (arbDeploy?.address) {
      if (market.totalSupply.value == null || market.circulatingSupply.value == null) {
        const supply = await fetchTotalSupply(
          arbDeploy.address,
          resolution?.decimals ?? null,
        );
        if (supply.value != null) {
          if (market.totalSupply.value == null) {
            market.totalSupply = sourced(supply.value, "Alchemy", "live");
          }
          if (market.circulatingSupply.value == null) {
            market.circulatingSupply = sourced(supply.value, "Alchemy", "live");
          }
          notes.push("alchemy supply");
        }
      }
      if (!identity.tokenStandard) {
        const std = await probeErc20Standard(arbDeploy.address);
        if (std) {
          identity.tokenStandard = sourced(std, "Alchemy", "live");
          notes.push("token standard");
        }
      }
    }
  }

  const tvlFresh: UniversalTvl = {
    tvlUsd: sourced(meta?.tvlUsdLatest ?? null, llamaLabel, llamaLive ? "live" : "derived"),
    tvlChangePct: {
      d1: sourced(meta?.tvlChangePct.d1 ?? null, llamaLabel, "derived"),
      d7: sourced(meta?.tvlChangePct.d7 ?? null, llamaLabel, "derived"),
    },
    perChain: sourced(meta?.currentChainTvls ?? [], llamaLabel, llamaLive ? "live" : "derived"),
  };

  const priorTvl = prior.tvl;
  const tvl: UniversalTvl = {
    tvlUsd: mergeSourced(tvlFresh.tvlUsd, priorTvl?.tvlUsd, isNullishNumber),
    tvlChangePct: {
      d1: mergeSourced(tvlFresh.tvlChangePct.d1, priorTvl?.tvlChangePct?.d1, isNullishNumber),
      d7: mergeSourced(tvlFresh.tvlChangePct.d7, priorTvl?.tvlChangePct?.d7, isNullishNumber),
    },
    perChain: mergeSourced(tvlFresh.perChain, priorTvl?.perChain, isEmptyArray),
  };

  const holderCount: Sourced<number | null> =
    prior.holderCount && prior.holderCount.value != null
      ? prior.holderCount
      : sourced<number | null>(null, "Deferred — no turnkey API", "derived");

  const hasLiveData =
    llamaLive ||
    cgLive ||
    (prior.tvl?.tvlUsd?.value ?? null) != null ||
    (prior.market?.priceUsd?.value ?? null) != null;

  const universal: UniversalMetrics = {
    identity,
    market,
    tvl,
    holderCount,
    coingeckoId: resolution ? geckoId ?? null : prior.coingeckoId ?? null,
    llamaSlug: llamaSlug ?? prior.llamaSlug ?? null,
    cmcId: meta?.cmcId ?? prior.cmcId ?? null,
    syncedAt: now,
  };
  item.UniversalMetrics = universal;

  if (isNetworkCategory(String(item.Category ?? ""))) {
    promoteIdentityToProfileFields(item, identity, feesGithub);
  }

  if ((item.CurrentScale?.tvlUsd ?? null) == null && meta?.tvlUsdLatest != null) {
    item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd: meta.tvlUsdLatest };
  }
  if ((item.CurrentScale?.marketCapUsd ?? null) == null && marketCapUsd != null) {
    item.CurrentScale = { ...(item.CurrentScale ?? {}), marketCapUsd };
  }

  return {
    tvlUsd: tvl.tvlUsd.value,
    priceUsd: market.priceUsd.value,
    note: notes.join("; ") || "no provider mapping",
    wrote: hasLiveData || priorIdentity != null || priorMarket != null || priorTvl != null,
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

  // Peg history: Llama's USD ratio for USD-pegged coins; then Llama's dedicated
  // /stablecoinprices depeg track; then CoinGecko market_chart in the peg
  // currency (e.g. EURe charted vs EUR).
  const charts = await fetchLlamaStablecoinCharts(slug, HISTORY_DAYS);
  if (charts && charts.pegPrice.length >= 2) {
    item.HistoricalPegData = {
      points: charts.pegPrice.map((p) => ({ date: p.date, price: p.value })),
      source: "defillama",
      updatedAt: nowIso(),
    };
    mutated = true;
  } else {
    const pegPrices = await fetchLlamaStablecoinPrices(slug, HISTORY_DAYS);
    if (pegPrices.length >= 2) {
      item.HistoricalPegData = {
        points: pegPrices.map((p) => ({ date: p.date, price: p.value })),
        source: "defillama",
        updatedAt: nowIso(),
      };
      mutated = true;
      return mutated;
    }
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

/**
 * DeFi Llama "dimensions" pass — runs for any category. Writes (when mapped):
 *   - ProtocolFeesRevenue (fees/revenue/holders-revenue + methodology) — all categories
 *   - DexVolume (DEX trading volume) — Entities + Tokens
 *   - YieldMechanics (pool APY + history) — Tokens (skips Aave aTokens, which the
 *     on-chain Aave pass owns)
 *   - Market.priceUsd / change24hPct / PriceHistory — Tokens unlisted on CoinGecko
 *     (only when no CoinGecko price was resolved this run)
 *
 * `pools` is a single shared `/pools` snapshot so this never refetches per item.
 */
async function refreshLlamaDimensions(
  item: Record<string, any>,
  slug: string,
  category: string,
  pools: LlamaPool[],
): Promise<{ mutated: boolean; note: string }> {
  let mutated = false;
  const notes: string[] = [];

  // Fees & revenue (all categories that map to a Llama fees protocol).
  const feesRev = await fetchLlamaFeesRevenue(slug);
  if (feesRev) {
    item.ProtocolFeesRevenue = {
      fees24hUsd: feesRev.fees24hUsd,
      fees7dUsd: feesRev.fees7dUsd,
      fees30dUsd: feesRev.fees30dUsd,
      feesAllTimeUsd: feesRev.feesAllTimeUsd,
      revenue24hUsd: feesRev.revenue24hUsd,
      revenue7dUsd: feesRev.revenue7dUsd,
      revenue30dUsd: feesRev.revenue30dUsd,
      holdersRevenue24hUsd: feesRev.holdersRevenue24hUsd,
      feesChange1dPct: feesRev.feesChange1dPct,
      methodology: feesRev.methodology,
      methodologyUrl: feesRev.methodologyUrl,
      llamaCategory: feesRev.category,
      source: "defillama",
      updatedAt: nowIso(),
    };
    if (!item.GitHub && feesRev.githubUrls.length > 0) {
      item.GitHub = feesRev.githubUrls[0];
      notes.push("github");
    }
    mutated = true;
    notes.push("fees/rev");
  }

  // DEX volume (networks + tokens that are DEXes).
  if (isNetworkCategory(category) || category === CATEGORY_TOKEN) {
    const dex = await fetchLlamaDexVolume(slug);
    if (dex) {
      item.DexVolume = { ...dex, source: "defillama", updatedAt: nowIso() };
      mutated = true;
      notes.push("dex vol");
    }
  }

  // Yields APY (tokens + yield-bearing stablecoins). aTokens owned by Aave pass.
  const yieldCategories = new Set([CATEGORY_TOKEN, CATEGORY_STABLECOIN]);
  if (yieldCategories.has(category) && !AAVE_ATOKEN_SLUGS.has(slug)) {
    const pool = resolveLlamaYieldPool(slug, pools);
    if (pool && pool.apyPct !== null) {
      const apyHistory = await fetchLlamaYieldChart(pool.poolId, HISTORY_DAYS);
      item.YieldMechanics = {
        currentApyPct: pool.apyPct,
        ...(pool.apyMean30dPct !== null ? { apy30dPct: pool.apyMean30dPct } : {}),
        feeShareToHoldersPct: 0,
        yieldSource: `DeFi Llama pool — ${pool.project} ${pool.symbol} on ${pool.chain}`,
        isAutoCompounding: true,
        emissionsBased: (pool.apyRewardPct ?? 0) > 0,
        payoutAsset: "Accrues into the pool position (base APY; rewards where applicable)",
        ...(apyHistory.length >= 2
          ? { apyHistory: apyHistory.map((p) => ({ date: p.date, price: p.value })) }
          : {}),
        dataSource: "live",
      };
      mutated = true;
      notes.push("yield apy");
    }
  }

  // Coins price fallback (unlisted on CoinGecko but with a known address).
  const priceFallbackCategories = new Set([CATEGORY_TOKEN, CATEGORY_STABLECOIN]);
  if (
    priceFallbackCategories.has(category) &&
    (item.Market?.priceUsd?.value ?? null) == null &&
    item.ContractAddress
  ) {
    const portal = item.ArbitrumPortalMetadata ?? {};
    const chains = (portal.chains as string[] | undefined) ?? item.Chains ?? [];
    const primaryChain = chains[0] ?? "Ethereum";
    const keys = llamaCoinKeysForAddress(String(item.ContractAddress), primaryChain);
    let applied = false;
    for (const key of keys) {
      const price = await fetchLlamaCoinPrice(key);
      if (price && price.priceUsd !== null) {
        const sourced = (value: number | null) => ({
          value,
          dataSource: "live" as const,
          sourceLabel: "DeFi Llama",
          updatedAt: nowIso(),
        });
        const pct = await fetchLlamaCoinPercentage(key);
        item.Market = {
          ...(item.Market ?? {}),
          priceUsd: sourced(price.priceUsd),
          change24hPct: sourced(pct),
        };
        const chart = await fetchLlamaCoinChart(key, HISTORY_DAYS);
        if (chart.length >= 2) {
          item.PriceHistory = {
            points: chart.map((p) => ({ date: p.date, price: p.value })),
            dataSource: "live",
            updatedAt: nowIso(),
          };
        }
        mutated = true;
        notes.push("llama price");
        applied = true;
        break;
      }
    }
    if (!applied) {
      // keys tried but no price — leave for next run
    }
  }

  return { mutated, note: notes.join("; ") };
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

  // Yields `/pools` is one large keyless payload; fetch it once and reuse the
  // snapshot for every slug's pool resolution. Fails soft to an empty list.
  const llamaPools = await fetchLlamaPools();

  const cgCache = new CoinGeckoCronCache();
  const productCoinIds = [
    ...new Set(
      items
        .filter((it) => {
          const slug = String(it.Slug ?? "");
          const category = String(it.Category ?? "");
          return COINGECKO_IDS[slug] && !isNetworkCategory(category);
        })
        .map((it) => COINGECKO_IDS[String(it.Slug ?? "")])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  await cgCache.prefetchMarkets(productCoinIds);

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

    // 1. CoinGecko resolution for member coins only (networks use the universal pass).
    if (COINGECKO_IDS[slug] && !isNetworkCategory(category)) {
      resolution = await cgCache.resolveForProductSlug(slug, true);
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

    // Persist CoinGecko market block (agent-readable + bootstrap export).
    // Independent of address: Solana tokens and Ethereum-only stables have
    // market data but may lack an Arbitrum contract.
    const marketCategories = new Set([CATEGORY_TOKEN, CATEGORY_STABLECOIN]);
    if (marketCategories.has(category) && resolution && resolution.priceUsd !== null) {
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

    // DeFi Llama dimensions: fees/revenue (all categories), DEX volume, yield
    // APY, and a contract-address price fallback for tokens unlisted on CoinGecko.
    const dims = await refreshLlamaDimensions(item, slug, category, llamaPools);
    if (dims.mutated) {
      mutated = true;
      row.note = row.note ? `${row.note}; ${dims.note}` : dims.note;
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
          const aTokenAddr = aTokenAddressForSlug(slug);
          if (aTokenAddr) {
            item.ContractAddress = aTokenAddr.toLowerCase();
          }
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
      } else if (isNetworkCategory(category) && slug === "aave") {
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

  // --- Credit networks: DeFi Llama live metrics ----------------------------
  // For each network tagged sector "Credit", overlay live supply/borrow/APY/
  // utilization (yields /poolsBorrow), protocol TVL, and fees/revenue onto the
  // curated `Lending` block (field name retained per migration). Curated
  // string/array fields (risk params, oracles, bad debt, audit) are preserved.
  const lendingItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      String(it.Sector ?? "") === "Credit" &&
      llamaLendingProjectForSlug(String(it.Slug ?? "")) !== null,
  );
  const lendingResults: { slug: string; tvlUsd: number | null; utilizationPct: number | null }[] =
    [];
  if (lendingItems.length > 0) {
    const sourced = (value: number | null) => ({
      value,
      dataSource: "live" as const,
      sourceLabel: "DeFi Llama",
      updatedAt: nowIso(),
    });
    const borrowPools = await fetchLlamaBorrowPools();
    for (const item of lendingItems) {
      const slug = String(item.Slug ?? "");
      const borrow = aggregateLendingBorrow(slug, borrowPools);
      const tvl = await fetchLlamaProtocolTvl(slug, 1);
      const tvlUsd = tvl && tvl.points.length > 0 ? tvl.points[tvl.points.length - 1].value : null;
      const feesRev = item.ProtocolFeesRevenue ?? null;

      const supplyApy = borrow?.supplyApyPct ?? null;
      const borrowApy = borrow?.borrowApyPct ?? null;
      const nim =
        supplyApy != null && borrowApy != null ? borrowApy - supplyApy : null;

      const live: Record<string, unknown> = {
        ...(tvlUsd != null ? { tvlUsd: sourced(tvlUsd) } : {}),
        ...(borrow?.totalBorrowUsd != null
          ? { totalBorrowsUsd: sourced(borrow.totalBorrowUsd) }
          : {}),
        ...(borrow?.utilizationPct != null
          ? { utilizationPct: sourced(borrow.utilizationPct) }
          : {}),
        ...(supplyApy != null ? { supplyApyPct: sourced(supplyApy) } : {}),
        ...(borrowApy != null ? { borrowApyPct: sourced(borrowApy) } : {}),
        ...(nim != null ? { netInterestMarginPct: sourced(nim) } : {}),
        ...(feesRev?.revenue30dUsd != null
          ? { revenue30dUsd: sourced(feesRev.revenue30dUsd) }
          : {}),
        ...(feesRev?.fees30dUsd != null ? { fees30dUsd: sourced(feesRev.fees30dUsd) } : {}),
        ...(feesRev?.revenue30dUsd != null
          ? { revenueAnnualizedUsd: sourced(feesRev.revenue30dUsd * 12) }
          : {}),
        ...(feesRev?.fees30dUsd != null
          ? { feesAnnualizedUsd: sourced(feesRev.fees30dUsd * 12) }
          : {}),
      };

      if (Object.keys(live).length > 0) {
        // Preserve curated fields; overlay live (Sourced) fields.
        item.Lending = { ...(item.Lending ?? {}), ...live };
        // Headline TVL on the network card mirrors the lending TVL when present.
        if (tvlUsd != null) {
          item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd };
        }
        item.UpdatedAt = nowIso();
        await putItem(item);
        updated += 1;
        lendingResults.push({ slug, tvlUsd, utilizationPct: borrow?.utilizationPct ?? null });
      }
    }
  }

  // --- Credit tag-metrics overlay: per-tag live blocks (creditTagMetrics) ---
  // For every Credit network (primary or secondary), populate the tag-keyed
  // `CreditTagMetrics` block from its `Tags`: Lending (supply/borrow/util/APY via
  // /poolsBorrow + protocol TVL), Leveraged Yield (TVL), Fixed Income (TVL).
  // Curated fields are preserved; the Morpho-specific overlay below spreads
  // richer tag data on top (this pass runs first).
  const creditItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      (String(it.Sector ?? "") === "Credit" ||
        (Array.isArray(it.SecondarySectors) && it.SecondarySectors.includes("Credit"))),
  );
  const creditTagResults: { slug: string; tags: string[] }[] = [];
  if (creditItems.length > 0) {
    const sourced = (value: number | null) => ({
      value,
      dataSource: "live" as const,
      sourceLabel: "DeFi Llama",
      updatedAt: nowIso(),
    });
    const borrowPools = await fetchLlamaBorrowPools();
    for (const item of creditItems) {
      const slug = String(item.Slug ?? "");
      const tags: string[] = Array.isArray(item.Tags) ? item.Tags : [];
      if (tags.length === 0) continue;

      const tvl = await fetchLlamaProtocolTvl(slug, 1);
      const tvlUsd = tvl && tvl.points.length > 0 ? tvl.points[tvl.points.length - 1].value : null;
      const ctm: Record<string, any> = {
        ...(item.CreditTagMetrics ?? {}),
      };
      let wrote = false;

      if (tags.includes("Lending")) {
        const borrow = aggregateLendingBorrow(slug, borrowPools);
        const lendingBlock: Record<string, unknown> = { ...(ctm.lending ?? {}) };
        if (tvlUsd != null) lendingBlock.totalSuppliedUsd = sourced(tvlUsd);
        if (borrow?.totalBorrowUsd != null)
          lendingBlock.totalBorrowsUsd = sourced(borrow.totalBorrowUsd);
        if (borrow?.utilizationPct != null)
          lendingBlock.utilizationPct = sourced(borrow.utilizationPct);
        if (borrow?.supplyApyPct != null) lendingBlock.supplyApyPct = sourced(borrow.supplyApyPct);
        if (borrow?.borrowApyPct != null) lendingBlock.borrowApyPct = sourced(borrow.borrowApyPct);
        if (Object.keys(lendingBlock).length > 0) {
          ctm.lending = lendingBlock;
          wrote = true;
        }
      }
      if (tags.includes("Leveraged Yield") && tvlUsd != null) {
        ctm.leveragedYield = { ...(ctm.leveragedYield ?? {}), tvlUsd: sourced(tvlUsd) };
        wrote = true;
      }
      if (tags.includes("Fixed Income") && tvlUsd != null) {
        ctm.fixedIncome = { ...(ctm.fixedIncome ?? {}), tvlUsd: sourced(tvlUsd) };
        wrote = true;
      }

      if (wrote) {
        item.CreditTagMetrics = ctm;
        if (tvlUsd != null && (item.CurrentScale?.tvlUsd ?? null) == null) {
          item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd };
        }
        item.UpdatedAt = nowIso();
        await putItem(item);
        updated += 1;
        creditTagResults.push({ slug, tags });
      }
    }
  }

  // --- DEX networks: DeFi Llama live TVL + volume --------------------------
  // For each network tagged sector "DEX", overlay live protocol TVL and 30d
  // trading volume onto the curated `Dex` block. Curated fields (governance
  // token, audit history, deployment, subSectorMetrics) are preserved. Open
  // interest / funding stay curated (no derivatives feed this phase).
  const dexItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      String(it.Sector ?? "") === "DEX" &&
      llamaProtocolForSlug(String(it.Slug ?? "")) !== null,
  );
  const dexResults: { slug: string; tvlUsd: number | null; volume30dUsd: number | null }[] = [];
  if (dexItems.length > 0) {
    const sourced = (value: number | null) => ({
      value,
      dataSource: "live" as const,
      sourceLabel: "DeFi Llama",
      updatedAt: nowIso(),
    });
    for (const item of dexItems) {
      const slug = String(item.Slug ?? "");
      const tvl = await fetchLlamaProtocolTvl(slug, 1);
      const tvlUsd = tvl && tvl.points.length > 0 ? tvl.points[tvl.points.length - 1].value : null;
      const dexVol = await fetchLlamaDexVolume(slug);
      const volume30dUsd = dexVol?.volume30dUsd ?? null;

      const live: Record<string, unknown> = {
        ...(tvlUsd != null ? { tvlUsd: sourced(tvlUsd) } : {}),
        ...(volume30dUsd != null ? { volume30dUsd: sourced(volume30dUsd) } : {}),
      };

      if (Object.keys(live).length > 0) {
        // Preserve curated fields; overlay live (Sourced) fields.
        item.Dex = { ...(item.Dex ?? {}), ...live };
        if (tvlUsd != null) {
          item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd };
        }
        item.UpdatedAt = nowIso();
        await putItem(item);
        updated += 1;
        dexResults.push({ slug, tvlUsd, volume30dUsd });
      }
    }
  }

  // --- RWA networks: DeFi Llama live AUM (protocol TVL) --------------------
  // For each network tagged sector "RWA", overlay live protocol TVL as `aumUsd`
  // onto the curated `Rwa` block. Curated fields (regulatory status, audit
  // history, deployment, subSectorMetrics) are preserved.
  const rwaNetworkItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      String(it.Sector ?? "") === "RWA" &&
      llamaProtocolForSlug(String(it.Slug ?? "")) !== null,
  );
  const rwaResults: { slug: string; aumUsd: number | null }[] = [];
  const rwaMissingAum: string[] = [];
  if (rwaNetworkItems.length > 0) {
    const sourced = (value: number | null) => ({
      value,
      dataSource: "live" as const,
      sourceLabel: "DeFi Llama",
      updatedAt: nowIso(),
    });
    for (const item of rwaNetworkItems) {
      const slug = String(item.Slug ?? "");
      const tvl = await fetchLlamaProtocolTvl(slug, 1);
      const aumUsd = tvl && tvl.points.length > 0 ? tvl.points[tvl.points.length - 1].value : null;
      if (aumUsd != null) {
        item.Rwa = { ...(item.Rwa ?? {}), aumUsd: sourced(aumUsd) };
        item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd: aumUsd };
        item.UpdatedAt = nowIso();
        await putItem(item);
        updated += 1;
        rwaResults.push({ slug, aumUsd });
      } else {
        rwaMissingAum.push(slug);
      }
    }
  }

  // --- Staking networks: DeFi Llama + CoinGecko Tier-1 metrics --------------
  // For each network tagged sector "Staking" (primary or secondary, e.g. Frax),
  // overlay live Tier-1 staking metrics (totalStakedUsd, tvlChangePct, token
  // price/mcap, base-asset exchange rate, fees, derived marketSharePct) onto the
  // curated `Staking` block. Tier-2 fields (validators, AVS, slashing,
  // governance) stay curated/null. Metrics are derived across the full seed set
  // so market-share is accurate even when a protocol isn't in the store yet.
  const stakingResults: { slug: string; totalStakedUsd: number | null }[] = [];
  const stakingItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      (String(it.Sector ?? "") === "Staking" ||
        (Array.isArray(it.SecondarySectors) && it.SecondarySectors.includes("Staking"))),
  );
  if (stakingItems.length > 0) {
    const metricsBySlug = await collectAllStakingMetrics(STAKING_SEED);
    for (const item of stakingItems) {
      const slug = String(item.Slug ?? "");
      const live = metricsBySlug.get(slug);
      if (!live || Object.keys(live).length === 0) continue;
      // Preserve curated Tier-2 fields; overlay live Tier-1 fields.
      item.Staking = { ...(item.Staking ?? {}), ...live };
      const totalStakedUsd = live.totalStakedUsd?.value ?? null;
      if (totalStakedUsd != null) {
        item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd: totalStakedUsd };
        syncUniversalTvlFromCurrentScale(item, "DeFi Llama staking TVL");
      }
      item.UpdatedAt = nowIso();
      await putItem(item);
      updated += 1;
      stakingResults.push({ slug, totalStakedUsd });
    }
  }

  // --- Liquidity networks: DeFi Llama + CoinGecko Tier-1 metrics -------------
  // For each network tagged sector "Liquidity" (primary, e.g. Yearn/Convex, or
  // secondary, e.g. the cross-tagged DEX venues Curve/Uniswap/...), overlay live
  // Tier-1 Liquidity metrics (tvlUsd, tvlChangePct, fees, token price/mcap,
  // derived marketSharePct) onto the curated `Liquidity` block. Tier-2 fields
  // (poolCount, vaultCount, avgVaultApyPct, governance) stay curated/null. The
  // headline CurrentScale.tvlUsd is only written for PRIMARY-Liquidity entities,
  // so the cross-tagged DEX venues keep their DEX-pass headline TVL.
  const liquidityResults: { slug: string; tvlUsd: number | null }[] = [];
  const liquidityItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      (String(it.Sector ?? "") === "Liquidity" ||
        (Array.isArray(it.SecondarySectors) && it.SecondarySectors.includes("Liquidity"))),
  );
  if (liquidityItems.length > 0) {
    const metricsBySlug = await collectAllLiquidityMetrics(LIQUIDITY_SEED);
    for (const item of liquidityItems) {
      const slug = String(item.Slug ?? "");
      const live = metricsBySlug.get(slug);
      if (!live || Object.keys(live).length === 0) continue;
      // Preserve curated Tier-2 fields; overlay live Tier-1 fields.
      item.Liquidity = { ...(item.Liquidity ?? {}), ...live };
      const tvlUsd = live.tvlUsd?.value ?? null;
      if (tvlUsd != null && String(item.Sector ?? "") === "Liquidity") {
        item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd };
        syncUniversalTvlFromCurrentScale(item, "DeFi Llama liquidity TVL");
      }
      item.UpdatedAt = nowIso();
      await putItem(item);
      updated += 1;
      liquidityResults.push({ slug, tvlUsd });
    }
  }

  // --- Derivatives networks: DeFi Llama + CoinGecko Tier-1 metrics -----------
  // For each network tagged sector "Derivatives" (primary, e.g. Synthetix/Aevo,
  // or secondary, e.g. the cross-tagged perp venues GMX/Gains/Hyperliquid and the
  // delta-neutral Ethena), overlay live Tier-1 Derivatives metrics (tvlUsd,
  // tvlChangePct, fees, token price/mcap, derived marketSharePct) onto the curated
  // `Derivatives` block. Tier-2 fields (maxLeverageX, vaultStrategies, hedgeVenue,
  // fundingRatePct, governance) stay curated/null. The headline CurrentScale.tvlUsd
  // is only written for PRIMARY-Derivatives entities, so the cross-tagged DEX /
  // Stablecoin venues keep their own (DEX / stablecoin-supply) headline.
  const derivativesResults: { slug: string; tvlUsd: number | null }[] = [];
  const derivativesItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      (String(it.Sector ?? "") === "Derivatives" ||
        (Array.isArray(it.SecondarySectors) && it.SecondarySectors.includes("Derivatives"))),
  );
  if (derivativesItems.length > 0) {
    const metricsBySlug = await collectAllDerivativesMetrics(DERIVATIVES_SEED);
    for (const item of derivativesItems) {
      const slug = String(item.Slug ?? "");
      const live = metricsBySlug.get(slug);
      if (!live || Object.keys(live).length === 0) continue;
      // Preserve curated Tier-2 fields; overlay live Tier-1 fields.
      item.Derivatives = { ...(item.Derivatives ?? {}), ...live };
      const tvlUsd = live.tvlUsd?.value ?? null;
      if (tvlUsd != null && String(item.Sector ?? "") === "Derivatives") {
        item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd };
        syncUniversalTvlFromCurrentScale(item, "DeFi Llama derivatives TVL");
      }
      item.UpdatedAt = nowIso();
      await putItem(item);
      updated += 1;
      derivativesResults.push({ slug, tvlUsd });
    }
  }

  // --- Other networks: DeFi Llama + CoinGecko Tier-1 metrics ------------------
  // For each network tagged sector "Other" (primary, e.g. Nexus/Sherlock, or
  // secondary, e.g. Convex/Aura), overlay live Tier-1 Other metrics (tvlUsd,
  // tvlChangePct, fees, token price/mcap, derived marketSharePct) onto the curated
  // `Other` block. Tier-2 underwriting/governance fields stay curated/null. The
  // headline CurrentScale.tvlUsd is only written for PRIMARY-Other entities, so
  // extend-existing Convex/Aura keep their Liquidity-pass headline TVL.
  const otherResults: { slug: string; tvlUsd: number | null }[] = [];
  const otherItems = items.filter(
    (it) =>
      isNetworkCategory(String(it.Category ?? "")) &&
      (String(it.Sector ?? "") === "Other" ||
        (Array.isArray(it.SecondarySectors) && it.SecondarySectors.includes("Other"))),
  );
  if (otherItems.length > 0) {
    const metricsBySlug = await collectAllOtherMetrics(OTHER_SEED);
    for (const item of otherItems) {
      const slug = String(item.Slug ?? "");
      const live = metricsBySlug.get(slug);
      if (!live || Object.keys(live).length === 0) continue;
      item.Other = { ...(item.Other ?? {}), ...live };
      const tvlUsd = live.tvlUsd?.value ?? null;
      if (tvlUsd != null && String(item.Sector ?? "") === "Other") {
        item.CurrentScale = { ...(item.CurrentScale ?? {}), tvlUsd };
        syncUniversalTvlFromCurrentScale(item, "DeFi Llama other TVL");
      }
      item.UpdatedAt = nowIso();
      await putItem(item);
      updated += 1;
      otherResults.push({ slug, tvlUsd });
    }
  }

  // --- Universal metrics: consistent Tier-1 block for EVERY network ----------
  const networkItems = items.filter((it) => isNetworkCategory(String(it.Category ?? "")));
  const llamaMetaBySlug = new Map<string, LlamaProtocolMeta | null>();
  const networkGeckoIds: string[] = [];

  for (const item of networkItems) {
    const slug = String(item.Slug ?? "");
    if (!slug) continue;
    const meta = await fetchLlamaProtocolMeta(slug);
    llamaMetaBySlug.set(slug, meta);
    const geckoId = meta?.geckoId ?? coinIdForNetworkSlug(slug);
    if (geckoId) networkGeckoIds.push(geckoId);
  }

  await cgCache.prefetchMarkets(networkGeckoIds);

  const universalResults: {
    slug: string;
    tvlUsd: number | null;
    priceUsd: number | null;
    note: string;
  }[] = [];
  for (const item of networkItems) {
    const slug = String(item.Slug ?? "");
    if (!slug) continue;
    const res = await refreshUniversalMetrics(item, slug, {
      meta: llamaMetaBySlug.get(slug) ?? null,
      cgCache,
      feesGithub: item.GitHub ? String(item.GitHub) : null,
    });
    if (res.wrote) {
      item.UpdatedAt = nowIso();
      await putItem(item);
      updated += 1;
    }
    universalResults.push({ slug, tvlUsd: res.tvlUsd, priceUsd: res.priceUsd, note: res.note });
  }

  // --- Options volume (sector === Options) ------------------------------------
  const optionsResults: { slug: string; notional24hUsd: number | null }[] = [];
  for (const item of networkItems) {
    if (!isOptionsNetwork(item)) continue;
    const slug = String(item.Slug ?? "");
    const protocol = llamaOptionsProtocolForSlug(slug);
    if (!protocol) continue;
    const opts = await fetchLlamaOptionsVolume(protocol);
    if (!opts) continue;
    item.OptionsVolume = {
      notionalVolume24hUsd: opts.notionalVolume24hUsd,
      notionalVolume30dUsd: opts.notionalVolume30dUsd,
      premiumVolume24hUsd: opts.premiumVolume24hUsd,
      premiumVolume30dUsd: opts.premiumVolume30dUsd,
      source: "defillama",
      updatedAt: nowIso(),
    };
    item.UpdatedAt = nowIso();
    await putItem(item);
    updated += 1;
    optionsResults.push({ slug, notional24hUsd: opts.notionalVolume24hUsd });
  }

  // --- Perp open interest (Perpetuals sector / sub-sector) --------------------
  const perpOiResults: { slug: string; openInterestUsd: number | null }[] = [];
  for (const item of networkItems) {
    if (!isPerpetualsNetwork(item)) continue;
    const slug = String(item.Slug ?? "");
    const protocol = llamaProtocolForSlug(slug);
    if (!protocol) continue;
    const oi = await fetchLlamaOpenInterest(protocol);
    if (!oi || oi.openInterestUsd == null) continue;
    item.OpenInterest = {
      openInterestUsd: oi.openInterestUsd,
      longOpenInterestUsd: oi.longOpenInterestUsd,
      shortOpenInterestUsd: oi.shortOpenInterestUsd,
      source: "defillama",
      updatedAt: nowIso(),
    };
    item.UpdatedAt = nowIso();
    await putItem(item);
    updated += 1;
    perpOiResults.push({ slug, openInterestUsd: oi.openInterestUsd });
  }

  // --- Chain-native lending overlays (Morpho, Kamino, TronGrid, Helius) --------
  const integrationStatus: Record<string, string> = {
    morpho: "skipped",
    kamino: "skipped",
    trongrid: hasTronGrid() ? "pending" : "missing_key",
    helius: hasHelius() ? "pending" : "missing_key",
  };

  const morphoMetrics = await fetchMorphoLiveMetrics();
  if (morphoMetrics?.tvlUsd != null) {
    integrationStatus.morpho = "ok";
    const morphoItem = items.find(
      (it) => isNetworkCategory(String(it.Category ?? "")) && String(it.Slug ?? "") === "morpho",
    );
    if (morphoItem) {
      morphoItem.Lending = {
        ...(morphoItem.Lending ?? {}),
        ...morphoMetricsToLendingOverlay(morphoMetrics),
      };
      morphoItem.CreditTagMetrics = {
        ...(morphoItem.CreditTagMetrics ?? {}),
        ...morphoMetricsToTagOverlay(morphoMetrics),
      };
      morphoItem.CurrentScale = {
        ...(morphoItem.CurrentScale ?? {}),
        tvlUsd: morphoMetrics.tvlUsd,
      };
      syncUniversalTvlFromCurrentScale(morphoItem, "Morpho API");
      morphoItem.UpdatedAt = nowIso();
      await putItem(morphoItem);
      updated += 1;
    }
  } else if (morphoMetrics === null) {
    integrationStatus.morpho = "error";
  }

  const kaminoMetrics = await fetchKaminoLiveMetrics();
  if (kaminoMetrics?.tvlUsd != null) {
    integrationStatus.kamino = "ok";
    const kaminoItem = items.find(
      (it) => isNetworkCategory(String(it.Category ?? "")) && String(it.Slug ?? "") === "kamino",
    );
    if (kaminoItem) {
      kaminoItem.Lending = {
        ...(kaminoItem.Lending ?? {}),
        ...kaminoMetricsToLendingOverlay(kaminoMetrics),
      };
      kaminoItem.CurrentScale = {
        ...(kaminoItem.CurrentScale ?? {}),
        tvlUsd: kaminoMetrics.tvlUsd,
      };
      syncUniversalTvlFromCurrentScale(kaminoItem, "Kamino API");
      kaminoItem.UpdatedAt = nowIso();
      await putItem(kaminoItem);
      updated += 1;
    }
  } else if (kaminoMetrics === null) {
    integrationStatus.kamino = "error";
  }

  if (hasTronGrid()) {
    const justLendMetrics = await fetchJustLendLiveMetrics();
    if (justLendMetrics) {
      integrationStatus.trongrid = "ok";
      const justItem = items.find(
        (it) => isNetworkCategory(String(it.Category ?? "")) && String(it.Slug ?? "") === "justlend",
      );
      if (justItem) {
        justItem.Lending = {
          ...(justItem.Lending ?? {}),
          ...justLendMetricsToLendingOverlay(justLendMetrics),
        };
        const lendingTvl = (justItem.Lending as { tvlUsd?: { value?: number | null } } | undefined)
          ?.tvlUsd?.value;
        if (lendingTvl != null) {
          justItem.CurrentScale = {
            ...(justItem.CurrentScale ?? {}),
            tvlUsd: lendingTvl,
          };
          syncUniversalTvlFromCurrentScale(justItem, "TronGrid / JustLend");
        }
        justItem.UpdatedAt = nowIso();
        await putItem(justItem);
        updated += 1;
      }
    } else {
      integrationStatus.trongrid = "error";
    }
  }

  if (hasHelius()) {
    const kmnoSupply = await fetchHeliusTokenSupply(KMNO_MINT);
    if (kmnoSupply?.supply != null) {
      integrationStatus.helius = "ok";
      const kmnoItem = items.find(
        (it) => String(it.Category ?? "") === CATEGORY_TOKEN && String(it.Slug ?? "") === "kmno",
      );
      if (kmnoItem) {
        kmnoItem.TotalSupply = {
          value: kmnoSupply.supply,
          source: "helius",
          updatedAt: nowIso(),
        };
        kmnoItem.UpdatedAt = nowIso();
        await putItem(kmnoItem);
        updated += 1;
      }
    } else {
      integrationStatus.helius = "error";
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
    if (ref.category === CATEGORY_RWA) return rwaLatestTvlUsd(member);
    if (ref.category === CATEGORY_TOKEN) return member.Market?.marketCapUsd?.value ?? null;
    return null;
  };
  let stablecoinSupplyUpdated = 0;
  for (const item of items) {
    if (!isNetworkCategory(String(item.Category ?? ""))) continue;
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
    syncUniversalTvlFromCurrentScale(item, "Member supply sum");
    if (String(item.Sector ?? "") === "Stablecoin") {
      const sourced = {
        value: total,
        dataSource: "live" as const,
        sourceLabel: "Member supply sum",
        updatedAt: nowIso(),
      };
      item.Stablecoin = { ...(item.Stablecoin ?? {}), currentSupplyUsd: sourced };
      stablecoinSupplyUpdated += 1;
    }
    item.UpdatedAt = nowIso();
    await putItem(item);
    updated += 1;
  }

  // Reconcile universal TVL with headline CurrentScale when sector passes ran before universal.
  for (const item of networkItems) {
    const scaleTvl = item.CurrentScale?.tvlUsd;
    if (scaleTvl == null || typeof scaleTvl !== "number") continue;
    const uTvl = (item.UniversalMetrics as UniversalMetrics | undefined)?.tvl?.tvlUsd?.value;
    if (uTvl === scaleTvl) continue;
    const slug = String(item.Slug ?? "");
    let label = "Headline TVL";
    if (slug === "morpho") label = "Morpho API";
    else if (slug === "kamino") label = "Kamino API";
    else if (slug === "justlend") label = "TronGrid / JustLend";
    else if (String(item.Sector ?? "") === "Stablecoin") label = "Member supply sum";
    else if (String(item.Sector ?? "") === "DEX") label = "DeFi Llama DEX TVL";
    else if (String(item.Sector ?? "") === "Credit") label = "DeFi Llama lending TVL";
    else if (String(item.Sector ?? "") === "RWA") label = "DeFi Llama RWA AUM";
    else if (String(item.Sector ?? "") === "Staking") label = "DeFi Llama staking TVL";
    else if (String(item.Sector ?? "") === "Liquidity") label = "DeFi Llama liquidity TVL";
    if (syncUniversalTvlFromCurrentScale(item, label)) {
      item.UpdatedAt = nowIso();
      await putItem(item);
      updated += 1;
    }
  }

  // Refresh public surfaces + each touched detail page.
  revalidatePath("/");
  revalidatePath("/networks");
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
  // Network detail pages embed member-coin live data, so refresh them too.
  revalidatePath("/networks/[slug]", "page");

  return NextResponse.json({
    ok: true,
    backend: "upstash",
    alchemy: hasAlchemy ? "present" : "missing",
    total: items.length,
    updated,
    results,
    aave: aaveResults,
    lending: lendingResults,
    creditTags: creditTagResults,
    staking: stakingResults,
    liquidity: liquidityResults,
    derivatives: derivativesResults,
    other: otherResults,
    dex: dexResults,
    rwa: rwaResults,
    universal: universalResults,
    optionsVolume: optionsResults,
    perpOpenInterest: perpOiResults,
    rwaMissingAum,
    stablecoinSupplyUpdated,
    integrations: integrationStatus,
  });
}
