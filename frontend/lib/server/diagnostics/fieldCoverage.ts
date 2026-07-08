import "server-only";

import { COINGECKO_IDS, coinIdForNetworkSlug } from "@/lib/coingeckoIds";
import { llamaFeesProtocolsForSlug, llamaProtocolsForSlug } from "@/lib/server/defillama";
import type {
  NetworkProfile,
  ReceiptProfile,
  RwaProfile,
  StablecoinProfile,
  TokenProfile,
} from "@/lib/types";

/**
 * Field-coverage diagnostics (pure, read-only). For one network it reports, per
 * API-backed field, whether the value is live / curated / missing and *why* —
 * so the admin page can show which blanks are fixable (slug/id) vs. genuinely
 * uncovered by any upstream. No fetches, no writes: it reads the already-synced
 * store item and the curated resolver maps.
 */

export type FieldStatus = "live" | "curated" | "missing";

export type FieldReason =
  | "ok"
  | "no-llama-slug"
  | "llama-returned-null"
  | "no-coingecko-id"
  | "coingecko-returned-null"
  | "no-api-coverage"
  | "not-yet-refreshed"
  | "curated-only"
  // Coins & receipts (this spec):
  | "no-onchain-adapter" // exchange_rate / nav needs an on-chain reader not wired
  | "dangling-ref" // in a network's MemberCoins but no profile (or vice-versa)
  | "no-entity-link" // EntitySlug empty or points at a non-existent network
  | "curated-empty"; // Tier-2 curated scaffold expected for this type but unfilled

export type FieldSource = "DefiLlama" | "CoinGecko" | "Alchemy" | "curated" | "derived";

export interface FieldCoverage {
  field: string;
  source: FieldSource;
  status: FieldStatus;
  reason: FieldReason;
  /** The resolved value, or null. Never 0-vs-null ambiguous: callers render "—" for null. */
  value: string | number | null;
  /** DeFi Llama product slug(s) the pipeline aggregates for this field. */
  resolvedSlugs?: string[];
  /** CoinGecko coin id used (or would be used) for market data. */
  resolvedCoingeckoId?: string | null;
  /** ISO timestamp of the value's last refresh. */
  asOf?: string | null;
  /** Extra human detail (e.g. dangling member-coin slugs). */
  detail?: string;
}

type CoinProfile = StablecoinProfile | TokenProfile | RwaProfile | ReceiptProfile;

/** A member-coin ref resolved to its store profile (from getNetworkMemberCoins). */
export interface ResolvedMemberCoin {
  ref: NetworkProfile["memberCoins"][number];
  profile: CoinProfile | null;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** True when the universal pass has never written a synced block for this network. */
function notYetRefreshed(network: NetworkProfile): boolean {
  return !network.universalMetrics?.syncedAt;
}

/**
 * Per-field coverage rows for one network. `memberCoins` is the resolved
 * ref→profile list (from `getNetworkMemberCoins`); when omitted, the member-coin
 * row only reports the declared count without dangling-reference detection.
 */
export function computeFieldCoverage(
  network: NetworkProfile,
  memberCoins?: ResolvedMemberCoin[],
): FieldCoverage[] {
  const slug = network.slug;
  const um = network.universalMetrics;
  const rows: FieldCoverage[] = [];

  // --- tvlUsd (DeFi Llama, summed across products) --------------------------
  {
    const resolvedSlugs = llamaProtocolsForSlug(slug);
    const liveVal = num(um?.tvl?.tvlUsd?.value);
    const curatedVal = num(network.currentScale?.tvlUsd);
    if (resolvedSlugs.length === 0) {
      // No Llama adapter: a curated headline may still exist.
      rows.push({
        field: "tvlUsd",
        source: curatedVal != null ? "curated" : "DefiLlama",
        status: curatedVal != null ? "curated" : "missing",
        reason: curatedVal != null ? "curated-only" : "no-llama-slug",
        value: curatedVal,
        resolvedSlugs,
      });
    } else if (liveVal != null) {
      rows.push({
        field: "tvlUsd",
        source: "DefiLlama",
        status: "live",
        reason: "ok",
        value: liveVal,
        resolvedSlugs,
        asOf: um?.tvl?.tvlUsd?.updatedAt ?? um?.syncedAt ?? null,
      });
    } else if (curatedVal != null) {
      rows.push({
        field: "tvlUsd",
        source: "curated",
        status: "curated",
        reason: notYetRefreshed(network) ? "not-yet-refreshed" : "llama-returned-null",
        value: curatedVal,
        resolvedSlugs,
      });
    } else {
      rows.push({
        field: "tvlUsd",
        source: "DefiLlama",
        status: "missing",
        reason: notYetRefreshed(network) ? "not-yet-refreshed" : "llama-returned-null",
        value: null,
        resolvedSlugs,
      });
    }
  }

  // --- marketCapUsd (CoinGecko) ---------------------------------------------
  {
    // Effective id: curated network id, else whatever the cron resolved (which
    // may itself have come from Llama's gecko_id fallback).
    const resolvedCoingeckoId = coinIdForNetworkSlug(slug) ?? um?.coingeckoId ?? null;
    const liveVal = num(um?.market?.marketCapUsd?.value);
    const curatedVal = num(network.currentScale?.marketCapUsd);
    if (!resolvedCoingeckoId) {
      rows.push({
        field: "marketCapUsd",
        source: curatedVal != null ? "curated" : "CoinGecko",
        status: curatedVal != null ? "curated" : "missing",
        reason: curatedVal != null ? "curated-only" : "no-coingecko-id",
        value: curatedVal,
        resolvedCoingeckoId,
      });
    } else if (liveVal != null) {
      rows.push({
        field: "marketCapUsd",
        source: "CoinGecko",
        status: "live",
        reason: "ok",
        value: liveVal,
        resolvedCoingeckoId,
        asOf: um?.market?.marketCapUsd?.updatedAt ?? um?.syncedAt ?? null,
      });
    } else {
      rows.push({
        field: "marketCapUsd",
        source: curatedVal != null ? "curated" : "CoinGecko",
        status: curatedVal != null ? "curated" : "missing",
        reason: notYetRefreshed(network) ? "not-yet-refreshed" : "coingecko-returned-null",
        value: curatedVal,
        resolvedCoingeckoId,
      });
    }
  }

  // --- fees 24h / 7d / 30d (DeFi Llama fees) --------------------------------
  {
    const feesSlugs = llamaFeesProtocolsForSlug(slug);
    const pfr = network.protocolFeesRevenue;
    const feeFields: { field: string; value: number | null }[] = [
      { field: "fees24hUsd", value: num(pfr?.fees24hUsd) },
      { field: "fees7dUsd", value: num(pfr?.fees7dUsd) },
      { field: "fees30dUsd", value: num(pfr?.fees30dUsd) },
    ];
    for (const { field, value } of feeFields) {
      if (feesSlugs.length === 0) {
        rows.push({
          field,
          source: "DefiLlama",
          status: "missing",
          reason: "no-api-coverage",
          value: null,
          resolvedSlugs: feesSlugs,
        });
      } else if (value != null) {
        rows.push({
          field,
          source: "DefiLlama",
          status: "live",
          reason: "ok",
          value,
          resolvedSlugs: feesSlugs,
          asOf: pfr?.updatedAt ?? null,
        });
      } else {
        rows.push({
          field,
          source: "DefiLlama",
          status: "missing",
          reason: notYetRefreshed(network) ? "not-yet-refreshed" : "llama-returned-null",
          value: null,
          resolvedSlugs: feesSlugs,
        });
      }
    }
  }

  // --- memberCoins ("View all coins" gap) -----------------------------------
  {
    const count = network.memberCoins?.length ?? 0;
    if (memberCoins) {
      const dangling = memberCoins.filter((m) => m.profile === null).map((m) => m.ref.slug);
      // Member coins whose own market cap fails soft for lack of a curated id.
      const noMcapId = memberCoins
        .filter((m) => m.profile !== null && !(m.ref.slug in COINGECKO_IDS))
        .map((m) => m.ref.slug);
      const detailParts: string[] = [];
      if (dangling.length) detailParts.push(`dangling refs: ${dangling.join(", ")}`);
      if (noMcapId.length) detailParts.push(`no CoinGecko id: ${noMcapId.join(", ")}`);
      rows.push({
        field: "memberCoins",
        source: "curated",
        status: dangling.length ? "missing" : count > 0 ? "live" : "curated",
        reason: dangling.length || noMcapId.length ? "curated-only" : "ok",
        value: count,
        detail: detailParts.length ? detailParts.join("; ") : undefined,
      });
    } else {
      rows.push({
        field: "memberCoins",
        source: "curated",
        status: count > 0 ? "live" : "curated",
        reason: "ok",
        value: count,
      });
    }
  }

  // --- Company stats (curated / portal metadata) ----------------------------
  const portal = network.arbitrumPortalMetadata;
  const curatedStat = (field: string, value: number | string | null): FieldCoverage => ({
    field,
    source: "curated",
    status: value != null && value !== "" ? "curated" : "missing",
    reason: "curated-only",
    value: value === "" ? null : value,
  });
  rows.push(curatedStat("users", num(network.currentScale?.users)));
  rows.push(curatedStat("aprPct", num(network.currentScale?.aprPct)));
  rows.push(curatedStat("foundedDate", portal?.foundedDate ?? null));
  rows.push(
    curatedStat(
      "chains",
      Array.isArray(portal?.chains) && portal.chains.length ? portal.chains.join(", ") : null,
    ),
  );

  return rows;
}

/* -------------------------------------------------------------------------- */
/* Coins & receipts coverage                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Shared context for coin/receipt coverage, built once per diagnostics request.
 * `knownSlugs` is every profile slug in the store (for entity-link validation);
 * `memberOfByCoinSlug` maps each coin/receipt slug → the network slugs whose
 * `MemberCoins` list it (for dangling-ref detection, cross-tag aware).
 */
export interface CoverageCtx {
  knownSlugs: Set<string>;
  memberOfByCoinSlug: Map<string, string[]>;
}

type CoinLike = StablecoinProfile | TokenProfile | RwaProfile;

/** Effective CoinGecko id: curated item field wins, else the static map. */
function effectiveCoingeckoId(profile: { slug: string; coingeckoId?: string | null }): string | null {
  const explicit = (profile.coingeckoId ?? "").toString().trim();
  if (explicit) return explicit;
  return COINGECKO_IDS[profile.slug] ?? null;
}

function getCoinType(profile: CoinLike): string | null {
  return "coinType" in profile ? ((profile as TokenProfile).coinType ?? null) : null;
}

/** A CoinGecko market field (read-only; cron writes it). */
function marketRow(field: string, value: number | null, cgId: string | null, hasMarket: boolean): FieldCoverage {
  if (!cgId) {
    return { field, source: "CoinGecko", status: "missing", reason: "no-coingecko-id", value: null, resolvedCoingeckoId: null };
  }
  if (value != null) {
    return { field, source: "CoinGecko", status: "live", reason: "ok", value, resolvedCoingeckoId: cgId };
  }
  return {
    field,
    source: "CoinGecko",
    status: "missing",
    reason: hasMarket ? "coingecko-returned-null" : "not-yet-refreshed",
    value: null,
    resolvedCoingeckoId: cgId,
  };
}

/** A Tier-2 curated scaffold field (editable; cron never touches it). */
function curatedScaffold(field: string, raw: unknown): FieldCoverage {
  const has = raw != null && raw !== "";
  return {
    field,
    source: "curated",
    status: has ? "curated" : "missing",
    reason: has ? "curated-only" : "curated-empty",
    value: has ? (raw as string | number) : null,
  };
}

/** entityLink + memberOf rows shared by coins and receipts. */
function linkageRows(
  profile: { slug: string; entitySlug?: string | null },
  ctx: CoverageCtx,
): FieldCoverage[] {
  const entitySlug = (profile.entitySlug ?? "").toString();
  const entityOk = entitySlug !== "" && ctx.knownSlugs.has(entitySlug);
  const parents = ctx.memberOfByCoinSlug.get(profile.slug) ?? [];
  return [
    {
      field: "entityLink",
      source: "curated",
      status: entityOk ? "live" : "missing",
      reason: entityOk ? "ok" : "no-entity-link",
      value: entitySlug || null,
      detail:
        entitySlug && !entityOk ? `EntitySlug "${entitySlug}" matches no network` : undefined,
    },
    {
      field: "memberOf",
      source: "curated",
      status: parents.length ? "live" : "missing",
      reason: parents.length ? "ok" : "dangling-ref",
      value: parents.length ? parents.join(", ") : null,
      detail: parents.length
        ? undefined
        : "Not in any network's MemberCoins — won't appear under 'View all coins'",
    },
  ];
}

/**
 * Per-field coverage for a coin (Token / Stablecoin) or an RWA-category item
 * (folded into the Coins view). Market fields are read-only (CoinGecko, cron);
 * backing/backingApy/lockDuration are editable Tier-2 scaffolds keyed off type.
 * No-Token entities suppress all market rows and emit one `nativeToken` note.
 */
export function computeCoinCoverage(profile: CoinLike, ctx: CoverageCtx): FieldCoverage[] {
  const rows: FieldCoverage[] = [];
  const coinType = getCoinType(profile);
  const cgId = effectiveCoingeckoId(profile);
  const hasMarket = profile.market != null;
  const isStableType = coinType === "NativeStablecoin" || coinType === "SyntheticDollar";
  const noToken =
    coinType === "NoToken" ||
    ("hasNativeToken" in profile && (profile as TokenProfile).hasNativeToken === false);

  if (noToken) {
    rows.push({
      field: "nativeToken",
      source: "curated",
      status: "curated",
      reason: "curated-only",
      value: "No native token — metrics roll up to the network",
    });
  } else {
    const m = profile.market;
    rows.push(marketRow("price", num(m?.priceUsd?.value), cgId, hasMarket));
    rows.push(marketRow("marketCapUsd", num(m?.marketCapUsd?.value), cgId, hasMarket));
    rows.push(marketRow("fdvUsd", num(m?.fdvUsd?.value), cgId, hasMarket));
    rows.push(marketRow("circSupply", num(m?.circulatingSupply?.value), cgId, hasMarket));
    rows.push(marketRow("totalSupply", num(m?.totalSupply?.value), cgId, hasMarket));
    rows.push(marketRow("volume24hUsd", num(m?.volume24hUsd?.value), cgId, hasMarket));
    if (isStableType) {
      const pd = num((profile as StablecoinProfile).pegDeviation);
      if (!cgId) {
        rows.push({ field: "pegDeviation", source: "derived", status: "missing", reason: "no-coingecko-id", value: null });
      } else if (pd != null) {
        rows.push({ field: "pegDeviation", source: "derived", status: "live", reason: "ok", value: pd });
      } else {
        rows.push({
          field: "pegDeviation",
          source: "derived",
          status: "missing",
          reason: hasMarket ? "coingecko-returned-null" : "not-yet-refreshed",
          value: null,
        });
      }
    }
  }

  // Type-conditional curated scaffolds (editable).
  if (isStableType) rows.push(curatedScaffold("backing", (profile as StablecoinProfile).backing));
  if (coinType === "SyntheticDollar") rows.push(curatedScaffold("backingApy", (profile as StablecoinProfile).backingApy));
  if (coinType === "LockedEscrow") rows.push(curatedScaffold("lockDuration", (profile as TokenProfile).lockDuration));

  rows.push(...linkageRows(profile, ctx));
  return rows;
}

type ReceiptLiveKind = "onchain" | "llama" | "cg" | "derived";

/** A receipt live field: value present → live; else a kind-specific missing reason. */
function receiptLiveRow(
  field: string,
  value: number | null,
  kind: ReceiptLiveKind,
  profile: ReceiptProfile,
): FieldCoverage {
  const source: FieldSource =
    kind === "onchain" ? "Alchemy" : kind === "llama" ? "DefiLlama" : kind === "cg" ? "CoinGecko" : "derived";
  if (value != null) {
    return { field, source, status: "live", reason: "ok", value };
  }
  if (kind === "onchain" || kind === "derived") {
    return { field, source, status: "missing", reason: "no-onchain-adapter", value: null };
  }
  if (kind === "llama") {
    const slugs = llamaProtocolsForSlug(profile.entitySlug ?? "");
    return {
      field,
      source,
      status: "missing",
      reason: slugs.length ? "llama-returned-null" : "no-llama-slug",
      value: null,
      resolvedSlugs: slugs,
    };
  }
  const cgId = effectiveCoingeckoId(profile);
  return {
    field,
    source,
    status: "missing",
    reason: cgId ? "coingecko-returned-null" : "no-coingecko-id",
    value: null,
    resolvedCoingeckoId: cgId,
  };
}

interface ReceiptLiveField {
  field: string;
  kind: ReceiptLiveKind;
  value: number | null;
}

/**
 * Per-field coverage for a receipt token, keyed off `ReceiptType` (§A1.4). Live
 * fields are on-chain (Alchemy — not yet wired → `no-onchain-adapter`) or
 * DeFi-Llama-proxied via the parent entity's slug; curated scaffolds are
 * editable Tier-2. `baseAsset` is required for LST/LRT/staked-stable.
 */
export function computeReceiptCoverage(profile: ReceiptProfile, ctx: CoverageCtx): FieldCoverage[] {
  const rows: FieldCoverage[] = [];
  const ex = num(profile.exchangeRateVsBase);
  const pd = num(profile.pegDeviation);
  const tvl = num(profile.underlyingTvlUsd);
  const apr = num(profile.apr);
  const implied = num(profile.impliedApy);
  const aum = num(profile.aumUsd);
  const price = num(profile.priceUsd);

  const live: ReceiptLiveField[] = [];
  const curated: string[] = [];
  let requiresBaseAsset = false;

  switch (profile.receiptType) {
    case "LiquidStaking":
      live.push(
        { field: "exchangeRate", kind: "onchain", value: ex },
        { field: "pegDeviation", kind: "derived", value: pd },
        { field: "underlyingStakedUsd", kind: "llama", value: tvl },
        { field: "stakingApr", kind: "llama", value: apr },
      );
      requiresBaseAsset = true;
      break;
    case "LiquidRestaking":
      live.push(
        { field: "exchangeRate", kind: "onchain", value: ex },
        { field: "pegDeviation", kind: "derived", value: pd },
        { field: "underlyingRestakedUsd", kind: "llama", value: tvl },
        { field: "restakingApr", kind: "llama", value: apr },
      );
      curated.push("avsCount");
      requiresBaseAsset = true;
      break;
    case "LendingReceipt":
      live.push(
        { field: "underlyingSuppliedUsd", kind: "llama", value: tvl },
        { field: "supplyApy", kind: "llama", value: apr },
        { field: "exchangeRate", kind: "onchain", value: ex },
      );
      break;
    case "YieldVault":
      live.push(
        { field: "tvlUsd", kind: "llama", value: tvl },
        { field: "vaultApy", kind: "llama", value: apr },
      );
      curated.push("navPerShare", "underlyingAssets");
      break;
    case "StakedStablecoin":
      live.push(
        { field: "exchangeRate", kind: "onchain", value: ex },
        { field: "underlyingTvlUsd", kind: "llama", value: tvl },
        { field: "yieldApy", kind: "llama", value: apr },
      );
      curated.push("underlyingYield");
      requiresBaseAsset = true;
      break;
    case "FixedIncomeTranche":
      live.push(
        { field: "impliedApy", kind: "llama", value: implied },
        { field: "poolTvlUsd", kind: "llama", value: tvl },
      );
      curated.push("maturityDate", "trancheSize");
      break;
    case "TokenizedRWA":
      live.push({ field: "aumUsd", kind: "llama", value: aum });
      curated.push("navUsd", "underlyingYield", "assetClass", "custodian", "regulatory");
      break;
    case "LockedEscrowReceipt":
      live.push(
        { field: "underlyingLockedUsd", kind: "llama", value: tvl },
        { field: "emissionsApr", kind: "llama", value: apr },
        { field: "price", kind: "cg", value: price },
      );
      curated.push("lockDuration");
      break;
  }

  const bag = profile as unknown as Record<string, unknown>;
  for (const lf of live) rows.push(receiptLiveRow(lf.field, lf.value, lf.kind, profile));
  for (const key of curated) rows.push(curatedScaffold(key, bag[key]));

  if (requiresBaseAsset) rows.push(curatedScaffold("baseAsset", profile.baseAsset));

  rows.push(...linkageRows(profile, ctx));
  return rows;
}

/**
 * Dispatcher: route a store profile to the right coverage function. Networks
 * keep their dedicated {@link computeFieldCoverage} (needs resolved memberCoins).
 */
export function computeCoverage(
  profile: CoinLike | ReceiptProfile,
  ctx: CoverageCtx,
): FieldCoverage[] {
  return profile.category === "Receipt"
    ? computeReceiptCoverage(profile, ctx)
    : computeCoinCoverage(profile, ctx);
}

/** Summary counts for the admin header line. */
export function summarizeCoverage(rows: FieldCoverage[]): {
  total: number;
  live: number;
  missing: number;
  fixable: number;
  noCoverage: number;
  needOnchain: number;
  curatedEmpty: number;
} {
  const apiRows = rows.filter(
    (r) => r.source === "DefiLlama" || r.source === "CoinGecko" || r.source === "Alchemy",
  );
  const live = apiRows.filter((r) => r.status === "live").length;
  const missing = apiRows.filter((r) => r.status === "missing").length;
  const noCoverage = apiRows.filter((r) => r.reason === "no-api-coverage").length;
  const fixable = apiRows.filter(
    (r) =>
      r.status === "missing" &&
      (r.reason === "no-llama-slug" || r.reason === "no-coingecko-id"),
  ).length;
  const needOnchain = rows.filter((r) => r.reason === "no-onchain-adapter").length;
  const curatedEmpty = rows.filter((r) => r.reason === "curated-empty").length;
  return { total: apiRows.length, live, missing, fixable, noCoverage, needOnchain, curatedEmpty };
}
