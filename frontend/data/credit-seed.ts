import type { CreditTag } from "@/lib/types";

export interface CreditSeed {
  name: string;
  slug: string;
  token: string | null;
  tag: CreditTag;
  llamaSlug: string | null; // DefiLlama protocol slug (TVL, fees, chains)
  feesSlug?: string | null; // override if fees adapter differs
  coingeckoId: string | null; // null = no standalone tradable gov token
  seedMode: "new" | "extend-existing";
  notes?: string;
}

/** Canonical Credit → Lending tag set (network tab filter). */
export const CANONICAL_LENDING_SLUGS = ["aave", "compound", "morpho", "spark", "radiant"] as const;

export const CREDIT_SEED: CreditSeed[] = [
  // ---------- LENDING ----------
  { name: "Aave",     slug: "aave",     token: "AAVE", tag: "Lending", llamaSlug: "aave-v3",     coingeckoId: "aave",                        seedMode: "extend-existing", notes: "V3 multichain; aave.ts live fetch already wired" },
  { name: "Compound", slug: "compound", token: "COMP", tag: "Lending", llamaSlug: "compound-v3", feesSlug: "compound-v3", coingeckoId: "compound-governance-token", seedMode: "extend-existing", notes: "V3 base-asset model; V2 = compound-v2" },
  { name: "Morpho",   slug: "morpho",   token: "MORPHO", tag: "Lending", llamaSlug: "morpho-blue", coingeckoId: "morpho",                    seedMode: "extend-existing", notes: "Morpho Blue isolated markets" },
  { name: "Spark Protocol", slug: "spark", token: null,   tag: "Lending", llamaSlug: "sparklend",   coingeckoId: null,                        seedMode: "extend-existing", notes: "Sky/MakerDAO-powered; no standalone tradable token" },
  { name: "Radiant Capital", slug: "radiant", token: "RDNT", tag: "Lending", llamaSlug: "radiant-v2", coingeckoId: "radiant-capital", seedMode: "extend-existing", notes: "Omnichain money market via LayerZero" },
  // M8: the two long-missing incumbents (CAN-84 comment), plus the M8 ingest.
  { name: "Fluid", slug: "fluid", token: "FLUID", tag: "Leveraged Yield", llamaSlug: "fluid", coingeckoId: "instadapp", seedMode: "extend-existing", notes: "dual-tagged Lending + Leveraged Yield in KV; ex-Instadapp" },
  { name: "Maple Finance", slug: "maple", token: "SYRUP", tag: "Fixed Income", llamaSlug: "maple", coingeckoId: "syrup", seedMode: "extend-existing", notes: "dual-tagged Lending + Fixed Income in KV (M8 bootstrap reconcile)" },
  // M8 new Lending entities (dataset compiled 2026-07-26).
  { name: "Steakhouse Financial", slug: "steakhouse-financial", token: null, tag: "Lending", llamaSlug: "steakhouse-financial", coingeckoId: null, seedMode: "new", notes: "risk curator, no contracts of its own; TVL books under Morpho/Euler/Kamino" },
  { name: "Native", slug: "native-credit-pool", token: null, tag: "Lending", llamaSlug: "native-credit-pool", coingeckoId: null, seedMode: "new", notes: "market-maker inventory credit pool; live on Robinhood Chain" },
  { name: "Dolomite", slug: "dolomite", token: "DOLO", tag: "Lending", llamaSlug: "dolomite", coingeckoId: "dolomite", seedMode: "new", notes: "collateral keeps native rights while pledged" },
  { name: "Euler", slug: "euler", token: "EUL", tag: "Lending", llamaSlug: "euler-v2", coingeckoId: null, seedMode: "new", notes: "V2 modular vault kernel; V1 exploited 2023, fully rewritten" },
  { name: "cSigma Finance", slug: "csigma-finance", token: "SIGMA", tag: "Lending", llamaSlug: "csigma-finance", coingeckoId: null, seedMode: "new", notes: "institutional credit desk, Arbitrum-concentrated" },
  // M8 migrations into Lending (were Stablecoin / Decentralized CDP).
  { name: "Liquity", slug: "liquity", token: "LQTY", tag: "Lending", llamaSlug: "liquity-v2", coingeckoId: "liquity", seedMode: "extend-existing", notes: "M8 migration from Stablecoin; V2 user-set-rate CDP" },
  { name: "Curve (crvUSD)", slug: "curve-stablecoin", token: "CRV", tag: "Lending", llamaSlug: "crvusd", coingeckoId: "crvusd", seedMode: "extend-existing", notes: "M8 migration from Stablecoin; crvUSD CDP + LlamaLend" },

  // ---------- LEVERAGED YIELD ----------
  { name: "Gearbox", slug: "gearbox", token: "GEAR", tag: "Leveraged Yield", llamaSlug: "gearbox",                       coingeckoId: "gearbox",     seedMode: "new", notes: "Credit Accounts, up to 10x" },
  { name: "Stella",  slug: "stella",  token: null,   tag: "Leveraged Yield", llamaSlug: "stella",                        coingeckoId: "alpha-finance", seedMode: "new", notes: "ex-Alpha Homora; pay-as-you-earn 0% borrow; token=ALPHA" },
  { name: "Extra Finance", slug: "extra-finance", token: "EXTRA", tag: "Leveraged Yield", llamaSlug: "extra-finance-leverage-farming", coingeckoId: null, seedMode: "new", notes: "Optimism/Base; up to 7x LP leverage" },
  // M8 new Leveraged Yield entities.
  { name: "T3tris Finance", slug: "t3tris-finance", token: null, tag: "Leveraged Yield", llamaSlug: "t3tris-finance", coingeckoId: null, seedMode: "new", notes: "PROVISIONAL tag fit (Onchain Capital Allocator); live on Robinhood Chain" },
  { name: "Contango", slug: "contango", token: "TANGO", tag: "Leveraged Yield", llamaSlug: "contango-v2", coingeckoId: null, seedMode: "new", notes: "looping aggregator over external money markets" },
  { name: "Yield Basis", slug: "yield-basis", token: "YB", tag: "Leveraged Yield", llamaSlug: "yield-basis", coingeckoId: "yield-basis", seedMode: "new", notes: "2x levered Curve BTC/crvUSD LP cancelling IL" },
  { name: "Origami Finance", slug: "origami-finance", token: null, tag: "Leveraged Yield", llamaSlug: "origami-finance", coingeckoId: null, seedMode: "new", notes: "folded yield-token vaults" },
  { name: "DeltaPrime", slug: "deltaprime", token: "PRIME", tag: "Leveraged Yield", llamaSlug: "deltaprime", coingeckoId: "prime-2", seedMode: "new", notes: "two 2024 key-compromise exploits (~$10.8m); onboarded with history displayed" },

  // ---------- FIXED INCOME ----------
  { name: "Pendle Finance",    slug: "pendle",    token: "PENDLE", tag: "Fixed Income", llamaSlug: "pendle",       coingeckoId: "pendle",            seedMode: "new", notes: "PT/YT yield split; category 'Yield' on Llama" },
  { name: "Notional Finance",  slug: "notional",  token: "NOTE",   tag: "Fixed Income", llamaSlug: "notional-v3",  coingeckoId: "notional-finance",  seedMode: "new", notes: "fCash fixed-rate AMM; v2=notional-v2" },
  { name: "Spectra",   slug: "spectra",   token: null,     tag: "Fixed Income", llamaSlug: "spectra-v2",   coingeckoId: null,                seedMode: "new", notes: "ex-APWine yield tokenization; verify token availability" },
  { name: "Sense Finance", slug: "sense", token: null,     tag: "Fixed Income", llamaSlug: "sense",        coingeckoId: null,                seedMode: "new", notes: "zero-coupon / stripped-yield; verify activity before relying" },
  // M8 new Fixed Income entities.
  { name: "TermMax", slug: "termmax", token: "TMX", tag: "Fixed Income", llamaSlug: "termmax", coingeckoId: null, seedMode: "new", notes: "fixed-rate fixed-maturity with Gearing Tokens" },
  { name: "Term Finance", slug: "term-finance", token: null, tag: "Fixed Income", llamaSlug: "termfinance-lend", coingeckoId: null, seedMode: "new", notes: "sealed-bid auction repo; second slug termfinance-vaults" },
  { name: "Boros", slug: "boros", token: null, tag: "Fixed Income", llamaSlug: "boros", coingeckoId: null, seedMode: "new", notes: "ParentSlug pendle: same team/brand, never plain rivals" },
  { name: "Fira", slug: "fira", token: null, tag: "Fixed Income", llamaSlug: "fira", coingeckoId: null, seedMode: "new", notes: "bond/coupon token split; borrowed figure is a data-quality flag" },
  { name: "Exactly", slug: "exactly", token: "EXA", tag: "Fixed Income", llamaSlug: "exactly", coingeckoId: "exa", seedMode: "new", notes: "fixed+variable pools on Base/Optimism" },
  // M8 migration into Fixed Income (was Stablecoin / Decentralized CDP).
  { name: "Inverse Finance", slug: "inverse-finance", token: "INV", tag: "Fixed Income", llamaSlug: "inverse-finance-firm", coingeckoId: "inverse-finance", seedMode: "extend-existing", notes: "M8 migration; FiRM fixed-rate borrowing via DBR" },
];
