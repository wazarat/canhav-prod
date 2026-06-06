import type { TokenProfile } from "@/lib/types";

const NOW = "2026-06-05T00:00:00Z";

export const jupsolToken: TokenProfile = {
  category: "Token",
  slug: "jupsol",
  name: "JupSOL",
  symbol: "JUPSOL",
  status: "APPROVED",
  tokenType: "LST",
  subCategory: "LST",
  entitySlug: "jupiter",
  description:
    "Jupiter Staked SOL liquid staking token. Represents staked SOL in Jupiter's staking product with DeFi composability across the ecosystem.",
  website: "https://jup.ag/stake",
  twitter: "https://x.com/JupiterExchange",
  discord: "https://discord.gg/jup",
  github: "https://github.com/jup-ag",
  coingecko: "https://www.coingecko.com/en/coins/jupiter-staked-sol",
  auditUrl: null,
  contractAddress: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
  totalSupply: { value: 12_400_000, source: "alchemy", updatedAt: NOW },
  arbitrumPortalMetadata: {
    portalUrl: null,
    logoUrl: null,
    bannerUrl: null,
    chains: ["Solana"],
    subCategory: "LST",
    isLive: true,
    isArbitrumNative: false,
    isPubliclyAudited: true,
    foundedDate: "2023-01-01",
  },
  createdAt: NOW,
  updatedAt: NOW,
};
