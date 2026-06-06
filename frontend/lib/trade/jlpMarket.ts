import type { JlpMarket } from "./types";

/** Market anchors aligned with CoinMarketCap (2026-06-05). */
export const JLP_MARKET: JlpMarket = {
  symbol: "JLP",
  name: "Jupiter Perps LP",
  mint: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
  priceUsd: 3.24,
  change24hPct: -3.91,
  marketCapUsd: 720_870_000,
  aumUsd: 720_870_000,
  aumCapUsd: 1_750_000_000,
  apyPct: 8.31,
  holders: 64_050,
  volume24hUsd: 15_100_000,
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
