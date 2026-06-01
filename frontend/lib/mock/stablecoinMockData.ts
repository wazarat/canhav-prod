import type { PegDataPoint, StablecoinProfile } from "@/lib/types";

/**
 * MOCK DATA — Step 2 of the build.
 *
 * These 10 profiles correspond exactly to the Phase 1 target list and are sourced
 * (for metadata) from `Arbitrum Ecosystem - scrape v2.csv`. Supply figures and peg
 * series are ILLUSTRATIVE placeholders so the UI can be built without burning
 * Alchemy/Dune free-tier quota; they are replaced by live overlays in Step 4.
 *
 * The shape is identical to the DynamoDB single-table item (see lib/types.ts),
 * so swapping mock → live is a data-source change only, not a UI change.
 */

const PEG_ANCHOR = new Date("2026-06-01T00:00:00Z");

/** Deterministic 32-bit hash (FNV-1a) so each slug yields a stable series. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tiny seeded LCG in [0, 1). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Build a deterministic ~30-day peg series centered on `center` with a small
 * mean-reverting wobble of magnitude `vol`.
 */
function makePegSeries(slug: string, center: number, vol: number, days = 30): PegDataPoint[] {
  const rand = lcg(hashSeed(slug));
  const points: PegDataPoint[] = [];
  let price = center;
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(PEG_ANCHOR.getTime() - i * 24 * 60 * 60 * 1000);
    const shock = (rand() - 0.5) * 2 * vol;
    // pull back toward the center so the series stays peg-like
    price = price + shock + (center - price) * 0.35;
    points.push({
      date: date.toISOString().slice(0, 10),
      price: Number(price.toFixed(4)),
    });
  }
  return points;
}

const NOW = "2026-06-01T08:00:00Z";

export const stablecoinMockData: StablecoinProfile[] = [
  {
    category: "Stablecoin",
    slug: "usdc",
    name: "USDC",
    symbol: "USDC",
    status: "APPROVED",
    pegTarget: "USD",
    description:
      "USDC is a fully-reserved US dollar stablecoin issued by Circle, redeemable 1:1 and widely used as base liquidity across Arbitrum DeFi.",
    website: "https://www.circle.com/en/usdc",
    twitter: "https://twitter.com/circle",
    discord: "https://discord.com/invite/Q7bKN5y",
    github: "https://github.com/centrehq",
    coingecko: "https://www.coingecko.com/en/coins/usd-coin",
    auditUrl: null,
    totalSupply: { value: 1_452_000_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("usdc", 1, 0.0012), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/usdc",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/usdc-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/usdc-banner.webp",
      chains: ["Arbitrum One", "Arbitrum Nova"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "tether",
    name: "Tether (USDT)",
    symbol: "USDT",
    status: "APPROVED",
    pegTarget: "USD",
    description:
      "Tether (USDT) is the most widely circulated US dollar stablecoin and a primary settlement asset across centralized and decentralized venues on Arbitrum.",
    website: "https://tether.to/",
    twitter: "https://twitter.com/Tether_to/",
    discord: null,
    github: null,
    coingecko: "https://www.coingecko.com/en/coins/tether",
    auditUrl: null,
    totalSupply: { value: 982_400_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("tether", 1, 0.0014), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/tether",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/tether-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/tether-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "ethena",
    name: "Ethena (USDe)",
    symbol: "USDe",
    status: "APPROVED",
    pegTarget: "USD",
    description:
      "Ethena's USDe is a crypto-native synthetic dollar that targets price stability through delta-neutral hedging across centralized and decentralized venues, with an embedded yield.",
    website: "https://ethena.fi/",
    twitter: "https://x.com/ethena_labs",
    discord: null,
    github: null,
    coingecko: "https://www.coingecko.com/en/coins/ethena-usde",
    auditUrl: "https://docs.ethena.fi/resources/audits",
    totalSupply: { value: 121_800_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("ethena", 1, 0.0032), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/ethena",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/ethena-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/ethena-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "sky",
    name: "Sky (USDS)",
    symbol: "USDS",
    status: "APPROVED",
    pegTarget: "USD",
    description:
      "Sky (formerly MakerDAO) issues USDS, a decentralized US dollar stablecoin that rewards holders for non-custodial saving via the Sky ecosystem.",
    website: "https://sky.money",
    twitter: "https://x.com/SkyEcosystem",
    discord: null,
    github: "https://github.com/makerdao",
    coingecko: "https://www.coingecko.com/en/coins/usds",
    auditUrl: null,
    totalSupply: { value: 64_500_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("sky", 1, 0.0018), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/sky",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/sky-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/sky-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "monerium",
    name: "Monerium",
    symbol: "EURe",
    status: "APPROVED",
    pegTarget: "EUR",
    description:
      "Monerium issues EURe, a regulated euro stablecoin, giving users instant, fee-free euro payments and DeFi access on Arbitrum.",
    website: "https://monerium.com/",
    twitter: "https://x.com/monerium",
    discord: "https://discord.gg/bGCf7v4sXZ",
    github: "https://github.com/monerium",
    coingecko: "https://www.coingecko.com/en/coins/monerium-eur-money",
    auditUrl: null,
    totalSupply: { value: 27_900_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("monerium", 1, 0.0016), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/monerium",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/monerium-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/monerium-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2016-01-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "usd-ai",
    name: "USD.AI (sUSDai)",
    symbol: "sUSDai",
    status: "APPROVED",
    pegTarget: "USD",
    description:
      "USD.AI is a yield-bearing synthetic dollar protocol bringing infrastructure finance on-chain, backed by overcollateralized compute loans. sUSDai is its yield-bearing receipt token.",
    website: "https://usd.ai",
    twitter: "https://x.com/USDai_Official",
    discord: "https://t.me/usdaiofficial",
    github: "https://github.com/metastreet-labs",
    coingecko: "https://www.coingecko.com/en/coins/susdai",
    auditUrl: null,
    totalSupply: { value: 41_600_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("usd-ai", 1.01, 0.004), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/usd-ai",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/usd-ai-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/usd-ai-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: true,
      isPubliclyAudited: false,
      foundedDate: "2025-04-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "trueusd",
    name: "TrueUSD",
    symbol: "TUSD",
    status: "PENDING_APPROVAL",
    pegTarget: "USD",
    description:
      "TrueUSD (TUSD) is a fiat-collateralized US dollar stablecoin with on-chain attestations, available on Arbitrum One.",
    website: "https://trueusd.com/",
    twitter: "https://twitter.com/tusdio",
    discord: "https://discord.com/invite/tusdio",
    github: "https://github.com/trusttoken/smart-contracts",
    coingecko: "https://www.coingecko.com/en/coins/true-usd",
    auditUrl: null,
    totalSupply: { value: 8_450_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("trueusd", 0.999, 0.0048), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/trueusd",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/trueusd-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/trueusd-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "stably",
    name: "Stably",
    symbol: "USDS.s",
    status: "PENDING_APPROVAL",
    pegTarget: "USD",
    description:
      "Stably provides fiat-backed stablecoin infrastructure and tokenization rails, with stablecoin deployments accessible on Arbitrum.",
    website: "https://www.stablecamel.com/ethereum",
    twitter: "https://twitter.com/Stably_Official",
    discord: "https://discord.com/channels/978765464186540093/1022531141535813783",
    github: "https://github.com/Git-on-my-level",
    coingecko: null,
    auditUrl: null,
    totalSupply: { value: 1_180_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("stably", 0.998, 0.006), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/stably",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/stably-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/stably-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "inverse-finance",
    name: "Inverse Finance",
    symbol: "DOLA",
    status: "PENDING_APPROVAL",
    pegTarget: "USD",
    description:
      "Inverse Finance issues DOLA, a decentralized, debt-backed US dollar stablecoin, alongside its fixed-rate lending markets (FiRM).",
    website: "https://inverse.finance",
    twitter: "https://twitter.com/InverseFinance",
    discord: "https://discord.gg/nQEzGuvcaT",
    github: "https://github.com/InverseFinance",
    coingecko: "https://www.coingecko.com/en/coins/dola-usd",
    auditUrl: null,
    totalSupply: { value: 5_420_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("inverse-finance", 0.997, 0.0072), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/inverse-finance",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/inverse-finance-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/inverse-finance-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin | Lending/Borrowing",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "Stablecoin",
    slug: "usdt0",
    name: "USDT0",
    symbol: "USDT0",
    status: "PENDING_APPROVAL",
    pegTarget: "USD",
    description:
      "USDT0 is a unified liquidity protocol bringing Tether's stablecoin assets to multiple chains via an omnichain (OFT) deployment, including Arbitrum One.",
    website: "https://usdt0.to/",
    twitter: "https://x.com/USDT0_to",
    discord: null,
    github: null,
    coingecko: null,
    auditUrl: null,
    totalSupply: { value: 312_000_000, source: "alchemy", updatedAt: NOW },
    historicalPegData: { points: makePegSeries("usdt0", 1, 0.0015), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/usdt0",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/usdt0-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/usdt0-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
];
