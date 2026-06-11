import { keccak256, toBytes } from "viem";

import { skillToMarkdown } from "@/lib/agent/skillExport";
import type { AgentSkill } from "@/lib/types";

/**
 * Canonical integrity hash for a skill: keccak256 of its Markdown export.
 *
 * Both sides of a collaboration compute it identically (client + server, no
 * server-only deps): the seller advertises `skillHash:<id>` on-chain at attach
 * time, returns it inside every StrategyPacket, and the buyer rejects the packet
 * unless they match — proving it received exactly what was advertised.
 */
export function skillMarkdownHash(skill: AgentSkill): `0x${string}` {
  return keccak256(toBytes(skillToMarkdown(skill)));
}
