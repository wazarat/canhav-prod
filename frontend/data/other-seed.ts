import type { OtherSubSector, OtherSecondaryTag } from "@/lib/types";

export interface OtherSeed {
  name: string;
  slug: string; // canhav internal slug
  token: string | null; // governance / protocol token ticker (null = tokenless)
  subSector: OtherSubSector;
  secondaryTags: OtherSecondaryTag[];
  llamaSlug: string | null; // DefiLlama protocol slug
  coingeckoId: string | null; // CoinGecko coin id (null = no liquid token)
  seedMode: "new" | "extend-existing";
}

// Other sector seed (canhav-other-spec §3/§4). Convex & Aura are extend-existing —
// primary Liquidity/Vaults in the store; they gain secondary Other/Governance here.
// Tokenless protocols (Sherlock, Cozy, Votium) source headline TVL from Llama path (c).
// Ids verified against spec tables on 2026-06-25; collector fails soft to null when wrong.
export const OTHER_SEED: OtherSeed[] = [
  // --------------------------- UNDERWRITING ---------------------------------
  {
    name: "Nexus Mutual",
    slug: "nexus-mutual",
    token: "wNXM",
    subSector: "Underwriting",
    secondaryTags: ["Claims-Assessed"],
    llamaSlug: "nexus-mutual",
    coingeckoId: "wrapped-nxm",
    seedMode: "new",
  },
  {
    name: "Sherlock",
    slug: "sherlock",
    token: null,
    subSector: "Underwriting",
    secondaryTags: ["Audit-Coverage"],
    llamaSlug: "sherlock",
    coingeckoId: null,
    seedMode: "new",
  },
  {
    name: "InsurAce",
    slug: "insurace",
    token: "INSUR",
    subSector: "Underwriting",
    secondaryTags: ["Multi-Chain"],
    llamaSlug: "insurace",
    coingeckoId: "insurace",
    seedMode: "new",
  },
  {
    name: "Neptune Mutual",
    slug: "neptune-mutual",
    token: "NPM",
    subSector: "Underwriting",
    secondaryTags: ["Parametric-Cover"],
    llamaSlug: "neptune-mutual",
    coingeckoId: "neptune-mutual",
    seedMode: "new",
  },
  {
    name: "Cozy Finance",
    slug: "cozy-finance",
    token: null,
    subSector: "Underwriting",
    secondaryTags: ["Parametric-Cover"],
    llamaSlug: "cozy-earn",
    coingeckoId: null,
    seedMode: "new",
  },
  {
    name: "Ease.org",
    slug: "ease-org",
    token: "EASE",
    subSector: "Underwriting",
    secondaryTags: ["Multi-Chain"],
    llamaSlug: "easedefi.org",
    coingeckoId: "ease",
    seedMode: "new",
  },

  // ---------------------------- GOVERNANCE ----------------------------------
  {
    name: "Votium",
    slug: "votium",
    token: null,
    subSector: "Governance",
    secondaryTags: ["Bribe-Marketplace"],
    llamaSlug: null, // no DeFi Llama adapter as of 2026-06-25
    coingeckoId: null,
    seedMode: "new",
  },
  {
    name: "Redacted (Hidden Hand)",
    slug: "hidden-hand",
    token: "BTRFLY",
    subSector: "Governance",
    secondaryTags: ["Bribe-Marketplace"],
    llamaSlug: "hidden-hand",
    coingeckoId: "redacted",
    seedMode: "new",
  },
  {
    name: "Paladin",
    slug: "paladin",
    token: "PAL",
    subSector: "Governance",
    secondaryTags: ["Bribe-Marketplace"],
    llamaSlug: "paladin-vote",
    coingeckoId: "paladin",
    seedMode: "new",
  },
  {
    name: "Stake DAO",
    slug: "stake-dao",
    token: "SDT",
    subSector: "Governance",
    secondaryTags: ["Vote-Aggregator", "Liquid-Locker"],
    llamaSlug: "stake-dao",
    coingeckoId: "stake-dao",
    seedMode: "new",
  },
  {
    name: "Convex Finance",
    slug: "convex-finance",
    token: "CVX",
    subSector: "Governance",
    secondaryTags: ["Vote-Aggregator"],
    llamaSlug: "convex-finance",
    coingeckoId: "convex-finance",
    seedMode: "extend-existing",
  },
  {
    name: "Aura",
    slug: "aura",
    token: "AURA",
    subSector: "Governance",
    secondaryTags: ["Vote-Aggregator"],
    llamaSlug: "aura",
    coingeckoId: "aura-finance",
    seedMode: "extend-existing",
  },
];
