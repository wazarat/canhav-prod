#!/usr/bin/env node
/**
 * CLI: run a single stablecoin, yield, or market agent pass (read-only research).
 *
 *   npx tsx src/cli/run-agent.ts --type stablecoin --asset sUSDe
 *   npx tsx src/cli/run-agent.ts --type yield --asset sUSDai --agent-id 900103
 *   npx tsx src/cli/run-agent.ts --type market --asset ETH
 */

import { getWatchedAsset, listWatchedAssetSymbols } from "../data/assets";
import { runOnce } from "../agent/schedule";
import type { AgentType } from "../types";

function parseArgs(argv: string[]) {
  let type: AgentType | null = null;
  let asset: string | null = null;
  let agentId = "cli_agent";

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--type" && next) type = next as AgentType;
    else if (a === "--asset" && next) asset = next;
    else if (a === "--agent-id" && next) agentId = next;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: run-agent.ts --type stablecoin|yield|market --asset ${listWatchedAssetSymbols().join("|")} [--agent-id id]`);
      process.exit(0);
    }
  }
  return { type, asset, agentId };
}

async function main() {
  const { type, asset: assetSymbol, agentId } = parseArgs(process.argv.slice(2));
  if (!type || (type !== "stablecoin" && type !== "yield" && type !== "market")) {
    console.error("Missing or invalid --type (stablecoin | yield | market)");
    process.exit(1);
  }
  if (!assetSymbol) {
    console.error(`Missing --asset. Options: ${listWatchedAssetSymbols().join(", ")}`);
    process.exit(1);
  }

  const asset = getWatchedAsset(assetSymbol);
  if (!asset) {
    console.error(`Unknown asset "${assetSymbol}". Options: ${listWatchedAssetSymbols().join(", ")}`);
    process.exit(1);
  }

  const { verdict, snapshot } = await runOnce(type, asset, agentId, null);
  console.log(JSON.stringify({ verdict, snapshot }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
