import { coinIdForNetworkSlug } from "@/lib/server/coingecko";
import type { NetworkProfile } from "@/lib/types";

/**
 * Curated CoinGecko thumb URLs for network governance tokens.
 * Used when portal/Llama logos are absent (no extra API call).
 */
const COINGECKO_THUMB_BY_ID: Record<string, string> = {
  aave: "https://coin-images.coingecko.com/coins/images/12645/small/aave-token-round.png",
  "compound-governance-token":
    "https://coin-images.coingecko.com/coins/images/10775/small/COMP.png",
  morpho: "https://coin-images.coingecko.com/coins/images/39995/small/morpho.png",
  "spark-2": "https://coin-images.coingecko.com/coins/images/39269/small/spark.jpg",
  "radiant-capital": "https://coin-images.coingecko.com/coins/images/26536/small/Radiant-Logo-200x200.png",
  "jupiter-exchange-solana":
    "https://coin-images.coingecko.com/coins/images/34188/small/jup.png",
  uniswap: "https://coin-images.coingecko.com/coins/images/12504/small/uniswap-logo.png",
  curve: "https://coin-images.coingecko.com/coins/images/12124/small/Curve.png",
  lido: "https://coin-images.coingecko.com/coins/images/13573/small/Lido_DAO.png",
  pendle: "https://coin-images.coingecko.com/coins/images/15069/small/Pendle_Logo_Normal-03.png",
  ethena: "https://coin-images.coingecko.com/coins/images/36530/small/ethena.png",
  "ondo-finance": "https://coin-images.coingecko.com/coins/images/26580/small/ONDO.png",
  maker: "https://coin-images.coingecko.com/coins/images/1364/small/Mark_Maker.png",
  hyperliquid: "https://coin-images.coingecko.com/coins/images/50882/small/hyperliquid.jpg",
};

/** Portal CDN fallbacks when csv_slug is known but ingest has not run yet. */
const PORTAL_LOGO_BY_SLUG: Record<string, string> = {
  compound: "https://portal-data.arbitrum.io/images/projects/compound-logo.webp",
  morpho: "https://portal-data.arbitrum.io/images/projects/morpho-logo.webp",
  spark: "https://portal-data.arbitrum.io/images/projects/spark-logo.webp",
  radiant: "https://portal-data.arbitrum.io/images/projects/radiant-capital-logo.webp",
  aave: "https://portal-data.arbitrum.io/images/projects/aave-logo.webp",
};

/** Resolve the best available logo URL for a network entity. */
export function resolveNetworkLogoUrl(profile: NetworkProfile): string | null {
  const portal = profile.arbitrumPortalMetadata?.logoUrl;
  if (portal) return portal;

  const llama = profile.universalMetrics?.identity?.logo?.value;
  if (llama) return llama;

  const portalFallback = PORTAL_LOGO_BY_SLUG[profile.slug];
  if (portalFallback) return portalFallback;

  const geckoId =
    profile.universalMetrics?.coingeckoId ?? coinIdForNetworkSlug(profile.slug);
  if (geckoId && COINGECKO_THUMB_BY_ID[geckoId]) {
    return COINGECKO_THUMB_BY_ID[geckoId];
  }

  return null;
}

export function networkLogoInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
