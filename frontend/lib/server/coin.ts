import "server-only";

import {
  fetchTokenMetadata,
  fetchTotalSupply,
  hasAlchemy,
  type MetricResult,
} from "@/lib/server/alchemy";
import { coinIdForSlug, fetchMarketData, type MarketData } from "@/lib/server/coingecko";
import { resolveEntityToken } from "@/lib/server/resolve";
import type {
  AssetSubtype,
  LendingMarket,
  PegMechanism,
  RwaProfile,
  StablecoinProfile,
  TokenDeployment,
  TokenMarket,
  TokenProfile,
  YieldMechanics,
} from "@/lib/types";

/**
 * Serializable live snapshot for a single coin (USDai / sUSDai / CHIP), used to
 * feed the entity-page coin modal. Combines CoinGecko market data with Alchemy
 * on-chain supply, both fetched server-side (cached 5 min) and returned as plain
 * JSON so it can cross the server/client boundary.
 *
 * Everything fails soft: any missing key/listing yields `null` so the modal can
 * render an explicit empty state (e.g. CHIP, which isn't listed yet).
 */

const LIVE_REVALIDATE = 300;

/** aToken slugs -> CoinGecko id for underlying reference price on member-coin cards. */
const ATOKEN_UNDERLYING_COIN_ID: Record<string, string> = {
  ausdc: "usd-coin",
  ausdt: "tether",
  aweth: "weth",
};

const ATOKEN_REF_LABEL: Record<string, string> = {
  ausdc: "USDC ref.",
  ausdt: "USDT ref.",
  aweth: "WETH ref.",
};

export interface CoinOnchain {
  supply: number | null;
  decimals: number | null;
  symbol: string | null;
  updatedAt: string | null;
}

export interface CoinDeploymentLink {
  chain: string;
  address: string;
  label?: string;
  url: string;
  explorerLabel: string;
}

export interface CoinLiveData {
  slug: string;
  name: string;
  symbol: string;
  category: "Stablecoin" | "Token" | "RWA";
  /** Member-coin role label (e.g. "Yield-bearing synthetic dollar"). */
  role: string;
  subCategory: string | null;
  /** Fine-grained economic classification (additive; null on old records). */
  assetSubtype: AssetSubtype | null;
  pegMechanism: PegMechanism | null;
  description: string;
  contractAddress: string | null;
  chains: string[];
  deployments: CoinDeploymentLink[];
  profilePath: string;
  /** Whether the coin is reported live by the Arbitrum Portal metadata. */
  isLive: boolean;
  hasAlchemy: boolean;
  market: MarketData | null;
  onchain: CoinOnchain | null;
  /** Live Aave V3 reserve rates when this coin is an Aave reserve, else null. */
  lendingMarket: LendingMarket | null;
  /** Cron-written yield overlay (Aave aTokens, Llama pools, etc.). */
  yieldMechanics: YieldMechanics | null;
  /** Underlying spot reference for aTokens (not the aToken price itself). */
  referencePrice: number | null;
  referencePriceLabel: string | null;
  links: {
    website: string | null;
    coingecko: string | null;
    explorer: string | null;
    explorerLabel: string;
  };
}

function chainExplorer(chain: string, address: string): { url: string; label: string } {
  const c = chain.toLowerCase();
  if (c.includes("solana")) {
    return { url: `https://solscan.io/token/${address}`, label: "Solscan" };
  }
  if (c.includes("tron")) {
    return { url: `https://tronscan.org/#/token20/${address}`, label: "Tronscan" };
  }
  if (c.includes("bnb")) {
    return { url: `https://bscscan.com/token/${address}`, label: "BscScan" };
  }
  if (c === "base") {
    return { url: `https://basescan.org/token/${address}`, label: "Basescan" };
  }
  if (c.includes("ethereum") || c === "eth") {
    return { url: `https://etherscan.io/token/${address}`, label: "Etherscan" };
  }
  if (c.includes("arbitrum")) {
    return { url: `https://arbiscan.io/token/${address}`, label: "Arbiscan" };
  }
  if (c.includes("polygon")) {
    return { url: `https://polygonscan.com/token/${address}`, label: "Polygonscan" };
  }
  if (c.includes("optimism")) {
    return { url: `https://optimistic.etherscan.io/token/${address}`, label: "Optimistic Etherscan" };
  }
  return { url: `https://etherscan.io/token/${address}`, label: "Explorer" };
}

function explorerLink(chains: string[], address: string | null): { url: string | null; label: string } {
  if (!address) return { url: null, label: "Explorer" };
  const primaryChain = chains[0] ?? "Ethereum";
  const { url, label } = chainExplorer(primaryChain, address);
  return { url, label };
}

function buildDeploymentLinks(
  primaryChain: string,
  primaryAddress: string | null,
  extra: TokenDeployment[] | undefined,
): CoinDeploymentLink[] {
  const out: CoinDeploymentLink[] = [];
  if (primaryAddress) {
    const { url, label } = chainExplorer(primaryChain, primaryAddress);
    out.push({ chain: primaryChain, address: primaryAddress, url, explorerLabel: label });
  }
  for (const dep of extra ?? []) {
    const { url, label } = chainExplorer(dep.chain, dep.address);
    out.push({
      chain: dep.chain,
      address: dep.address,
      label: dep.label,
      url,
      explorerLabel: label,
    });
  }
  return out;
}

function storedMarketToLive(stored: TokenMarket | undefined): MarketData | null {
  if (!stored) return null;
  const price = stored.priceUsd?.value ?? null;
  const mcap = stored.marketCapUsd?.value ?? null;
  if (price === null && mcap === null) return null;
  return {
    coinId: "",
    currentPrice: price,
    marketCap: mcap,
    marketCapRank: null,
    totalVolume: stored.volume24hUsd?.value ?? null,
    circulatingSupply: stored.circulatingSupply?.value ?? null,
    totalSupply: stored.totalSupply?.value ?? null,
    maxSupply: stored.maxSupply?.value ?? null,
    ath: null,
    atl: null,
    priceChange24h: stored.change24hPct?.value ?? null,
    priceChange7d: null,
    priceChange30d: null,
    fullyDilutedValuation: stored.fdvUsd?.value ?? null,
    source: "coingecko",
  };
}

function mergeMarketData(
  live: MarketData | null,
  stored: TokenMarket | undefined,
  resolvePriceUsd: number | null,
): MarketData | null {
  const fromStored = storedMarketToLive(stored);
  if (!live && !fromStored && resolvePriceUsd === null) return null;

  const currentPrice =
    live?.currentPrice ?? fromStored?.currentPrice ?? resolvePriceUsd ?? null;
  const marketCap = live?.marketCap ?? fromStored?.marketCap ?? null;

  if (currentPrice === null && marketCap === null) return null;

  return {
    coinId: live?.coinId ?? fromStored?.coinId ?? "",
    currentPrice,
    marketCap,
    marketCapRank: live?.marketCapRank ?? fromStored?.marketCapRank ?? null,
    totalVolume: live?.totalVolume ?? fromStored?.totalVolume ?? null,
    circulatingSupply: live?.circulatingSupply ?? fromStored?.circulatingSupply ?? null,
    totalSupply: live?.totalSupply ?? fromStored?.totalSupply ?? null,
    maxSupply: live?.maxSupply ?? fromStored?.maxSupply ?? null,
    ath: live?.ath ?? fromStored?.ath ?? null,
    atl: live?.atl ?? fromStored?.atl ?? null,
    priceChange24h: live?.priceChange24h ?? fromStored?.priceChange24h ?? null,
    priceChange7d: live?.priceChange7d ?? fromStored?.priceChange7d ?? null,
    priceChange30d: live?.priceChange30d ?? fromStored?.priceChange30d ?? null,
    fullyDilutedValuation:
      live?.fullyDilutedValuation ?? fromStored?.fullyDilutedValuation ?? null,
    source: "coingecko",
  };
}

export async function getCoinLiveData(
  profile: StablecoinProfile | TokenProfile | RwaProfile,
  role = "",
): Promise<CoinLiveData> {
  const token = await resolveEntityToken(profile);
  const storedAddress =
    (profile.contractAddress || "").trim().toLowerCase() || null;
  const address = storedAddress ?? token.address;
  const coinId = coinIdForSlug(profile.slug);
  const underlyingCoinId = ATOKEN_UNDERLYING_COIN_ID[profile.slug];

  const [liveMarket, underlyingMarket, supply, metadata] = await Promise.all([
    coinId ? fetchMarketData(coinId, LIVE_REVALIDATE) : Promise.resolve(null),
    underlyingCoinId
      ? fetchMarketData(underlyingCoinId, LIVE_REVALIDATE)
      : Promise.resolve(null),
    address && hasAlchemy()
      ? fetchTotalSupply(address, token.decimals, LIVE_REVALIDATE)
      : Promise.resolve<MetricResult>({ value: null, source: "alchemy", updatedAt: null }),
    address && hasAlchemy() ? fetchTokenMetadata(address) : Promise.resolve(null),
  ]);

  const storedMarket =
    profile.category === "Token" ? profile.market : undefined;
  const market = mergeMarketData(liveMarket, storedMarket, token.priceUsd);

  const onchain: CoinOnchain | null = address
    ? {
        supply: supply.value,
        decimals: metadata?.decimals ?? token.decimals,
        symbol: metadata?.symbol ?? null,
        updatedAt: supply.updatedAt,
      }
    : null;

  const lendingMarket =
    "lendingMarket" in profile ? (profile.lendingMarket ?? null) : null;

  const yieldMechanics =
    profile.category === "Token" ? (profile.yieldMechanics ?? null) : null;

  const referencePrice = underlyingMarket?.currentPrice ?? null;
  const referencePriceLabel =
    referencePrice !== null ? (ATOKEN_REF_LABEL[profile.slug] ?? null) : null;

  const chains = profile.arbitrumPortalMetadata.chains ?? [];
  const primaryChain = chains[0] ?? "Ethereum";
  const extraDeployments =
    profile.category === "RWA" ? undefined : profile.deployments;
  const deployments = buildDeploymentLinks(
    primaryChain,
    address,
    extraDeployments,
  );
  const explorer = explorerLink(chains, address);
  const profilePath =
    profile.category === "Stablecoin"
      ? `/stablecoins/${profile.slug}`
      : profile.category === "RWA"
        ? `/rwas/${profile.slug}`
        : `/tokens/${profile.slug}`;

  return {
    slug: profile.slug,
    name: profile.name,
    symbol: profile.symbol,
    category: profile.category,
    role,
    subCategory:
      profile.category === "RWA"
        ? (profile.assetClass ?? null)
        : (profile.subCategory ?? null),
    assetSubtype: profile.assetSubtype ?? null,
    pegMechanism: profile.pegMechanism ?? null,
    description: profile.description,
    contractAddress: address,
    chains,
    deployments,
    profilePath,
    isLive: profile.arbitrumPortalMetadata.isLive ?? false,
    hasAlchemy: hasAlchemy(),
    market,
    onchain,
    lendingMarket,
    yieldMechanics,
    referencePrice,
    referencePriceLabel,
    links: {
      website: profile.website,
      coingecko: profile.coingecko,
      explorer: explorer.url,
      explorerLabel: explorer.label,
    },
  };
}
