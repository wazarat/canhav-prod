import { makePegSeries } from "@/lib/mock/stablecoinMockHelpers";
import type { StablecoinProfile } from "@/lib/types";

const NOW = "2026-06-05T00:00:00Z";

const solanaPortal = {
  portalUrl: null as string | null,
  logoUrl: null as string | null,
  bannerUrl: null as string | null,
  chains: ["Solana"],
  subCategory: "Stablecoin",
  isLive: true,
  isArbitrumNative: false,
  isPubliclyAudited: true,
  foundedDate: "2024-01-01",
};

export const jupusdStablecoin: StablecoinProfile = {
  category: "Stablecoin",
  slug: "jupusd",
  name: "JupUSD",
  symbol: "JUPUSD",
  status: "APPROVED",
  pegTarget: "USD",
  subCategory: "Stablecoin",
  entitySlug: "jupiter",
  description:
    "Reserve-backed Solana stablecoin built with Ethena: ~90% USDtb (BlackRock BUIDL-backed) + 10% USDC buffer. Does not yield natively (compliance).",
  website: "https://jup.ag",
  twitter: "https://x.com/JupiterExchange",
  discord: "https://discord.gg/jup",
  github: "https://github.com/jup-ag",
  coingecko: "https://www.coingecko.com/en/coins/jupusd",
  auditUrl: null,
  contractAddress: "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD",
  totalSupply: { value: 125_000_000, source: "alchemy", updatedAt: NOW },
  historicalPegData: {
    points: makePegSeries("jupusd", 1.0, 0.0008),
    source: "dune",
    updatedAt: NOW,
  },
  arbitrumPortalMetadata: solanaPortal,
  createdAt: NOW,
  updatedAt: NOW,
};

export const jljupusdStablecoin: StablecoinProfile = {
  category: "Stablecoin",
  slug: "jljupusd",
  name: "Jupiter Lend JUPUSD",
  symbol: "jlJUPUSD",
  status: "APPROVED",
  pegTarget: "USD",
  subCategory: "Staked Stablecoin",
  entitySlug: "jupiter",
  description:
    "Deposit JupUSD into Jupiter Lend Earn to receive jlJupUSD, which earns interest and incentives while staying liquid and usable as collateral.",
  website: "https://jup.ag/lend",
  twitter: "https://x.com/JupiterExchange",
  discord: "https://discord.gg/jup",
  github: "https://github.com/jup-ag",
  coingecko: null,
  auditUrl: null,
  contractAddress: null,
  totalSupply: { value: 48_500_000, source: "alchemy", updatedAt: NOW },
  historicalPegData: {
    points: makePegSeries("jljupusd", 1.02, 0.0012),
    source: "dune",
    updatedAt: NOW,
  },
  arbitrumPortalMetadata: {
    ...solanaPortal,
    subCategory: "Staked Stablecoin",
  },
  createdAt: NOW,
  updatedAt: NOW,
};
