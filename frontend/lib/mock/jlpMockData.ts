import { makePriceSeries } from "@/lib/mock/seriesHelpers";
import type { TokenProfile } from "@/lib/types";

const NOW = "2026-06-05T00:00:00Z";

export const jlpToken: TokenProfile = {
  category: "Token",
  slug: "jlp",
  name: "Jupiter Perps LP",
  symbol: "JLP",
  status: "APPROVED",
  tokenType: "Yield",
  subCategory: "Yield-generating Token",
  entitySlug: "jupiter",
  description:
    "JLP is the liquidity-provider token for Jupiter Perpetuals: a tokenized index of SOL, ETH, BTC, USDC, and USDT plus a claim on 75% of perp trading fees. It is a yield-bearing LP token, NOT a stablecoin.",
  longDescription:
    "Holding JLP is equivalent to holding the pool's asset basket and acting as the counterparty to every Jupiter Perps trader. Fees from opening/closing positions, borrowing, price impact, and swaps accrue directly into the pool, lifting the JLP virtual price (auto-compounding real yield, no emissions). JLP can be minted/redeemed with any pool asset (the protocol rebalances toward target weights via a small fee) or bought on the open market; above the AUM cap, minting disables and JLP may trade at a premium.",
  website: "https://jup.ag/perps-earn",
  twitter: "https://x.com/JupiterExchange",
  discord: "https://discord.gg/jup",
  github: "https://github.com/jup-ag",
  coingecko:
    "https://www.coingecko.com/en/coins/jupiter-perpetuals-liquidity-provider-token",
  auditUrl: null,
  contractAddress: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",

  market: {
    priceUsd: {
      value: 5.12,
      dataSource: "demo",
      sourceLabel: "Solana Compass (demo)",
      updatedAt: NOW,
    },
    marketCapUsd: { value: 730_661_168, dataSource: "demo", updatedAt: NOW },
    volume24hUsd: { value: 3_528_927, dataSource: "demo", updatedAt: NOW },
    circulatingSupply: { value: 320_000_000, dataSource: "demo", updatedAt: NOW },
    totalSupply: { value: 320_000_000, dataSource: "demo", updatedAt: NOW },
    maxSupply: { value: null, dataSource: "demo", updatedAt: NOW },
    holders: { value: 64_436, dataSource: "demo", updatedAt: NOW },
  },

  priceHistory: {
    points: makePriceSeries("jlp-price", 5.12, 0.06, 0.02, 90),
    dataSource: "demo",
    updatedAt: NOW,
  },

  poolComposition: {
    assets: [
      {
        symbol: "SOL",
        name: "Solana",
        targetWeightPct: 44,
        currentWeightPct: 43.6,
        kind: "volatile",
        valueUsd: 318_000_000,
      },
      {
        symbol: "BTC",
        name: "Bitcoin (wBTC)",
        targetWeightPct: 11,
        currentWeightPct: 11.4,
        kind: "volatile",
        valueUsd: 83_000_000,
      },
      {
        symbol: "ETH",
        name: "Ethereum (wETH)",
        targetWeightPct: 9,
        currentWeightPct: 8.7,
        kind: "volatile",
        valueUsd: 64_000_000,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        targetWeightPct: 27,
        currentWeightPct: 27.2,
        kind: "stable",
        valueUsd: 199_000_000,
      },
      {
        symbol: "USDT",
        name: "Tether",
        targetWeightPct: 9,
        currentWeightPct: 9.1,
        kind: "stable",
        valueUsd: 66_000_000,
      },
    ],
    stablePct: 36.3,
    volatilePct: 63.7,
    aumUsd: 730_000_000,
    aumCapUsd: 1_750_000_000,
    utilizationPct: 41.7,
    dataSource: "demo",
    updatedAt: NOW,
  },

  yieldMechanics: {
    currentApyPct: 42.0,
    apy7dPct: 39.5,
    apy30dPct: 45.2,
    feeShareToHoldersPct: 75,
    yieldSource:
      "Perp trading fees: open/close fees, borrow fees, price-impact, and swaps.",
    isAutoCompounding: true,
    emissionsBased: false,
    payoutAsset:
      "In-kind — fees redeposited into pool assets hourly, raising JLP virtual price.",
    apyHistory: makePriceSeries("jlp-apy", 42, -0.1, 0.03, 90),
    dataSource: "demo",
  },

  typedRisks: [
    {
      category: "Counterparty (trader PnL)",
      severity: "high",
      description: "JLP is the house: when traders are net profitable, JLP NAV falls.",
    },
    {
      category: "Market (basket beta)",
      severity: "high",
      description:
        "~64% volatile exposure (SOL/ETH/BTC) means JLP drops with crypto drawdowns.",
    },
    {
      category: "Holder concentration",
      severity: "medium",
      description: "Top-10 holders control ~83% of supply (demo).",
    },
    {
      category: "AUM cap / premium",
      severity: "low",
      description:
        "At cap, minting disables and secondary-market JLP can trade above virtual price.",
    },
    {
      category: "Oracle / liquidation",
      severity: "medium",
      description: "Mispriced oracles can distort PnL and liquidations.",
    },
  ],

  tokenomics: {
    maxSupply: null,
    notes: [
      "Uncapped — supply expands/contracts with mint/redeem.",
      "No governance rights; pure LP/index exposure.",
    ],
  },

  audits: [
    { firm: "OtterSec", date: "2024", url: null },
    { firm: "Sec3", date: "2024", url: null },
  ],

  sources: [
    { label: "Jupiter Perps docs", url: "https://dev.jup.ag/docs/perps/custody-account" },
    {
      label: "JLP mechanics (Eco)",
      url: "https://eco.com/support/en/articles/15083164-jupiter-perps-fees-leverage-how-jlp-works",
    },
    {
      label: "Solana Compass — JLP",
      url: "https://solanacompass.com/tokens/27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
    },
    {
      label: "CoinGecko — JLP",
      url: "https://www.coingecko.com/en/coins/jupiter-perpetuals-liquidity-provider-token",
    },
  ],

  tradeable: {
    replicationBasket: [
      { symbol: "SOL", weightPct: 44, gmxMarket: "SOL/USD" },
      { symbol: "BTC", weightPct: 11, gmxMarket: "BTC/USD" },
      { symbol: "ETH", weightPct: 9, gmxMarket: "ETH/USD" },
    ],
    chain: "arbitrum-sepolia",
    chainId: 421614,
    zeroDevEnabled: true,
    gasSponsored: true,
    mode: "demo",
  },

  agentSkill: {
    id: "jupiter.jlp.v1",
    title: "Understanding JLP (Jupiter Perps LP)",
    summary:
      "JLP is a yield-bearing index/LP token on Solana representing the Jupiter Perpetuals pool (SOL/ETH/BTC/USDC/USDT) plus a 75% claim on perp trading fees. It is NOT a stablecoin and NOT a governance token. Its price floats with the basket and auto-compounds real fee yield; it carries direct trader-PnL (counterparty) risk.",
    facts: [
      { key: "category", value: "Yield-bearing LP / index token (not a stablecoin)" },
      { key: "chain", value: "Solana" },
      { key: "mint", value: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4" },
      { key: "fee_share_to_holders", value: "75% of perp fees" },
      {
        key: "target_weights",
        value: "SOL 44% / BTC 11% / ETH 9% / USDC 27% / USDT 9%",
      },
      { key: "stable_vs_volatile", value: "~36% stable, ~64% volatile" },
      { key: "yield_type", value: "Real yield (fees), auto-compounding, no emissions" },
      { key: "aum_cap", value: "~$1.75B; minting disabled at cap, premium possible" },
      { key: "supply", value: "Uncapped; mint/redeem against the pool" },
    ],
    sections: [
      {
        heading: "What JLP is",
        body: "Holding JLP = holding the pool basket + acting as counterparty to leveraged Jupiter Perps traders. You earn 75% of fees; you take the other side of trader PnL.",
      },
      {
        heading: "How yield works",
        body: "Open/close fees, borrow fees, price impact, and swaps accrue into the pool hourly, lifting the JLP virtual price. No separate reward token is minted.",
      },
      {
        heading: "Valuation",
        body: "JLP virtual price = pool AUM / JLP supply. Secondary-market price can exceed virtual price when AUM is at cap and minting is disabled.",
      },
      {
        heading: "Key risks",
        body: "Counterparty/trader-PnL (high), volatile-basket beta (high), holder concentration (medium), oracle/liquidation (medium).",
      },
      {
        heading: "How to classify it",
        body: "When mapping DeFi products: JLP → 'Yield Token / LP index'. Do NOT label it a stablecoin even though ~36% of the basket is stables.",
      },
    ],
    actions: [
      {
        name: "Get JLP price & APY",
        description: "Read current JLP virtual price and APY.",
        signature: "getJlpStats() -> { priceUsd, apyPct, aumUsd }",
        readOnly: true,
      },
      {
        name: "Quote mint",
        description: "Estimate JLP received for depositing a pool asset.",
        signature: "quoteMintJlp(asset, amount) -> { jlpOut, feePct }",
        readOnly: true,
      },
      {
        name: "Quote redeem",
        description: "Estimate asset received for burning JLP.",
        signature: "quoteRedeemJlp(jlpAmount, asset) -> { assetOut, feePct }",
        readOnly: true,
      },
      {
        name: "Replicate on Arbitrum",
        description:
          "Map JLP basket to GMX positions via a ZeroDev smart account (see TradeConfig).",
        signature: "replicateExposure(usdAmount) -> Order[]",
        readOnly: false,
      },
    ],
    glossary: [
      {
        term: "Virtual price",
        definition: "Pool AUM divided by JLP supply; the fair NAV per JLP.",
      },
      {
        term: "AUM cap",
        definition: "Soft ceiling on pool size; at cap, new minting halts.",
      },
      {
        term: "Real yield",
        definition: "Yield paid from actual trading fees, not token emissions.",
      },
    ],
    sources: [
      { label: "Jupiter Perps docs", url: "https://dev.jup.ag/docs/perps/custody-account" },
      {
        label: "JLP mechanics (Eco)",
        url: "https://eco.com/support/en/articles/15083164-jupiter-perps-fees-leverage-how-jlp-works",
      },
    ],
    version: "1.0.0",
    updatedAt: NOW,
  },

  totalSupply: { value: 320_000_000, source: "alchemy", updatedAt: NOW },
  arbitrumPortalMetadata: {
    portalUrl: null,
    logoUrl: null,
    bannerUrl: null,
    chains: ["Solana"],
    subCategory: "Perpetuals LP",
    isLive: true,
    isArbitrumNative: false,
    isPubliclyAudited: true,
    foundedDate: "2023-10-01",
  },
  createdAt: NOW,
  updatedAt: NOW,
};
