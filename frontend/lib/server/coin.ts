import "server-only";

import {
  fetchTokenMetadata,
  fetchTotalSupply,
  hasAlchemy,
  type MetricResult,
} from "@/lib/server/alchemy";
import { coinIdForSlug, fetchMarketData, type MarketData } from "@/lib/server/coingecko";
import { resolveEntityToken } from "@/lib/server/resolve";
import type { StablecoinProfile, TokenProfile } from "@/lib/types";

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

export interface CoinLiveData {
  slug: string;
  name: string;
  symbol: string;
  category: "Stablecoin" | "Token";
  /** Member-coin role label (e.g. "Yield-bearing synthetic dollar"). */
  role: string;
  description: string;
  contractAddress: string | null;
  hasAlchemy: boolean;
  market: MarketData | null;
  onchain: CoinOnchain | null;
  links: {
    website: string | null;
    coingecko: string | null;
    arbiscan: string | null;
  };
}

export async function getCoinLiveData(
  profile: StablecoinProfile | TokenProfile,
  role = "",
): Promise<CoinLiveData> {
  const token = await resolveEntityToken(profile);
  const address = token.address;
  const coinId = coinIdForSlug(profile.slug);

  const [market, supply, metadata] = await Promise.all([
    coinId ? fetchMarketData(coinId, LIVE_REVALIDATE) : Promise.resolve(null),
    address && hasAlchemy()
      ? fetchTotalSupply(address, token.decimals, LIVE_REVALIDATE)
      : Promise.resolve<MetricResult>({ value: null, source: "alchemy", updatedAt: null }),
    address && hasAlchemy() ? fetchTokenMetadata(address) : Promise.resolve(null),
  ]);

  const onchain: CoinOnchain | null = address
    ? {
        supply: supply.value,
        decimals: metadata?.decimals ?? token.decimals,
        symbol: metadata?.symbol ?? null,
        updatedAt: supply.updatedAt,
      }
    : null;

  return {
    slug: profile.slug,
    name: profile.name,
    symbol: profile.symbol,
    category: profile.category,
    role,
    description: profile.description,
    contractAddress: address,
    hasAlchemy: hasAlchemy(),
    market,
    onchain,
    links: {
      website: profile.website,
      coingecko: profile.coingecko,
      arbiscan: address ? `https://arbiscan.io/token/${address}` : null,
    },
  };
}
