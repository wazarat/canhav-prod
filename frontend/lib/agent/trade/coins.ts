import { EXCHANGE_ROUTER, SEPOLIA_USDC } from "@/lib/agent/trade/gmx";

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
}

/** v1: sUSDe + sUSDai research assets → ETH/USD GMX market on Sepolia. */
export const TRADE_COINS: TradeCoin[] = [
  {
    symbol: "sUSDe",
    entitySlug: "ethena",
    collateralToken: SEPOLIA_USDC,
    gmxMarket: null,
    marketIndexToken: "WETH",
  },
  {
    symbol: "sUSDai",
    entitySlug: "usd-ai",
    collateralToken: SEPOLIA_USDC,
    gmxMarket: null,
    marketIndexToken: "WETH",
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
