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
  TokenProfile,
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

export async function getCoinLiveData(
  profile: StablecoinProfile | TokenProfile | RwaProfile,
  role = "",
): Promise<CoinLiveData> {
  const token = await resolveEntityToken(profile);
  const address = token.address;
  const coinId = coinIdForSlug(profile.slug);

  const [liveMarket, supply, metadata] = await Promise.all([
    coinId ? fetchMarketData(coinId, LIVE_REVALIDATE) : Promise.resolve(null),
    address && hasAlchemy()
      ? fetchTotalSupply(address, token.decimals, LIVE_REVALIDATE)
      : Promise.resolve<MetricResult>({ value: null, source: "alchemy", updatedAt: null }),
    address && hasAlchemy() ? fetchTokenMetadata(address) : Promise.resolve(null),
  ]);

  const market = liveMarket;

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
    links: {
      website: profile.website,
      coingecko: profile.coingecko,
      explorer: explorer.url,
      explorerLabel: explorer.label,
    },
  };
}
