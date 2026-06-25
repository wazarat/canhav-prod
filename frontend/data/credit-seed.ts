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

export const CREDIT_SEED: CreditSeed[] = [
  // ---------- LENDING ----------
  { name: "Aave",     slug: "aave",     token: "AAVE", tag: "Lending", llamaSlug: "aave-v3",     coingeckoId: "aave",                        seedMode: "extend-existing", notes: "V3 multichain; aave.ts live fetch already wired" },
  { name: "Compound", slug: "compound", token: "COMP", tag: "Lending", llamaSlug: "compound-v3", feesSlug: "compound-v3", coingeckoId: "compound-governance-token", seedMode: "extend-existing", notes: "V3 base-asset model; V2 = compound-v2" },
  { name: "Morpho",   slug: "morpho",   token: "MORPHO", tag: "Lending", llamaSlug: "morpho-blue", coingeckoId: "morpho",                    seedMode: "extend-existing", notes: "Morpho Blue isolated markets" },
  { name: "Radiant Capital", slug: "radiant", token: "RDNT", tag: "Lending", llamaSlug: "radiant-v2", coingeckoId: "radiant-capital",        seedMode: "new", notes: "Omnichain via LayerZero" },
  { name: "Spark Protocol", slug: "spark", token: null,   tag: "Lending", llamaSlug: "sparklend",   coingeckoId: null,                        seedMode: "extend-existing", notes: "Sky/MakerDAO-powered; no standalone tradable token" },

  // ---------- LEVERAGED YIELD ----------
  { name: "Gearbox", slug: "gearbox", token: "GEAR", tag: "Leveraged Yield", llamaSlug: "gearbox",                       coingeckoId: "gearbox",     seedMode: "new", notes: "Credit Accounts, up to 10x" },
  { name: "Stella",  slug: "stella",  token: null,   tag: "Leveraged Yield", llamaSlug: "stella",                        coingeckoId: "alpha-finance", seedMode: "new", notes: "ex-Alpha Homora; pay-as-you-earn 0% borrow; token=ALPHA" },
  { name: "Extra Finance", slug: "extra-finance", token: "EXTRA", tag: "Leveraged Yield", llamaSlug: "extra-finance-leverage-farming", coingeckoId: null, seedMode: "new", notes: "Optimism/Base; up to 7x LP leverage" },

  // ---------- FIXED INCOME ----------
  { name: "Pendle",    slug: "pendle",    token: "PENDLE", tag: "Fixed Income", llamaSlug: "pendle",       coingeckoId: "pendle",            seedMode: "new", notes: "PT/YT yield split; category 'Yield' on Llama" },
  { name: "Notional",  slug: "notional",  token: "NOTE",   tag: "Fixed Income", llamaSlug: "notional-v3",  coingeckoId: "notional-finance",  seedMode: "new", notes: "fCash fixed-rate AMM; v2=notional-v2" },
  { name: "Spectra",   slug: "spectra",   token: null,     tag: "Fixed Income", llamaSlug: "spectra-v2",   coingeckoId: null,                seedMode: "new", notes: "ex-APWine yield tokenization; verify token availability" },
  { name: "Sense Finance", slug: "sense", token: null,     tag: "Fixed Income", llamaSlug: "sense",        coingeckoId: null,                seedMode: "new", notes: "zero-coupon / stripped-yield; verify activity before relying" },
];
