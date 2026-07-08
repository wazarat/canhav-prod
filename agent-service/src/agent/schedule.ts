import { getWatchedAsset } from "../data/assets";
import { runMarketAgent } from "./market";
import { runStablecoinAgent } from "./stablecoin";
import { runYieldAgent } from "./yield";
import type { AgentType, AssetSnapshot, ResearchVerdict, WatchedAsset } from "../types";

export interface RunOnceResult {
  verdict: ResearchVerdict;
  snapshot: AssetSnapshot;
}

/** Run one agent pass: READ data → compute → produce verdict. No on-chain write. */
export async function runOnce(
  type: AgentType,
  asset: WatchedAsset,
  agentId: string,
  priorSnapshot: AssetSnapshot | null = null,
): Promise<RunOnceResult> {
  if (type === "stablecoin") return runStablecoinAgent(asset, agentId, priorSnapshot);
  if (type === "market") return runMarketAgent(asset, agentId, priorSnapshot);
  return runYieldAgent(asset, agentId, priorSnapshot);
}

/** Resolve asset symbol to WatchedAsset preset and run once. */
export async function runOnceBySymbol(
  type: AgentType,
  symbol: string,
  agentId: string,
  priorSnapshot: AssetSnapshot | null = null,
): Promise<RunOnceResult | null> {
  const asset = getWatchedAsset(symbol);
  if (!asset) return null;
  return runOnce(type, asset, agentId, priorSnapshot);
}

/**
 * Periodic loop. Default cadence: hourly. Stores verdicts via callback;
 * on-chain write is opt-in + gated elsewhere.
 */
export function startSchedule(
  type: AgentType,
  asset: WatchedAsset,
  agentId: string,
  onResult: (result: RunOnceResult) => void,
  getPriorSnapshot: () => AssetSnapshot | null,
  everyMs = 60 * 60 * 1000,
): () => void {
  const tick = async () => {
    const result = await runOnce(type, asset, agentId, getPriorSnapshot());
    onResult(result);
  };
  void tick();
  const id = setInterval(() => void tick(), everyMs);
  return () => clearInterval(id);
}
