import "server-only";

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

/** Whether an OpenAI key is configured for the reasoning loop. */
export function hasOpenAI(): boolean {
  return Boolean(readSecret("OPENAI_API_KEY"));
}

/** The OpenAI model the agent loop should use (override via OPENAI_AGENT_MODEL). */
export function agentModel(): string {
  return readSecret("OPENAI_AGENT_MODEL") ?? DEFAULT_AGENT_MODEL;
}

/**
 * Whether the on-chain identity stack is provisioned: a ZeroDev project RPC plus
 * both deployed registry addresses. The spawn route also needs these in the
 * actual process env (agent-service `loadConfig` reads `process.env`).
 */
export function hasZeroDev(): boolean {
  return Boolean(
    readSecret("ZERODEV_RPC") &&
      readSecret("IDENTITY_REGISTRY_ADDRESS") &&
      readSecret("SECURITY_REGISTRY_ADDRESS"),
  );
}

export { hasUpstash };

export interface AgentConfigStatus {
  /** LLM reasoning loop is configured. */
  openai: boolean;
  /** Persistent memory store (Upstash) is configured; false uses local fallback. */
  upstash: boolean;
  /** On-chain ERC-8004 registration is configured. */
  zerodev: boolean;
  /** The only chain agents touch. */
  chain: typeof AGENT_CHAIN;
  /** Resolved model id (informational; reflects OPENAI_AGENT_MODEL or default). */
  model: string;
}

/** Snapshot of which agent-layer capabilities are live in this environment. */
export function agentConfigStatus(): AgentConfigStatus {
  return {
    openai: hasOpenAI(),
    upstash: hasUpstash(),
    zerodev: hasZeroDev(),
    chain: AGENT_CHAIN,
    model: agentModel(),
  };
}
