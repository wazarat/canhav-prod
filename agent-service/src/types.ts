import type { Address } from "viem";

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

/** A single ERC-8004 service entry (A2A, MCP, OASF, web, email, ...). */
export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
  /** OPTIONAL OASF skills carried by this service. */
  skills?: string[];
  /** OPTIONAL OASF domains carried by this service. */
  domains?: string[];
}

/** An on-chain registration reference (CAIP-10 registry + agentId). */
export interface AgentRegistration {
  agentId: number | string;
  agentRegistry: string;
}

/**
 * Canonical ERC-8004 agent registration file shape. The `type`, `name`,
 * `description`, `services`, `registrations`, and `supportedTrust` fields follow
 * the spec; `skillId`/`version`/`entity`/`associatedProducts` are CanHav
 * extensions carried alongside (allowed — indexers ignore unknown keys).
 */
export interface AgentRegistrationFile {
  /** Canonical EIP-8004 registration file type URI. */
  type: string;
  name: string;
  description: string;
  /** Image URL for ERC-721 app compatibility. */
  image?: string;
  /** Service endpoints the agent exposes (REQUIRED, may be empty for fallback). */
  services: AgentService[];
  /** Whether the agent supports x402 pay-per-use commerce. */
  x402Support: boolean;
  /** Whether the agent is currently active. */
  active?: boolean;
  /** On-chain registrations (CAIP-10 registry references). */
  registrations?: AgentRegistration[];
  /** Trust models the agent supports (reputation, crypto-economic, ...). */
  supportedTrust: string[];
  /** CanHav extension: the source skill id. */
  skillId?: string;
  /** CanHav extension: the source skill version. */
  version?: string;
  /** CanHav extension: the Entity ("project") this agent is bound to (slug). */
  entity?: string;
  /** CanHav extension: member products the agent is scoped to. */
  associatedProducts?: AgentProductRef[];
  createdAt: string;
}

/** The three on-chain anchors an agent tracks per asset (Arbitrum One reads). */
export interface WatchedAsset {
  symbol: string;
  /** (1) ERC-20 token contract. */
  token: Address;
  /** (2) Factory that mints pools for this asset. */
  factory: Address;
  /** (2) Pool contracts spawned by the factory. */
  pools: Address[];
  /** (3) Protocol vault / staking / minting core. */
  core: Address;
  decimals: number;
  /** Store / CoinGecko slug for off-chain reads. */
  slug: string;
  entitySlug: string;
}

/** Typed research verdict emitted by stablecoin or yield agents. */
export interface ResearchVerdict {
  agentId: string;
  asset: string;
  kind: "stablecoin" | "yield";
  signal: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  rationale: string;
  ts: string;
}

/** Prior readings stored for trend detection between runs. */
export interface AssetSnapshot {
  asset: string;
  totalSupply: string | null;
  priceUsd: number | null;
  apy: number | null;
  ts: string;
}

export type AgentType = "stablecoin" | "yield";
