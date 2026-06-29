/**
 * Client-safe CoinGecko slug → coin id maps and pure lookup helpers.
 * Extracted from lib/server/coingecko.ts so client components (e.g.
 * entityLogo) never import server-only fetch logic.
 * Keep in sync with backend/app/live/coingecko.py.
 */

// Best-effort slug -> CoinGecko coin id. `null` means "no known liquid token on
// CoinGecko" (common for early-stage RWAs). This map is the single place to
// curate the mapping; keep it in sync with the Python module.
export const COINGECKO_IDS: Record<string, string | null> = {
  // Stablecoins
  ethena: "ethena-usde",
  susde: "ethena-staked-usde",
  usdtb: "usdtb", // Ethena USDtb (Ethereum/Solana only — market data, no Arbitrum address)
  ena: "ethena",
  "inverse-finance": "dola-usd",
  monerium: "monerium-eur-money",
  gbpe: "monerium-gbp-emoney", // Gnosis only — market data, no Arbitrum address
  sky: "usds",
  susds: "susds",
  dai: "dai",
  stusds: null,
  "sky-gov": "sky",
  stably: null,
  veusd: "veusd",
  tether: "tether",
  trueusd: "true-usd",
  // USD.AI synthetic dollars (verified on CoinGecko, Arbitrum One).
  usdai: "usdai",
  susdai: "susdai",
  // CHIP (USD.AI governance token) — not listed on CoinGecko yet.
  chip: null,
  // Jupiter (Solana) — market data via CoinGecko; on-chain supply is Solana-only.
  jup: "jupiter-exchange-solana",
  jlp: "jupiter-perpetuals-liquidity-provider-token",
  jupsol: "jupiter-staked-sol",
  jupusd: "jupusd",
  jljupusd: null,
  // Pleasing USD — supply/peg via DeFi Llama (id 341); CG id for market data.
  usdpm: "pleasing-usd",
  gho: "gho",
  sgho: null,
  usdy: "ondo-us-dollar-yield",
  "ondo-gov": "ondo-finance",
  "aave-gov": "aave",
  stkaave: "staked-aave",
  pgold: "pleasing-gold",
  ousg: "ousg",
  benji: "franklin-templeton-benji",
  usdc: "usd-coin",
  usdt0: "usdt0",
  // RWAs (most have no CoinGecko-listed Arbitrum token yet). Verified via the
  // CoinGecko /search + /coins endpoints:
  //   - franklin-templeton-benji: BENJI on Arbitrum One ($1.00 NAV) -> full
  //     on-chain (Alchemy) + market data.
  //   - aryze-eusd / centrifuge: listed but NOT on Arbitrum -> market data only.
  arcton: null,
  aryze: "aryze-eusd",
  atmosphera: null,
  centrifuge: "centrifuge",
  "chateau-capital": null,
  dinari: null,
  dualmint: null,
  "estate-protocol": null,
  "florence-finance": null,
  "franklin-templeton": "franklin-templeton-benji",
  // Data-expansion coins. Most are low-liquidity / unlisted / institutional-gated,
  // so they map to null (live overlay simply skips them). Only confident ids set.
  sena: "ethena-staked-ena",
  iusde: null,
  mkr: "maker",
  schip: null,
  true: null,
  tgbp: null,
  taud: null,
  tcad: null,
  thkd: null,
  "monerium-usde": null,
  iske: null,
  rusdy: "rebasing-ondo-us-dollar-yield",
  usdsc: null,
  "ondo-gm": null,
  "stably-gold": null,
  reg: "realtoken-ecosystem-governance",
  // DEX governance tokens (PDF "DEX Sector Expansion" §3).
  uni: "uniswap",
  crv: "curve-dao-token",
  bal: "balancer",
  aero: "aerodrome-finance",
  cake: "pancakeswap-token",
  sushi: "sushi",
  ray: "raydium",
  "dydx-gov": "dydx-chain",
  drift: "drift-protocol",
  "gmx-gov": "gmx",
  hype: "hyperliquid",
  gns: "gains-network",
  joe: "joe",
  rune: "thorchain",
  // Derivatives sector member coins (canhav-derivatives spec §3/§4/§5; verified 2026-06-25).
  // ENA (ena -> "ethena") is already mapped above. DPX (Dopex) has no clean
  // CoinGecko markets entry; Rage Trade / Neutra are tokenless.
  snx: "havven", // Synthetix SNX (legacy CoinGecko id "havven")
  "aevo-gov": "aevo-exchange", // member-coin slug distinct from the "aevo" entity slug
  rbn: "ribbon-finance",
  drv: "derive", // Derive (ex-Lyra)
  jones: "jones-dao",
  dpx: null, // Dopex — no reliable CoinGecko markets entry (TVL via DeFi Llama)
  // Lending-network governance tokens (PDF Week 7+8). Ids verified via the
  // CoinGecko /search endpoint; `// verify` ones should be confirmed before
  // relying on live price/supply (the cron fails soft to null otherwise).
  morpho: "morpho",
  comp: "compound-governance-token",
  spk: "spark-2", // Spark Protocol SPK (CoinGecko id is spark-2; "spark" is unrelated)
  fluid: "instadapp", // Fluid governance (ex-INST; fluid id has no CG market feed)
  xvs: "venus",
  jst: "just",
  kmno: "kamino",
  syrup: "syrup",
  "syrup-oft": "syrup",
  cfg: "centrifuge",
  gfi: "goldfinch",
  cpool: "clearpool",
  stsyrup: null, // not on CoinGecko — Llama ethereum price fallback
  vai: null,
  // Stablecoin Sector Expansion (PDF §3). Confident ids set; `// verify` ones
  // should be confirmed before relying on live price/supply (cron fails soft).
  eurc: "euro-coin",
  usdp: "paxos-standard",
  pyusd: "paypal-usd",
  usdg: "global-dollar",
  usdl: "lift-dollar", // wound down 2025 but still listed
  fdusd: "first-digital-usd",
  m0: "wrappedm-by-m0", // WrappedM proxy; plain M unlisted on CoinGecko
  ausd: "agora-dollar",
  bgusd: null, // exchange-native, not on CoinGecko
  zusd: "zusd",
  gyen: "gyen",
  lusd: "liquity-usd",
  bold: "liquity-bold",
  crvusd: "crvusd",
  scrvusd: "savings-crvusd",
  lisusd: "helio-protocol-hay", // Lista USD (formerly Helio HAY)
  rsv: "reserve",
  eusd: "electronic-usd",
  rgusd: "revenue-generating-usd",
  frax: "frax",
  frxusd: "frax-usd",
  sfrax: "staked-frax",
  usr: "resolv-usr",
  stusr: null, // only wstUSR listed (off-peg/illiquid feed) — left unmapped
  rlp: "resolv-rlp",
  usdf: null, // falcon-finance-usd listed but returns no price — left unmapped
  susdf: null, // sUSDf not listed on CoinGecko
  cusd: "cap-usd", // Cap USD (distinct id from Celo Dollar)
  deusd: "elixir-deusd",
  sdeusd: "elixir-staked-deusd",
  usdz: "anzen-usdz",
  susdz: "anzen-staked-usdz",
  usdm: "mountain-protocol-usdm",
  // Credit sector member coins (Leveraged Yield + Fixed Income gov tokens; verified 2026-06-25).
  rdnt: "radiant-capital",
  gear: "gearbox",
  pendle: "pendle",
  note: "notional-finance",
  // Staking sector member coins — LST/LRT tokens (verified 2026-06-25).
  steth: "staked-ether",
  reth: "rocket-pool-eth",
  wbeth: "wrapped-beacon-eth",
  cbeth: "coinbase-wrapped-staked-eth",
  meth: "mantle-staked-ether",
  sfrxeth: "staked-frax-ether", // distinct from the `sfrax` stablecoin (staked-frax)
  sweth: "sweth",
  ethx: "stader-ethx",
  oseth: "stakewise-v3-oseth",
  ankreth: "ankreth",
  eigen: "eigenlayer", // EigenCloud (prev. EigenLayer); CoinGecko id remains "eigenlayer"
  weeth: "wrapped-eeth",
  ezeth: "renzo-restaked-eth",
  rseth: "kelp-dao-restaked-eth",
  pufeth: "pufeth",
  unieth: "universal-eth", // Bedrock uniETH (CoinGecko id is universal-eth)
  yneth: "yieldnest-restaked-eth",
  // Compiled coin integration (canhav-coins-compiled.xlsx).
  "aave-token": "aave",
  "morpho-token": "morpho",
  "fluid-token": "instadapp",
  "pendle-token": "pendle",
  "gmx-token": "gmx",
  "dydx-token": "dydx-chain",
  "aevo-token": "aevo-exchange",
  "sky-token": "sky",
  "gamma-token": "gamma-strategies",
  "swell-token": "sweth",
  "ankr-token": "ankreth",
  "ethena-ena": "ethena",
  rez: "renzo",
  eul: "euler",
  kava: "kava",
  extra: "extra-finance",
  mav: "maverick-protocol",
  cvx: "convex-finance",
  bifi: "beefy-finance",
  yfi: "yearn-finance",
  ldo: "lido-dao",
  rpl: "rocket-pool",
  ethfi: "ether-fi",
  kar: "karak",
  mnt: "mantle",
  anz: "anzen-usdz",
  usde: "ethena-usde",
  susd: "nusd",
  rusd: "reservoir-rusd",
  "lido-steth": "staked-ether",
  "rocket-pool-reth": "rocket-pool-eth",
  "ether-fi-weeth": "wrapped-eeth",
  "renzo-ezeth": "renzo-restaked-eth",
  "kelp-rseth": "kelp-dao-restaked-eth",
  "puffer-pufeth": "pufeth",
  "yieldnest-yneth": "yieldnest-restaked-eth",
  "bedrock-unieth": "universal-eth",
  "stader-ethx": "stader-ethx",
  "stakewise-oseth": "stakewise-v3-oseth",
  "swell-sweth": "sweth",
  "mantle-meth": "mantle-staked-ether",
  "ethena-susde": "ethena-staked-usde",
  "sky-susds": "susds",
  "spark-sdai": "savings-dai",
  "aave-atokens": null,
  "aave-staked": "staked-aave",
  "compound-ctokens": null,
  "morpho-metamorpho": null,
  "radiant-rtokens": null,
  "spark-sptokens": null,
  "usd-ai-susdai": "susdai",
  dlp: null,
  m: null,
  "mpl-syrup": null,
  "tprotocol-tru": null,
  ease: null,
  insur: null,
  btrfly: null,
  fflr: null,
  fxs: null,
  sense: null,
};

/**
 * Network (umbrella entity) slug → governance / protocol token on CoinGecko.
 * Separate from `COINGECKO_IDS` (member products). `null` = no suitable token;
 * universal pass then relies on Llama `gecko_id` only.
 */
export const NETWORK_COINGECKO_IDS: Record<string, string | null> = {
  aave: "aave",
  aerodrome: "aerodrome-finance",
  balancer: "balancer",
  centrifuge: "centrifuge",
  clearpool: "clearpool",
  compound: "compound-governance-token",
  "curve-finance": "curve-dao-token",
  "drift-protocol": "drift-protocol",
  dydx: "dydx-chain",
  ethena: "ethena",
  fluid: "instadapp",
  "gains-network": "gains-network",
  gmx: "gmx",
  goldfinch: "goldfinch",
  hyperliquid: "hyperliquid",
  justlend: "just",
  jupiter: "jupiter-exchange-solana",
  kamino: "kamino",
  maple: "syrup",
  morpho: "morpho",
  "ondo-finance": "ondo-finance",
  pancakeswap: "pancakeswap-token",
  raydium: "raydium",
  sky: "sky",
  spark: "spark-2",
  sushiswap: "sushi",
  thorchain: "thorchain",
  "trader-joe": "joe",
  uniswap: "uniswap",
  venus: "venus",
  frax: "frax",
  liquity: "liquity",
  "lista-dao": "lista",
  realt: "realtoken-ecosystem-governance",
  // Credit sector expansion — Leveraged Yield + Fixed Income gov tokens (verified 2026-06-25).
  gearbox: "gearbox",
  stella: "alpha-finance", // ex-Alpha Homora (ALPHA token)
  "extra-finance": null, // EXTRA not listed on CoinGecko
  pendle: "pendle",
  notional: "notional-finance",
  spectra: null, // no standalone tradable token
  sense: null,
  radiant: "radiant-capital",
  // Staking sector — LST/LRT or governance token for the universal pass (verified 2026-06-25).
  lido: "staked-ether",
  "rocket-pool": "rocket-pool-eth",
  "binance-wbeth": "wrapped-beacon-eth",
  "coinbase-cbeth": "coinbase-wrapped-staked-eth",
  "mantle-meth": "mantle-staked-ether",
  swell: "sweth",
  stader: "stader-ethx",
  stakewise: "stakewise-v3-oseth",
  ankr: "ankreth",
  eigenlayer: "eigenlayer",
  symbiotic: null, // TVL-only (no liquid token)
  karak: null,
  "ether-fi": "wrapped-eeth",
  renzo: "renzo-restaked-eth",
  "kelp-dao": "kelp-dao-restaked-eth",
  puffer: "pufeth",
  bedrock: "universal-eth",
  yieldnest: "yieldnest-restaked-eth",
  // Liquidity sector — governance token for the universal pass (verified 2026-06-25).
  // The five extend-existing DEX venues (curve-finance/uniswap/balancer/aerodrome/
  // pancakeswap) are already mapped above.
  gamma: "gamma-strategies",
  "yearn-finance": "yearn-finance",
  "convex-finance": "convex-finance",
  beefy: "beefy-finance",
  aura: "aura-finance",
  arrakis: null, // tokenless — TVL sourced from DeFi Llama only
  maverick: "maverick-protocol",
  // Derivatives sector — governance token for the universal pass (verified 2026-06-25).
  // The extend-existing perp venues (gmx/gains-network/hyperliquid) + ethena are
  // already mapped above. dYdX/Drift excluded (non-EVM).
  synthetix: "havven", // SNX (legacy CoinGecko id "havven")
  aevo: "aevo-exchange",
  "ribbon-finance": "ribbon-finance",
  dopex: null, // DPX — no reliable CoinGecko markets entry (TVL via DeFi Llama)
  derive: "derive",
  "jones-dao": "jones-dao",
  "rage-trade": null, // tokenless — TVL sourced from DeFi Llama only
  "neutra-finance": null, // tokenless — TVL sourced from DeFi Llama only
  // Other sector — governance / underwriting tokens (verified 2026-06-25).
  // Convex & Aura already mapped above (Liquidity). Sherlock, Cozy, Votium tokenless.
  "nexus-mutual": "wrapped-nxm",
  insurace: "insurace",
  "neptune-mutual": "neptune-mutual",
  "ease-org": "ease",
  "hidden-hand": "redacted",
  paladin: "paladin",
  "stake-dao": "stake-dao",
  // Stablecoin issuers / TradFi — no meaningful governance token for universals.
  tether: null,
  circle: null,
  monerium: null,
  paxos: null,
  "first-digital": null,
  bitget: null,
  stably: null,
  "gmo-trust": null,
  agora: null,
  cap: null,
  anzen: null,
  falcon: null,
  elixir: null,
  "mountain-protocol": null,
  resolv: null,
  reserve: null,
  "m-zero": null,
  "usd-ai": null,
  usdt0: null,
  "trueusd": null,
  "inverse-finance": null,
  "curve-stablecoin": null,
  // RWAs / early-stage — defer to Llama gecko_id when present.
  arcton: null,
  aryze: null,
  atmosphera: null,
  "chateau-capital": null,
  dinari: null,
  dualmint: null,
  "estate-protocol": null,
  "florence-finance": null,
  "franklin-templeton": null,
  "lofty-ai": null,
  "pleasing-market": null,
  securitize: null,
  "toucan-protocol": null,
};

/** Governance-token join key for a network slug (not member-product slugs). */
export function coinIdForNetworkSlug(slug: string): string | null {
  if (slug in NETWORK_COINGECKO_IDS) {
    return NETWORK_COINGECKO_IDS[slug] ?? null;
  }
  return null;
}

/** The curated CoinGecko coin id for a slug, or null if unmapped. */
export function coinIdForSlug(slug: string): string | null {
  return COINGECKO_IDS[slug] ?? null;
}
