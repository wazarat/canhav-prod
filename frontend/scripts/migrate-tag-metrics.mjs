#!/usr/bin/env node
/**
 * One-time migration: copy curated sector *Metrics blocks into tag-keyed *TagMetrics
 * on bootstrap store items. Safe to re-run (merges, does not wipe live fields).
 *
 * Usage: node scripts/migrate-tag-metrics.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const bootstrapPath = path.join(here, "..", "data", "bootstrap-store.json");

const STAKING_TAG = {
  "Liquid Staking": "liquidStaking",
  Restaking: "restaking",
  "Liquid Restaking": "liquidRestaking",
};

const LIQUIDITY_TAG = { Pools: "pools", Vaults: "vaults" };

const DERIVATIVES_TAG = {
  "Perp DEX": "perpDex",
  "Option Vaults": "optionVaults",
  "Delta-Neutral": "deltaNeutral",
};

const OTHER_TAG = { Underwriting: "underwriting", Governance: "governance" };

const RWA_TAG = {
  "Tokenized Treasuries": "treasuries",
  "Tokenized Equities": "tokenizedEquities",
  "Tokenized Commodities": "commodities",
  "Real Estate": "realEstate",
  "Private Credit": "privateCredit",
  "Carbon / ESG": "carbon",
  "Tokenization Infrastructure": "tokenizationInfra",
  "Structured Products": "structuredProducts",
  "Event Finance": "eventFinance",
  "Stablecoins & FX": "stablecoinsFx",
};

function mergeTagBlock(existing, incoming) {
  if (!incoming) return existing ?? null;
  if (!existing) return incoming;
  return { ...existing, ...incoming };
}

function migrateItem(item) {
  if (item.Category !== "Entity" && item.Category !== "Network") return false;
  let changed = false;

  const stakingSub = item.StakingSubSector ?? (item.Sector === "Staking" ? item.SubSector : null);
  if (item.Staking && stakingSub && STAKING_TAG[stakingSub]) {
    const key = STAKING_TAG[stakingSub];
    const prior = item.StakingTagMetrics ?? {};
    const nextBlock = mergeTagBlock(prior[key], item.Staking);
    if (JSON.stringify(prior[key]) !== JSON.stringify(nextBlock)) {
      item.StakingTagMetrics = { ...prior, [key]: nextBlock };
      changed = true;
    }
  }

  const liqSub =
    item.LiquiditySubSector ?? (item.Sector === "Liquidity" ? item.SubSector : null);
  if (item.Liquidity && liqSub && LIQUIDITY_TAG[liqSub]) {
    const key = LIQUIDITY_TAG[liqSub];
    const prior = item.LiquidityTagMetrics ?? {};
    const nextBlock = mergeTagBlock(prior[key], item.Liquidity);
    if (JSON.stringify(prior[key]) !== JSON.stringify(nextBlock)) {
      item.LiquidityTagMetrics = { ...prior, [key]: nextBlock };
      changed = true;
    }
  }

  const derivSub =
    item.DerivativesSubSector ?? (item.Sector === "Derivatives" ? item.SubSector : null);
  if (item.Derivatives && derivSub && DERIVATIVES_TAG[derivSub]) {
    const key = DERIVATIVES_TAG[derivSub];
    const prior = item.DerivativesTagMetrics ?? {};
    const nextBlock = mergeTagBlock(prior[key], item.Derivatives);
    if (JSON.stringify(prior[key]) !== JSON.stringify(nextBlock)) {
      item.DerivativesTagMetrics = { ...prior, [key]: nextBlock };
      changed = true;
    }
  }

  const otherSub = item.OtherSubSector ?? (item.Sector === "Other" ? item.SubSector : null);
  if (item.Other && otherSub && OTHER_TAG[otherSub]) {
    const key = OTHER_TAG[otherSub];
    const prior = item.OtherTagMetrics ?? {};
    const nextBlock = mergeTagBlock(prior[key], item.Other);
    if (JSON.stringify(prior[key]) !== JSON.stringify(nextBlock)) {
      item.OtherTagMetrics = { ...prior, [key]: nextBlock };
      changed = true;
    }
  }

  if (item.Rwa && item.RwaSubSector && RWA_TAG[item.RwaSubSector]) {
    const key = RWA_TAG[item.RwaSubSector];
    const prior = item.RwaTagMetrics ?? {};
    const rwa = item.Rwa;
    const sub = rwa.subSectorMetrics;
    const nextBlock = mergeTagBlock(prior[key], {
      ...(rwa.aumUsd != null ? { aumUsd: rwa.aumUsd } : {}),
      ...(sub && typeof sub === "object" ? sub : {}),
    });
    if (JSON.stringify(prior[key]) !== JSON.stringify(nextBlock)) {
      item.RwaTagMetrics = { ...prior, [key]: nextBlock };
      changed = true;
    }
  }

  const tags = Array.isArray(item.Tags) ? item.Tags : [];
  if (tags.includes("Lending") && item.Lending && !item.CreditTagMetrics?.lending) {
    const prior = item.CreditTagMetrics ?? {};
    const lendingTag = {
      totalSuppliedUsd: item.Lending.tvlUsd,
      totalBorrowsUsd: item.Lending.totalBorrowsUsd,
      utilizationPct: item.Lending.utilizationPct,
      availableLiquidityUsd: item.Lending.availableLiquidityUsd,
      supplyApyPct: item.Lending.supplyApyPct,
      borrowApyPct: item.Lending.borrowApyPct,
      collateralAssets: item.Lending.collateralAssets,
      oracles: item.Lending.oracles,
      isolatedMarketCount: item.Lending.isolatedMarketCount,
    };
    item.CreditTagMetrics = { ...prior, lending: mergeTagBlock(prior.lending, lendingTag) };
    changed = true;
  }

  return changed;
}

const store = JSON.parse(readFileSync(bootstrapPath, "utf-8"));
let migrated = 0;

for (const [key, item] of Object.entries(store.items ?? {})) {
  if (migrateItem(item)) {
    store.items[key] = item;
    migrated += 1;
  }
}

const mapleKey = Object.keys(store.items ?? {}).find(
  (k) => store.items[k]?.Slug === "maple",
);
if (mapleKey) {
  const maple = store.items[mapleKey];
  if (!Array.isArray(maple.Tags) || maple.Tags.length < 2) {
    maple.Tags = ["Lending", "Fixed Income"];
    maple.CreditTagMetrics = {
      ...(maple.CreditTagMetrics ?? {}),
      lending: maple.CreditTagMetrics?.lending ?? {
        collateralAssets: maple.Lending?.collateralAssets,
        oracles: maple.Lending?.oracles,
      },
      fixedIncome: maple.CreditTagMetrics?.fixedIncome ?? {
        mechanism: "Pool-based private credit",
        markets: 3,
      },
    };
    store.items[mapleKey] = maple;
    migrated += 1;
    console.log("Added multi-tag Credit example on maple");
  }
}

writeFileSync(bootstrapPath, `${JSON.stringify(store, null, 2)}\n`);
console.log(`Migrated tag metrics on ${migrated} bootstrap item(s).`);
