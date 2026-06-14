import { readCoreState } from "../data/onchain";
import { readOffchainMarket } from "../data/offchain";
import type { AssetSnapshot, ResearchVerdict, WatchedAsset } from "../types";

const APY_COMPRESSION_THRESHOLD = -0.15; // 15% relative drop vs prior
const APY_STRENGTH_THRESHOLD = 0.05; // 5% relative gain

/** Compute a yield research verdict from on-chain + off-chain reads. */
export async function runYieldAgent(
  asset: WatchedAsset,
  agentId: string,
  priorSnapshot: AssetSnapshot | null,
): Promise<{ verdict: ResearchVerdict; snapshot: AssetSnapshot }> {
  const [core, market] = await Promise.all([readCoreState(asset), readOffchainMarket(asset)]);

  const snapshot: AssetSnapshot = {
    asset: asset.symbol,
    totalSupply: core.totalSupply?.toString() ?? null,
    priceUsd: market.priceUsd,
    apy: market.apy,
    ts: new Date().toISOString(),
  };

  let signal = "yield_strength";
  let severity: "low" | "medium" | "high" = "low";
  let confidence = 0.65;
  let rationale = "Trailing yield appears stable relative to recent readings.";

  const currentApy = market.apy;
  const priorApy = priorSnapshot?.apy ?? null;

  if (currentApy != null && priorApy != null && priorApy > 0) {
    const relativeChange = (currentApy - priorApy) / Math.abs(priorApy);
    if (relativeChange <= APY_COMPRESSION_THRESHOLD) {
      signal = "yield_compression";
      severity = relativeChange <= -0.3 ? "high" : "medium";
      confidence = 0.78;
      rationale = `Implied APY fell ~${(Math.abs(relativeChange) * 100).toFixed(0)}% vs prior snapshot (${(priorApy * 100).toFixed(1)}% → ${(currentApy * 100).toFixed(1)}%).`;
    } else if (relativeChange >= APY_STRENGTH_THRESHOLD) {
      signal = "yield_strength";
      severity = "low";
      confidence = 0.72;
      rationale = `Yield source strengthened: implied APY up ~${(relativeChange * 100).toFixed(0)}% vs prior reading.`;
    }
  } else if (currentApy != null) {
    if (currentApy >= 0.08) {
      signal = "catalyst_positive";
      severity = "low";
      confidence = 0.6;
      rationale = `Current implied APY ~${(currentApy * 100).toFixed(1)}% — elevated but within historical range for ${asset.symbol}.`;
    } else if (currentApy < 0.03) {
      signal = "catalyst_negative";
      severity = "medium";
      confidence = 0.68;
      rationale = `Implied APY compressed below 3% — yield durability may be weakening.`;
    }
  }

  if (market.priceChange24h != null && market.priceChange24h < -0.01 && signal === "yield_strength") {
    signal = "catalyst_negative";
    severity = "medium";
    confidence = 0.7;
    rationale = `24h price drift negative alongside flat yield — watch for compression risk.`;
  }

  return {
    verdict: {
      agentId,
      asset: asset.symbol,
      kind: "yield",
      signal,
      severity,
      confidence,
      rationale,
      ts: snapshot.ts,
    },
    snapshot,
  };
}
