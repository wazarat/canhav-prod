import type { ReceiptType } from "@/lib/types";

export interface ReceiptSeed {
  slug: string;
  symbol: string;
  name: string;
  receiptType: ReceiptType;
  entitySlug: string;
  baseAsset?: string;
  geckoId: string | null;
  sector: string;
  tag: string;
  notes: string;
}

/** 64 receipt families from canhav-coins-compiled.xlsx */
export const RECEIPT_SEED: ReceiptSeed[] = [
  { slug: "aave-atokens", symbol: "aUSDC", name: "aUSDC, aUSDT, aWETH (and other aTokens)", receiptType: "LendingReceipt", entitySlug: "aave", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Lending", notes: "Interest-bearing deposit receipts" },
  { slug: "aave-staked", symbol: "stkAAVE", name: "stkAAVE, stkGHO, stkABPT", receiptType: "LockedEscrowReceipt", entitySlug: "aave", baseAsset: undefined, geckoId: "staked-aave", sector: "Credit", tag: "Lending", notes: "Insurance / staking module" },
  { slug: "compound-ctokens", symbol: "cUSDC", name: "cUSDC, cETH, cDAI (and other cTokens)", receiptType: "LendingReceipt", entitySlug: "compound", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Lending", notes: "Compound deposit receipts" },
  { slug: "morpho-metamorpho", symbol: "maUSDC", name: "maUSDC, mcUSDC (and other Optimizer wrappers)", receiptType: "LendingReceipt", entitySlug: "morpho", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Lending", notes: "Optimizer wrappers" },
  { slug: "radiant-rtokens", symbol: "rUSDC", name: "rUSDC, rWETH, rUSDT (and other rTokens)", receiptType: "LendingReceipt", entitySlug: "radiant", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Lending", notes: "" },
  { slug: "spark-sdai", symbol: "sDAI", name: "sDAI (Savings DAI)", receiptType: "StakedStablecoin", entitySlug: "spark", baseAsset: "USDS", geckoId: "savings-dai", sector: "Credit", tag: "Lending", notes: "Savings DAI; governed by Sky" },
  { slug: "spark-sptokens", symbol: "spUSDC", name: "spUSDC, spWETH (and other spTokens)", receiptType: "LendingReceipt", entitySlug: "spark", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Lending", notes: "" },
  { slug: "usd-ai-susdai", symbol: "sUSDai", name: "sUSDai", receiptType: "StakedStablecoin", entitySlug: "usd-ai", baseAsset: "USD", geckoId: "susdai", sector: "Credit", tag: "Lending", notes: "Yield-bearing staked USDai; GPU-backed credit" },
  { slug: "usd-ai-schip", symbol: "sCHIP", name: "sCHIP", receiptType: "LockedEscrowReceipt", entitySlug: "usd-ai", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Lending", notes: "Staked CHIP; protocol backstop" },
  { slug: "fluid-fusdc", symbol: "fUSDC", name: "fUSDC, fETH (fTokens)", receiptType: "LendingReceipt", entitySlug: "fluid", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Lending", notes: "" },
  { slug: "pendle-ptyt", symbol: "PT-stETH", name: "PT-stETH, PT-eETH, etc.", receiptType: "FixedIncomeTranche", entitySlug: "pendle", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Fixed Income", notes: "Fixed-yield principal" },
  { slug: "pendle-ptyt-family", symbol: "YT-stETH", name: "YT-stETH, YT-eETH, etc.", receiptType: "FixedIncomeTranche", entitySlug: "pendle", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Fixed Income", notes: "Tradable future yield" },
  { slug: "notional-fcash", symbol: "fCash", name: "fCash / nTokens", receiptType: "LendingReceipt", entitySlug: "notional", baseAsset: undefined, geckoId: null, sector: "Credit", tag: "Fixed Income", notes: "Fixed-rate lending positions" },
  { slug: "gmx-glp", symbol: "GLP", name: "GLP", receiptType: "YieldVault", entitySlug: "gmx", baseAsset: undefined, geckoId: null, sector: "Derivatives", tag: "Perp DEX", notes: "GMX V1 LP basket" },
  { slug: "gmx-gm", symbol: "GM", name: "GM (GMX Market tokens)", receiptType: "YieldVault", entitySlug: "gmx", baseAsset: undefined, geckoId: "gm-2", sector: "Derivatives", tag: "Perp DEX", notes: "GMX V2 pools" },
  { slug: "dopex-rdpx", symbol: "rDPX", name: "rDPX", receiptType: "YieldVault", entitySlug: "dopex", baseAsset: undefined, geckoId: null, sector: "Derivatives", tag: "Option Vaults", notes: "Dopex rebate token" },
  { slug: "convex-cvxcrv", symbol: "cvxCRV", name: "cvxCRV", receiptType: "LockedEscrowReceipt", entitySlug: "convex-finance", baseAsset: undefined, geckoId: "convex-crv", sector: "Liquidity", tag: "Vaults", notes: "Tokenized locked CRV + rewards" },
  { slug: "convex-vlcvx", symbol: "vlCVX", name: "vlCVX", receiptType: "LockedEscrowReceipt", entitySlug: "convex-finance", baseAsset: undefined, geckoId: null, sector: "Liquidity", tag: "Vaults", notes: "Vote-locked CVX" },
  { slug: "aura-aurabal", symbol: "auraBAL", name: "auraBAL", receiptType: "LockedEscrowReceipt", entitySlug: "aura", baseAsset: undefined, geckoId: "aura-bal", sector: "Liquidity", tag: "Vaults", notes: "Tokenized veBAL" },
  { slug: "yearn-yvusdc", symbol: "yvUSDC", name: "yvUSDC, yvETH (yVaults)", receiptType: "YieldVault", entitySlug: "yearn-finance", baseAsset: undefined, geckoId: "usdc-yvault", sector: "Liquidity", tag: "Vaults", notes: "Yearn vault shares" },
  { slug: "beefy-mootokens", symbol: "mooTokens", name: "mooTokens", receiptType: "YieldVault", entitySlug: "beefy", baseAsset: undefined, geckoId: null, sector: "Liquidity", tag: "Vaults", notes: "Beefy vault receipts" },
  { slug: "nexus-nxm", symbol: "NXM", name: "NXM", receiptType: "LockedEscrowReceipt", entitySlug: "nexus-mutual", baseAsset: undefined, geckoId: "nxm", sector: "Other", tag: "Underwriting (Insurance)", notes: "Member-restricted; wNXM is tradable form" },
  { slug: "paladin-hpal", symbol: "hPAL", name: "hPAL", receiptType: "LockedEscrowReceipt", entitySlug: "paladin", baseAsset: undefined, geckoId: null, sector: "Other", tag: "Governance", notes: "Staked PAL" },
  { slug: "redacted-rlbtrfly", symbol: "rlBTRFLY", name: "rlBTRFLY", receiptType: "LockedEscrowReceipt", entitySlug: "hidden-hand", baseAsset: undefined, geckoId: null, sector: "Other", tag: "Governance", notes: "Locked BTRFLY" },
  { slug: "redacted-pxeth", symbol: "pxETH", name: "pxETH", receiptType: "LiquidStaking", entitySlug: "hidden-hand", baseAsset: "ETH", geckoId: "dinero-staked-eth", sector: "Other", tag: "Governance", notes: "Pirex ETH" },
  { slug: "redacted-apxeth", symbol: "apxETH", name: "apxETH", receiptType: "LiquidStaking", entitySlug: "hidden-hand", baseAsset: "ETH", geckoId: null, sector: "Other", tag: "Governance", notes: "Auto-compounding Pirex ETH" },
  { slug: "stake-sdcrv", symbol: "sdCRV", name: "sdCRV", receiptType: "LockedEscrowReceipt", entitySlug: "stake-dao", baseAsset: undefined, geckoId: "stake-dao-crv", sector: "Other", tag: "Governance", notes: "Stake DAO Liquid CRV" },
  { slug: "stake-sdbal", symbol: "sdBAL", name: "sdBAL", receiptType: "LockedEscrowReceipt", entitySlug: "stake-dao", baseAsset: undefined, geckoId: null, sector: "Other", tag: "Governance", notes: "Stake DAO Liquid BAL" },
  { slug: "stake-sdfxs", symbol: "sdFXS", name: "sdFXS", receiptType: "LockedEscrowReceipt", entitySlug: "stake-dao", baseAsset: undefined, geckoId: null, sector: "Other", tag: "Governance", notes: "Stake DAO Liquid FXS" },
  { slug: "stake-sdpendle", symbol: "sdPENDLE", name: "sdPENDLE", receiptType: "LockedEscrowReceipt", entitySlug: "stake-dao", baseAsset: undefined, geckoId: "stake-dao-sdpendle", sector: "Other", tag: "Governance", notes: "Stake DAO Liquid PENDLE" },
  { slug: "stake-sdangle", symbol: "sdANGLE", name: "sdANGLE", receiptType: "LockedEscrowReceipt", entitySlug: "stake-dao", baseAsset: undefined, geckoId: null, sector: "Other", tag: "Governance", notes: "Stake DAO Liquid ANGLE" },
  { slug: "centrifuge-pool-tokens", symbol: "Pool Tokens", name: "Pool Tokens (various)", receiptType: "FixedIncomeTranche", entitySlug: "centrifuge", baseAsset: undefined, geckoId: null, sector: "RWA", tag: "RWA Yield", notes: "Per-pool tranche tokens" },
  { slug: "clearpool-credit-vault-tokens", symbol: "Credit Vault Tokens", name: "Credit Vault Tokens (various)", receiptType: "FixedIncomeTranche", entitySlug: "clearpool", baseAsset: undefined, geckoId: null, sector: "RWA", tag: "RWA Yield", notes: "" },
  { slug: "dinari-dshares", symbol: "dShares", name: "dShares (various)", receiptType: "TokenizedRWA", entitySlug: "dinari", baseAsset: undefined, geckoId: null, sector: "RWA", tag: "RWA Yield", notes: "Tokenized public stocks" },
  { slug: "ethena-susde", symbol: "sUSDe", name: "sUSDe", receiptType: "StakedStablecoin", entitySlug: "ethena", baseAsset: "USDe", geckoId: "ethena-staked-usde", sector: "RWA", tag: "RWA Yield", notes: "Yield-bearing staked USDe" },
  { slug: "goldfinch-senior-pool", symbol: "Senior Pool", name: "Senior Pool / Junior Tranche tokens", receiptType: "FixedIncomeTranche", entitySlug: "goldfinch", baseAsset: undefined, geckoId: null, sector: "RWA", tag: "RWA Yield", notes: "" },
  { slug: "maple-credit-pool-tokens", symbol: "Credit Pool Tokens", name: "Credit Pool Tokens (various)", receiptType: "FixedIncomeTranche", entitySlug: "maple", baseAsset: undefined, geckoId: null, sector: "RWA", tag: "RWA Yield", notes: "incl. SYRUP staking" },
  { slug: "ondo-usdy", symbol: "USDY", name: "USDY", receiptType: "StakedStablecoin", entitySlug: "ondo-finance", baseAsset: "USD", geckoId: "ondo-us-dollar-yield", sector: "RWA", tag: "RWA Yield", notes: "Accruing T-bill token" },
  { slug: "ondo-ousg", symbol: "OUSG", name: "OUSG", receiptType: "TokenizedRWA", entitySlug: "ondo-finance", baseAsset: undefined, geckoId: "ousg", sector: "RWA", tag: "RWA Yield", notes: "Tokenized short-term Treasuries" },
  { slug: "franklin-benji", symbol: "BENJI", name: "BENJI", receiptType: "TokenizedRWA", entitySlug: "franklin-templeton", baseAsset: undefined, geckoId: "franklin-templeton-benji", sector: "RWA", tag: "RWA Yield", notes: "FOBXX on-chain shares" },
  { slug: "securitize-buidl", symbol: "BUIDL", name: "BUIDL", receiptType: "TokenizedRWA", entitySlug: "securitize", baseAsset: undefined, geckoId: "blackrock-usd-institutional-digital-liquidity-fund", sector: "RWA", tag: "RWA Yield", notes: "BlackRock USD Institutional Digital Liquidity Fund" },
  { slug: "realt-realtokens", symbol: "RealTokens", name: "RealTokens (various)", receiptType: "TokenizedRWA", entitySlug: "realt", baseAsset: undefined, geckoId: null, sector: "RWA", tag: "RWA Yield", notes: "Fractional real estate" },
  { slug: "frax-sfrxusd", symbol: "sFRAX", name: "sFRAX / sfrxUSD", receiptType: "StakedStablecoin", entitySlug: "frax", baseAsset: "USD", geckoId: "staked-frax", sector: "RWA", tag: "RWA Yield", notes: "RWA-backed yield" },
  { slug: "toucan-carbon-credit-tokens", symbol: "Carbon Credit Tokens", name: "Carbon Credit Tokens (e.g. NCT)", receiptType: "TokenizedRWA", entitySlug: "toucan-protocol", baseAsset: undefined, geckoId: null, sector: "RWA", tag: "RWA Yield", notes: "" },
  { slug: "sky-susds", symbol: "sUSDS", name: "sUSDS", receiptType: "StakedStablecoin", entitySlug: "sky", baseAsset: "USDS", geckoId: "susds", sector: "RWA", tag: "RWA Yield", notes: "Sky Savings Rate token" },
  { slug: "reservoir-srusd", symbol: "srUSD", name: "srUSD", receiptType: "StakedStablecoin", entitySlug: "reserve", baseAsset: "USD", geckoId: "reservoir-srusd", sector: "RWA", tag: "RWA Yield", notes: "Overcollateralized staked rUSD" },
  { slug: "binance-wbeth", symbol: "WBETH", name: "WBETH", receiptType: "LiquidStaking", entitySlug: "binance-wbeth", baseAsset: "ETH", geckoId: "wrapped-beacon-eth", sector: "Staking", tag: "Liquid Staking", notes: "Wrapped Beacon ETH" },
  { slug: "coinbase-cbeth", symbol: "cbETH", name: "cbETH", receiptType: "LiquidStaking", entitySlug: "coinbase-cbeth", baseAsset: "ETH", geckoId: "coinbase-wrapped-staked-eth", sector: "Staking", tag: "Liquid Staking", notes: "Coinbase Wrapped Staked ETH" },
  { slug: "lido-steth", symbol: "stETH", name: "stETH", receiptType: "LiquidStaking", entitySlug: "lido", baseAsset: "ETH", geckoId: "staked-ether", sector: "Staking", tag: "Liquid Staking", notes: "Rebasing" },
  { slug: "lido-steth-family", symbol: "wstETH", name: "wstETH", receiptType: "LiquidStaking", entitySlug: "lido", baseAsset: "ETH", geckoId: "bridged-wrapped-lido-staked-ether-scroll", sector: "Staking", tag: "Liquid Staking", notes: "Non-rebasing wrapper of stETH" },
  { slug: "mantle-meth", symbol: "mETH", name: "mETH", receiptType: "LiquidStaking", entitySlug: "mantle-meth", baseAsset: "ETH", geckoId: "mantle-staked-ether", sector: "Staking", tag: "Liquid Staking", notes: "" },
  { slug: "rocket-pool-reth", symbol: "rETH", name: "rETH", receiptType: "LiquidStaking", entitySlug: "rocket-pool", baseAsset: "ETH", geckoId: "rocket-pool-eth", sector: "Staking", tag: "Liquid Staking", notes: "" },
  { slug: "stader-ethx", symbol: "ETHx", name: "ETHx", receiptType: "LiquidStaking", entitySlug: "stader", baseAsset: "ETH", geckoId: "stader-ethx", sector: "Staking", tag: "Liquid Staking", notes: "" },
  { slug: "stakewise-oseth", symbol: "osETH", name: "osETH", receiptType: "LiquidStaking", entitySlug: "stakewise", baseAsset: "ETH", geckoId: "stakewise-v3-oseth", sector: "Staking", tag: "Liquid Staking", notes: "" },
  { slug: "swell-sweth", symbol: "swETH", name: "swETH", receiptType: "LiquidStaking", entitySlug: "swell", baseAsset: "ETH", geckoId: "sweth", sector: "Staking", tag: "Liquid Staking", notes: "" },
  { slug: "ankr-ankreth", symbol: "ankrETH", name: "ankrETH", receiptType: "LiquidStaking", entitySlug: "ankr", baseAsset: "ETH", geckoId: "ankreth", sector: "Staking", tag: "Liquid Staking", notes: "" },
  { slug: "ankr-aethc", symbol: "aETHc", name: "aETHc", receiptType: "LiquidStaking", entitySlug: "ankr", baseAsset: "ETH", geckoId: null, sector: "Staking", tag: "Liquid Staking", notes: "" },
  { slug: "bedrock-unieth", symbol: "uniETH", name: "uniETH", receiptType: "LiquidRestaking", entitySlug: "bedrock", baseAsset: "ETH", geckoId: "universal-eth", sector: "Staking", tag: "Liquid Restaking", notes: "" },
  { slug: "ether-fi-weeth", symbol: "weETH", name: "weETH", receiptType: "LiquidRestaking", entitySlug: "ether-fi", baseAsset: "ETH", geckoId: "wrapped-eeth", sector: "Staking", tag: "Liquid Restaking", notes: "" },
  { slug: "ether-fi-weeth-family", symbol: "eETH", name: "eETH", receiptType: "LiquidRestaking", entitySlug: "ether-fi", baseAsset: "ETH", geckoId: "ether-fi-staked-eth", sector: "Staking", tag: "Liquid Restaking", notes: "Rebasing form" },
  { slug: "kelp-rseth", symbol: "rsETH", name: "rsETH", receiptType: "LiquidRestaking", entitySlug: "kelp-dao", baseAsset: "ETH", geckoId: "kelp-dao-restaked-eth", sector: "Staking", tag: "Liquid Restaking", notes: "" },
  { slug: "puffer-pufeth", symbol: "pufETH", name: "pufETH", receiptType: "LiquidRestaking", entitySlug: "puffer", baseAsset: "ETH", geckoId: "pufeth", sector: "Staking", tag: "Liquid Restaking", notes: "" },
  { slug: "renzo-ezeth", symbol: "ezETH", name: "ezETH", receiptType: "LiquidRestaking", entitySlug: "renzo", baseAsset: "ETH", geckoId: "renzo-restaked-eth", sector: "Staking", tag: "Liquid Restaking", notes: "" },
  { slug: "yieldnest-yneth", symbol: "ynETH", name: "ynETH", receiptType: "LiquidRestaking", entitySlug: "yieldnest", baseAsset: "ETH", geckoId: "yieldnest-restaked-eth", sector: "Staking", tag: "Liquid Restaking", notes: "" },
];
