import { readCoreState } from "../data/onchain";
import { readOffchainMarket } from "../data/offchain";
import type { AssetSnapshot, ResearchVerdict, WatchedAsset } from "../types";

const PEG_WARN_BPS = 50; // 0.5% deviation from $1
const SUPPLY_CHANGE_WARN = 0.02; // 2% vs prior snapshot

function severityFromPeg(deviation: number): "low" | "medium" | "high" {
  const bps = Math.abs(deviation) * 10_000;
  if (bps >= 100) return "high";
  if (bps >= PEG_WARN_BPS) return "medium";
  return "low";
}

function supplySignal(
  current: bigint | null,
  prior: AssetSnapshot | null,
): { signal: string; severity: "low" | "medium" | "high"; confidence: number; rationale: string } | null {
  if (current == null || prior?.totalSupply == null) return null;
  const prev = BigInt(prior.totalSupply);
  if (prev === 0n) return null;
  const delta = Number(current - prev) / Number(prev);
  if (Math.abs(delta) < SUPPLY_CHANGE_WARN) return null;
  if (delta < 0) {
    return {
      signal: "supply_contraction",
      severity: Math.abs(delta) > 0.05 ? "high" : "medium",
      confidence: 0.75,
      rationale: `sUSDe totalSupply contracted ~${(Math.abs(delta) * 100).toFixed(1)}% since last reading.`,
    };
  }
  return {
    signal: "supply_growth",
    severity: delta > 0.1 ? "medium" : "low",
    confidence: 0.7,
    rationale: `Token totalSupply grew ~${(delta * 100).toFixed(1)}% since last reading.`,
  };
}

/** Compute a stablecoin research verdict from on-chain + off-chain reads. */
export async function runStablecoinAgent(
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

  let signal = "reserve_diversification";
  let severity: "low" | "medium" | "high" = "low";
  let confidence = 0.6;
  let rationale = "Supply and peg readings are within normal bounds.";

  const supplyVerdict = supplySignal(core.totalSupply, priorSnapshot);
  if (supplyVerdict) {
    signal = supplyVerdict.signal;
    severity = supplyVerdict.severity;
    confidence = supplyVerdict.confidence;
    rationale = supplyVerdict.rationale;
  } else if (market.priceUsd != null) {
    // Yield-bearing stables (sUSDe, sUSDai) accrue above $1 — peg check uses
    // 24h drift, not absolute distance from $1.
    const isYieldBearing = asset.slug === "susde" || asset.slug === "susdai";
    if (isYieldBearing && market.priceChange24h != null) {
      if (Math.abs(market.priceChange24h) > 0.005) {
        signal = "peg_risk";
        severity = Math.abs(market.priceChange24h) > 0.02 ? "high" : "medium";
        confidence = 0.72;
        rationale = `24h price drift ${(market.priceChange24h * 100).toFixed(2)}% — unusual for ${asset.symbol} accrual cadence.`;
      }
    } else {
      const deviation = market.priceUsd - 1;
      if (Math.abs(deviation) * 10_000 >= PEG_WARN_BPS) {
        signal = "peg_risk";
        severity = severityFromPeg(deviation);
        confidence = 0.8;
        rationale = `Spot price $${market.priceUsd.toFixed(4)} deviates ${(deviation * 100).toFixed(2)}% from $1 peg.`;
      }
    }
  }

  if (core.poolTvl != null && core.poolTvl > 0n && signal === "reserve_diversification") {
    rationale = `Pool TVL present; no peg or supply stress detected at this cadence.`;
    confidence = 0.65;
  }

  return {
    verdict: {
      agentId,
      asset: asset.symbol,
      kind: "stablecoin",
      signal,
      severity,
      confidence,
      rationale,
      ts: snapshot.ts,
    },
    snapshot,
  };
}
