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

/** Top-level taxonomy categories. Only "Stablecoin" is active in Phase 1. */
export type CategorySlug =
  | "stablecoins"
  | "rwas"
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
