import { readFileSync } from "node:fs";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { loadConfig } from "../config";
import { spawnAgentFromSkill } from "../agent/spawn";
import type { AgentSkill } from "../types";

/**
 * Example CLI: spawn an agent from a skill JSON file.
 *
 *   AGENT_SIGNER_PRIVATE_KEY=0x... npm run spawn -- ./skill.json
 *
 * In the app the signer is the user's self-custodial embedded wallet (a Privy
 * social-login wallet) and minting runs in the browser. For local CLI testing
 * only, a throwaway private key stands in for that signer — it pays its own
 * gas, so fund it with a little Arbitrum Sepolia ETH (the pinned testnet).
 * Never use a key holding real funds.
 */
async function main(): Promise<void> {
  const skillPath = process.argv[2];
  if (!skillPath) {
    throw new Error("Usage: npm run spawn -- <path-to-skill.json>");
  }
  const skill = JSON.parse(readFileSync(skillPath, "utf8")) as AgentSkill;

  const privateKey = process.env.AGENT_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Set AGENT_SIGNER_PRIVATE_KEY (a testnet-only throwaway key for CLI spawns).");
  }
  const signer = privateKeyToAccount(privateKey as Hex);

  const cfg = loadConfig();
  const result = await spawnAgentFromSkill({ cfg, skill, signer });
  console.log(`Spawned ERC-8004 agent #${result.agentId.toString()} at ${result.agentAddress}`);
  console.log(`agentURI: ${result.agentURI.slice(0, 64)}...`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
