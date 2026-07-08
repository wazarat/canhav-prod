import { readOffchainMarket } from "../data/offchain";
import type { AssetSnapshot, ResearchVerdict, WatchedAsset } from "../types";

// Majors (ETH, BTC) have no peg or APY semantics — the research surface is
// price action: trailing 24h move, 30d trend, and drift vs the prior snapshot.
const DRAWDOWN_WARN_24H = -0.04; // -4% in 24h
const DRAWDOWN_HIGH_24H = -0.08; // -8% in 24h
const MOMENTUM_BAND_24H = 0.015; // ±1.5% counts as a directional move
const TREND_BAND_30D = 0.1; // ±10% over 30d counts as a trend

/** Compute a majors market verdict from off-chain (CoinGecko) reads only. */
export async function runMarketAgent(
  asset: WatchedAsset,
  agentId: string,
  priorSnapshot: AssetSnapshot | null,
): Promise<{ verdict: ResearchVerdict; snapshot: AssetSnapshot }> {
  const market = await readOffchainMarket(asset);

  const snapshot: AssetSnapshot = {
    asset: asset.symbol,
    totalSupply: null,
    priceUsd: market.priceUsd,
    apy: null,
    ts: new Date().toISOString(),
  };

  let signal = "market_calm";
  let severity: "low" | "medium" | "high" = "low";
  let confidence = 0.6;
  let rationale = `No pronounced ${asset.symbol} price action at this cadence.`;

  const change24h = market.priceChange24h;
  const trend30d = market.trend30d;

  if (change24h == null && trend30d == null) {
    return {
      verdict: {
        agentId,
        asset: asset.symbol,
        kind: "market",
        signal: "data_unavailable",
        severity: "medium",
        confidence: 0.3,
        rationale: `CoinGecko market data unavailable for ${asset.symbol}; cannot assess price action.`,
        ts: snapshot.ts,
      },
      snapshot,
    };
  }

  if (change24h != null && change24h <= DRAWDOWN_WARN_24H) {
    signal = "drawdown_risk";
    severity = change24h <= DRAWDOWN_HIGH_24H ? "high" : "medium";
    confidence = 0.78;
    rationale = `${asset.symbol} fell ${(change24h * 100).toFixed(1)}% in 24h — active drawdown.`;
  } else if (change24h != null && Math.abs(change24h) >= MOMENTUM_BAND_24H) {
    const up = change24h > 0;
    signal = up ? "momentum_positive" : "momentum_negative";
    severity = up ? "low" : "medium";
    confidence = 0.7;
    rationale = `${asset.symbol} moved ${(change24h * 100).toFixed(1)}% in 24h${
      trend30d != null ? ` (${(trend30d * 100).toFixed(0)}% over 30d)` : ""
    }.`;
  } else if (trend30d != null && Math.abs(trend30d) >= TREND_BAND_30D) {
    const up = trend30d > 0;
    signal = up ? "trend_positive" : "trend_negative";
    severity = "low";
    confidence = 0.65;
    rationale = `${asset.symbol} is ${up ? "up" : "down"} ${(Math.abs(trend30d) * 100).toFixed(0)}% over 30d with a quiet last 24h.`;
  }

  // Inter-run drift check: flag a sharp fall since the prior reading even if
  // the 24h window looks calm (e.g. hourly cadence catching a fast move).
  const priorPrice = priorSnapshot?.priceUsd ?? null;
  if (
    market.priceUsd != null &&
    priorPrice != null &&
    priorPrice > 0 &&
    signal === "market_calm"
  ) {
    const drift = (market.priceUsd - priorPrice) / priorPrice;
    if (drift <= DRAWDOWN_WARN_24H) {
      signal = "drawdown_risk";
      severity = drift <= DRAWDOWN_HIGH_24H ? "high" : "medium";
      confidence = 0.72;
      rationale = `${asset.symbol} fell ${(Math.abs(drift) * 100).toFixed(1)}% since the prior reading.`;
    }
  }

  return {
    verdict: {
      agentId,
      asset: asset.symbol,
      kind: "market",
      signal,
      severity,
      confidence,
      rationale,
      ts: snapshot.ts,
    },
    snapshot,
  };
}
