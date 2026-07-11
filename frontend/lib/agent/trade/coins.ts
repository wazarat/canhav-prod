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
  /**
   * Index token symbol for Reader market lookup (e.g. WETH for ETH/USD).
   * Null when no GMX market exists for this coin.
   */
  marketIndexToken: string | null;
  /** CoinGecko coin id for the live spot-price endpoint. */
  geckoId: string;
  /**
   * Whether a GMX Sepolia perp market exists for this coin. When false the
   * desk runs the same research gate but only files buy/sell recommendations
   * (no on-chain fill).
   */
  executable: boolean;
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
    executable: true,
  },
  {
    symbol: "BTC",
    entitySlug: "bitcoin",
    collateralToken: USDC_SG,
    gmxMarket: "0x3A83246bDDD60c4e71c91c10D9A66Fd64399bBCf",
    marketIndexToken: "BTC",
    geckoId: "bitcoin",
    executable: true,
  },
  {
    symbol: "AAVE",
    entitySlug: "aave",
    collateralToken: USDC_SG,
    gmxMarket: null,
    marketIndexToken: null,
    geckoId: "aave",
    executable: false,
  },
];

export function getTradeCoin(symbol: string): TradeCoin | null {
  const key = symbol.trim();
  return TRADE_COINS.find((c) => c.symbol.toLowerCase() === key.toLowerCase()) ?? null;
}

export function listTradeCoinSymbols(): string[] {
  return TRADE_COINS.map((c) => c.symbol);
}

/** The executable GMX Sepolia majors — the default desk for unmapped skills. */
export function majorTradeCoins(): TradeCoin[] {
  return TRADE_COINS.filter((c) => c.executable);
}

/**
 * Skill-aware desk coins. Entity skills use the bare entity slug (see
 * lib/agent/skills.ts); product skills are namespaced `token:{slug}` etc.
 * A skill whose entity has a catalog coin gets that coin's desk; everyone
 * else falls back to the executable majors.
 */
export function getTradeCoinsForAgent(skillId: string | null | undefined): TradeCoin[] {
  const raw = skillId?.trim().toLowerCase() ?? "";
  const slug = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  if (slug) {
    const matched = TRADE_COINS.filter((c) => c.entitySlug === slug);
    if (matched.length > 0) return matched;
  }
  return majorTradeCoins();
}

export function defaultGmxTarget(): `0x${string}` {
  return EXCHANGE_ROUTER;
}
