import "server-only";

import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { readSecret } from "@/lib/server/env";
import { hasUpstash } from "@/lib/server/redis";

import { AGENT_CHAIN, ARBITRUM_SEPOLIA_CHAIN_ID } from "./chain";

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

/** EntryPoint v0.7 (used to shape the paymaster probe userOp). */
const ENTRYPOINT_07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

/**
 * Parse the `/api/v<n>/<projectId>/chain/<chainId>` segments from `ZERODEV_RPC`.
 * Lets the status readout report *which* ZeroDev project + chain the running
 * deployment actually resolves — the only way to catch a stale env snapshot or
 * a wrong/typo'd project id without leaking the full (sponsorship-capable) URL.
 */
function parseZeroDevRpc(): {
  url: string | null;
  projectId: string | null;
  chainId: number | null;
} {
  const url = readSecret("ZERODEV_RPC");
  if (!url) return { url: null, projectId: null, chainId: null };
  const m = url.match(/\/api\/v\d+\/([0-9a-fA-F-]{36})(?:\/chain\/(\d+))?/);
  return {
    url,
    projectId: m?.[1] ?? null,
    chainId: m?.[2] ? Number(m[2]) : null,
  };
}

/**
 * Masked ZeroDev project identifier for the public status readout: the first 8
 * chars of the project UUID (e.g. `"0988370e"`), never the full id/URL (which
 * could be replayed to drain sponsored gas). Returns `"set:unparseable"` when
 * `ZERODEV_RPC` is present but not the expected v3 `.../<uuid>/chain/<id>` shape
 * — that itself signals a copy-paste artifact (quotes/whitespace) or wrong URL.
 */
function maskedZeroDevProject(): string | null {
  const { url, projectId } = parseZeroDevRpc();
  if (!url) return null;
  if (!projectId) return "set:unparseable";
  return `${projectId.slice(0, 8)}…`;
}

export interface PaymasterProbe {
  /** True only when the live RPC returned sponsored paymaster data. */
  ok: boolean;
  httpStatus: number | null;
  /** Chain id parsed from `ZERODEV_RPC` and used for the probe. */
  chainId: number | null;
  /** The paymaster contract address returned on success (proof it resolved). */
  paymaster?: string | null;
  /** The verbatim RPC error on failure (e.g. `Unauthorized: wapk`). */
  error?: string | null;
}

/**
 * Server-side reproduction of the exact sponsorship call the mint makes
 * (`pm_getPaymasterStubData`), using the running deployment's real `ZERODEV_RPC`.
 *
 * On-demand only (it can count against the project's daily request budget), so
 * it is never run by `agentConfigStatus()` — the status route gates it behind a
 * query flag + the admin token. A green probe here means the live deployment
 * can sponsor the mint; a red probe surfaces the real reason (wrong project,
 * no matching policy, exhausted credits) instead of the generic UI "403".
 */
export async function probeZeroDevPaymaster(): Promise<PaymasterProbe> {
  const { url, chainId } = parseZeroDevRpc();
  if (!url) {
    return { ok: false, httpStatus: null, chainId: null, error: "ZERODEV_RPC not set." };
  }
  const probeChain = chainId ?? ARBITRUM_SEPOLIA_CHAIN_ID;
  const chainHex = `0x${probeChain.toString(16)}`;
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "pm_getPaymasterStubData",
    params: [
      {
        sender: "0x0000000000000000000000000000000000000001",
        nonce: "0x0",
        callData: "0x",
        callGasLimit: "0x186a0",
        verificationGasLimit: "0x186a0",
        preVerificationGas: "0x186a0",
        maxFeePerGas: "0x3b9aca00",
        maxPriorityFeePerGas: "0x3b9aca00",
      },
      ENTRYPOINT_07,
      chainHex,
      {},
    ],
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    type PaymasterRpcResponse = {
      result?: { paymaster?: string };
      error?: { message?: string } | string;
    };
    let json: PaymasterRpcResponse | null = null;
    try {
      json = JSON.parse(text) as PaymasterRpcResponse;
    } catch {
      // Non-JSON body (e.g. an HTML 403 page) — fall back to the raw text.
    }
    const rpcError = json?.error;
    if (!res.ok || rpcError) {
      const message =
        typeof rpcError === "string"
          ? rpcError
          : (rpcError?.message ?? text.slice(0, 300) ?? "Paymaster rejected the request.");
      return { ok: false, httpStatus: res.status, chainId, error: message };
    }
    return {
      ok: true,
      httpStatus: res.status,
      chainId,
      paymaster: json?.result?.paymaster ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      httpStatus: null,
      chainId,
      error: e instanceof Error ? e.message : "Paymaster probe failed.",
    };
  }
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
  /**
   * Masked ZeroDev project the running deployment resolves (first 8 chars of the
   * project UUID, e.g. `"0988370e"`), or `"set:unparseable"` / `null`. Surfaces a
   * stale env snapshot or wrong/typo'd project id without leaking the full URL.
   */
  zerodevProject: string | null;
  /** Chain id parsed from `ZERODEV_RPC`; should be 421614 (Arbitrum Sepolia). */
  zerodevChain: number | null;
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
    zerodevProject: maskedZeroDevProject(),
    zerodevChain: parseZeroDevRpc().chainId,
    chain: AGENT_CHAIN,
    model: agentModel(),
  };
}
