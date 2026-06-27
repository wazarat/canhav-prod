#!/usr/bin/env node
/**
 * Backfill ArbitrumPortalMetadata.logoUrl in bootstrap-store.json.
 *
 * Resolution order per entity (Category === "Entity", logoUrl null):
 *   1. DeFi Llama protocol API (logo field)
 *   2. Arbitrum Portal CSV Logo URL column
 *   3. Curated brand / CoinGecko thumb map (issuer RWAs + stablecoins)
 *
 * Usage:
 *   node scripts/populate-entity-logos.mjs
 *   DRY_RUN=1 node scripts/populate-entity-logos.mjs
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const bootstrapPath = path.join(frontendRoot, "data", "bootstrap-store.json");
const portalCsvPath = path.join(repoRoot, "backend", "data", "Arbitrum Ecosystem - scrape v2.csv");

const DRY_RUN = process.env.DRY_RUN === "1";

/** Non-null entries from lib/server/defillama.ts LLAMA_PROTOCOL_SLUGS. */
const LLAMA_PROTOCOL_BY_NETWORK_SLUG = {
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

/** Curated brand logos — keep in sync with frontend/lib/networks/entityLogo.ts */
const BRAND_LOGO_BY_SLUG = {
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
  resolv: "https://coin-images.coingecko.com/coins/images/40008/small/USR_LOGO.png",
  dopex: "https://portal-data.arbitrum.io/images/projects/stryke-logo.webp",
  karak: "https://coin-images.coingecko.com/coins/images/52182/small/karak.jpg",
  votium: "https://coin-images.coingecko.com/coins/images/13404/small/CVX.png",
};

const llamaLogoCache = new Map();

function loadPortalLogos() {
  const map = new Map();
  if (!existsSync(portalCsvPath)) return map;
  const text = readFileSync(portalCsvPath, "utf8");
  const lines = text.split("\n");
  if (lines.length < 2) return map;
  const headers = parseCsvLine(lines[0]);
  const slugIdx = headers.findIndex((h) => h.toLowerCase() === "slug");
  const logoIdx = headers.findIndex((h) => h.toLowerCase() === "logo url");
  if (slugIdx < 0 || logoIdx < 0) return map;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const slug = (cols[slugIdx] ?? "").trim().toLowerCase();
    const logo = (cols[logoIdx] ?? "").trim();
    if (slug && logo) map.set(slug, logo);
  }
  return map;
}

/** Minimal RFC-4180-ish CSV line parser (handles quoted fields). */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function fetchLlamaLogo(llamaSlug) {
  if (llamaLogoCache.has(llamaSlug)) return llamaLogoCache.get(llamaSlug);
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${encodeURIComponent(llamaSlug)}`, {
      headers: { "User-Agent": "canhav-logo-script/1.0" },
    });
    if (!res.ok) {
      llamaLogoCache.set(llamaSlug, null);
      return null;
    }
    const data = await res.json();
    const logo = typeof data.logo === "string" && data.logo.trim() ? data.logo.trim() : null;
    llamaLogoCache.set(llamaSlug, logo);
    return logo;
  } catch {
    llamaLogoCache.set(llamaSlug, null);
    return null;
  }
}

async function resolveLogoUrl(slug, portalLogos) {
  const llamaSlug = LLAMA_PROTOCOL_BY_NETWORK_SLUG[slug];
  if (llamaSlug) {
    const logo = await fetchLlamaLogo(llamaSlug);
    if (logo) return { logo, source: "defillama" };
  }
  const portalCsv = portalLogos.get(slug);
  if (portalCsv) return { logo: portalCsv, source: "portal-csv" };
  const brand = BRAND_LOGO_BY_SLUG[slug];
  if (brand) return { logo: brand, source: "brand" };
  return { logo: null, source: null };
}

async function main() {
  const raw = JSON.parse(readFileSync(bootstrapPath, "utf8"));
  const items = raw.items ?? {};
  const portalLogos = loadPortalLogos();

  let patched = 0;
  let skipped = 0;
  const manual = [];

  for (const [key, item] of Object.entries(items)) {
    if (item.Category !== "Entity") continue;
    const portal = item.ArbitrumPortalMetadata ?? {};
    if (portal.logoUrl) {
      skipped++;
      continue;
    }
    const slug = item.Slug;
    const { logo, source } = await resolveLogoUrl(slug, portalLogos);
    if (logo) {
      item.ArbitrumPortalMetadata = { ...portal, logoUrl: logo };
      patched++;
      console.log(`  + ${slug}: ${source}`);
    } else {
      manual.push(slug);
    }
    // Gentle rate limit for Llama API.
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nPatched: ${patched}, already had logo: ${skipped}, still missing: ${manual.length}`);
  if (manual.length) {
    console.log("Still missing logos:", manual.join(", "));
  }

  if (!DRY_RUN && patched > 0) {
    raw._meta = {
      ...raw._meta,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(bootstrapPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    console.log(`\nWrote ${bootstrapPath}`);
  } else if (DRY_RUN) {
    console.log("\nDRY_RUN=1 — no file written.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
