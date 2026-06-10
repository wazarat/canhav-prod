import type { Address, Hex } from "viem";

/**
 * Subset of the CanHav `AgentSkill` shape (mirrors frontend/lib/types.ts). A
 * skill is the human/agent-readable knowledge bundle a user turns into an agent.
 */
export interface AgentSkillFact {
  key: string;
  value: string;
}

export interface AgentSkillAction {
  name: string;
  description: string;
  signature: string;
  readOnly: boolean;
}

export interface AgentSkillSection {
  heading: string;
  body: string;
}

export interface AgentSkill {
  id: string;
  title: string;
  summary: string;
  facts: AgentSkillFact[];
  sections: AgentSkillSection[];
  actions: AgentSkillAction[];
  glossary?: { term: string; definition: string }[];
  sources: { label: string; url: string }[];
  version: string;
  updatedAt: string;
}

/**
 * ERC-8004 agent registration file. Resolved by `agentURI` (tokenURI). For the
 * scaffold we inline it as a base64 data URI so the metadata is fully on-chain;
 * production may host it on IPFS/HTTPS instead.
 */
export interface AgentProductRef {
  slug: string;
  symbol: string;
  category: string;
}

export interface AgentRegistrationFile {
  name: string;
  description: string;
  skillId: string;
  version: string;
  /** Read/research vs write/execute capabilities derived from the skill. */
  capabilities: string[];
  /** The Entity ("project") this agent is bound to (slug). */
  entity?: string;
  /** Member products (stablecoins/tokens/RWAs) the agent is scoped to. */
  associatedProducts?: AgentProductRef[];
  /** Optional service endpoints the agent exposes. */
  endpoints?: string[];
  createdAt: string;
}

/** A single scoped on-chain action an agent may execute (gated before send). */
export interface ScopedAction {
  target: Address;
  data: Hex;
  value?: bigint;
}
