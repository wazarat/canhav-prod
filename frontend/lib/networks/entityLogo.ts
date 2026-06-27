import { coinIdForNetworkSlug } from "@/lib/coingeckoIds";
import type { NetworkProfile } from "@/lib/types";

const LLAMA_ICON_BASE = "https://icons.llamao.fi/icons/protocols";

/**
 * Client-safe copy of non-null entries from `LLAMA_PROTOCOL_SLUGS` in
 * `lib/server/defillama.ts` — do not import server-only modules here.
 */
const LLAMA_PROTOCOL_BY_NETWORK_SLUG: Record<string, string> = {
  aave: "aave-v3",
  morpho: "morpho-blue",
  spark: "spark",
  compound: "compound-v3",
  fluid: "fluid",
  venus: "venus-core-pool",
  justlend: "justlend",
  kamino: "kamino-lend",
  maple: "maple",
  gearbox: "gearbox",
  stella: "stella",
  "extra-finance": "extra-finance-leverage-farming",
  pendle: "pendle",
  notional: "notional-v3",
  spectra: "spectra-v2",
  sense: "sense",
  radiant: "radiant-v2",
  lido: "lido",
  "rocket-pool": "rocket-pool",
  "binance-wbeth": "binance-staked-eth",
  "coinbase-cbeth": "coinbase-wrapped-staked-eth",
  "mantle-meth": "mantle-restaking",
  frax: "frax-ether",
  swell: "swell-liquid-staking",
  stader: "stader",
  stakewise: "stakewise-v2",
  ankr: "ankr",
  eigenlayer: "eigencloud",
  symbiotic: "symbiotic",
  "ether-fi": "ether.fi-stake",
  renzo: "renzo",
  "kelp-dao": "kelp",
  puffer: "puffer-stake",
  bedrock: "bedrock-unieth",
  yieldnest: "yieldnest",
  gamma: "gamma",
  "yearn-finance": "yearn-finance",
  "convex-finance": "convex-finance",
  beefy: "beefy",
  aura: "aura",
  arrakis: "arrakis-modular",
  maverick: "maverick-protocol",
  centrifuge: "centrifuge-protocol",
  dinari: "dinari",
  "estate-protocol": "estate-protocol",
  "chateau-capital": "chateau",
  "florence-finance": "florence-finance",
  pgold: "pleasing-gold",
  uniswap: "uniswap",
  "curve-finance": "curve-finance",
  balancer: "balancer",
  aerodrome: "aerodrome-slipstream",
  pancakeswap: "pancakeswap",
  "trader-joe": "lfj",
  sushiswap: "sushiswap",
  raydium: "raydium",
  thorchain: "thorchain-dex",
  hyperliquid: "hyperliquid",
  dydx: "dydx",
  gmx: "gmx",
  "drift-protocol": "drift-trade",
  "gains-network": "gains-network",
  synthetix: "synthetix-v3",
  aevo: "aevo-perps",
  "ribbon-finance": "ribbon",
  dopex: "dopex",
  derive: "derive-v2",
  "jones-dao": "jones-dao",
  "rage-trade": "rage-trade-v1",
  "neutra-finance": "neutral-trade",
  ethena: "ethena-usde",
  "nexus-mutual": "nexus-mutual",
  sherlock: "sherlock",
  insurace: "insurace",
  "neptune-mutual": "neptune-mutual",
  "cozy-finance": "cozy-earn",
  "ease-org": "easedefi.org",
  "hidden-hand": "hidden-hand",
  paladin: "paladin-vote",
  "stake-dao": "stake-dao",
  "ondo-finance": "ondo-finance",
  "pleasing-market": "pleasing-gold",
  securitize: "securitize",
  goldfinch: "goldfinch",
  clearpool: "clearpool",
  realt: "realt",
  "lofty-ai": "lofty",
  "toucan-protocol": "toucan-protocol",
};

/**
 * Curated brand logos for issuers / RWAs without DeFi Llama protocol pages.
 * Sources: Arbitrum Portal CDN, CoinGecko coin images for primary products.
 */
const BRAND_LOGO_BY_SLUG: Record<string, string> = {
  // Arbitrum Portal CDN (from ecosystem CSV).
  arcton: "https://portal-data.arbitrum.io/images/projects/arcton-logo.webp",
  aryze: "https://portal-data.arbitrum.io/images/projects/aryze-logo.webp",
  atmosphera: "https://portal-data.arbitrum.io/images/projects/atmosphera-logo.webp",
  bitget: "https://portal-data.arbitrum.io/images/projects/bitget-logo.webp",
  dualmint: "https://portal-data.arbitrum.io/images/projects/dualmint-logo.webp",
  "franklin-templeton":
    "https://portal-data.arbitrum.io/images/projects/franklin-templeton-logo.webp",
  "inverse-finance":
    "https://portal-data.arbitrum.io/images/projects/inverse-finance-logo.webp",
  liquity: "https://portal-data.arbitrum.io/images/projects/liquity-logo.webp",
  tether: "https://portal-data.arbitrum.io/images/projects/tether-logo.webp",
  usdt0: "https://portal-data.arbitrum.io/images/projects/usdt0-logo.webp",
  // Stablecoin issuers — primary product CoinGecko images.
  circle: "https://coin-images.coingecko.com/coins/images/6319/small/USDC.png",
  paxos: "https://coin-images.coingecko.com/coins/images/6013/small/Pax_Dollar.png",
  agora: "https://coin-images.coingecko.com/coins/images/39259/small/agUSD.png",
  anzen:
    "https://coin-images.coingecko.com/coins/images/38039/small/usdz-image-200x200.png",
  cap: "https://coin-images.coingecko.com/coins/images/68272/small/cUSD_ab_500%C3%97500.png",
  "curve-stablecoin":
    "https://coin-images.coingecko.com/coins/images/9638/small/CRVUSD.png",
  elixir: "https://coin-images.coingecko.com/coins/images/31099/small/deUSD.png",
  falcon:
    "https://coin-images.coingecko.com/coins/images/102173313/small/Falcon_Token_fUSD_Primary_200px.png",
  "first-digital":
    "https://coin-images.coingecko.com/coins/images/33062/small/FDUSD.png",
  "gmo-trust": "https://coin-images.coingecko.com/coins/images/1026/small/GYEN.png",
  "lista-dao": "https://coin-images.coingecko.com/coins/images/35477/small/lista.png",
  "m-zero": "https://coin-images.coingecko.com/coins/images/39104/small/M0.png",
  "mountain-protocol":
    "https://coin-images.coingecko.com/coins/images/31719/small/usdm.png",
  reserve: "https://coin-images.coingecko.com/coins/images/8365/small/Reserve.png",
  resolv:
    "https://coin-images.coingecko.com/coins/images/40008/small/USR_LOGO.png",
  // Dopex rebranded to Stryke — no Llama protocol page; use Portal CDN.
  dopex: "https://portal-data.arbitrum.io/images/projects/stryke-logo.webp",
  karak: "https://coin-images.coingecko.com/coins/images/52182/small/karak.jpg",
  // Votium has no token — Convex (CVX) is the closest governance brand.
  votium: "https://coin-images.coingecko.com/coins/images/13404/small/CVX.png",
};

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
  "radiant-capital":
    "https://coin-images.coingecko.com/coins/images/26536/small/Radiant-Logo-200x200.png",
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
  gearbox: "https://coin-images.coingecko.com/coins/images/21657/small/gear.png",
  "notional-finance":
    "https://coin-images.coingecko.com/coins/images/12559/small/notional.jpg",
  "alpha-finance":
    "https://coin-images.coingecko.com/coins/images/12741/small/AlphaToken.png",
};

/** Portal CDN fallbacks when csv_slug is known but ingest has not run yet. */
const PORTAL_LOGO_BY_SLUG: Record<string, string> = {
  compound: "https://portal-data.arbitrum.io/images/projects/compound-logo.webp",
  morpho: "https://portal-data.arbitrum.io/images/projects/morpho-logo.webp",
  spark: "https://portal-data.arbitrum.io/images/projects/spark-logo.webp",
  radiant: "https://portal-data.arbitrum.io/images/projects/radiant-capital-logo.webp",
  aave: "https://portal-data.arbitrum.io/images/projects/aave-logo.webp",
};

function llamaIconUrl(networkSlug: string): string | null {
  const llamaSlug = LLAMA_PROTOCOL_BY_NETWORK_SLUG[networkSlug];
  return llamaSlug ? `${LLAMA_ICON_BASE}/${llamaSlug}` : null;
}

/** Resolve the best available logo URL for a network entity. */
export function resolveNetworkLogoUrl(profile: NetworkProfile): string | null {
  const portal = profile.arbitrumPortalMetadata?.logoUrl;
  if (portal) return portal;

  const llama = profile.universalMetrics?.identity?.logo?.value;
  if (llama) return llama;

  const portalFallback = PORTAL_LOGO_BY_SLUG[profile.slug];
  if (portalFallback) return portalFallback;

  const llamaCdn = llamaIconUrl(profile.slug);
  if (llamaCdn) return llamaCdn;

  const brandLogo = BRAND_LOGO_BY_SLUG[profile.slug];
  if (brandLogo) return brandLogo;

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
