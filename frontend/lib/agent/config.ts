import "server-only";

import { openai } from "@ai-sdk/openai";
import type { EmbeddingModel, LanguageModel } from "ai";

import { readSecret } from "@/lib/server/env";
import { securityRegistryConfigured } from "@/lib/server/securityGate";
import { canMintTcnhv, deployerKeyDiagnostics } from "@/lib/server/factory";

import { hasTcnhv } from "./collab-config";
import { hasUpstash } from "@/lib/server/redis";

import { AGENT_CHAIN } from "./chain";

/**
 * Server-only configuration probes for the CanHav AI agent layer (Pillar 2).
 *
 * Every live path degrades gracefully until provisioned, so these booleans drive
 * both the `/api/agent/status` readout and the "not configured" UI states:
 *   - OpenAI    -> the LLM research loop (app/api/agent)
 *   - Upstash   -> persistent agent memory (lib/agent/memory.ts); a local JSON
 *                  fallback is used in offline dev when this is false
 *   - Identity  -> on-chain ERC-8004 registration (app/api/agent/spawn) against
 *                  the deployed registries, signed by the user's Privy wallet
 *
 * Secrets resolve via `readSecret` (process.env first, then backend/.env), the
 * same convention the Alchemy/Dune/CoinGecko overlays already use.
 */

export { AGENT_CHAIN, ARBITRUM_SEPOLIA_CHAIN_ID } from "./chain";
export const DEFAULT_AGENT_MODEL = "gpt-4o-mini" as const;

/** Whether a direct OpenAI key is configured for the reasoning loop. */
export function hasOpenAI(): boolean {
  return Boolean(readSecret("OPENAI_API_KEY"));
}

/**
 * Whether a Vercel AI Gateway key is configured. The gateway gives provider
 * failover + spend controls and lets us route around a drained OpenAI quota
 * without code changes (a `provider/model` string is resolved through it).
 */
export function hasGateway(): boolean {
  return Boolean(readSecret("AI_GATEWAY_API_KEY"));
}

/** Whether ANY LLM provider is configured (gateway preferred, else OpenAI). */
export function hasLLM(): boolean {
  return hasGateway() || hasOpenAI();
}

/** Which provider the agent loop resolves to. */
export function agentProvider(): "gateway" | "openai" | "none" {
  if (hasGateway()) return "gateway";
  if (hasOpenAI()) return "openai";
  return "none";
}

/** The model the agent loop should use (override via OPENAI_AGENT_MODEL). */
export function agentModel(): string {
  return readSecret("OPENAI_AGENT_MODEL") ?? DEFAULT_AGENT_MODEL;
}

/** Mirror a secret from backend/.env into process.env so provider SDKs see it. */
function hydrateEnv(name: string): void {
  if (!process.env[name]) {
    const value = readSecret(name);
    if (value) process.env[name] = value;
  }
}

/**
 * Resolve the AI SDK model for the chat loop. Prefers the Vercel AI Gateway when
 * `AI_GATEWAY_API_KEY` is set (a `provider/model` string routes through it),
 * otherwise falls back to the direct OpenAI provider. Either path keeps the
 * `streamText` call site unchanged.
 */
export function resolveAgentModel(): LanguageModel {
  const model = agentModel();
  if (hasGateway()) {
    hydrateEnv("AI_GATEWAY_API_KEY");
    // Gateway expects a fully-qualified `provider/model` id.
    return model.includes("/") ? model : `openai/${model}`;
  }
  hydrateEnv("OPENAI_API_KEY");
  return openai(model);
}

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small" as const;

/** Embedding model id (override via OPENAI_EMBEDDING_MODEL). */
export function embeddingModel(): string {
  return readSecret("OPENAI_EMBEDDING_MODEL") ?? DEFAULT_EMBEDDING_MODEL;
}

/**
 * Whether vector embeddings are available (the knowledge layer falls back to
 * keyword retrieval when this is false — it never hard-fails).
 */
export function hasEmbeddings(): boolean {
  return hasLLM();
}

/**
 * Resolve the AI SDK embedding model for the knowledge layer, mirroring
 * `resolveAgentModel`: Vercel AI Gateway when configured (string id), else the
 * direct OpenAI provider. Returns null when no provider is configured so
 * callers can degrade to keyword search.
 */
export function resolveEmbeddingModel(): EmbeddingModel | null {
  const model = embeddingModel();
  if (hasGateway()) {
    hydrateEnv("AI_GATEWAY_API_KEY");
    return model.includes("/") ? model : `openai/${model}`;
  }
  if (hasOpenAI()) {
    hydrateEnv("OPENAI_API_KEY");
    return openai.textEmbeddingModel(model);
  }
  return null;
}

/**
 * Whether Privy social login is configured: the public app id (client provider)
 * and the server secret (access-token verification). Both are required for the
 * end-to-end login + smart-account signer flow.
 */
export function hasPrivy(): boolean {
  return Boolean(readSecret("NEXT_PUBLIC_PRIVY_APP_ID") && readSecret("PRIVY_APP_SECRET"));
}

/**
 * Whether on-chain ERC-8004 identity is configured: the deployed registries
 * plus Privy (the user's wallet signs the mint directly and pays its own gas).
 */
export function hasOnchainIdentity(): boolean {
  return Boolean(
    readSecret("IDENTITY_REGISTRY_ADDRESS") &&
      readSecret("SECURITY_REGISTRY_ADDRESS") &&
      hasPrivy(),
  );
}

/**
 * Whether the Privy-direct wallet path is live: social login + tCNHV token.
 * Used for treasury bootstrap, balance readout, and plain ERC-20 transfers.
 */
export function hasPrivyWallet(): boolean {
  return hasPrivy() && hasTcnhv();
}

export { hasUpstash };

export interface AgentConfigStatus {
  /** A direct OpenAI key is configured. */
  openai: boolean;
  /** Whether ANY LLM provider (gateway or OpenAI) is configured. */
  llm: boolean;
  /** Which provider the loop resolves to. */
  provider: "gateway" | "openai" | "none";
  /** Vector embeddings available for the knowledge layer (else keyword search). */
  embeddings: boolean;
  /** Persistent memory store (Upstash) is configured; false uses local fallback. */
  upstash: boolean;
  /** On-chain ERC-8004 registration is configured (registries + Privy). */
  onchainIdentity: boolean;
  /** Privy social login is configured (app id + server secret). */
  privy: boolean;
  /** The only chain agents touch. */
  chain: typeof AGENT_CHAIN;
  /** Resolved model id (informational; reflects OPENAI_AGENT_MODEL or default). */
  model: string;
  /** tCNHV token address is configured (credits UI + settlement). */
  tcnhv: boolean;
  /** Owner key + token wired enough to mint signup grants and rewards. */
  canMintTcnhv: boolean;
  /** Whether FACTORY_DEPLOYER_PRIVATE_KEY is present (no secret leaked). */
  factoryDeployerKeySet: boolean;
  /** Whether the key passes format validation (0x + 64 hex chars). */
  factoryDeployerKeyValid: boolean;
  /** SECURITY_REGISTRY_ADDRESS explicitly set (else Sepolia singleton fallback). */
  securityRegistryExplicit: boolean;
}

/** Snapshot of which agent-layer capabilities are live in this environment. */
export function agentConfigStatus(): AgentConfigStatus {
  const key = deployerKeyDiagnostics();
  return {
    openai: hasOpenAI(),
    llm: hasLLM(),
    provider: agentProvider(),
    embeddings: hasEmbeddings(),
    upstash: hasUpstash(),
    onchainIdentity: hasOnchainIdentity(),
    privy: hasPrivy(),
    chain: AGENT_CHAIN,
    model: agentModel(),
    tcnhv: hasTcnhv(),
    canMintTcnhv: canMintTcnhv(),
    factoryDeployerKeySet: key.set,
    factoryDeployerKeyValid: key.valid,
    securityRegistryExplicit: securityRegistryConfigured(),
  };
}
