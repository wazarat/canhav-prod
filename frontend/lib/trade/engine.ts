import { JLP_MARKET, MINT_FEE_PCT } from "./jlpMarket";
import { markPriceAt } from "./priceFeed";
import type { Position, Quote, Side } from "./types";

export function quoteBuy(payAmountUsd: number, leverage = 1, side: Side = "long"): Quote {
  const entryPrice = markPriceAt(Date.now());
  const feeUsd = payAmountUsd * MINT_FEE_PCT;
  const priceImpactPct = Math.min(0.5, (payAmountUsd / 5_000_000) * 100);
  const net = (payAmountUsd - feeUsd) * leverage;
  const jlpOut = +(net / entryPrice).toFixed(4);
  return {
    payAsset: "USDC",
    payAmountUsd,
    jlpOut,
    entryPrice,
    feePct: MINT_FEE_PCT,
    feeUsd: +feeUsd.toFixed(2),
    priceImpactPct: +priceImpactPct.toFixed(3),
    leverage,
    side,
  };
}

export function positionFromQuote(q: Quote): Position {
  const notionalUsd = +(q.jlpOut * q.entryPrice).toFixed(2);
  return {
    id: crypto.randomUUID(),
    side: q.side,
    jlpSize: q.jlpOut,
    entryPrice: q.entryPrice,
    notionalUsd,
    collateralUsd: +q.payAmountUsd.toFixed(2),
    leverage: q.leverage,
    openedAt: new Date().toISOString(),
    accruedYieldUsd: 0,
  };
}

/** Unrealized PnL from price move (long gains when mark > entry). */
export function pricePnl(
  p: Position,
  markPrice: number,
): { usd: number; pct: number } {
  const dir = p.side === "long" ? 1 : -1;
  const usd = dir * p.jlpSize * (markPrice - p.entryPrice);
  const pct = (usd / p.collateralUsd) * 100;
  return { usd: +usd.toFixed(2), pct: +pct.toFixed(2) };
}

/** Yield accrued since open, from the pool APY (continuous, demo). */
export function accruedYield(p: Position, nowMs = Date.now()): number {
  const days = (nowMs - new Date(p.openedAt).getTime()) / 86_400_000;
  const yieldUsd = p.notionalUsd * (JLP_MARKET.apyPct / 100) * (days / 365);
  return +yieldUsd.toFixed(2);
}
