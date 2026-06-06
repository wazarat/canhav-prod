import type { JlpMarket } from "./types";

export const JLP_MARKET: JlpMarket = {
  symbol: "JLP",
  name: "Jupiter Perps LP",
  mint: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
  priceUsd: 5.12,
  change24hPct: 0.43,
  marketCapUsd: 730_661_168,
  aumUsd: 730_000_000,
  aumCapUsd: 1_750_000_000,
  apyPct: 42.0,
  holders: 64_436,
  fees24hUsd: 412_000,
  weights: [
    { symbol: "SOL", name: "Solana", pct: 44, kind: "volatile" },
    { symbol: "USDC", name: "USD Coin", pct: 27, kind: "stable" },
    { symbol: "BTC", name: "Bitcoin", pct: 11, kind: "volatile" },
    { symbol: "ETH", name: "Ethereum", pct: 9, kind: "volatile" },
    { symbol: "USDT", name: "Tether", pct: 9, kind: "stable" },
  ],
};

export const MINT_FEE_PCT = 0.0006;
export const SLIPPAGE_PCT = 0.001;
export const COLLATERAL_ASSET = "USDC";
