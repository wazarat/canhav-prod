import "server-only";

import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { readSecret } from "@/lib/server/env";
import { hasUpstash } from "@/lib/server/redis";

/**
 * Server-only configuration probes for the CanHav AI agent layer (Pillar 2).
 *
 * Every live path degrades gracefully until provisioned, so these booleans drive
 * both the `/api/agent/status` readout and the "not configured" UI states:
 *   - OpenAI    -> the LLM research loop (app/api/agent)
 *   - Upstash   -> persistent agent memory (lib/agent/memory.ts); a local JSON
 *                  fallback is used in offline dev when this is false
 *   - ZeroDev   -> on-chain ERC-8004 registration (app/api/agent/spawn), which
 *                  reuses the standalone agent-service + deployed registries
 *
 * Secrets resolve via `readSecret` (process.env first, then backend/.env), the
 * same convention the Alchemy/Dune/CoinGecko overlays already use.
 */

export const AGENT_CHAIN = "arbitrum-sepolia" as const;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614 as const;
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

/** Whether the ZeroDev passkey server URL is exposed to the client. */
export function hasPasskeyServer(): boolean {
  const url = process.env.NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER?.trim();
  return Boolean(url);
}

/**
 * Whether the on-chain identity stack is provisioned: a ZeroDev project RPC,
 * both deployed registry addresses, and the client passkey server URL.
 */
export function hasZeroDev(): boolean {
  return Boolean(
    readSecret("ZERODEV_RPC") &&
      readSecret("IDENTITY_REGISTRY_ADDRESS") &&
      readSecret("SECURITY_REGISTRY_ADDRESS") &&
      hasPasskeyServer(),
  );
}

export { hasUpstash };

export interface AgentConfigStatus {
  /** A direct OpenAI key is configured. */
  openai: boolean;
  /** Whether ANY LLM provider (gateway or OpenAI) is configured. */
  llm: boolean;
  /** Which provider the loop resolves to. */
  provider: "gateway" | "openai" | "none";
  /** Persistent memory store (Upstash) is configured; false uses local fallback. */
  upstash: boolean;
  /** On-chain ERC-8004 registration is configured (RPC + registries + passkey server). */
  zerodev: boolean;
  /** ZeroDev passkey server URL is set for client WebAuthn ceremonies. */
  passkeyServer: boolean;
  /** The only chain agents touch. */
  chain: typeof AGENT_CHAIN;
  /** Resolved model id (informational; reflects OPENAI_AGENT_MODEL or default). */
  model: string;
}

/** Snapshot of which agent-layer capabilities are live in this environment. */
export function agentConfigStatus(): AgentConfigStatus {
  return {
    openai: hasOpenAI(),
    llm: hasLLM(),
    provider: agentProvider(),
    upstash: hasUpstash(),
    zerodev: hasZeroDev(),
    passkeyServer: hasPasskeyServer(),
    chain: AGENT_CHAIN,
    model: agentModel(),
  };
}
