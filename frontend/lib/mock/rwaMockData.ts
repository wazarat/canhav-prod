import type { RwaProfile, TvlDataPoint } from "@/lib/types";

/**
 * MOCK DATA — Phase 2, Step 2 of the build.
 *
 * These 10 profiles correspond exactly to the Phase 2 RWA target list and are
 * sourced (for metadata) from `Arbitrum Ecosystem - scrape v2.csv` (all carry
 * sub-category "Real World Assets (RWAs)"). TVL figures and historical series
 * are ILLUSTRATIVE placeholders so the UI can be built without burning
 * Alchemy/Dune free-tier quota; they are replaced by live overlays in Step 4.
 *
 * The shape is identical to the DynamoDB single-table item (see lib/types.ts),
 * so swapping mock → live is a data-source change only, not a UI change.
 *
 * `assetClass` is DERIVED from each protocol's description — the CSV labels
 * every row generically as "Real World Assets (RWAs)".
 */

const TVL_ANCHOR = new Date("2026-06-01T00:00:00Z");

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
 * Build a deterministic ~30-day TVL series that ends at `end` USD with a steady
 * `driftPct` total move across the window plus a small day-to-day wobble.
 * A positive drift grows the series toward `end`; negative shrinks it.
 */
function makeTvlSeries(
  slug: string,
  end: number,
  driftPct: number,
  vol = 0.02,
  days = 30,
): TvlDataPoint[] {
  const rand = lcg(hashSeed(slug));
  const start = end / (1 + driftPct);
  const points: TvlDataPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const t = i / (days - 1);
    const date = new Date(TVL_ANCHOR.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const trend = start + (end - start) * t;
    const wobble = 1 + (rand() - 0.5) * 2 * vol;
    points.push({
      date: date.toISOString().slice(0, 10),
      value: Math.round((trend * wobble) / 1000) * 1000,
    });
  }
  // Pin the final point to the headline figure for a clean "latest" read.
  points[points.length - 1] = { date: points[points.length - 1].date, value: end };
  return points;
}

const NOW = "2026-06-01T08:00:00Z";

export const rwaMockData: RwaProfile[] = [
  {
    category: "RWA",
    slug: "centrifuge",
    name: "Centrifuge",
    symbol: "CFG",
    status: "APPROVED",
    assetClass: "Private Credit",
    description:
      "The first protocol to bring real-world assets on-chain, Centrifuge builds a more transparent financial system by tokenizing private credit and structured pools.",
    website: "https://centrifuge.io/",
    twitter: "https://twitter.com/centrifuge",
    discord: "https://discord.com/invite/yEzyUq5gxF",
    github: "https://github.com/centrifuge",
    coingecko: "https://www.coingecko.com/en/coins/centrifuge",
    auditUrl: null,
    totalValueLocked: { value: 412_000_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("centrifuge", 412_000_000, 0.08), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/centrifuge",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/centrifuge-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/centrifuge-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2017-06-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "franklin-templeton",
    name: "Franklin Templeton",
    symbol: "BENJI",
    status: "APPROVED",
    assetClass: "Treasuries & Funds",
    description:
      "A global asset-management firm bringing tokenized money-market funds and treasuries on-chain — spanning digital-assets technology, investment strategies, and node operations.",
    website: "https://www.franklinresources.com/",
    twitter: "https://x.com/FTDA_US",
    discord: null,
    github: null,
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 685_000_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("franklin-templeton", 685_000_000, 0.05, 0.012), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/franklin-templeton",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/franklin-templeton-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/franklin-templeton-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs) | Stablecoin",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "dinari",
    name: "Dinari",
    symbol: "dSHARE",
    status: "APPROVED",
    assetClass: "Tokenized Equities",
    description:
      "Dinari dShares are 1:1 backed tokens of stocks, ETFs, bonds, and REITs. An SEC-registered transfer agent with reserves audited by a Big 4 firm, Dinari has raised $7.5M in seed funding.",
    website: "https://dinari.com/",
    twitter: "https://twitter.com/DinariGlobal",
    discord: "https://discord.gg/dinari",
    github: "https://github.com/dinaricrypto/sbt-contracts",
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 96_500_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("dinari", 96_500_000, 0.14), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/dinari",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/dinari-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/dinari-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2021-10-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "estate-protocol",
    name: "Estate Protocol",
    symbol: "EST",
    status: "APPROVED",
    assetClass: "Real Estate",
    description:
      "Estate Protocol lets users earn yields from institutional-grade tokenized real estate, fractionalizing property ownership on-chain.",
    website: "https://www.estateprotocol.com/",
    twitter: "https://twitter.com/EstateProtocol",
    discord: "https://discord.com/invite/FRANJG3QZu",
    github: "https://github.com/Estate-Protocol-Home",
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 38_200_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("estate-protocol", 38_200_000, 0.11), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/estate-protocol",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/estate-protocol-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/estate-protocol-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: true,
      isPubliclyAudited: false,
      foundedDate: "2022-01-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "chateau-capital",
    name: "Chateau Capital",
    symbol: "CHAT",
    status: "APPROVED",
    assetClass: "Structured Products",
    description:
      "Chateau Capital enables DeFi users to invest in institutional-grade equity, debt, and derivatives directly on-chain.",
    website: "https://www.chateau.capital/",
    twitter: "https://twitter.com/Chateau_capital",
    discord: null,
    github: "https://github.com/chateau-capital/ca",
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 24_700_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("chateau-capital", 24_700_000, 0.06), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/chateau-capital",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/chateau-capital-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/chateau-capital-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2023-05-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "arcton",
    name: "Arcton",
    symbol: "ARC",
    status: "PENDING_APPROVAL",
    assetClass: "Tokenized Equities",
    description:
      "Arcton operates as the first trading platform specifically designed for startup IPOs, bringing pre-public equity on-chain.",
    website: "https://arcton.com/",
    twitter: "https://twitter.com/Arctonhq",
    discord: "https://discord.gg/jeDBheXM",
    github: null,
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 6_400_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("arcton", 6_400_000, 0.18), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/arcton",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/arcton-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/arcton-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2021-05-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "aryze",
    name: "Aryze",
    symbol: "ARYZE",
    status: "PENDING_APPROVAL",
    assetClass: "Stablecoins & FX",
    description:
      "Aryze offers stablecoin services — cross-border payments, secure treasury management, and branded stablecoins (SaaS) — all backed by real-world assets for transparency and compliance.",
    website: "https://www.aryze.io/",
    twitter: "https://x.com/ARYZEofficial",
    discord: "https://discord.com/invite/C2xjkatmpC",
    github: "https://github.com/ARYZEofficial",
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 18_900_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("aryze", 18_900_000, 0.09), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/aryze",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/aryze-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/aryze-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2017-06-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "florence-finance",
    name: "Florence Finance",
    symbol: "FLR",
    status: "PENDING_APPROVAL",
    assetClass: "Private Credit",
    description:
      "Florence Finance is a dedicated platform operating broadly within the Real World Assets category, financing off-chain credit with on-chain liquidity.",
    website: "https://florence.finance/",
    twitter: "https://x.com/FinanceFlorence",
    discord: "https://discord.gg/ykKMD9U5GB",
    github: "https://github.com/florence-finance",
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 14_300_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("florence-finance", 14_300_000, -0.04), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/florence-finance",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/florence-finance-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/florence-finance-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "dualmint",
    name: "DualMint",
    symbol: "DMINT",
    status: "PENDING_APPROVAL",
    assetClass: "Multi-Asset",
    description:
      "DualMint aims to scale small-ticket, high-frequency, recession-proof assets into composable yield infrastructure for DeFi — more than an RWA marketplace.",
    website: "https://www.dualmint.com",
    twitter: "https://x.com/dualmintrwa",
    discord: "https://t.me/dualmint",
    github: null,
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 9_100_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("dualmint", 9_100_000, 0.22), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/dualmint",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/dualmint-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/dualmint-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2022-04-01",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    category: "RWA",
    slug: "atmosphera",
    name: "Atmosphera",
    symbol: "ATMO",
    status: "PENDING_APPROVAL",
    assetClass: "Event Finance",
    description:
      "Atmosphera focuses on event financing — letting users discover, fund, and profit from world-class events, pocketing the upside through real returns.",
    website: "https://atmosphera.live/",
    twitter: null,
    discord: "https://t.me/atmospherainvest",
    github: null,
    coingecko: null,
    auditUrl: null,
    totalValueLocked: { value: 3_800_000, source: "alchemy", updatedAt: NOW },
    historicalTvlData: { points: makeTvlSeries("atmosphera", 3_800_000, 0.31, 0.04), source: "dune", updatedAt: NOW },
    arbitrumPortalMetadata: {
      portalUrl: "https://portal.arbitrum.io/projects/atmosphera",
      logoUrl: "https://portal-data.arbitrum.io/images/projects/atmosphera-logo.webp",
      bannerUrl: "https://portal-data.arbitrum.io/images/projects/atmosphera-banner.webp",
      chains: ["Arbitrum One"],
      subCategory: "Real World Assets (RWAs)",
      isLive: true,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: "2025-10-10",
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
];
