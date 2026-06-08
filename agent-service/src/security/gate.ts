import { createPublicClient, http, type Address } from "viem";

import { assertArbitrumSepolia, chain, type AgentServiceConfig } from "../config";
import { securityRegistryAbi } from "../abi/registries";

/** Thrown when an agent attempts to interact with a gated (disallowed) target. */
export class GateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GateError";
  }
}

function publicClient(cfg: AgentServiceConfig) {
  return createPublicClient({ chain, transport: http(cfg.rpcUrl) });
}

/** Read the on-chain SecurityRegistry allowlist for a target. */
export async function isTargetAllowed(cfg: AgentServiceConfig, target: Address): Promise<boolean> {
  return publicClient(cfg).readContract({
    address: cfg.securityRegistry,
    abi: securityRegistryAbi,
    functionName: "isAllowed",
    args: [target],
  });
}

/**
 * The single gate every scoped action passes through before execution. Refuses:
 *   - any chain other than Arbitrum Sepolia (testnet-only guard), and
 *   - any target not allowlisted on the SecurityRegistry (unaudited/unverified).
 */
export async function assertTargetAllowed(cfg: AgentServiceConfig, target: Address): Promise<void> {
  assertArbitrumSepolia(cfg.chainId);
  const allowed = await isTargetAllowed(cfg, target);
  if (!allowed) {
    throw new GateError(
      `Target ${target} is not on the SecurityRegistry allowlist (unaudited/unverified). Agent execution refused.`,
    );
  }
}
