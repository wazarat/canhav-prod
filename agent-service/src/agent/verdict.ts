import { encodeFunctionData, type Address, type Hex } from "viem";

import type { AgentServiceConfig } from "../config";
import type { ResearchVerdict } from "../types";
import type { AgentKernelAccount } from "../zerodev/account";
import { executeScopedAction } from "./execute";

/** Minimal ABI for an optional on-chain verdict recorder (gated target). */
const verdictRecorderAbi = [
  {
    type: "function",
    name: "recordVerdict",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetHash", type: "bytes32" },
      { name: "severity", type: "uint8" },
      { name: "confidenceBps", type: "uint16" },
    ],
    outputs: [],
  },
] as const;

const SEVERITY_UINT: Record<ResearchVerdict["severity"], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function assetHash(asset: string): Hex {
  const bytes = new TextEncoder().encode(asset);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex.padEnd(64, "0").slice(0, 64)}` as Hex;
}

/**
 * Optional on-chain verdict write — routes through executeScopedAction → gate.
 * Off by default for demo agents; only call when target is SecurityRegistry-allowlisted.
 */
export async function recordVerdictOnChain(
  cfg: AgentServiceConfig,
  agent: AgentKernelAccount,
  target: Address,
  verdict: ResearchVerdict,
) {
  const data = encodeFunctionData({
    abi: verdictRecorderAbi,
    functionName: "recordVerdict",
    args: [
      assetHash(verdict.asset),
      SEVERITY_UINT[verdict.severity],
      Math.round(verdict.confidence * 10_000),
    ],
  });
  return executeScopedAction(cfg, agent, { target, data });
}
