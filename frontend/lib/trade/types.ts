export type Side = "long" | "short";
export type OrderKind = "buy" | "sell";

export interface JlpMarket {
  symbol: "JLP";
  name: "Jupiter Perps LP";
  mint: string;
  priceUsd: number;
  change24hPct: number;
  marketCapUsd: number;
  aumUsd: number;
  aumCapUsd: number;
  apyPct: number;
  holders: number;
  volume24hUsd: number;
  weights: { symbol: string; name: string; pct: number; kind: "stable" | "volatile" }[];
}

export interface Quote {
  payAsset: string;
  payAmountUsd: number;
  jlpOut: number;
  entryPrice: number;
  feePct: number;
  feeUsd: number;
  priceImpactPct: number;
  leverage: number;
  side: Side;
}

export interface Position {
  id: string;
  side: Side;
  jlpSize: number;
  entryPrice: number;
  notionalUsd: number;
  collateralUsd: number;
  leverage: number;
  openedAt: string;
  accruedYieldUsd: number;
}

export interface ActivityItem {
  id: string;
  kind: OrderKind | "close";
  jlp: number;
  priceUsd: number;
  valueUsd: number;
  feeUsd: number;
  txHash: string;
  at: string;
}

export interface SmartAccount {
  address: string;
  connected: boolean;
  gasSponsored: boolean;
  chainId: 421614;
}
