/**
 * Frontend data contract for CanHav Research.
 *
 * This shape intentionally mirrors the DynamoDB single-table item stored in
 * `backend/data/store.json` / Upstash Redis and read at runtime.
 *
 *   PK = `CATEGORY#<Category>`   SK = `PROTOCOL#<slug>`
 */

export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED";

/**
 * OZ-derived security posture shown on every protocol page. This is the
 * human-facing twin of the on-chain `SecurityRegistry` allowlist that gates
 * ERC-8004 agents (see `agent-service` / `contracts`). Today it is derived from
 * the existing audit metadata; once the registry is deployed it will be backed
 * by on-chain status + Arbiscan source verification.
 */
export type SecurityStatus = "verified" | "audited" | "unverified";

export interface SecurityInfo {
  status: SecurityStatus;
  /** Public audit link, when one is on file. */
  auditUrl: string | null;
  /** Provenance note for the badge tooltip. */
  source: string;
}

export type PegTarget = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "HKD" | "ISK";

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

/** On-chain circulating supply (Alchemy eth_call, or DeFi Llama fallback). */
export interface TotalSupply {
  /** Circulating supply in token units, or null until the live overlay runs. */
  value: number | null;
  source: "alchemy" | "defillama" | "coingecko";
  /** ISO timestamp of the last refresh, or null if never. */
  updatedAt: string | null;
}

/** Macro peg history wrapper (DeFi Llama, CoinGecko, or a curated Dune query). */
export interface HistoricalPegData {
  points: PegDataPoint[];
  source: "dune" | "defillama" | "coingecko";
  updatedAt: string | null;
}

/** Latest circulating supply / TVL on one chain (source: DeFi Llama). */
export interface ChainSupply {
  chain: string;
  /** Circulating supply (peg-target units) or TVL (USD) on that chain. */
  value: number;
}

/** Cross-chain footprint of a stablecoin or RWA protocol (source: DeFi Llama). */
export interface ChainDistribution {
  chains: ChainSupply[];
  /** Unit of `value`: peg-target units (supply) or USD (tvl). */
  unit: "supply" | "usd";
  source: "defillama";
  updatedAt: string | null;
}

/** Issuance metadata for a stablecoin (source: DeFi Llama asset detail). */
export interface IssuanceMeta {
  /** e.g. "fiat-backed" | "crypto-backed" | "algorithmic". */
  pegMechanism: string | null;
  /** How units are minted/redeemed, per the issuer. */
  mintRedeemDescription: string | null;
  auditLinks: string[];
  source: "defillama";
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
  /** Fine-grained economic classification (additive; layered on subCategory). */
  assetSubtype?: AssetSubtype | null;
  /** How the peg is actually held (additive; powers depeg-risk reasoning). */
  pegMechanism?: PegMechanism | null;
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
  /** Cross-chain circulating footprint (DeFi Llama; written by the cron). */
  chainDistribution?: ChainDistribution | null;
  /** Issuance metadata: peg mechanism, mint/redeem, audits (DeFi Llama). */
  issuanceMeta?: IssuanceMeta | null;
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  /** Curated off-chain facts (reg status, rating, attestation) with provenance. */
  offchainFacts?: OffchainFact[];
  /** Live Aave V3 lending rates when this coin is an Aave reserve (e.g. GHO). */
  lendingMarket?: LendingMarket | null;
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

/** Total value locked / AUM (Alchemy supply x price, DeFi Llama, or CG mcap). */
export interface TotalValueLocked {
  /** TVL in USD, or null until the live overlay runs. */
  value: number | null;
  source: "alchemy" | "defillama" | "coingecko";
  /** ISO timestamp of the last refresh, or null if never. */
  updatedAt: string | null;
}

/** Macro TVL history wrapper (DeFi Llama, CoinGecko, or a curated Dune query). */
export interface HistoricalTvlData {
  points: TvlDataPoint[];
  source: "dune" | "defillama" | "coingecko";
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
  /** Fine-grained economic classification (additive; layered on assetClass). */
  assetSubtype?: AssetSubtype | null;
  /** How the underlying value is backed (additive; e.g. rwa-collateral). */
  pegMechanism?: PegMechanism | null;
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
  /** Cross-chain TVL footprint (DeFi Llama; written by the cron). */
  chainDistribution?: ChainDistribution | null;
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  /** Curated off-chain facts (issuer, custody, gating) with provenance. */
  offchainFacts?: OffchainFact[];
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Shared sourced-value types (rich token/entity dashboards)                  */
/* -------------------------------------------------------------------------- */

export type DataSource = "live" | "demo" | "derived";

export interface Sourced<T> {
  value: T;
  /** "live" = fetched this render; "derived" = computed from other live inputs. */
  dataSource: DataSource;
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

/**
 * Live lending-market rates for a reserve, read on-chain via Alchemy from Aave
 * V3 (`AaveProtocolDataProvider.getReserveData`). Supply/borrow APY are the
 * ray rates converted to compounded-per-second percentages; `utilizationPct` is
 * borrowed / supplied. Populated by the cron refresh; `null`s when unavailable.
 */
export interface LendingMarket {
  supplyApyPct: number | null;
  variableBorrowApyPct: number | null;
  utilizationPct: number | null;
  /** Underlying reserve symbol the rates are for (e.g. "GHO", "USDC"). */
  underlyingSymbol?: string | null;
  source: "aave";
  updatedAt: string | null;
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

/* -------------------------------------------------------------------------- */
/* Fine-grained economic classification (additive, layered on TokenType)      */
/* -------------------------------------------------------------------------- */

/**
 * Fine-grained economic classification, layered ON TOP of the coarse
 * `TokenType` / `StablecoinSubCategory`. Optional everywhere: old records (no
 * `assetSubtype`) keep working and the UI falls back to the coarse taxonomy.
 * This is what lets the agent reason about *what a token actually is* — a flat
 * fiat stablecoin vs a synthetic dollar vs an RWA claim.
 */
export type AssetSubtype =
  // --- dollar-like ---
  | "fiat-stablecoin" // TUSD, USDpm, SD, GHO, USDS — flat 1:1, reserve-backed
  | "synthetic-dollar" // USDe (Ethena), USDai — peg via hedge / overcollateral
  | "e-money" // EURe, GBPe, Monerium USDe, ISKe — regulated EMI, legal e-money
  | "yield-bearing-stable" // sUSDe, sUSDS, USDY, rUSDY, stkGHO — accrues yield, ~$1 ref
  | "rwa-backed-stable" // USDtb — backed by tokenized treasuries (BUIDL)
  // --- governance / risk ---
  | "governance" // AAVE, ENA, JUP, ONDO, SKY, CHIP
  | "staked-governance" // stkAAVE, sENA — governance staked as backstop
  | "insurance-firstloss" // sCHIP, stkABPT — slashed first on default
  // --- receipts / derivatives ---
  | "lp-receipt" // JLP, aTokens (aUSDC/aUSDT/aWETH) — claim on a pool
  | "lst" // JupSOL — liquid staking token
  | "institutional-gated" // iUSDe, OUSG — KYC / accredited-only wrapper
  // --- real-world ---
  | "tokenized-commodity" // PGOLD, (Stably Gold) — 1 unit = 1 physical unit
  | "tokenized-equity" // Ondo GM (TSLA/SPY/QQQ/NVDA)
  | "tokenized-treasury" // OUSG, USDY underlying
  // --- lifecycle ---
  | "legacy" // DAI, MKR, USDSC — superseded but still live
  | "conceptual"; // announced, not shipped

/** How a "stable" thing actually stays stable — the agent's depeg-risk lens. */
export type PegMechanism =
  | "fiat-reserve" // TUSD, USDpm, SD, EURe — 1:1 cash/T-bill in escrow/EMI
  | "overcollateralized" // GHO, USDS, DAI — minted against crypto collateral
  | "delta-neutral-hedge" // USDe (Ethena) — long spot + short perp
  | "rwa-collateral" // USDtb, USDai — tokenized treasuries / PYUSD reserve
  | "algorithmic-rebase" // rUSDY — balance rebases daily
  | "none"; // governance / commodity / equity tokens

/* -------------------------------------------------------------------------- */
/* Off-chain facts with explicit freshness provenance                         */
/* -------------------------------------------------------------------------- */

/**
 * Freshness class for an off-chain fact, so the agent/UI never present a stale
 * static fact as if it were live.
 */
export type Freshness =
  | "live" // re-fetched every render / on a short cron (price, supply, APY snapshot)
  | "semi-live" // refreshed on a daily/weekly cron (proposals, attestation date, AUM)
  | "static"; // captured once, manually curated (reg status, audit firm, founding date)

/**
 * A single curated off-chain fact (regulatory status, rating, audit firm, ICO
 * terms, etc.) carrying its own provenance + freshness so it is self-describing.
 */
export interface OffchainFact {
  key: string;
  value: string;
  freshness: Freshness;
  source: SourceRef;
  /** ISO date — when WE recorded it. */
  capturedAt: string;
  /** Marks forward-looking / design-stage facts (playbook §5.2). */
  theoretical?: boolean;
}

export interface Tokenomics {
  maxSupply: number | null;
  totalBurned?: number;
  buybackPolicy?: string;
  emissionsPolicy?: string;
  distribution?: { bucket: string; pct: number }[];
  notes?: string[];
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

/** Where a skill came from: auto-derived from an entity, or written by a user. */
export type SkillOrigin = "entity-derived" | "user-authored";

/** Whether a user skill is visible to other users' agents in discovery. */
export type SkillVisibility = "private" | "discoverable";

/**
 * A user-authored skill — the same machine-readable knowledge bundle as
 * {@link AgentSkill}, plus authorship + visibility. Attaching one to an agent is
 * "training". Private skills are bundled into the agent's discoverable offer
 * when the agent owner opts into collaboration.
 */
export interface UserSkill extends AgentSkill {
  /** Privy user id (DID) of the author. */
  authorUserId: string;
  origin: SkillOrigin;
  visibility: SkillVisibility;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Agent-to-agent collaboration (x402) — the ONLY objects agents exchange.    */
/* No free-form agent chat: a buyer sends a typed StrategyRequest and receives */
/* a typed StrategyPacket. Both are research-only knowledge transfers.         */
/* -------------------------------------------------------------------------- */

/** A buyer agent's typed request for a discoverable seller agent's bundled offer. */
export interface StrategyRequest {
  /** The seller agent id being requested. */
  toAgentId: string;
  /** The buyer's agent id (for on-chain attestation). */
  fromAgentId: string;
  /** A bounded, typed objective — what the buyer wants to learn (not a chat). */
  objective: string;
  /** Optional structured constraints. */
  constraints?: {
    /** Soft cap on the size of the returned packet. */
    maxAnswerTokens?: number;
  };
}

/**
 * Optional objective-aware addendum to a StrategyPacket: a bounded brief the
 * SELLER agent generates from its own unique training (framework config,
 * knowledge base, memory) for the buyer's stated objective. Clearly labeled,
 * carries its own provenance, and is EXCLUDED from the `skillHash` integrity
 * check (which covers only the deterministic base packet).
 */
export interface TailoredBrief {
  /** The buyer's objective this brief answers. */
  objective: string;
  /** Bounded markdown brief (research-only, no advice). */
  brief: string;
  /** What the seller agent drew on (knowledge docs, memory). */
  basedOn: SourceRef[];
  generatedAt: string;
}

/** A seller agent's typed deliverable, derived from its UserSkill. */
export interface StrategyPacket {
  skillId: string;
  /** The seller agent id that produced it. */
  producedByAgentId: string;
  title: string;
  summary: string;
  /** Ordered, actionable research steps distilled from the skill. */
  steps: string[];
  facts: AgentSkillFact[];
  sources: SourceRef[];
  /** keccak256 of the skill Markdown — MUST match the advertised `skillHash:<id>`. */
  skillHash: `0x${string}`;
  /** The settling USDC transfer tx hash (x402 payment reference). */
  paymentRef: string;
  issuedAt: string;
  /** Objective-aware seller addendum (null when no LLM key / no objective). */
  tailoredBrief?: TailoredBrief | null;
  /**
   * Drip-disclosure descriptor when the packet is one installment of an
   * agreement: the seller reveals only a bounded slice per interaction so the
   * buyer accumulates the knowledge over installments rather than draining it
   * all at once (anti-extraction).
   */
  drip?: StrategyPacketDrip | null;
}

export interface StrategyPacketDrip {
  /** 0-based index of this installment. */
  installmentIndex: number;
  /** Total installments agreed. */
  totalInstallments: number;
  /** Units (data slices) disclosed in this installment. */
  units: number;
  /** Whether more installments remain after this one. */
  hasMore: boolean;
  /** Human-readable slice descriptor, e.g. "facts 4–6 of 9". */
  label: string;
}

/* -------------------------------------------------------------------------- */
/* Data frames — user-pinned compositions of EXISTING read-only metrics       */
/* (no new data sources; every kind maps 1:1 to a fetcher we already run).    */
/* -------------------------------------------------------------------------- */

/** One metric inside a data frame. Each kind resolves via an existing fetcher. */
export type DataFrameMetric =
  /** Stablecoin peg series (lib/server/series.ts → dune/coingecko). */
  | { kind: "peg"; slug: string }
  /** RWA TVL series (lib/server/series.ts → dune/coingecko). */
  | { kind: "tvl"; slug: string }
  /** Token USD price series (lib/server/series.ts → coingecko). */
  | { kind: "price"; slug: string }
  /** Live on-chain total supply (lib/server/alchemy.ts). */
  | { kind: "supply"; address: string; decimals?: number | null; label?: string }
  /** Live Aave V3 reserve rates (lib/server/aave.ts): gho, ausdc, ausdt, aweth. */
  | { kind: "aaveRates"; slug: string };

export type DataFrameWindow = "7d" | "30d" | "90d";

/**
 * A user-pinned "focus dataset" their agent should always be able to pull for
 * its entity — e.g. "JLP liquidity health" = price + supply over 30d. Stored
 * per agent; resolved on demand by the `frame_load` tool.
 */
export interface DataFrame {
  id: string;
  agentId: string;
  title: string;
  metrics: DataFrameMetric[];
  window: DataFrameWindow;
  notes?: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Custom tools — owner-configured, READ-ONLY data feeds from a typed catalog */
/* (users never write code; each kind wraps an existing gated fetcher).       */
/* -------------------------------------------------------------------------- */

export type CustomToolTemplate =
  /** Latest results of a saved Dune query the owner curates. */
  | { kind: "duneQuery"; queryId: number; title: string; description: string }
  /** Live CoinGecko market snapshot for a coin id (price/mcap/volume). */
  | { kind: "coingeckoMarket"; coinId: string; title: string; description: string }
  /** Live on-chain total supply + metadata for a token contract (Alchemy). */
  | {
      kind: "alchemyTokenSupply";
      address: string;
      decimals?: number | null;
      title: string;
      description: string;
    }
  /** A JSON endpoint on an ALLOWLISTED host (HTTPS, size-capped, server-side). */
  | { kind: "httpJson"; url: string; jsonPath?: string; title: string; description: string };

/**
 * An owner-configured read-only tool attached to one agent. The `description`
 * is what the LLM sees when deciding to call it, so it should say what the
 * data is and when to use it.
 */
export interface CustomTool {
  id: string;
  agentId: string;
  ownerUserId: string;
  template: CustomToolTemplate;
  enabled: boolean;
  createdAt: string;
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
  /** Fine-grained economic classification (additive; layered on subCategory). */
  assetSubtype?: AssetSubtype | null;
  /** Peg/backing mechanism where relevant (additive; "none" for pure gov tokens). */
  pegMechanism?: PegMechanism | null;
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
  /** Live Aave V3 lending rates when this token is an Aave reserve (e.g. aUSDC). */
  lendingMarket?: LendingMarket | null;
  typedRisks?: TypedRisk[];
  tokenomics?: Tokenomics;
  audits?: { firm: string; date: string; url: string | null }[];
  sources?: SourceRef[];
  /** Curated off-chain facts (reg status, rating, ICO terms) with provenance. */
  offchainFacts?: OffchainFact[];
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

/**
 * Confidence/lifecycle status for a timeline milestone (playbook §5). Lets the
 * UI render executed/stated milestones solid (with a source) and theoretical /
 * CanHav-inferred items muted, and lets the agent qualify them aloud.
 */
export type TimelineStatus = "executed" | "stated" | "theoretical" | "canhav-inferred";

export interface TimelineEntry {
  date: string;
  title: string;
  description: string;
  /** Primary source for stated/executed milestones. */
  link?: string | null;
  /** Defaults to "stated" when omitted; theoretical/inferred render muted. */
  status?: TimelineStatus;
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
  /** Curated off-chain facts (reg status, ratings, org structure) with provenance. */
  offchainFacts?: OffchainFact[];
  /** Sourced milestone timeline; supersedes `events` when present (playbook §5). */
  timeline?: TimelineEntry[];
  agentSkill?: AgentSkill;
}
