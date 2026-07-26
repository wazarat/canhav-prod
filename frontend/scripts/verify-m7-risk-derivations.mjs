#!/usr/bin/env node
/**
 * M7 fidelity gate (Credits completion CAN-73/79).
 *
 * The Risks tab derives its scorecard and 3x3 severity matrix from the stored
 * TypedRisks at render time. This gate proves that derivation equals the
 * dataset's own pre-computed `risk_profile` (per-category count/weighted,
 * critical_count, total_risks, likelihood_impact_matrix) for all 14 entities.
 * Exits non-zero on any drift — same ethos as the M6 parser gates.
 *
 *   node scripts/verify-m7-risk-derivations.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(path.join(here, "data", "credit-assets-risks.json"), "utf-8"),
);

/* Same rule as lib/networks/riskScore.ts RISK_SEVERITY_WEIGHTS. */
const WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };
const AXES = ["low", "medium", "high"];

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL ${msg}`);
};

if (dataset.entities.length !== 14) fail(`expected 14 entities, got ${dataset.entities.length}`);

let totalRisks = 0;
for (const entity of dataset.entities) {
  const { slug, risks, risk_profile: profile } = entity;
  totalRisks += risks.length;

  /* Per-category count / weighted / max severity. */
  const derived = new Map();
  for (const r of risks) {
    const e = derived.get(r.category) ?? { count: 0, weighted: 0, critical: 0 };
    e.count += 1;
    e.weighted += WEIGHTS[r.severity] ?? 0;
    if (r.severity === "critical") e.critical += 1;
    derived.set(r.category, e);
  }
  for (const [category, expected] of Object.entries(profile.by_category)) {
    /* The dataset records genuine absence (e.g. Regulatory for morpho) as an
     * explicit zero row — derive the same zero, never skip it. */
    const got = derived.get(category) ?? { count: 0, weighted: 0, critical: 0 };
    if (got.count !== expected.count || got.weighted !== expected.weighted) {
      fail(
        `${slug}/${category}: derived ${got.count}(${got.weighted}) != dataset ${expected.count}(${expected.weighted})`,
      );
    }
  }
  for (const category of derived.keys()) {
    if (!profile.by_category[category]) {
      fail(`${slug}: derived category ${category} missing from risk_profile`);
    }
  }
  const criticals = risks.filter((r) => r.severity === "critical").length;
  if (criticals !== profile.critical_count) {
    fail(`${slug}: critical_count derived ${criticals} != dataset ${profile.critical_count}`);
  }
  if (risks.length !== profile.total_risks) {
    fail(`${slug}: total_risks derived ${risks.length} != dataset ${profile.total_risks}`);
  }

  /* 3x3 matrix rebin ("likelihood|impact" keys). */
  const cells = {};
  let unplaced = 0;
  for (const r of risks) {
    if (AXES.includes(r.likelihood) && AXES.includes(r.impact)) {
      const key = `${r.likelihood}|${r.impact}`;
      cells[key] = (cells[key] ?? 0) + 1;
    } else {
      unplaced++;
    }
  }
  const expectedMatrix = profile.likelihood_impact_matrix ?? {};
  const allKeys = new Set([...Object.keys(cells), ...Object.keys(expectedMatrix)]);
  for (const key of allKeys) {
    if ((cells[key] ?? 0) !== (expectedMatrix[key] ?? 0)) {
      fail(`${slug} matrix ${key}: derived ${cells[key] ?? 0} != dataset ${expectedMatrix[key] ?? 0}`);
    }
  }
  const placed = risks.length - unplaced;
  const matrixTotal = Object.values(expectedMatrix).reduce((a, b) => a + b, 0);
  if (placed !== matrixTotal) {
    fail(`${slug}: placed ${placed} != matrix total ${matrixTotal} (unplaced ${unplaced})`);
  }
}

if (totalRisks !== 204) fail(`expected 204 risks total, got ${totalRisks}`);

if (failures) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log(
  `OK: 14 entities, ${totalRisks} risks — derived category scores + matrix cells match risk_profile exactly.`,
);
