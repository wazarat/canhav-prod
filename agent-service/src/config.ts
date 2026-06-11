import { arbitrumSepolia } from "viem/chains";
import type { Address } from "viem";

/**
 * CanHav agent-service configuration.
 *
 * HARD CONSTRAINT: agents execute on **Arbitrum Sepolia testnet only**. The
 * chain is pinned here and {@link assertArbitrumSepolia} throws on any other
 * chainId, so research data that references other chains (Solana, Ethereum, ...)
 * can never lead to off-Arbitrum execution.
 */
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614 as const;

/** The single supported chain. */
export const chain = arbitrumSepolia;

export interface AgentServiceConfig {
  chainId: number;
  /** ZeroDev unified RPC (bundler + paymaster) for Arbitrum Sepolia. */
  zerodevRpc: string;
  /** Public RPC for read calls (gate checks, event parsing). */
  rpcUrl: string;
  /** Deployed ERC-8004 IdentityRegistry address. */
  identityRegistry: Address;
  /** Deployed SecurityRegistry address (agent gating + badge source of truth). */
  securityRegistry: Address;
  /** Optional Arbiscan key for off-chain source-verification gating. */
  arbiscanApiKey?: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

/** Throws unless `chainId` is Arbitrum Sepolia. */
export function assertArbitrumSepolia(chainId: number): void {
  if (chainId !== ARBITRUM_SEPOLIA_CHAIN_ID) {
    throw new Error(
      `CanHav agents run on Arbitrum Sepolia (chainId ${ARBITRUM_SEPOLIA_CHAIN_ID}) only — refusing chainId ${chainId}.`,
    );
  }
}

/** Build the service config from the environment, asserting the chain pin. */
export function loadConfig(): AgentServiceConfig {
  return createConfig({
    zerodevRpc: required("ZERODEV_RPC"),
    rpcUrl:
      optional("ARBITRUM_SEPOLIA_RPC_URL") ??
      chain.rpcUrls.default.http[0] ??
      "https://sepolia-rollup.arbitrum.io/rpc",
    identityRegistry: required("IDENTITY_REGISTRY_ADDRESS") as Address,
    securityRegistry: required("SECURITY_REGISTRY_ADDRESS") as Address,
    arbiscanApiKey: optional("ARBISCAN_API_KEY"),
  });
}

/** Build config from explicit values (browser mint path — no process.env required). */
export function createConfig(
  params: Omit<AgentServiceConfig, "chainId"> & { chainId?: number },
): AgentServiceConfig {
  const cfg: AgentServiceConfig = {
    chainId: params.chainId ?? chain.id,
    zerodevRpc: params.zerodevRpc,
    rpcUrl: params.rpcUrl,
    identityRegistry: params.identityRegistry,
    securityRegistry: params.securityRegistry,
    arbiscanApiKey: params.arbiscanApiKey,
  };
  assertArbitrumSepolia(cfg.chainId);
  return cfg;
}
