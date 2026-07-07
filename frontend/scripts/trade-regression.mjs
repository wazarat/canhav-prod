/**
 * Pathway A/B regression checks (local, no testnet wallet required).
 * Run from frontend/: node scripts/trade-regression.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(dir, "..");

const gate = spawnSync("node", ["scripts/trade-gate-check.mjs"], {
  cwd: frontendRoot,
  encoding: "utf-8",
});
if (gate.status !== 0) {
  console.error(gate.stdout || gate.stderr);
  process.exit(1);
}

console.log("trade-regression: gate checks OK");
console.log("Manual testnet checklist:");
console.log("  1. forge script script/AllowlistGmx.s.sol --rpc-url arbitrum_sepolia --broadcast");
console.log("  2. Propose long + short on sUSDe via agent trade_propose → Approve → tx on Sepolia");
console.log("  3. Block non-researched coin (e.g. BTC) via assertResearchGate");
console.log("  4. Method manual: trade_propose returns suggestion only");
console.log("  5. Method spending_cap: within-cap autoExecute=true; over-cap server refusal");
