import { readFileSync } from "node:fs";
import type { WebAuthnKey } from "@zerodev/webauthn-key";

import { loadConfig } from "../config";
import { spawnAgentFromSkill } from "../agent/spawn";
import type { AgentSkill } from "../types";

/**
 * Example CLI: spawn an agent from a skill JSON file.
 *
 *   WEBAUTHN_KEY_JSON='{...}' npm run spawn -- ./skill.json
 *
 * The passkey (`WEBAUTHN_KEY_JSON`) is produced by the client-side WebAuthn
 * ceremony and passed in; there is no seed phrase. bigint fields (`pubX`,
 * `pubY`) arrive as strings in JSON and are coerced here.
 */
async function main(): Promise<void> {
  const skillPath = process.argv[2];
  if (!skillPath) {
    throw new Error("Usage: npm run spawn -- <path-to-skill.json>");
  }
  const skill = JSON.parse(readFileSync(skillPath, "utf8")) as AgentSkill;

  const webAuthnKeyJson = process.env.WEBAUTHN_KEY_JSON;
  if (!webAuthnKeyJson) {
    throw new Error("Set WEBAUTHN_KEY_JSON (from the client-side passkey ceremony).");
  }
  const raw = JSON.parse(webAuthnKeyJson) as Record<string, unknown>;
  const webAuthnKey: WebAuthnKey = {
    ...(raw as unknown as WebAuthnKey),
    pubX: BigInt(String(raw.pubX)),
    pubY: BigInt(String(raw.pubY)),
  };

  const cfg = loadConfig();
  const result = await spawnAgentFromSkill({ cfg, skill, webAuthnKey });
  console.log(`Spawned ERC-8004 agent #${result.agentId.toString()} at ${result.agentAddress}`);
  console.log(`agentURI: ${result.agentURI.slice(0, 64)}...`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
