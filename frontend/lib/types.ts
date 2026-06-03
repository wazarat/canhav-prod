/**
 * Frontend data contract for CanHav Research.
 *
 * This shape intentionally mirrors the DynamoDB single-table item so the same
 * structure is used by the mock data today and by the live API (Step 4) later.
 *
 *   PK = `CATEGORY#<Category>`   SK = `PROTOCOL#<slug>`
 */

export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED";

export type PegTarget = "USD" | "EUR";

/** Top-level taxonomy categories. */
export type CategorySlug =
  | "entities"
  | "stablecoins"
  | "rwas"
  | "tokens"
  | "lending"
  | "perpetuals"
  | "yield"
  | "dex"
  | "options";

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  description: string;
  status: "active" | "coming_soon";
  /** Number of profiles tracked (approved + pending), shown as a hint. */
  trackedCount?: number;
}

/** A single historical peg observation (source: Dune, Step 4). */
export interface PegDataPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Observed price in the peg target currency (≈ 1.0 for a healthy peg). */
  price: number;
}

/** On-chain circulating supply (source: Alchemy, Step 4). */
export interface TotalSupply {
  /** Circulating supply in token units, or null until the live overlay runs. */
  value: number | null;
  source: "alchemy";
  /** ISO timestamp of the last refresh, or null if never. */
  updatedAt: string | null;
}

/** Macro peg history wrapper (source: Dune, Step 4). */
export interface HistoricalPegData {
  points: PegDataPoint[];
  source: "dune";
  updatedAt: string | null;
}

/** Raw metadata sourced directly from the Arbitrum Portal CSV. */
export interface ArbitrumPortalMetadata {
  portalUrl: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  chains: string[];
  subCategory: string | null;
  isLive: boolean;
  isArbitrumNative: boolean;
  isPubliclyAudited: boolean;
  foundedDate: string | null;
}

export interface StablecoinProfile {
  category: "Stablecoin";
  slug: string;
  name: string;
  symbol: string;
  status: ApprovalStatus;
  pegTarget: PegTarget;
  description: string;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  github: string | null;
  coingecko: string | null;
  auditUrl: string | null;
  /** Resolved Arbitrum token contract address (CoinGecko, Step 4 B2). */
  contractAddress?: string | null;
  /** Slug of the parent umbrella Entity (e.g. "usd-ai"), if grouped. */
  entitySlug?: string | null;
  totalSupply: TotalSupply;
  historicalPegData: HistoricalPegData;
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Real World Assets (RWAs) — Phase 2                                         */
/* -------------------------------------------------------------------------- */

/**
 * The underlying off-chain asset a tokenization protocol brings on-chain.
 * Derived during ingestion (the CSV only labels everything "Real World
 * Assets (RWAs)"), analogous to how stablecoin symbols/peg targets are derived.
 */
export type RwaAssetClass =
  | "Tokenized Equities"
  | "Private Credit"
  | "Real Estate"
  | "Treasuries & Funds"
  | "Event Finance"
  | "Structured Products"
  | "Multi-Asset"
  | "Stablecoins & FX";

/** A single historical TVL / AUM observation (source: Dune, Step 4). */
export interface TvlDataPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Total value locked / assets under management, in USD. */
  value: number;
}

/** On-chain total value locked / AUM (source: Alchemy, Step 4). */
export interface TotalValueLocked {
  /** TVL in USD, or null until the live overlay runs. */
  value: number | null;
  source: "alchemy";
  /** ISO timestamp of the last refresh, or null if never. */
  updatedAt: string | null;
}

/** Macro TVL history wrapper (source: Dune, Step 4). */
export interface HistoricalTvlData {
  points: TvlDataPoint[];
  source: "dune";
  updatedAt: string | null;
}

export interface RwaProfile {
  category: "RWA";
  slug: string;
  name: string;
  /** Short ticker/label for the protocol (derived; CSV has no symbol column). */
  symbol: string;
  status: ApprovalStatus;
  /** Derived underlying-asset classification. */
  assetClass: RwaAssetClass;
  description: string;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  github: string | null;
  coingecko: string | null;
  auditUrl: string | null;
  /** Resolved Arbitrum token/vault contract address(es) (CoinGecko, Step 4 B2). */
  contractAddress?: string | null;
  vaultAddresses?: string[] | null;
  totalValueLocked: TotalValueLocked;
  historicalTvlData: HistoricalTvlData;
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Tokens — governance / utility tokens (e.g. CHIP)                           */
/* -------------------------------------------------------------------------- */

export type TokenType = "Governance" | "Utility";

export interface TokenProfile {
  category: "Token";
  slug: string;
  name: string;
  symbol: string;
  status: ApprovalStatus;
  tokenType: TokenType;
  description: string;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  github: string | null;
  coingecko: string | null;
  auditUrl: string | null;
  contractAddress?: string | null;
  /** Slug of the parent umbrella Entity (e.g. "usd-ai"). */
  entitySlug?: string | null;
  totalSupply: TotalSupply;
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Entities — top-tier umbrella protocols that group several coins            */
/* -------------------------------------------------------------------------- */

export interface EntityComponent {
  name: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  pinned?: boolean;
}

export interface OrgUnit {
  name: string;
  role: string;
  description: string;
}

export interface TradFiRow {
  product: string;
  similarity: string;
  differences: string;
}

export interface InvestmentRound {
  date: string;
  round: string;
  amountUsd: number | null;
  amountLabel: string | null;
  investors: string[];
  link: string | null;
}

export interface Partnership {
  name: string;
  date: string;
  amountLabel: string | null;
  description: string;
}

export interface CurrentScale {
  tvlUsd: number | null;
  users: number | null;
  aprPct: number | null;
  targetAprPct: number | null;
  loanPipelineUsd: number | null;
  partnerships: number | null;
}

/** Which category partition a member coin lives in. */
export type MemberCoinCategory = "Stablecoin" | "Token";

export interface MemberCoinRef {
  slug: string;
  name: string;
  symbol: string;
  category: MemberCoinCategory;
  role: string;
}

export interface EntityProfile {
  category: "Entity";
  slug: string;
  name: string;
  symbol: string;
  status: ApprovalStatus;
  tagline: string;
  description: string;
  differentiator: string;
  officialDocs: string | null;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  github: string | null;
  components: EntityComponent[];
  faq: FaqItem[];
  orgStructure: OrgUnit[];
  tradFiComparison: TradFiRow[];
  risks: string[];
  investmentRounds: InvestmentRound[];
  partnerships: Partnership[];
  currentScale: CurrentScale;
  memberCoins: MemberCoinRef[];
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  createdAt: string;
  updatedAt: string;
}
