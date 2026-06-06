/**
 * Frontend data contract for CanHav Research.
 *
 * This shape intentionally mirrors the DynamoDB single-table item so the same
 * structure is used by the mock data today and by the live API (Step 4) later.
 *
 *   PK = `CATEGORY#<Category>`   SK = `PROTOCOL#<slug>`
 */

export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED";

export type PegTarget = "USD" | "EUR" | "GBP";

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
  /** Optional sub-classification (e.g. "Staked Stablecoin"). */
  subCategory?: StablecoinSubCategory | null;
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
  /** Slug of the parent umbrella Entity (e.g. "ondo-finance"). */
  entitySlug?: string | null;
  totalValueLocked: TotalValueLocked;
  historicalTvlData: HistoricalTvlData;
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Shared demo / dashboard types (Jupiter, JLP, etc.)                         */
/* -------------------------------------------------------------------------- */

export type DataSource = "live" | "demo" | "derived";

export interface Sourced<T> {
  value: T;
  /** "live" = fetched this render; "demo" = illustrative anchor; "derived" = computed. */
  dataSource: DataSource;
  /** Human label shown in tooltips, e.g. "CoinGecko (demo)". */
  sourceLabel?: string;
  updatedAt?: string | null;
}

export interface TokenMarket {
  priceUsd: Sourced<number | null>;
  marketCapUsd: Sourced<number | null>;
  fdvUsd?: Sourced<number | null>;
  volume24hUsd?: Sourced<number | null>;
  circulatingSupply?: Sourced<number | null>;
  totalSupply?: Sourced<number | null>;
  maxSupply?: Sourced<number | null>;
  high52w?: Sourced<number | null>;
  low52w?: Sourced<number | null>;
  change24hPct?: Sourced<number | null>;
  holders?: Sourced<number | null>;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface PriceHistory {
  points: PricePoint[];
  dataSource: DataSource;
  updatedAt: string | null;
}

export interface PoolAsset {
  symbol: string;
  name: string;
  targetWeightPct: number;
  currentWeightPct: number;
  kind: "volatile" | "stable";
  valueUsd: number;
}

export interface PoolComposition {
  assets: PoolAsset[];
  stablePct: number;
  volatilePct: number;
  aumUsd: number;
  aumCapUsd: number | null;
  utilizationPct: number;
  dataSource: DataSource;
  updatedAt: string | null;
}

export interface YieldMechanics {
  currentApyPct: number;
  apy7dPct?: number;
  apy30dPct?: number;
  feeShareToHoldersPct: number;
  yieldSource: string;
  isAutoCompounding: boolean;
  emissionsBased: boolean;
  payoutAsset: string;
  apyHistory?: PricePoint[];
  dataSource: DataSource;
}

export type RiskSeverity = "low" | "medium" | "high";

export interface TypedRisk {
  category: string;
  severity: RiskSeverity;
  description: string;
}

export interface SourceRef {
  label: string;
  url: string;
}

export interface Tokenomics {
  maxSupply: number | null;
  totalBurned?: number;
  buybackPolicy?: string;
  emissionsPolicy?: string;
  distribution?: { bucket: string; pct: number }[];
  notes?: string[];
}

export interface TradeConfig {
  replicationBasket: { symbol: string; weightPct: number; gmxMarket: string }[];
  chain: "arbitrum-sepolia";
  chainId: 421614;
  zeroDevEnabled: boolean;
  gasSponsored: boolean;
  mode: "demo" | "live";
}

export interface AgentSkillSection {
  heading: string;
  body: string;
}

export interface AgentSkillFact {
  key: string;
  value: string;
}

export interface AgentSkillAction {
  name: string;
  description: string;
  signature: string;
  readOnly: boolean;
}

export interface AgentSkill {
  id: string;
  title: string;
  summary: string;
  facts: AgentSkillFact[];
  sections: AgentSkillSection[];
  actions: AgentSkillAction[];
  glossary?: { term: string; definition: string }[];
  sources: SourceRef[];
  version: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Tokens — governance / utility tokens (e.g. CHIP)                           */
/* -------------------------------------------------------------------------- */

export type TokenType = "Governance" | "Utility" | "Yield" | "LST";

/** Finer taxonomy for stablecoins (e.g. staked stablecoin). */
export type StablecoinSubCategory = "Stablecoin" | "Staked Stablecoin";

/** Finer taxonomy for tokens (e.g. governance, yield-bearing, LST). */
export type TokenSubCategory =
  | "Governance Token"
  | "Yield-generating Token"
  | "LST"
  | "Utility Token";

export interface TokenProfile {
  category: "Token";
  slug: string;
  name: string;
  symbol: string;
  status: ApprovalStatus;
  tokenType: TokenType;
  /** Optional sub-classification (e.g. "Governance Token", "LST"). */
  subCategory?: TokenSubCategory | null;
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
  longDescription?: string;
  market?: TokenMarket;
  priceHistory?: PriceHistory;
  poolComposition?: PoolComposition;
  yieldMechanics?: YieldMechanics;
  typedRisks?: TypedRisk[];
  tokenomics?: Tokenomics;
  audits?: { firm: string; date: string; url: string | null }[];
  sources?: SourceRef[];
  tradeable?: TradeConfig;
  agentSkill?: AgentSkill;
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
  marketCapUsd: number | null;
  loanPipelineUsd: number | null;
  partnerships: number | null;
}

/** Which category partition a member coin lives in. */
export type MemberCoinCategory = "Stablecoin" | "Token" | "RWA";

export interface MemberCoinRef {
  slug: string;
  name: string;
  symbol: string;
  category: MemberCoinCategory;
  role: string;
  /** Optional sub-classification mirrored from the product profile. */
  subCategory?: string | null;
}

export type RiskCategory =
  | "Counterparty"
  | "Network"
  | "Oracle"
  | "Reserve / Depeg"
  | "Smart Contract"
  | "Governance"
  | "Collateral"
  | "Regulatory"
  | "Systemic";

export interface EntityRisk {
  category: RiskCategory;
  description: string;
}

export interface EntityEvent {
  date: string;
  title: string;
  description: string;
  link?: string | null;
}

/** Optional display labels for entity headline stat cards. */
export interface ScaleLabels {
  tvl?: string;
  users?: string;
  apr?: string;
  pipeline?: string;
  partnerships?: string;
  coins?: string;
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
  risks: EntityRisk[];
  events: EntityEvent[];
  investmentRounds: InvestmentRound[];
  partnerships: Partnership[];
  currentScale: CurrentScale;
  /** Per-entity labels for the headline stat row (defaults to USD.AI copy when omitted). */
  scaleLabels?: ScaleLabels;
  memberCoins: MemberCoinRef[];
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  createdAt: string;
  updatedAt: string;
  longDescription?: string;
  market?: TokenMarket;
  priceHistory?: PriceHistory;
  tokenomics?: Tokenomics;
  typedRisks?: TypedRisk[];
  audits?: { firm: string; date: string; url: string | null }[];
  sources?: SourceRef[];
  timeline?: { date: string; title: string; description: string }[];
  agentSkill?: AgentSkill;
}
