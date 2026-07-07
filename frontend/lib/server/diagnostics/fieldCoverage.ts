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
  | "curated-only";

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

/** Summary counts for the admin header line. */
export function summarizeCoverage(rows: FieldCoverage[]): {
  total: number;
  live: number;
  missing: number;
  fixable: number;
  noCoverage: number;
} {
  const apiRows = rows.filter((r) => r.source === "DefiLlama" || r.source === "CoinGecko");
  const live = apiRows.filter((r) => r.status === "live").length;
  const missing = apiRows.filter((r) => r.status === "missing").length;
  const noCoverage = apiRows.filter((r) => r.reason === "no-api-coverage").length;
  const fixable = apiRows.filter(
    (r) =>
      r.status === "missing" &&
      (r.reason === "no-llama-slug" || r.reason === "no-coingecko-id"),
  ).length;
  return { total: apiRows.length, live, missing, fixable, noCoverage };
}
