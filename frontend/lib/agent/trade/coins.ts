import { EXCHANGE_ROUTER, USDC_SG } from "@/lib/agent/trade/gmx";

export interface TradeCoin {
  symbol: string;
  entitySlug: string;
  /** ERC-20 used as GMX collateral on Arbitrum Sepolia. */
  collateralToken: `0x${string}`;
  /**
   * GMX market token address. When null, resolved at trade time via Reader
   * using `marketIndexToken` hint.
   */
  gmxMarket: `0x${string}` | null;
  /** Index token symbol for Reader market lookup (e.g. WETH for ETH/USD). */
  marketIndexToken: string;
  /** CoinGecko coin id for the live spot-price endpoint. */
  geckoId: string;
}

/**
 * v2: the verified GMX Sepolia majors (on-chain via Reader.getMarkets,
 * 2026-07-08 — re-verify with `node scripts/verify-gmx-markets.mjs`).
 * Honest mapping: you trade the market the research covers.
 */
export const TRADE_COINS: TradeCoin[] = [
  {
    symbol: "ETH",
    entitySlug: "ethereum",
    collateralToken: USDC_SG,
    gmxMarket: "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc",
    marketIndexToken: "WETH",
    geckoId: "ethereum",
  },
  {
    symbol: "BTC",
    entitySlug: "bitcoin",
    collateralToken: USDC_SG,
    gmxMarket: "0x3A83246bDDD60c4e71c91c10D9A66Fd64399bBCf",
    marketIndexToken: "BTC",
    geckoId: "bitcoin",
  },
];

export function getTradeCoin(symbol: string): TradeCoin | null {
  const key = symbol.trim();
  return TRADE_COINS.find((c) => c.symbol.toLowerCase() === key.toLowerCase()) ?? null;
}

export function listTradeCoinSymbols(): string[] {
  return TRADE_COINS.map((c) => c.symbol);
}

export function defaultGmxTarget(): `0x${string}` {
  return EXCHANGE_ROUTER;
}
