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

export type PegTarget = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "HKD" | "ISK" | "JPY";

/** Top-level taxonomy categories. */
export type CategorySlug =
  | "networks"
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

/**
 * Protocol fees & revenue (source: DeFi Llama `summary/fees/{protocol}`).
 *
 * "Fees" is what users pay; "revenue" is the slice the protocol/token holders
 * keep; "holdersRevenue" is the share that flows to token holders specifically.
 * 30d figures are derived by summing the last 30 daily chart points when Llama
 * doesn't expose a `total30d`. `methodology` is Llama's plain-language note on
 * what is counted, used for the fee/revenue/earnings benchmark.
 */
export interface ProtocolFeesRevenue {
  fees24hUsd: number | null;
  fees7dUsd: number | null;
  fees30dUsd: number | null;
  feesAllTimeUsd?: number | null;
  revenue24hUsd: number | null;
  revenue7dUsd: number | null;
  revenue30dUsd: number | null;
  holdersRevenue24hUsd?: number | null;
  /** 24h % change in fees (Llama `change_1d`). */
  feesChange1dPct?: number | null;
  /** Llama's methodology note (what's counted as fees vs revenue). */
  methodology?: string | null;
  methodologyUrl?: string | null;
  /** Llama protocol category (e.g. "Dexes", "Lending", "Liquid Staking"). */
  llamaCategory?: string | null;
  source: "defillama";
  updatedAt: string | null;
}

/** DEX trading volume (source: DeFi Llama `summary/dexs/{protocol}`). */
export interface DexVolume {
  volume24hUsd: number | null;
  volume7dUsd: number | null;
  volume30dUsd: number | null;
  volumeAllTimeUsd?: number | null;
  /** 24h % change in volume (Llama `change_1d`). */
  change1dPct?: number | null;
  source: "defillama";
  updatedAt: string | null;
}

/**
 * Options dex volume (source: DeFi Llama `summary/options/{protocol}`).
 *
 * Scaffolding only — populated once the `options` category has live profiles.
 * Notional is the value of the underlying; premium is what buyers actually pay.
 */
export interface OptionsVolume {
  notionalVolume24hUsd: number | null;
  notionalVolume30dUsd: number | null;
  premiumVolume24hUsd: number | null;
  premiumVolume30dUsd: number | null;
  source: "defillama";
  updatedAt: string | null;
}

/**
 * Perp open interest (source: DeFi Llama `overview/open-interest`).
 *
 * Scaffolding only — populated once the `perpetuals` category has live profiles.
 */
export interface OpenInterest {
  openInterestUsd: number | null;
  longOpenInterestUsd?: number | null;
  shortOpenInterestUsd?: number | null;
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

/** Per-chain token deployment (same symbol, different address). */
export interface TokenDeployment {
  chain: string;
  address: string;
  label?: string;
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
  /** Additional chain deployments when the stablecoin exists on multiple networks. */
  deployments?: TokenDeployment[];
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
  /** Cron-written CoinGecko market block (receipt tokens, gov-adjacent stables). */
  market?: TokenMarket;
  /** Cron-written yield overlay (Llama pools for sUSDe, scrvUSD, etc.). */
  yieldMechanics?: YieldMechanics;
  /** Protocol fees/revenue when this coin maps to a Llama protocol (DeFi Llama). */
  protocolFeesRevenue?: ProtocolFeesRevenue | null;
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
  /** Cron-written CoinGecko market block when listed. */
  market?: TokenMarket;
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  /** Curated off-chain facts (issuer, custody, gating) with provenance. */
  offchainFacts?: OffchainFact[];
  /** Protocol fees/revenue when this protocol maps to a Llama protocol (DeFi Llama). */
  protocolFeesRevenue?: ProtocolFeesRevenue | null;
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
  /** Additional chain deployments when the token exists on multiple networks. */
  deployments?: TokenDeployment[];
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
  /** Protocol fees/revenue when this token maps to a Llama protocol (DeFi Llama). */
  protocolFeesRevenue?: ProtocolFeesRevenue | null;
  /** DEX trading volume when this token is a DEX governance token (DeFi Llama). */
  dexVolume?: DexVolume | null;
  typedRisks?: TypedRisk[];
  tokenomics?: Tokenomics;
  audits?: { firm: string; date: string; url: string | null }[];
  sources?: SourceRef[];
  /** Curated off-chain facts (reg status, rating, ICO terms) with provenance. */
  offchainFacts?: OffchainFact[];
  agentSkill?: AgentSkill;
}

/* -------------------------------------------------------------------------- */
/* Networks — top-tier umbrella protocols that group several coins            */
/* -------------------------------------------------------------------------- */

export interface NetworkComponent {
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

export interface NetworkRisk {
  category: RiskCategory;
  description: string;
}

export interface NetworkEvent {
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

/* -------------------------------------------------------------------------- */
/* Network taxonomy hierarchy                                                 */
/* Network → subCategory (what kind of thing) → sector (what it does) →       */
/* subSector (functional leaf). This is the protocol-level taxonomy, distinct */
/* from the coin-level subtypes (StablecoinSubCategory / TokenSubCategory).   */
/* -------------------------------------------------------------------------- */

/** The "Subcategory" level — what kind of network this is. */
export type NetworkSubCategory = "Protocol" | "Chain" | "Rollup" | "Appchain";

/**
 * The functional "Sub-sub-category" — what the network does. Seeded with
 * "Credit"; the rest mirror the coming-soon `CategorySlug` partitions so the
 * taxonomy expands as those sectors go live.
 */
export type NetworkSector =
  | "Credit"
  | "Perpetuals"
  | "Yield"
  | "DEX"
  | "Options"
  | "Stablecoin"
  | "RWA"
  | "Staking"
  | "Liquidity";

/** Credit-sector tags (replaces the legacy 5-value lending taxonomy). */
export type CreditTag =
  | "Lending" // Aave V3, Compound V2/V3, Morpho, Radiant, Spark
  | "Leveraged Yield" // Gearbox, Stella, Extra Finance
  | "Fixed Income"; // Pendle, Notional, Spectra, Sense

/**
 * Stablecoin sub-sectors. The leaf of the taxonomy for `sector === "Stablecoin"`
 * entities. Mirrors the lending pattern.
 */
export type StablecoinSubSector =
  | "Fiat-Backed Regulated"
  | "E-Money Regulated"
  | "Decentralized CDP"
  | "Synthetic Yield-Bearing"
  | "RWA-Backed Stable"
  | "Cross-Chain / Omnichain";

/**
 * Secondary tag — a stablecoin issuer can simultaneously belong to one primary
 * sub-sector and 0–2 secondary tags.
 */
export type StablecoinSecondaryTag =
  | "Yield-Bearing"
  | "Institutional-Gated"
  | "Multi-Currency"
  | "Multi-Chain"
  | "Hybrid-Chain"
  | "Compliance-Heavy"
  | "DAO-Governed"
  | "Exchange-Native"
  | "RWA-Backed"
  | "Wound-Down"
  | "Recently-Exploited";

/**
 * DEX sub-sectors. The leaf of the taxonomy for `sector === "DEX"` entities,
 * mirroring the CreditTag / StablecoinSubSector pattern.
 */
export type DexSubSector =
  | "AMM" // Uniswap V2-style x*y=k, Balancer weighted, SushiSwap classic
  | "Concentrated Liquidity" // Uniswap V3/V4, PancakeSwap Infinity, Trader Joe Liquidity Book
  | "Stableswap" // Curve, Saddle, Wombat
  | "Aggregator" // Jupiter, 1inch, ParaSwap, CowSwap
  | "Orderbook" // Hyperliquid, dYdX, Phoenix
  | "Hybrid AMM + Orderbook" // Raydium, Drift
  | "Perpetuals" // GMX, Gains Network, Aevo, Pacifica
  | "ve(3,3)" // Aerodrome, Velodrome, Equalizer
  | "Cross-Chain Native"; // THORChain, Maya, Chainflip

/** Secondary cross-cutting tags for a DEX entity (0+ apply). */
export type DexSecondaryTag =
  | "Spot"
  | "Perps"
  | "Derivatives"
  | "Multi-Chain"
  | "Non-EVM"
  | "Solana-Native"
  | "L2-Native"
  | "Appchain"
  | "MEV-Resistant"
  | "veTokenomics"
  | "Hooks"
  | "CLMM"
  | "Routing-Layer"
  | "Wound-Down"
  | "Recently-Exploited";

/**
 * RWA sub-sectors. Entity-level taxonomy, complementary to the coin-level
 * `RwaAssetClass`. An RWA *entity* groups one or many products, each of which
 * carries its own AssetClass.
 */
export type RwaSubSector =
  | "Tokenized Treasuries" // Ondo OUSG, Franklin BENJI, Mountain USDM, Hashnote USYC
  | "Tokenized Equities" // Dinari dSHARE, Ondo GM (TSLA/SPY/QQQ/NVDA)
  | "Tokenized Commodities" // Pleasing Market PGOLD, Kinesis KAU/KAG, Paxos PAXG
  | "Real Estate" // RealT, Lofty, Estate Protocol
  | "Private Credit" // Centrifuge, Goldfinch, Clearpool, Florence
  | "Carbon / ESG" // Toucan BCT/NCT, KlimaDAO
  | "Tokenization Infrastructure" // Securitize, Backed Finance, Tokeny, Polymath
  | "Structured Products" // Chateau Capital, dualMint
  | "Event Finance" // Atmosphera (weather/climate-linked notes)
  | "Stablecoins & FX"; // Aryze, currency-only RWA shops

/**
 * RWA attribute tags — deliberately narrowed to 5 to avoid overwhelming users.
 * Collapses the legacy 11-tag set (Compliance-Heavy + Permissioned ->
 * Institutional-Gated; Hybrid-Chain -> Multi-Chain; Multi-Currency / Non-EVM /
 * Wound-Down dropped and represented structurally elsewhere). Mirrors the
 * backend `RWA_SECONDARY_TAGS` enum in `backend/app/db/schema.py`.
 */
export type RwaSecondaryTag =
  | "Institutional-Gated" // absorbs Compliance-Heavy + Permissioned: KYC/AML or accredited-only access
  | "Yield-Bearing" // passes TradFi yield (T-Bill interest, rent) to the holder's wallet
  | "Real-World-Custody" // underlying held in an off-chain legal entity (Delaware LLC / SPV / vault)
  | "DAO-Governed" // token holders vote on risk params, pool deployment, treasury
  | "Multi-Chain"; // absorbs Hybrid-Chain: natively bridges across EVM (and EVM<->non-EVM) networks

/** Staking primary sub-sector — the three staking tags. */
export type StakingSubSector =
  | "Liquid Staking" // Lido, Rocket Pool, cbETH, wBETH, mETH, sfrxETH, swETH, ETHx, osETH, ankrETH
  | "Restaking" // EigenLayer, Symbiotic, Karak
  | "Liquid Restaking"; // ether.fi, Renzo, Kelp, Puffer, Bedrock, YieldNest

/** Staking cross-cutting secondary tags (0+, multi-select). */
export type StakingSecondaryTag =
  | "Exchange-Native" // Binance wBETH, Coinbase cbETH
  | "Non-Custodial"
  | "Permissionless-Operators" // Rocket Pool
  | "Native-Restaking" // Puffer anti-slashing
  | "Multi-Asset" // Karak, Symbiotic
  | "Multi-Chain" // Ankr
  | "LST-Backed-Basket" // Kelp rsETH, Bedrock, YieldNest
  | "EigenLayer-Strategy-Manager" // Renzo
  | "CDP-Integrated" // Frax sfrxETH
  | "L2-Ecosystem"; // Mantle mETH

/** Liquidity primary sub-sector — the two Liquidity tags. */
export type LiquiditySubSector =
  | "Pools" // LPing / stable pools: deposit asset pairs to enable swaps & earn fees (Curve, Uniswap V3)
  | "Vaults"; // yield farming / auto-compounding vaults over LP strategies (Yearn, Convex, Beefy)

/** Liquidity cross-cutting secondary tags (0+, multi-select). */
export type LiquiditySecondaryTag =
  | "Stable-Pools" // pools of like-priced assets (Curve 3pool)
  | "Concentrated-Liquidity" // Uniswap V3 / Maverick style
  | "Auto-Compounding" // vaults that harvest + reinvest
  | "LP-Strategy-Manager" // manages/optimizes LP positions (Gamma, Arrakis)
  | "Multi-Chain"
  | "ve-Tokenomics"; // vote-escrow boosted (Curve, Convex, Aura)

/** Fiat-Backed Regulated sub-sector metrics (Circle, Paxos, First Digital). */
export interface StablecoinFiatBackedMetrics {
  kind: "fiat-backed";
  reserveCustodian?: string | null;
  reserveBreakdown?: { asset: string; pct: number }[];
  attestationCadence?: "daily" | "weekly" | "monthly" | "quarterly" | null;
  attestor?: string | null;
  realtimeReserveOracle?: string | null;
}

/** Decentralized CDP sub-sector metrics (Sky, Liquity, Curve, Lista). */
export interface StablecoinDecentralizedCDPMetrics {
  kind: "decentralized-cdp";
  collateralAssets?: string[];
  minCollateralRatioPct?: Sourced<number | null>;
  stabilityFeePct?: Sourced<number | null>;
  savingsRatePct?: Sourced<number | null>;
  liquidationMechanism?: string | null;
  governanceToken?: string | null;
}

/** Synthetic Yield-Bearing sub-sector metrics (Ethena, Resolv, Falcon, Frax). */
export interface StablecoinSyntheticMetrics {
  kind: "synthetic";
  hedgeVenues?: string[];
  fundingRateExposure?: string | null;
  insuranceFundUsd?: Sourced<number | null>;
  yieldSources?: string[];
}

/** RWA-Backed sub-sector metrics (Ondo, USD.AI, Anzen, Mountain). */
export interface StablecoinRwaBackedMetrics {
  kind: "rwa-backed";
  underlyingAssets?: string[];
  custodian?: string | null;
  yieldDistribution?: "rebase" | "exchange-rate" | "off-chain" | null;
  nav?: Sourced<number | null>;
}

/** E-Money Regulated sub-sector metrics (Monerium, GMO Trust). */
export interface StablecoinEMoneyMetrics {
  kind: "e-money";
  emiLicense?: string | null;
  fiatRails?: string[];
  ibanSupport?: boolean;
  redemptionCadence?: string | null;
}

/** Discriminated union of sub-sector-specific stablecoin metric blocks. */
export type StablecoinSubSectorMetrics =
  | StablecoinFiatBackedMetrics
  | StablecoinDecentralizedCDPMetrics
  | StablecoinSyntheticMetrics
  | StablecoinRwaBackedMetrics
  | StablecoinEMoneyMetrics;

/* -------------------------------------------------------------------------- */
/* DEX sector — sub-sector-specific metric blocks (spec §1/§7)                */
/* -------------------------------------------------------------------------- */

/** AMM / CLMM metrics (Uniswap, Curve, Balancer, PancakeSwap, Aerodrome). */
export interface DexAmmMetrics {
  kind: "amm";
  pools?: Sourced<number | null>;
  topPools?: { name: string; tvlUsd?: number; volume24h?: number }[];
  feeTierStructure?: string | null;
}

/** Orderbook metrics (Hyperliquid spot/CLOB, dYdX). */
export interface DexOrderbookMetrics {
  kind: "orderbook";
  markets?: Sourced<number | null>;
  makerRebatePct?: Sourced<number | null>;
  takerFeePct?: Sourced<number | null>;
  openInterestUsd?: Sourced<number | null>;
}

/** Perpetuals metrics (GMX, Gains, Drift). */
export interface DexPerpsMetrics {
  kind: "perps";
  markets?: Sourced<number | null>;
  openInterestUsd?: Sourced<number | null>;
  fundingRateModel?: string | null;
  maxLeverage?: Sourced<number | null>;
  liquidationsVolume30dUsd?: Sourced<number | null>;
}

/** Aggregator metrics (Jupiter, 1inch). */
export interface DexAggregatorMetrics {
  kind: "aggregator";
  integratedDexes?: Sourced<number | null>;
  routingAlgo?: string | null;
  topRoutedVenues?: { venue: string; sharePct?: number }[];
}

/** Cross-chain native swap metrics (THORChain, Maya). */
export interface DexCrossChainMetrics {
  kind: "cross-chain";
  integratedChains?: Sourced<number | null>;
  nativeAssetsSupported?: string[];
  bridgeArchitecture?: string | null;
}

/** Discriminated union of sub-sector-specific DEX metric blocks. */
export type DexSubSectorMetrics =
  | DexAmmMetrics
  | DexOrderbookMetrics
  | DexPerpsMetrics
  | DexAggregatorMetrics
  | DexCrossChainMetrics;

/* -------------------------------------------------------------------------- */
/* RWA sector — sub-sector-specific metric blocks (spec §1/§7)                */
/* -------------------------------------------------------------------------- */

/** Tokenized Treasuries metrics (Ondo, Franklin, Mountain, Securitize BUIDL). */
export interface RwaTreasuryMetrics {
  kind: "treasuries";
  underlyingAssets?: string[];
  duration?: string | null;
  yieldDistribution?: "rebase" | "exchange-rate" | "off-chain" | null;
  fundStructure?: string | null;
  navUsd?: Sourced<number | null>;
  custodian?: string | null;
}

/** Private Credit metrics (Centrifuge, Goldfinch, Clearpool). */
export interface RwaPrivateCreditMetrics {
  kind: "private-credit";
  activeBorrowers?: Sourced<number | null>;
  cumulativeOriginationsUsd?: Sourced<number | null>;
  defaultRatePct?: Sourced<number | null>;
  averageMaturityDays?: Sourced<number | null>;
  trancheStructure?: string | null;
}

/** Real Estate metrics (RealT, Lofty, Estate Protocol). */
export interface RwaRealEstateMetrics {
  kind: "real-estate";
  propertiesCount?: Sourced<number | null>;
  averagePropertyValueUsd?: Sourced<number | null>;
  rentalYieldRangePct?: string | null;
  geographicScope?: string | null;
  custodyStructure?: string | null;
}

/** Tokenized Commodities metrics (Pleasing Market, Kinesis, Paxos). */
export interface RwaCommoditiesMetrics {
  kind: "commodities";
  underlyingCommodity?: string | null;
  custodyVault?: string | null;
  redemptionMinimum?: string | null;
  oracleProvider?: string | null;
}

/** Carbon / ESG metrics (Toucan, KlimaDAO). */
export interface RwaCarbonMetrics {
  kind: "carbon";
  creditsTokenizedTonnes?: Sourced<number | null>;
  registryPartners?: string[];
  vintageRangeYears?: string | null;
}

/** Tokenization Infrastructure metrics (Securitize, Backed, Tokeny). */
export interface RwaTokenizationInfraMetrics {
  kind: "tokenization-infra";
  fundsHosted?: Sourced<number | null>;
  totalAumUsd?: Sourced<number | null>;
  registeredJurisdictions?: string[];
  topClients?: string[];
}

/** Discriminated union of sub-sector-specific RWA metric blocks. */
export type RwaSubSectorMetrics =
  | RwaTreasuryMetrics
  | RwaPrivateCreditMetrics
  | RwaRealEstateMetrics
  | RwaCommoditiesMetrics
  | RwaCarbonMetrics
  | RwaTokenizationInfraMetrics;

/**
 * DEX-entity metrics block (sector === "DEX"). Mirrors the `StablecoinMetrics`
 * pattern: live fields (TVL/volume) are filled by the DeFi Llama cron in
 * Phase 2; curated fields (deployment, audit, sub-sector panel) are static
 * research. Everything optional so partial data renders honestly.
 */
export interface DexMetrics {
  /** Total value locked (USD) — live from DeFi Llama or curated. */
  tvlUsd?: Sourced<number | null>;
  /** Trailing 30-day trading volume (USD). */
  volume30dUsd?: Sourced<number | null>;
  /** Governance / primary token symbol. */
  governanceToken?: string | null;
  /** Audit / security history (curated). */
  auditHistory?: string | null;
  /** Chain / ecosystem deployment. */
  deployment?: ChainDeployment | null;
  /** Sub-sector-specific specialized metric panel. */
  subSectorMetrics?: DexSubSectorMetrics | null;
}

/**
 * RWA-entity metrics block (sector === "RWA"). Mirrors `StablecoinMetrics`.
 * `aumUsd` is filled live where a Llama/rwa.xyz mapping exists (Phase 2); the
 * curated string/array fields are static research. Everything optional.
 */
export interface RwaMetrics {
  /** Assets under management / TVL (USD) — live or curated. */
  aumUsd?: Sourced<number | null>;
  /** Regulatory status summary (curated). */
  regulatoryStatus?: string | null;
  /** Audit / attestation history (curated). */
  auditHistory?: string | null;
  /** Chain / ecosystem deployment. */
  deployment?: ChainDeployment | null;
  /** Sub-sector-specific specialized metric panel. */
  subSectorMetrics?: RwaSubSectorMetrics | null;
}

/* -------------------------------------------------------------------------- */
/* Staking sector — metric block + supporting types (additive)                */
/* -------------------------------------------------------------------------- */

/** Restaking AVS / operator exposure (Tier 2 — curated until indexed). */
export interface AvsExposure {
  name: string;
  delegatedStakeUsd: number | null;
  operatorCount: number | null;
}

/** Slashing / penalty event (Tier 2 — curated until beacon-chain indexed). */
export interface SlashingEvent {
  date: string; // ISO
  description: string;
  amountEth: number | null;
  link?: string | null;
}

/**
 * Staking-entity metrics block (sector === "Staking"). Mirrors the
 * `LendingMetrics` / `StablecoinMetrics` pattern: Tier-1 fields are filled live
 * by the DeFiLlama + CoinGecko cron; Tier-2 fields are schema-reserved and stay
 * curated/null until indexers are wired. Everything optional so partial data
 * renders honestly.
 */
export interface StakingMetrics {
  /* --- Tier 1: LIVE (DefiLlama + CoinGecko, reuse existing clients) --- */
  /** Total staked / TVL (USD) — DefiLlama /protocol/{slug}. */
  totalStakedUsd?: Sourced<number | null>;
  /** TVL change (%) 1d / 7d — derived from the daily TVL series. */
  tvlChangePct?: { d1: number | null; d7: number | null } | null;
  /** LST/LRT token spot price (USD) — CoinGecko current_price.usd. */
  tokenPriceUsd?: Sourced<number | null>;
  /** Token market cap (USD) — CoinGecko market_cap.usd. */
  marketCapUsd?: Sourced<number | null>;
  /** Exchange rate of the LST/LRT vs its base asset (e.g. stETH:ETH) — derived. */
  baseAssetExchangeRate?: Sourced<number | null>;
  /** Peg deviation from base asset (%) — derived (depeg track). */
  pegDeviationPct?: Sourced<number | null>;
  /** Staking APR / APY (%) — protocol API or Dune (curate-now, automate-soon). */
  stakingAprPct?: Sourced<number | null>;
  /** Market share within sub-sector (%) — derived across the tag set. */
  marketSharePct?: number | null;
  /** Protocol fees / revenue — DefiLlama /summary/fees/{slug}. */
  feesRevenue?: ProtocolFeesRevenue | null;
  /** Underlying staked asset (ETH, SOL, MNT, …). */
  underlyingAsset?: string | null;
  /** LST/LRT token contract addresses per chain — CoinGecko platforms. */
  tokenContracts?: { chain: string; address: string }[];

  /* --- Tier 2: SCHEMA RESERVED (curated / theoretical until indexed) --- */
  /** Active validator count. */
  validatorCount?: Sourced<number | null>;
  /** Node operator count. */
  nodeOperatorCount?: Sourced<number | null>;
  /** Operator model description (permissioned / permissionless / DVT). */
  operatorModel?: string | null;
  /** Slashing / penalty history. */
  slashingEvents?: SlashingEvent[] | null;
  /** Restaking AVS exposure (Restaking / Liquid Restaking only). */
  avsData?: AvsExposure[] | null;
  /** Withdrawal / unstaking queue summary. */
  withdrawalQueue?: string | null;
  /** Underlying LST composition for basket LRTs (e.g. rsETH). */
  collateralBasket?: { asset: string; pct: number }[] | null;
  /** Structured governance metrics (reuse existing type). */
  governanceDetail?: GovernanceActivityDetail | null;
  /** Audit / exploit history (curated). */
  auditHistory?: string | null;
  /** Chain / ecosystem deployment (reuse existing type). */
  deployment?: ChainDeployment | null;
}

/**
 * Liquidity-entity metrics block (sector === "Liquidity"). Mirrors the
 * `StakingMetrics` pattern: Tier-1 fields are filled live by the DeFiLlama +
 * CoinGecko cron; Tier-2 fields are schema-reserved and stay curated/null until
 * indexers are wired. Everything optional so partial data renders honestly.
 */
export interface LiquidityMetrics {
  /* --- Tier 1: LIVE (DeFi Llama + CoinGecko, reuse existing clients) --- */
  /** Protocol TVL (USD) — DeFi Llama /protocol/{slug}. */
  tvlUsd?: Sourced<number | null>;
  /** TVL change over 1d / 7d (%). */
  tvlChangePct?: { d1: number | null; d7: number | null } | null;
  /** 24h swap volume (USD) — DeFi Llama /summary/dexs/{slug} (Pools). */
  volume24hUsd?: Sourced<number | null>;
  /** Protocol fees / revenue — DeFi Llama /summary/fees/{slug}. */
  feesRevenue?: ProtocolFeesRevenue | null;
  /** Governance token price (USD) — CoinGecko. */
  tokenPriceUsd?: Sourced<number | null>;
  /** Governance token market cap (USD) — CoinGecko. */
  marketCapUsd?: Sourced<number | null>;
  /** Market share within sub-sector (%) — derived across the tag set. */
  marketSharePct?: number | null;
  /* --- Tier 2: SCHEMA RESERVED (curated/theoretical until indexed) --- */
  /** Number of active pools (Pools). */
  poolCount?: Sourced<number | null>;
  /** Top pools by TVL (Pools). */
  topPools?: { name: string; tvlUsd: number; apyPct: number | null }[] | null;
  /** Number of vaults (Vaults). */
  vaultCount?: Sourced<number | null>;
  /** Weighted average vault APY (%) (Vaults). */
  avgVaultApyPct?: Sourced<number | null>;
  /** Strategies / protocols deployed into (Curve, Convex…). */
  underlyingProtocols?: string[];
  /** Vault performance fee (%) (curated). */
  performanceFeePct?: number | null;
  /** Impermanent-loss exposure note (curated). */
  ileImpermanentLossNote?: string | null;
  /** Structured governance metrics (reuse existing type). */
  governanceDetail?: GovernanceActivityDetail | null;
  /** Audit / exploit history (curated). */
  auditHistory?: string | null;
  /** Chain / ecosystem deployment (reuse existing type). */
  deployment?: ChainDeployment | null;
}

/** A risk/incident row for a stablecoin issuer (depeg, exploit, audit). */
export interface StablecoinRiskEvent {
  date: string;
  type: string;
  impact: string;
  link?: string | null;
}

/**
 * Stablecoin-issuer metrics block (sector === "Stablecoin"). Mirrors the
 * `LendingMetrics` pattern: `current_supply_usd` is filled live by the DeFi
 * Llama cron; curated fields (reserves, peg mechanism, audits, risk events)
 * are static research. Everything optional so partial data renders honestly.
 */
export interface StablecoinMetrics {
  /** Circulating supply (USD-equivalent) — live from DeFi Llama or curated. */
  currentSupplyUsd?: Sourced<number | null>;
  /** How the peg is maintained (curated). */
  pegMechanism?: string | null;
  /** Reserve / collateral composition summary (curated). */
  reserves?: string | null;
  /** Audit / attestation history (curated). */
  auditHistory?: string | null;
  /** Issuer transparency / attestation page URL. */
  attestationUrl?: string | null;
  /** Chainlink Proof-of-Reserves (or equivalent) page URL. */
  proofOfReservesUrl?: string | null;
  /** Risk / incident timeline (depegs, exploits, wind-downs). */
  riskEvents?: StablecoinRiskEvent[];
  /** Chain / ecosystem deployment. */
  deployment?: ChainDeployment | null;
  /** Sub-sector-specific specialized metric panel. */
  subSectorMetrics?: StablecoinSubSectorMetrics | null;
}

/**
 * A ranked competitor of a network, ordered top→bottom by relevance. Used to
 * help users pick which lending platform to research more deeply.
 */
export interface Competitor {
  name: string;
  /** Network slug when the competitor is also tracked on-platform. */
  slug?: string | null;
  /** 1-based rank; lower = more direct/important competitor. */
  rank: number;
  /** One-line positioning (the "competitive slide" summary). */
  positioning: string;
  /** Where it overlaps with this network. */
  similarities: string;
  /** The differentiating factor vs. this network. */
  differences: string;
}

/** A chain/ecosystem deployment row (PDF chain-compatibility table). */
export interface ChainDeployment {
  /** Chains / ecosystems the protocol is live on. */
  chains: string[];
  /** EVM compatibility note ("Yes", "No", "Mixed", with detail). */
  evmCompatible: "yes" | "no" | "mixed";
  notes?: string;
}

/** 30-day liquidation activity (curated or live when available). */
export interface Liquidations30d {
  volumeUsd?: number | null;
  count?: number | null;
  notes?: string | null;
}

/** Structured governance activity (curated). */
export interface GovernanceActivityDetail {
  proposals?: number | null;
  voterTurnoutPct?: number | null;
  treasuryUsd?: number | null;
  notes?: string | null;
}

/** Tag-specific metric blocks keyed by the Credit tag vocabulary. */
export interface CreditTagMetrics {
  /** "Lending" tag — money-market style metrics. */
  lending?: LendingMarketMetrics | null;
  /** "Leveraged Yield" tag — leverage-farming metrics. */
  leveragedYield?: LeveragedYieldMetrics | null;
  /** "Fixed Income" tag — fixed-rate / yield-tokenization metrics. */
  fixedIncome?: FixedIncomeMetrics | null;
}

/** "Lending" tag metrics (Tier 1 live where mapped, else curated). */
export interface LendingMarketMetrics {
  totalSuppliedUsd?: Sourced<number | null>; // DefiLlama TVL
  totalBorrowsUsd?: Sourced<number | null>;
  utilizationPct?: Sourced<number | null>;
  supplyApyPct?: Sourced<number | null>;
  borrowApyPct?: Sourced<number | null>;
  collateralAssets?: string[]; // curated
  isolatedMarketCount?: number | null; // curated (Morpho-style)
  oracles?: string[]; // curated
}

/** "Leveraged Yield" tag metrics. */
export interface LeveragedYieldMetrics {
  tvlUsd?: Sourced<number | null>; // DefiLlama
  maxLeverageX?: number | null; // curated (e.g. 10x Gearbox, 7x Extra)
  borrowApyPct?: Sourced<number | null>;
  supportedStrategies?: string[]; // curated (Curve, Convex, Velodrome…)
  borrowModel?: string | null; // curated ("Credit Accounts", "pay-as-you-earn")
  integratedProtocols?: string[]; // curated
}

/** "Fixed Income" tag metrics. */
export interface FixedIncomeMetrics {
  tvlUsd?: Sourced<number | null>; // DefiLlama
  fixedApyPct?: Sourced<number | null>; // curated/derived (PT implied APY)
  impliedYieldPct?: Sourced<number | null>; // curated (YT)
  maturities?: string[]; // curated (3m, 6m, …)
  mechanism?: string | null; // curated ("PT/YT split", "fCash", "zero-coupon")
  markets?: number | null; // curated count of active markets
}

/**
 * Lending-specific metrics block (PDF §"metrics we should be including"). Live
 * fields are filled by the DeFiLlama cron pass (`Sourced<>`); curated fields
 * (bad debt, liquidations, oracle deps, risk params) are static research that
 * DeFiLlama does not expose. Everything is optional/nullable so partial data
 * renders honestly.
 */
export interface LendingMetrics {
  /** Total value supplied / deposits (USD). */
  tvlUsd?: Sourced<number | null>;
  /** Total outstanding borrows (USD). */
  totalBorrowsUsd?: Sourced<number | null>;
  /** Borrowed / supplied (0–100). */
  utilizationPct?: Sourced<number | null>;
  /** Blended supply APY (%). */
  supplyApyPct?: Sourced<number | null>;
  /** Blended variable borrow APY (%). */
  borrowApyPct?: Sourced<number | null>;
  /** Net interest margin / spread (borrow − supply, %). */
  netInterestMarginPct?: Sourced<number | null>;
  /** Protocol revenue (30d, USD) — mirrors ProtocolFeesRevenue when mapped. */
  revenue30dUsd?: Sourced<number | null>;
  /** Fees generated (30d, USD). */
  fees30dUsd?: Sourced<number | null>;
  /** Protocol revenue (annualized, USD) — curated or derived from 30d. */
  revenueAnnualizedUsd?: Sourced<number | null>;
  /** Fees generated (annualized, USD) — curated or derived from 30d. */
  feesAnnualizedUsd?: Sourced<number | null>;
  /** Active users / wallets (30d). */
  activeUsers?: Sourced<number | null>;
  /** Unique borrowers (30d). */
  uniqueBorrowers30d?: Sourced<number | null>;
  /** Collateral assets supported (curated). */
  collateralAssets?: string[];
  /** Loan assets supported (curated). */
  loanAssets?: string[];
  /** Notable stablecoin exposure (e.g. USDC, USDT, DAI, USDS). */
  stablecoinExposure?: string[];
  /** Stablecoin share of TVL (%). */
  stablecoinExposurePct?: number | null;
  /** Oracle dependencies (e.g. Chainlink, RedStone, Pyth, internal). */
  oracles?: string[];
  /** Risk parameters summary (LTV, liq. threshold/penalty, caps) — curated. */
  riskParameters?: string | null;
  /** Liquidations signal / recent activity (curated). */
  liquidations?: string | null;
  /** 30-day liquidation volume and count. */
  liquidations30d?: Liquidations30d | null;
  /** Bad debt — one of the most important lending-risk metrics (curated). */
  badDebt?: string | null;
  /** Governance activity summary (curated text). */
  governanceActivity?: string | null;
  /** Structured governance metrics (proposals, turnout, treasury). */
  governanceDetail?: GovernanceActivityDetail | null;
  /** Audit / exploit history (curated). */
  auditHistory?: string | null;
  /** Chain / ecosystem deployment. */
  deployment?: ChainDeployment | null;
}

/* -------------------------------------------------------------------------- */
/* Universal network metrics (Tier 1) — collected consistently for EVERY       */
/* network from DeFiLlama /protocol/{slug} + a single CoinGecko /coins/{id}.    */
/* Additive: layered alongside currentScale + sector blocks, never replacing    */
/* them. Each field is Sourced<> so the UI/agent show honest provenance.        */
/* -------------------------------------------------------------------------- */

/** Trailing price-change percentages (CoinGecko market_data). */
export interface PriceChangePct {
  d1: Sourced<number | null>;
  d7: Sourced<number | null>;
  d30: Sourced<number | null>;
}

/** Trailing TVL-change percentages (derived from DeFiLlama tvl[] series). */
export interface TvlChangePct {
  d1: Sourced<number | null>;
  d7: Sourced<number | null>;
}

/** Latest TVL on a single chain (USD) — DeFiLlama currentChainTvls. */
export interface UniversalChainTvl {
  chain: string;
  tvlUsd: number;
}

/** Identity & classification universals (spec §A). */
export interface UniversalIdentity {
  /** Launch / listed date (ISO YYYY-MM-DD) — DeFiLlama listedAt. */
  foundedDate: Sourced<string | null>;
  /** Deployed chains — DeFiLlama chains[]. */
  chains: Sourced<string[]>;
  /** Token standard (ERC-20/SPL/…); curated/deferred until probed on-chain. */
  tokenStandard?: Sourced<string | null>;
  /** Per-chain token contract deployments — CoinGecko platforms map. */
  contracts: Sourced<TokenDeployment[]>;
  /** DeFiLlama protocol category (cross-check vs sector). */
  llamaCategory: Sourced<string | null>;
  /** Protocol website — DeFiLlama url. */
  url?: Sourced<string | null>;
  /** Protocol Twitter handle — DeFiLlama twitter. */
  twitter?: Sourced<string | null>;
  /** Audit links — DeFiLlama audit_links. */
  auditLinks?: Sourced<string[]>;
  /** Protocol logo URL — DeFiLlama logo. */
  logo?: Sourced<string | null>;
  /** Protocol GitHub repo(s) — DeFiLlama fees summary `github[]`. */
  github?: Sourced<string | null>;
  /** Curated regulatory facts (no reliable API). */
  jurisdiction?: Sourced<string | null>;
  hq?: Sourced<string | null>;
  entityType?: Sourced<string | null>;
}

/** Live market universals from a single CoinGecko /coins/{id} payload (spec §C2). */
export interface UniversalMarket {
  priceUsd: Sourced<number | null>;
  marketCapUsd: Sourced<number | null>;
  fdvUsd: Sourced<number | null>;
  circulatingSupply: Sourced<number | null>;
  totalSupply: Sourced<number | null>;
  priceChangePct: PriceChangePct;
  marketCapRank: Sourced<number | null>;
}

/** TVL universals from DeFiLlama /protocol/{slug} (spec §C1). */
export interface UniversalTvl {
  tvlUsd: Sourced<number | null>;
  tvlChangePct: TvlChangePct;
  perChain: Sourced<UniversalChainTvl[]>;
}

/**
 * Tier-1 universal metrics — the consistent, cross-network data block populated
 * for EVERY network by the cron's universal pass. Sector-specific enrichments
 * (lending/dex/rwa/stablecoin) and curated copy live in their own blocks.
 * Fees/revenue are NOT duplicated here — reuse `NetworkProfile.protocolFeesRevenue`.
 */
export interface UniversalMetrics {
  identity: UniversalIdentity;
  market: UniversalMarket;
  tvl: UniversalTvl;
  /** Holder count — no turnkey free API; curated/deferred (spec §C6). */
  holderCount: Sourced<number | null>;
  /** Resolved join keys (reused across refreshes). */
  coingeckoId: string | null;
  llamaSlug: string | null;
  /** CoinMarketCap id from DeFiLlama protocol meta (`cmcId`). */
  cmcId?: string | null;
  /** ISO timestamp this block was last synced (spec §C7). */
  syncedAt: string;
}

export interface NetworkProfile {
  category: "Network";
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
  components: NetworkComponent[];
  faq: FaqItem[];
  orgStructure: OrgUnit[];
  tradFiComparison: TradFiRow[];
  risks: NetworkRisk[];
  events: NetworkEvent[];
  investmentRounds: InvestmentRound[];
  partnerships: Partnership[];
  currentScale: CurrentScale;
  /** Per-entity labels for the headline stat row (defaults to USD.AI copy when omitted). */
  scaleLabels?: ScaleLabels;
  /* --- Taxonomy hierarchy (Network → subCategory → sector → subSector) --- */
  /** What kind of network this is. Defaults to "Protocol" when omitted. */
  subCategory?: NetworkSubCategory | null;
  /** Functional sector (e.g. "Credit"); null for the legacy umbrella networks. */
  sector?: NetworkSector | null;
  /**
   * Additional sectors this entity also belongs to (additive cross-tagging).
   * The primary stays `sector`; e.g. Sky is primary "Stablecoin" with
   * secondary `["Credit"]`. Filters OR primary + secondary.
   */
  secondarySectors?: NetworkSector[];
  /** Sector-specific leaf (e.g. a `CreditTag` when sector === "Credit"). */
  subSector?: string | null;
  /** Credit tags — multi-tag taxonomy (Lending / Leveraged Yield / Fixed Income). */
  tags?: CreditTag[];
  /** Ranked competitors (top→bottom) — surfaced for `sector === "Credit"`. */
  competitors?: Competitor[];
  /**
   * Credit-sector metrics block (live + curated) — `sector === "Credit"`. Field
   * name kept as `lending` to avoid renaming working live-data plumbing
   * (defillama.ts / aave.ts / data.ts read `profile.lending`).
   */
  lending?: LendingMetrics | null;
  /** Tag-specific curated metric blocks (Lending / Leveraged Yield / Fixed Income). */
  creditTagMetrics?: CreditTagMetrics | null;
  /** Stablecoin primary sub-sector (when sector === "Stablecoin", or as a secondary marker). */
  stablecoinSubSector?: StablecoinSubSector | null;
  /** Stablecoin secondary tags (0–2): Yield-Bearing, Multi-Currency, Wound-Down, etc. */
  stablecoinSecondaryTags?: StablecoinSecondaryTag[];
  /** Stablecoin-issuer metrics block (live + curated) — `sector === "Stablecoin"`. */
  stablecoin?: StablecoinMetrics | null;
  /** DEX primary sub-sector (when sector === "DEX", or as a secondary marker). */
  dexSubSector?: DexSubSector | null;
  /** DEX secondary tags (0+): Spot, Perps, Multi-Chain, CLMM, etc. */
  dexSecondaryTags?: DexSecondaryTag[];
  /** DEX-entity metrics block (live + curated) — `sector === "DEX"`. */
  dex?: DexMetrics | null;
  /** RWA primary sub-sector (when sector === "RWA", or as a secondary marker). */
  rwaSubSector?: RwaSubSector | null;
  /** RWA secondary tags (0+): Institutional-Gated, Yield-Bearing, etc. */
  rwaSecondaryTags?: RwaSecondaryTag[];
  /** RWA-entity metrics block (live + curated) — `sector === "RWA"`. */
  rwa?: RwaMetrics | null;
  /** Staking primary sub-sector (when sector === "Staking", or as a secondary marker). */
  stakingSubSector?: StakingSubSector | null;
  /** Staking secondary tags (0+): Exchange-Native, Non-Custodial, etc. */
  stakingSecondaryTags?: StakingSecondaryTag[];
  /** Staking-entity metrics block (live + curated) — `sector === "Staking"`. */
  staking?: StakingMetrics | null;
  /** Liquidity primary sub-sector (when sector === "Liquidity", or as a secondary marker). */
  liquiditySubSector?: LiquiditySubSector | null;
  /** Liquidity secondary tags (0+): Stable-Pools, Auto-Compounding, etc. */
  liquiditySecondaryTags?: LiquiditySecondaryTag[];
  /** Liquidity-entity metrics block (live + curated) — `sector === "Liquidity"`. */
  liquidity?: LiquidityMetrics | null;
  /** High-cardinality child entity slugs (RealT properties, Centrifuge pools, …). */
  childEntities?: string[];
  memberCoins: MemberCoinRef[];
  arbitrumPortalMetadata: ArbitrumPortalMetadata;
  /** Protocol fees/revenue when this entity maps to a Llama protocol (DeFi Llama). */
  protocolFeesRevenue?: ProtocolFeesRevenue | null;
  /** Tier-1 universal metrics — consistent cross-network block (cron-written). */
  universalMetrics?: UniversalMetrics | null;
  /** DEX trading volume when this entity is a DEX (DeFi Llama). */
  dexVolume?: DexVolume | null;
  /** Options dex volume (DeFi Llama) — populated once `options` category is live. */
  optionsVolume?: OptionsVolume | null;
  /** Perp open interest (DeFi Llama) — populated once `perpetuals` category is live. */
  openInterest?: OpenInterest | null;
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
