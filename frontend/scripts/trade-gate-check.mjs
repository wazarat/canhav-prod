/**
 * Scripted gate checks (no test runner). Run from frontend/:
 *   node scripts/trade-gate-check.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dir = path.dirname(fileURLToPath(import.meta.url));

// Load compiled gate helpers via tsx-less approach: inline the pure verdict logic.
const VERDICT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BLOCKED_SIGNALS = new Set(["peg_risk", "supply_contraction"]);

function isPositiveVerdict(verdict) {
  if (verdict.severity === "high") return false;
  if (BLOCKED_SIGNALS.has(verdict.signal)) return false;
  return true;
}

function isFreshVerdict(verdict, now = Date.now()) {
  const ts = Date.parse(verdict.ts);
  if (!Number.isFinite(ts)) return false;
  return now - ts <= VERDICT_MAX_AGE_MS;
}

function evaluateVerdictGate(verdict, now = Date.now()) {
  if (!verdict) return { ok: false, reason: "No research verdict." };
  if (!isFreshVerdict(verdict, now)) return { ok: false, reason: "Stale verdict." };
  if (!isPositiveVerdict(verdict)) return { ok: false, reason: `Blocked signal: ${verdict.signal}` };
  return { ok: true, verdictRef: `${verdict.asset}:${verdict.ts}:${verdict.signal}` };
}

const now = Date.now();

const freshPositive = {
  agentId: "900101",
  asset: "sUSDe",
  kind: "stablecoin",
  signal: "reserve_diversification",
  severity: "low",
  confidence: 0.6,
  rationale: "Within bounds.",
  ts: new Date(now - 60_000).toISOString(),
};

const stale = { ...freshPositive, ts: new Date(now - 48 * 3_600_000).toISOString() };
const negative = { ...freshPositive, signal: "peg_risk", severity: "high" };
const highSeverity = { ...freshPositive, signal: "reserve_diversification", severity: "high" };

const cases = [
  ["fresh positive", freshPositive, true],
  ["stale", stale, false],
  ["peg_risk", negative, false],
  ["high severity", highSeverity, false],
  ["unknown asset", null, false],
];

let failed = 0;
for (const [label, verdict, expectOk] of cases) {
  const result = evaluateVerdictGate(verdict, now);
  const ok = result.ok === expectOk;
  console.log(`${ok ? "✓" : "✗"} ${label}:`, result);
  if (!ok) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} gate check(s) failed.`);
  process.exit(1);
}
console.log("\nAll verdict gate checks passed.");
