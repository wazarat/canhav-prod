#!/usr/bin/env node
/**
 * Credit M6 Asset Coverage parser (Credits completion CAN-75/72/77).
 *
 * Sources (both committed under scripts/data/):
 *   - credit-assets-risks.json   The AUTHORITATIVE pre-joined dataset attached
 *     to CAN-77 (typed asset/oracle/flagged/incident rows, risk link joins,
 *     per-entity risk_profile). Downloaded from the Linear attachment
 *     2026-07-26 (user-authorized).
 *   - credit-m6m7-dataset.json   The M5-parsed sidecar whose TypedRisks are
 *     LIVE in KV. M6 patches those rows with the join fields the JSON adds
 *     (linkedAssetsUnmatched / linkedPartnersUnmatched / linkedFlaggedAssets)
 *     WITHOUT touching any other field, so the KV diff stays link-only.
 *
 * Output: scripts/data/credit-m6-asset-coverage.json
 *   { generatedAt, entities: { [slug]: { AssetCoverage|null, Incidents, TypedRisks } } }
 *   - sense gets AssetCoverage: null (CAN-72: sunset Oct 2023, tab stays hidden).
 *
 * Fidelity gates (script exits non-zero on any mismatch):
 *   - 14 slugs; 277 asset rows; 109 flagged rows; 52 incidents; 204 risks.
 *   - per-entity risk_profile.by_category weighted == recomputed (4/3/2/1).
 *   - sentinel counts: borrowingDisabled aave 8 / radiant 12 / spark 1 /
 *     extra-finance 2; ltvWithdrawn aave 7 / spark 8.
 *   - 9 lending-shape + 5 fixedIncome-shape entities.
 *   - TypedRisks patch matches every sidecar risk to a JSON risk by name, 1:1,
 *     and linkedAssets/linkedPartners stay byte-identical to the live values.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "data");

const joined = JSON.parse(readFileSync(path.join(dataDir, "credit-assets-risks.json"), "utf-8"));
const sidecar = JSON.parse(readFileSync(path.join(dataDir, "credit-m6m7-dataset.json"), "utf-8"));

const WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };
const LENDING_SHAPE = new Set([
  "aave", "compound", "morpho", "radiant", "spark", "extra-finance", "fluid", "gearbox", "stella",
]);

let failures = 0;
function fail(msg) {
  failures += 1;
  console.error(`FAIL: ${msg}`);
}
function assertEq(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${expected}, got ${actual}`);
}

/* ----------------------------- cell helpers ------------------------------ */

const isNa = (v) => v == null || String(v).trim() === "" || String(v).trim().toLowerCase() === "n.a.";

/** Extract [label](url) pairs from a markdown cell into SourceRef[]. */
function parseSources(cell) {
  if (isNa(cell)) return [];
  const out = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let m;
  while ((m = re.exec(cell)) !== null) out.push({ label: m[1], url: m[2] });
  return out;
}

/** "80.5" -> {value: 80.5, text: null}; "86 (LLTV)" -> {value: 86, text: "86 (LLTV)"};
 *  ranges/prose -> {value: null, text: raw}; "n.a." -> {value: null, text: null}. */
function parsePct(cell) {
  if (isNa(cell)) return { value: null, text: null };
  const raw = String(cell).trim();
  if (/^\d+(\.\d+)?$/.test(raw)) return { value: Number(raw), text: null };
  const lead = raw.match(/^(\d+(\.\d+)?)\s*\([^)]*\)$/);
  if (lead) return { value: Number(lead[1]), text: raw };
  return { value: null, text: raw };
}

/** Caps: pure "amount [UNIT]" parses to a number; the sentinel `1` (with or
 *  without the dataset's "(disabled)" annotation) means borrowing disabled;
 *  anything else (unlimited / no cap / per-market quotas) stays display-only. */
function parseCap(cell) {
  if (isNa(cell)) return { value: null, display: null, disabled: false };
  const raw = String(cell).trim();
  if (/^1(\s*\((?:borrow )?disabled\))?$/i.test(raw)) {
    return { value: null, display: raw, disabled: true };
  }
  const m = raw.match(/^([\d,]+(?:\.\d+)?)(\s+[A-Za-z0-9.\-/()]+)?$/);
  if (m) return { value: Number(m[1].replace(/,/g, "")), display: raw, disabled: false };
  return { value: null, display: raw, disabled: false };
}

/** Deterministic role bucket from the dataset's free-text role column. */
function roleKind(role) {
  const r = role.toLowerCase();
  if (r.includes("both")) return "both";
  const collateral = r.includes("collateral");
  const loan =
    r.includes("loan") ||
    r.includes("debt") ||
    r.includes("pool asset") ||
    r.includes("underlying (lend") ||
    r.includes("base of c") ||
    r.includes("underlying / loan");
  if (collateral && loan) return "both";
  if (collateral) return "collateral";
  if (loan) return "loan";
  return "other";
}

/** Strip the leading "**Asset strategy.**" bold header the prose cells carry. */
function stripStrategyPrefix(prose) {
  if (isNa(prose)) return null;
  return String(prose).replace(/^\*\*Asset strategy\.?\*\*\s*/i, "").trim() || null;
}

/* ------------------------------- builders -------------------------------- */

function buildAsset(row, shape) {
  const base = {
    asset: row.asset,
    role: row.role,
    roleKind: roleKind(row.role),
    chain: isNa(row.chain) ? null : row.chain,
    maxLtvPct: null,
    maxLtvText: null,
    liqThresholdPct: null,
    liqThresholdText: null,
    liqBonusPct: null,
    liqBonusText: null,
    supplyCapValue: null,
    supplyCapDisplay: null,
    borrowCapValue: null,
    borrowCapDisplay: null,
    borrowingDisabled: false,
    ltvWithdrawn: false,
    isolationEmode: null,
    underlyingYieldSource: null,
    maturityOrTerm: null,
    fixedImpliedApy: null,
    collateralOrCapParameters: null,
    oracle: isNa(row.oracle) ? null : row.oracle,
    notes: isNa(row.notes) ? null : row.notes,
    sources: parseSources(row.source),
  };
  if (shape === "lending") {
    const ltv = parsePct(row.max_ltv_pct);
    const thr = parsePct(row.liq_threshold_pct);
    const bon = parsePct(row.liq_bonus_pct);
    const sup = parseCap(row.supply_cap);
    const bor = parseCap(row.borrow_cap);
    base.maxLtvPct = ltv.value;
    base.maxLtvText = ltv.text;
    base.liqThresholdPct = thr.value;
    base.liqThresholdText = thr.text;
    base.liqBonusPct = bon.value;
    base.liqBonusText = bon.text;
    base.supplyCapValue = sup.value;
    base.supplyCapDisplay = sup.display;
    base.borrowCapValue = bor.value;
    base.borrowCapDisplay = bor.display;
    base.borrowingDisabled = bor.disabled;
    base.ltvWithdrawn = ltv.value === 0 && thr.value != null && thr.value > 0;
    base.isolationEmode = isNa(row.isolation_emode) ? null : row.isolation_emode;
  } else {
    base.underlyingYieldSource = isNa(row.underlying_yield_source) ? null : row.underlying_yield_source;
    base.maturityOrTerm = isNa(row.maturity_or_term) ? null : row.maturity_or_term;
    base.fixedImpliedApy = isNa(row.fixed_implied_apy) ? null : row.fixed_implied_apy;
    base.collateralOrCapParameters = isNa(row.collateral_or_cap_parameters)
      ? null
      : row.collateral_or_cap_parameters;
  }
  return base;
}

function buildOracle(row) {
  return {
    provider: row.provider,
    assetsCovered: isNa(row.assets_covered)
      ? []
      : String(row.assets_covered).split(/,\s*/).map((s) => s.trim()).filter(Boolean),
    feedType: isNa(row.feed_type) ? null : row.feed_type,
    sources: parseSources(row.source),
  };
}

function buildFlagged(row) {
  return {
    asset: row.asset,
    flag: row.flag,
    reason: isNa(row.what_happened_or_why) ? null : row.what_happened_or_why,
    sources: parseSources(row.source),
  };
}

function parseAmountUsd(cell) {
  if (isNa(cell)) return { value: null, display: null };
  const raw = String(cell).trim();
  const m = raw.match(/^[\d,]+(\.\d+)?$/);
  if (m) return { value: Number(raw.replace(/,/g, "")), display: raw };
  return { value: null, display: raw };
}

function buildIncident(row) {
  const amount = parseAmountUsd(row.amount_usd);
  const sources = parseSources(row.source);
  const type = isNa(row.event_type) ? "incident" : String(row.event_type).trim();
  return {
    date: row.date,
    title: type.charAt(0).toUpperCase() + type.slice(1),
    description: row.what_happened,
    eventType: type,
    amountUsd: amount.value,
    amountUsdDisplay: amount.display,
    outcome: isNa(row.outcome) ? null : row.outcome,
    link: sources[0]?.url ?? null,
  };
}

/** Patch the LIVE M5 TypedRisks rows with the JSON's extra join fields. */
function patchTypedRisks(slug, jsonRisks, sidecarRisks) {
  const bySidecarName = new Map(sidecarRisks.map((r) => [r.name, r]));
  assertEq(jsonRisks.length, sidecarRisks.length, `${slug} risk count json vs sidecar`);
  const patched = [];
  for (const jr of jsonRisks) {
    const base = bySidecarName.get(jr.risk);
    if (!base) {
      fail(`${slug}: JSON risk "${jr.risk}" has no sidecar TypedRisk with that name`);
      continue;
    }
    const matched = jr.link_assets_matched ?? [];
    const unmatched = [...(jr.link_assets_unmatched ?? [])];
    // The matcher drops prose descriptors ("Protocol-wide") entirely — keep
    // them as unmatched text so drill-downs can state the real scope.
    if (matched.length === 0 && unmatched.length === 0 && !isNa(jr.linked_assets)) {
      unmatched.push(String(jr.linked_assets).trim());
    }
    // Live linkedAssets must already equal the matched join keys (M5 push).
    if (JSON.stringify(base.linkedAssets ?? []) !== JSON.stringify(matched)) {
      fail(`${slug}/"${jr.risk}": live linkedAssets != JSON matched join keys`);
    }
    const row = { ...base };
    if (unmatched.length) row.linkedAssetsUnmatched = unmatched;
    const pUnmatched = jr.link_partners_unmatched ?? [];
    if (pUnmatched.length) row.linkedPartnersUnmatched = pUnmatched;
    const flagged = jr.link_flagged_assets ?? [];
    if (flagged.length) row.linkedFlaggedAssets = flagged;
    patched.push(row);
  }
  return patched;
}

/* --------------------------------- main ----------------------------------- */

const out = { generatedAt: new Date().toISOString(), source: joined.generated, entities: {} };
let totalAssets = 0;
let totalFlagged = 0;
let totalIncidents = 0;
let totalRisks = 0;
const sentinelCounts = {};

for (const entity of joined.entities) {
  const slug = entity.slug;
  const shape = LENDING_SHAPE.has(slug) ? "lending" : "fixedIncome";
  const sidecarEntity = sidecar.entities[slug];
  if (!sidecarEntity) {
    fail(`${slug}: missing from the M5 sidecar`);
    continue;
  }

  const assets = entity.assets.map((r) => buildAsset(r, shape));
  const oracles = entity.oracles.map(buildOracle);
  const flaggedAssets = entity.flagged_assets.map(buildFlagged);
  const incidents = entity.incidents.map(buildIncident);
  const typedRisks = patchTypedRisks(slug, entity.risks, sidecarEntity.TypedRisks);

  totalAssets += assets.length;
  totalFlagged += flaggedAssets.length;
  totalIncidents += incidents.length;
  totalRisks += typedRisks.length;
  sentinelCounts[slug] = {
    borrowingDisabled: assets.filter((a) => a.borrowingDisabled).length,
    ltvWithdrawn: assets.filter((a) => a.ltvWithdrawn).length,
  };

  // risk_profile fidelity: recompute per-category weighted sums.
  const byCat = {};
  for (const r of typedRisks) {
    byCat[r.category] = (byCat[r.category] ?? 0) + (WEIGHTS[r.severity] ?? 0);
  }
  for (const [cat, prof] of Object.entries(entity.risk_profile.by_category)) {
    assertEq(byCat[cat] ?? 0, prof.weighted, `${slug} ${cat} weighted`);
  }
  assertEq(typedRisks.length, entity.risk_profile.total_risks, `${slug} total risks`);
  assertEq(assets.length, entity.risk_profile.asset_count, `${slug} asset count`);
  assertEq(flaggedAssets.length, entity.risk_profile.flagged_asset_count, `${slug} flagged count`);
  assertEq(incidents.length, entity.risk_profile.incident_count, `${slug} incident count`);

  // CAN-72: sense sunset Oct 2023 — every row deprecated, the tab STAYS hidden.
  const assetCoverage =
    slug === "sense"
      ? null
      : {
          shape,
          assetStrategy: stripStrategyPrefix(entity.asset_strategy),
          assets,
          oracles,
          flaggedAssets,
          curatedNote:
            "Curated list ranked by size and strategic importance — not the exhaustive on-chain asset universe.",
          riskLinkNote: isNa(sidecarEntity.TypedRisksNote) ? null : sidecarEntity.TypedRisksNote,
          asOf: joined.generated ?? null,
        };

  out.entities[slug] = { AssetCoverage: assetCoverage, Incidents: incidents, TypedRisks: typedRisks };
}

/* ------------------------------ global gates ------------------------------ */

assertEq(Object.keys(out.entities).length, 14, "entity count");
assertEq(totalAssets, 277, "total asset rows");
assertEq(totalFlagged, 109, "total flagged rows");
assertEq(totalIncidents, 52, "total incidents");
assertEq(totalRisks, 204, "total risks");
assertEq(sentinelCounts.aave.borrowingDisabled, 8, "aave borrowingDisabled");
assertEq(sentinelCounts.radiant.borrowingDisabled, 12, "radiant borrowingDisabled");
assertEq(sentinelCounts.spark.borrowingDisabled, 2, "spark borrowingDisabled");
assertEq(sentinelCounts["extra-finance"].borrowingDisabled, 2, "extra-finance borrowingDisabled");
assertEq(sentinelCounts.aave.ltvWithdrawn, 7, "aave ltvWithdrawn");
assertEq(sentinelCounts.spark.ltvWithdrawn, 8, "spark ltvWithdrawn");
const lendingShapes = Object.values(out.entities).filter(
  (e) => e.AssetCoverage?.shape === "lending",
).length;
assertEq(lendingShapes, 9, "lending-shape entities (sense excluded by design)");

if (failures > 0) {
  console.error(`\n${failures} fidelity failure(s) — no output written.`);
  process.exit(1);
}

const outPath = path.join(dataDir, "credit-m6-asset-coverage.json");
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${path.basename(outPath)}: 14 entities, ${totalAssets} assets, ${totalFlagged} flagged, ${totalIncidents} incidents, ${totalRisks} risks.`);
console.log("Sentinels:", JSON.stringify(sentinelCounts));
