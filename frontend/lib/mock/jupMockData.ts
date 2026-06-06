import type { TokenProfile } from "@/lib/types";

const NOW = "2026-06-05T00:00:00Z";

/** Minimal JUP profile so entity member-coin cards resolve in the Jupiter demo. */
export const jupToken: TokenProfile = {
  category: "Token",
  slug: "jup",
  name: "Jupiter",
  symbol: "JUP",
  status: "APPROVED",
  tokenType: "Governance",
  subCategory: "Governance Token",
  entitySlug: "jupiter",
  description:
    "JUP is the governance token of the Jupiter protocol — capped supply, deflationary via burns and buybacks.",
  website: "https://jup.ag",
  twitter: "https://x.com/JupiterExchange",
  discord: "https://discord.gg/jup",
  github: "https://github.com/jup-ag",
  coingecko: "https://www.coingecko.com/en/coins/jupiter-exchange-solana",
  auditUrl: null,
  contractAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  market: {
    priceUsd: {
      value: 0.16,
      dataSource: "live",
      sourceLabel: "Finance feed",
      updatedAt: NOW,
    },
    marketCapUsd: {
      value: 501_533_898,
      dataSource: "live",
      updatedAt: NOW,
    },
    change24hPct: { value: -13.26, dataSource: "live", updatedAt: NOW },
  },
  totalSupply: { value: null, source: "alchemy", updatedAt: NOW },
  arbitrumPortalMetadata: {
    portalUrl: null,
    logoUrl: null,
    bannerUrl: null,
    chains: ["Solana"],
    subCategory: "Governance Token",
    isLive: true,
    isArbitrumNative: false,
    isPubliclyAudited: true,
    foundedDate: "2021-01-01",
  },
  createdAt: NOW,
  updatedAt: NOW,
};
