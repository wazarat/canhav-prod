import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";

import {
  getApprovedNetworks,
  getApprovedNetworkBySlug,
  getApprovedRwaBySlug,
  getApprovedRwas,
  getApprovedStablecoinBySlug,
  getApprovedStablecoins,
  getApprovedTokenBySlug,
  getApprovedTokens,
} from "@/lib/data";
import {
  appendMemory,
  getAgentProfile,
  getDataFrame,
  getMemory,
  markSkillStudied,
  setAgentConfig,
} from "@/lib/agent/memory";
import {
  defaultAgentConfig,
  sanitizeAgentConfig,
  TRADE_HITL_METHODS,
  type AgentConfig,
} from "@/lib/agent/agentConfig";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { TRADE_MODES } from "@/components/agent/trade/tradeModes";
import { buildCustomTools, executeCustomTool, listCustomTools } from "@/lib/agent/customTools";
import { resolveDataFrame } from "@/lib/agent/dataframes";
import { canPublishVerdict, claimVerdictSlot } from "@/lib/agent/dunePublish";
import { refreshAssetCombinedVerdict } from "@/lib/agent/verdictRunner";
import { execTradePropose } from "@/lib/agent/trade/propose";
import { searchKnowledge } from "@/lib/agent/knowledge";
import { resolveEntityBinding, type AgentScope } from "@/lib/agent/entity-binding";
import { getAgentSkillById } from "@/lib/agent/skills";
import { filterTagsForSector, matchesSectorFilter } from "@/lib/networkTaxonomy";
import { networkHeadlineTvlUsd } from "@/lib/networks/marketHeadlines";
import { fetchReserveRatesForSlug } from "@/lib/server/aave";
import { fetchRecentTransfers, fetchTokenMetadata, fetchTotalSupply } from "@/lib/server/alchemy";
import { ensureVerdictTable, hasDuneWrite, insertVerdict } from "@/lib/server/dune";
import { resolvePegSeries, resolveTvlSeries } from "@/lib/server/series";
import type { LendingMarket, NetworkProfile, OffchainFact, Sourced } from "@/lib/types";

/**
 * Compact off-chain facts for agent consumption: drop the nested source object
 * down to its label/url and surface the freshness + theoretical flags so the
 * model can qualify a fact ("curated, may be stale") instead of stating it flat.
 */
function compactFacts(facts: OffchainFact[] | undefined) {
  return (facts ?? []).map((f) => ({
    key: f.key,
    value: f.value,
    freshness: f.freshness,
    source: f.source?.label ?? null,
    sourceUrl: f.source?.url ?? null,
    theoretical: f.theoretical ?? false,
  }));
}

/**
 * Compact a `Sourced<number|null>` metric to `{ value, source, asOf }` so every
 * number the agent quotes carries its provenance. Null/absent metrics compact
 * to null (never a fake zero).
 */
function sourcedNum(s: Sourced<number | null> | null | undefined) {
  if (!s || s.value == null) return null;
  return { value: s.value, source: s.sourceLabel ?? s.dataSource, asOf: s.updatedAt ?? null };
}

/** Compact Aave V3 lending rates for agent consumption (null when not a reserve). */
function compactLendingMarket(market: LendingMarket | null | undefined) {
  if (!market) return null;
  return {
    supplyApyPct: market.supplyApyPct,
    variableBorrowApyPct: market.variableBorrowApyPct,
    utilizationPct: market.utilizationPct,
    underlyingSymbol: market.underlyingSymbol ?? null,
    source: market.source,
    updatedAt: market.updatedAt,
  };
}

/**
 * The CanHav research agent's toolset.
 *
 * Every tool is a thin wrapper over data that already exists
 * (lib/data.ts / dune.ts / alchemy.ts / skills + memory). Research reads are
 * default; `trade_propose` is gated by research verdict + owner HITL settings.
 * returns a compact, JSON-serializable object that includes a one-line
 * `summary` the activity feed streams as a step ("📚 Read JLP profile").
 *
 * `buildAgentTools(agentId)` is consumed by the streamText loop (app/api/agent);
 * `runTool(...)` powers the debug playground (app/api/agent/tools).
 */

const schemas = {
  research_getEntity: z.object({ slug: z.string().describe("Entity slug, e.g. 'jupiter'.") }),
  research_getStablecoin: z.object({ slug: z.string().describe("Stablecoin slug, e.g. 'usdc'.") }),
  research_getToken: z.object({ slug: z.string().describe("Token slug, e.g. 'jlp'.") }),
  research_getRwa: z.object({ slug: z.string().describe("RWA protocol slug, e.g. 'centrifuge'.") }),
  research_listByCategory: z.object({
    category: z.enum(["networks", "stablecoins", "rwas", "tokens"]),
  }),
  research_getHistory: z.object({
    slug: z.string(),
    metric: z.enum(["peg", "tvl"]),
  }),
  research_compare: z.object({
    sector: z
      .string()
      .describe('Sector to screen, e.g. "Credit", "Staking", "Derivatives", "RWA".'),
    tag: z
      .string()
      .optional()
      .describe(
        'Optional tag filter within the sector, e.g. "Lending", "Leveraged Yield", "Fixed Income".',
      ),
    limit: z.number().int().min(1).max(25).optional().describe("Max rows (default 15)."),
  }),
  research_getRisks: z.object({
    slug: z.string().describe("Network entity slug, e.g. 'aave'."),
  }),
  research_getPartnerships: z.object({
    slug: z.string().describe("Network entity slug, e.g. 'aave'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 20)."),
  }),
  research_getCompetitors: z.object({
    slug: z.string().describe("Network entity slug, e.g. 'aave'."),
  }),
  research_getAssetCoverage: z.object({
    slug: z.string().describe("Network entity slug, e.g. 'aave'."),
    asset: z
      .string()
      .optional()
      .describe("Optional asset name/symbol filter, e.g. 'USDC' (substring match)."),
    limit: z.number().int().min(1).max(40).optional().describe("Max asset rows (default 20)."),
  }),
  research_whatChanged: z.object({
    slug: z.string().describe("Stablecoin slug (peg) or RWA slug (tvl)."),
    metric: z.enum(["peg", "tvl"]),
    days: z
      .number()
      .int()
      .min(1)
      .max(90)
      .optional()
      .describe("Lookback window in days (default 7)."),
  }),
  chain_readLive: z.object({
    address: z.string().describe("Token contract address (Arbitrum)."),
    decimals: z.number().int().optional(),
  }),
  chain_readAaveRates: z.object({
    slug: z.string().describe("Aave reserve member-coin slug: gho, ausdc, ausdt, or aweth."),
  }),
  skill_load: z.object({ skillId: z.string().describe("Skill id (entity slug).") }),
  memory_remember: z.object({
    fact: z.string().describe("A durable, reusable fact to remember."),
    source: z.string().optional(),
  }),
  memory_recall: z.object({}),
  frame_load: z.object({
    frameId: z.string().describe("Id of a pinned data frame (listed in the system prompt)."),
  }),
  knowledge_search: z.object({
    query: z.string().describe("What to look for in the owner's uploaded knowledge."),
    k: z.number().int().min(1).max(8).optional().describe("Max passages to return (default 4)."),
  }),
  dune_publishVerdict: z.object({
    asset: z.string().min(1).max(40).describe("Asset the verdict is about, e.g. 'sUSDe'."),
    signal: z
      .string()
      .min(1)
      .max(60)
      .describe("Short machine-readable signal, e.g. 'yield_compression'."),
    severity: z.enum(["low", "medium", "high"]).describe("Severity of the signal."),
    rationale: z
      .string()
      .min(1)
      .max(500)
      .describe("One-sentence, off-chain explanation Dune can't natively produce."),
    confidence: z.number().min(0).max(1).describe("Confidence in the verdict, 0..1."),
    source_refs: z
      .string()
      .max(300)
      .optional()
      .describe("Semicolon-separated source labels the verdict relies on."),
  }),
  trade_propose: z.object({
    asset: z
      .string()
      .describe(
        "Coin on this agent's trade desk: the skill token (e.g. AAVE, recommendation-only) or a GMX major (ETH, BTC).",
      ),
    side: z.enum(["long", "short"]),
    sizeUsdHuman: z.number().positive().optional().describe("Approx USD notional (default 10)."),
    leverage: z.number().int().min(1).max(2).optional(),
  }),
  research_refreshCombinedVerdict: z.object({
    asset: z
      .string()
      .describe(
        "Researched asset to refresh the combined verdict for: sUSDe, sUSDai, ETH, BTC, or AAVE.",
      ),
  }),
  config_updateGuardrails: z.object({
    tradeHitlMethod: z
      .union([z.enum(TRADE_HITL_METHODS), z.null()])
      .optional()
      .describe("New trade HITL method. Pass null (or omit) to leave it unchanged."),
    tradeSpendingCapUsd: z
      .union([z.number(), z.string(), z.null()])
      .optional()
      .describe(
        "Per-trade cap in whole USD (e.g. 15). Pass null (or omit) to leave it unchanged; pass 0 or 'none' to remove the cap.",
      ),
    tradeCumulativeCapUsd: z
      .union([z.number(), z.string(), z.null()])
      .optional()
      .describe(
        "Rolling 24h cumulative cap in whole USD (e.g. 25). Pass null (or omit) to leave it unchanged; pass 0 or 'none' to remove the cap.",
      ),
    confirm: z
      .boolean()
      .optional()
      .describe(
        "false or omitted returns a preview WITHOUT writing. Only pass true after restating the exact change to the user and receiving their explicit confirmation.",
      ),
  }),
};

type Args<K extends keyof typeof schemas> = z.infer<(typeof schemas)[K]>;

/* -------------------------------------------------------------------------- */
/* Executors (shared by the LLM tools and the playground)                     */
/* -------------------------------------------------------------------------- */

async function execGetEntity(a: Args<"research_getEntity">) {
  const p = await getApprovedNetworkBySlug(a.slug);
  if (!p) return { found: false, summary: `No CanHav network for "${a.slug}".` };
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    symbol: p.symbol,
    tagline: p.tagline,
    description: p.description,
    differentiator: p.differentiator,
    // Taxonomy so the agent can tell Lending from Fixed Income and route
    // follow-ups (research_compare / research_getRisks / ...) correctly.
    sector: p.sector ?? null,
    secondarySectors: p.secondarySectors ?? [],
    tags: p.tags ?? (p.subSector ? [p.subSector] : []),
    riskCount: p.typedRisks?.length ?? p.risks?.length ?? 0,
    partnershipCount: p.partnerships?.length ?? 0,
    hasAssetCoverage: Boolean(p.assetCoverage),
    hasCompetitors: (p.competitors?.length ?? 0) > 0,
    chains: p.arbitrumPortalMetadata.chains,
    memberCoins: p.memberCoins.map((c) => ({
      slug: c.slug,
      name: c.name,
      symbol: c.symbol,
      category: c.category,
      role: c.role,
    })),
    scale: p.currentScale,
    offchainFacts: compactFacts(p.offchainFacts),
    // Status-tagged so the agent distinguishes executed/stated milestones from
    // forward-looking (theoretical) and CanHav-inferred steps.
    timeline: (p.timeline ?? []).map((t) => ({
      date: t.date,
      title: t.title,
      status: t.status ?? "stated",
    })),
    summary: `Read entity ${p.name} (${p.memberCoins.length} member coins).`,
  };
}

async function execGetStablecoin(a: Args<"research_getStablecoin">) {
  const p = await getApprovedStablecoinBySlug(a.slug);
  if (!p) return { found: false, summary: `No stablecoin "${a.slug}".` };
  const latestPeg = p.historicalPegData.points.at(-1)?.price ?? null;
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    symbol: p.symbol,
    pegTarget: p.pegTarget,
    subCategory: p.subCategory ?? null,
    assetSubtype: p.assetSubtype ?? null,
    pegMechanism: p.pegMechanism ?? null,
    description: p.description,
    totalSupply: p.totalSupply.value,
    latestPeg,
    chainDistribution: p.chainDistribution?.chains ?? null,
    issuance: p.issuanceMeta
      ? {
          pegMechanism: p.issuanceMeta.pegMechanism,
          mintRedeem: p.issuanceMeta.mintRedeemDescription,
          auditLinks: p.issuanceMeta.auditLinks,
        }
      : null,
    offchainFacts: compactFacts(p.offchainFacts),
    contractAddress: p.contractAddress ?? null,
    lendingMarket: compactLendingMarket(p.lendingMarket),
    summary: `Read stablecoin ${p.name} (peg ${p.pegTarget}${p.assetSubtype ? `, ${p.assetSubtype}` : ""}).`,
  };
}

async function execGetToken(a: Args<"research_getToken">) {
  const p = await getApprovedTokenBySlug(a.slug);
  if (!p) return { found: false, summary: `No token "${a.slug}".` };
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    symbol: p.symbol,
    tokenType: p.tokenType,
    subCategory: p.subCategory ?? null,
    assetSubtype: p.assetSubtype ?? null,
    pegMechanism: p.pegMechanism ?? null,
    description: p.description,
    priceUsd: p.market?.priceUsd?.value ?? null,
    marketCapUsd: p.market?.marketCapUsd?.value ?? null,
    totalSupply: p.totalSupply.value,
    offchainFacts: compactFacts(p.offchainFacts),
    contractAddress: p.contractAddress ?? null,
    yieldMechanics: p.yieldMechanics
      ? {
          currentApyPct: p.yieldMechanics.currentApyPct,
          yieldSource: p.yieldMechanics.yieldSource,
          emissionsBased: p.yieldMechanics.emissionsBased,
          dataSource: p.yieldMechanics.dataSource,
        }
      : null,
    lendingMarket: compactLendingMarket(p.lendingMarket),
    summary: `Read token ${p.name} (${p.tokenType}).`,
  };
}

async function execGetRwa(a: Args<"research_getRwa">) {
  const p = await getApprovedRwaBySlug(a.slug);
  if (!p) return { found: false, summary: `No RWA "${a.slug}".` };
  const latestTvl = p.historicalTvlData.points.at(-1)?.value ?? p.totalValueLocked.value ?? null;
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    symbol: p.symbol,
    assetClass: p.assetClass,
    assetSubtype: p.assetSubtype ?? null,
    pegMechanism: p.pegMechanism ?? null,
    description: p.description,
    tvlUsd: latestTvl,
    tvlByChain: p.chainDistribution?.chains ?? null,
    offchainFacts: compactFacts(p.offchainFacts),
    summary: `Read RWA ${p.name} (${p.assetClass}).`,
  };
}

async function execList(a: Args<"research_listByCategory">) {
  const items =
    a.category === "networks"
      ? await getApprovedNetworks()
      : a.category === "stablecoins"
        ? await getApprovedStablecoins()
        : a.category === "rwas"
          ? await getApprovedRwas()
          : await getApprovedTokens();
  const list = items.map((p) => ({ slug: p.slug, name: p.name, symbol: p.symbol }));
  return {
    category: a.category,
    count: list.length,
    items: list,
    summary: `Listed ${list.length} ${a.category}.`,
  };
}

async function execHistory(a: Args<"research_getHistory">) {
  // Same resolver chain as the detail-page charts: stored history (written by
  // the daily cron) -> Dune (if configured) -> DeFi Llama -> CoinGecko.
  let points: { date: string; price?: number; value?: number }[] = [];
  let source: string | null = null;
  if (a.metric === "peg") {
    const profile = await getApprovedStablecoinBySlug(a.slug);
    if (!profile) {
      return {
        slug: a.slug,
        metric: a.metric,
        available: false,
        count: 0,
        points: [],
        summary: `No stablecoin found for slug "${a.slug}".`,
      };
    }
    const series = await resolvePegSeries(profile);
    points = series.points;
    source = series.source;
  } else {
    const profile = await getApprovedRwaBySlug(a.slug);
    if (!profile) {
      return {
        slug: a.slug,
        metric: a.metric,
        available: false,
        count: 0,
        points: [],
        summary: `No RWA found for slug "${a.slug}".`,
      };
    }
    const series = await resolveTvlSeries(profile);
    points = series.points;
    source = series.source;
  }
  return {
    slug: a.slug,
    metric: a.metric,
    available: points.length > 0,
    count: points.length,
    source,
    points: points.slice(-30),
    summary: points.length
      ? `Pulled ${points.length} ${a.metric} points for ${a.slug} (source: ${source}).`
      : `No ${a.metric} history available for ${a.slug} from any source (Dune/DeFi Llama/CoinGecko).`,
  };
}

/** Compact headline metrics for one comparison row, keyed by the entity's credit tags. */
function creditHighlights(p: NetworkProfile) {
  const m = p.creditTagMetrics;
  if (!m) return null;
  const out: Record<string, unknown> = {};
  if (m.lending) {
    out.lending = {
      totalSuppliedUsd: sourcedNum(m.lending.totalSuppliedUsd),
      totalBorrowsUsd: sourcedNum(m.lending.totalBorrowsUsd),
      supplyApyPct: sourcedNum(m.lending.supplyApyPct),
      borrowApyPct: sourcedNum(m.lending.borrowApyPct),
      utilizationPct: sourcedNum(m.lending.utilizationPct),
      maxLtvPct: sourcedNum(m.lending.maxLtvPct),
      badDebtUsd: sourcedNum(m.lending.badDebtUsd),
    };
  }
  if (m.leveragedYield) {
    out.leveragedYield = {
      tvlUsd: sourcedNum(m.leveragedYield.tvlUsd),
      maxLeverageX: m.leveragedYield.maxLeverageX ?? null,
      borrowApyPct: sourcedNum(m.leveragedYield.borrowApyPct),
      loopingApyNetPct: sourcedNum(m.leveragedYield.loopingApyNetPct),
    };
  }
  if (m.fixedIncome) {
    out.fixedIncome = {
      tvlUsd: sourcedNum(m.fixedIncome.tvlUsd),
      fixedApyPct: sourcedNum(m.fixedIncome.fixedApyPct),
      underlyingApyPct: sourcedNum(m.fixedIncome.underlyingApyPct),
    };
  }
  return Object.keys(out).length ? out : null;
}

async function execCompare(a: Args<"research_compare">) {
  const networks = await getApprovedNetworks();
  let members = networks.filter((p) => matchesSectorFilter(p, a.sector));
  if (a.tag) {
    const wanted = a.tag.toLowerCase();
    members = members.filter((p) =>
      filterTagsForSector(p, a.sector).some((t) => t.toLowerCase() === wanted),
    );
  }
  if (!members.length) {
    const sectors = [...new Set(networks.map((p) => p.sector).filter(Boolean))].sort();
    return {
      found: false,
      rows: [],
      summary: `No entities matched sector "${a.sector}"${a.tag ? ` + tag "${a.tag}"` : ""}. Sectors in the dataset: ${sectors.join(", ")}.`,
    };
  }
  const limit = a.limit ?? 15;
  const rows = members
    .map((p) => {
      const typedRisks = p.typedRisks ?? [];
      return {
        slug: p.slug,
        name: p.name,
        tags: filterTagsForSector(p, a.sector),
        tvlUsd: networkHeadlineTvlUsd(p),
        creditMetrics: creditHighlights(p),
        riskCount: typedRisks.length || (p.risks?.length ?? 0),
        highSeverityRiskCount: typedRisks.filter(
          (r) => r.severity === "high" || r.severity === "critical",
        ).length,
        partnershipCount: p.partnerships?.length ?? 0,
        flaggedAssetCount: p.assetCoverage?.flaggedAssets?.length ?? 0,
      };
    })
    .sort((x, y) => (y.tvlUsd ?? 0) - (x.tvlUsd ?? 0))
    .slice(0, limit);
  return {
    found: true,
    sector: a.sector,
    tag: a.tag ?? null,
    totalMatched: members.length,
    returned: rows.length,
    rows,
    source: "CanHav dataset (DeFi Llama TVL + curated tag metrics)",
    summary: `Compared ${rows.length} of ${members.length} ${a.sector}${a.tag ? ` / ${a.tag}` : ""} entities, ranked by TVL. Drill into risks/assets per slug before recommending.`,
  };
}

async function execGetRisks(a: Args<"research_getRisks">) {
  const p = await getApprovedNetworkBySlug(a.slug);
  if (!p) return { found: false, summary: `No CanHav network for "${a.slug}".` };
  const typed = (p.typedRisks ?? []).slice(0, 16).map((r) => ({
    name: r.name ?? null,
    category: r.category,
    severity: r.severity,
    likelihood: r.likelihood ?? null,
    impact: r.impact ?? null,
    description: r.description,
    mitigation: r.mitigation ?? null,
    monitoringSignal: r.monitoringSignal ?? null,
    linkedAssets: r.linkedAssets ?? [],
    asOf: r.asOf ?? null,
    source: r.sourceLabel ?? null,
    sourceUrl: r.sourceUrl ?? null,
  }));
  // Legacy prose risks only matter when the typed dataset is absent.
  const legacy = typed.length
    ? []
    : (p.risks ?? []).slice(0, 10).map((r) => ({ category: r.category, description: r.description }));
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    typedRisks: typed,
    legacyRisks: legacy,
    riskPosture: p.riskPosture ?? null,
    incidents: (p.incidents ?? []).slice(0, 8).map((i) => ({
      date: i.date,
      title: i.title,
      severity: i.severity ?? null,
      eventType: i.eventType ?? null,
      amountUsd: i.amountUsd ?? null,
      outcome: i.outcome ?? null,
    })),
    auditsNote: p.auditsNote ?? null,
    summary: typed.length
      ? `Read ${typed.length} typed risk(s) for ${p.name} (${typed.filter((r) => r.severity === "high" || r.severity === "critical").length} high/critical).`
      : `Read ${legacy.length} legacy risk note(s) for ${p.name} (no typed risk dataset).`,
  };
}

async function execGetPartnerships(a: Args<"research_getPartnerships">) {
  const p = await getApprovedNetworkBySlug(a.slug);
  if (!p) return { found: false, summary: `No CanHav network for "${a.slug}".` };
  const all = p.partnerships ?? [];
  const limit = a.limit ?? 20;
  const rows = all.slice(0, limit).map((x) => ({
    name: x.name,
    date: x.date,
    amountLabel: x.amountLabel,
    description: x.description,
    // Slug set when the partner is also tracked on-platform (follow-up read).
    slug: x.slug ?? null,
  }));
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    totalCount: all.length,
    returned: rows.length,
    partnerships: rows,
    source: "CanHav curated partnership dataset",
    summary: `Read ${rows.length} of ${all.length} partnership(s) for ${p.name}.`,
  };
}

async function execGetCompetitors(a: Args<"research_getCompetitors">) {
  const p = await getApprovedNetworkBySlug(a.slug);
  if (!p) return { found: false, summary: `No CanHav network for "${a.slug}".` };
  const rows = (p.competitors ?? [])
    .slice()
    .sort((x, y) => x.rank - y.rank)
    .slice(0, 10)
    .map((c) => ({
      rank: c.rank,
      name: c.name,
      slug: c.slug ?? null,
      positioning: c.positioning,
      similarities: c.similarities,
      differences: c.differences,
    }));
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    competitors: rows,
    source: "CanHav curated competitor dataset",
    summary: rows.length
      ? `Read ${rows.length} ranked competitor(s) for ${p.name} (top: ${rows[0].name}).`
      : `No curated competitor set for ${p.name}.`,
  };
}

async function execGetAssetCoverage(a: Args<"research_getAssetCoverage">) {
  const p = await getApprovedNetworkBySlug(a.slug);
  if (!p) return { found: false, summary: `No CanHav network for "${a.slug}".` };
  const ac = p.assetCoverage;
  if (!ac) {
    return {
      found: false,
      slug: p.slug,
      summary: `No curated asset-coverage dataset for ${p.name}.`,
    };
  }
  let assets = ac.assets;
  if (a.asset) {
    const wanted = a.asset.toLowerCase();
    assets = assets.filter((x) => x.asset.toLowerCase().includes(wanted));
  }
  const limit = a.limit ?? 20;
  const rows = assets.slice(0, limit).map((x) => ({
    asset: x.asset,
    role: x.role,
    roleKind: x.roleKind,
    chain: x.chain,
    // Lending-shape params (null on fixed-income rows). Display text carries
    // the value when the source cell was prose; never re-derive numbers.
    maxLtvPct: x.maxLtvPct ?? x.maxLtvText,
    liqThresholdPct: x.liqThresholdPct ?? x.liqThresholdText,
    supplyCap: x.supplyCapValue ?? x.supplyCapDisplay,
    borrowCap: x.borrowingDisabled ? "borrowing disabled" : (x.borrowCapValue ?? x.borrowCapDisplay),
    ltvWithdrawn: x.ltvWithdrawn,
    // Fixed-income-shape params (null on lending rows).
    maturityOrTerm: x.maturityOrTerm,
    fixedImpliedApy: x.fixedImpliedApy,
    underlyingYieldSource: x.underlyingYieldSource,
    oracle: x.oracle,
    notes: x.notes,
    sources: x.sources.map((s) => s.label),
  }));
  return {
    found: true,
    slug: p.slug,
    name: p.name,
    shape: ac.shape,
    assetStrategy: ac.assetStrategy,
    totalAssets: assets.length,
    returned: rows.length,
    assets: rows,
    oracles: ac.oracles.map((o) => ({ provider: o.provider, assetsCovered: o.assetsCovered })),
    flaggedAssets: ac.flaggedAssets.slice(0, 10).map((f) => ({ asset: f.asset, flag: f.flag, reason: f.reason })),
    curatedNote: ac.curatedNote ?? null,
    asOf: ac.asOf,
    source: "CanHav M6 asset coverage dataset",
    summary: `Read ${rows.length} of ${assets.length} ${ac.shape} asset row(s) for ${p.name}${ac.asOf ? ` (as of ${ac.asOf})` : ""}.`,
  };
}

async function execWhatChanged(a: Args<"research_whatChanged">) {
  const days = a.days ?? 7;
  let points: { date: string; price?: number; value?: number }[] = [];
  let source: string | null = null;
  if (a.metric === "peg") {
    const profile = await getApprovedStablecoinBySlug(a.slug);
    if (!profile) return { found: false, summary: `No stablecoin found for slug "${a.slug}".` };
    const series = await resolvePegSeries(profile);
    points = series.points;
    source = series.source;
  } else {
    const profile = await getApprovedRwaBySlug(a.slug);
    if (!profile) return { found: false, summary: `No RWA found for slug "${a.slug}".` };
    const series = await resolveTvlSeries(profile);
    points = series.points;
    source = series.source;
  }
  const val = (pt: { price?: number; value?: number }) => pt.price ?? pt.value ?? null;
  const usable = points.filter((pt) => val(pt) != null);
  if (usable.length < 2) {
    return {
      found: false,
      slug: a.slug,
      metric: a.metric,
      summary: `Not enough ${a.metric} history for ${a.slug} to compute a ${days}-day change.`,
    };
  }
  const end = usable[usable.length - 1];
  const cutoff = new Date(new Date(end.date).getTime() - days * 86_400_000).toISOString().slice(0, 10);
  // First point at/after the cutoff; falls back to the oldest point when the
  // series is shorter than the requested window (reported via windowDays).
  const start = usable.find((pt) => pt.date >= cutoff) ?? usable[0];
  const startV = val(start) as number;
  const endV = val(end) as number;
  const window = usable.filter((pt) => pt.date >= start.date);
  const values = window.map((pt) => val(pt) as number);
  return {
    found: true,
    slug: a.slug,
    metric: a.metric,
    requestedDays: days,
    start: { date: start.date, value: startV },
    end: { date: end.date, value: endV },
    change: endV - startV,
    changePct: startV !== 0 ? ((endV - startV) / startV) * 100 : null,
    min: Math.min(...values),
    max: Math.max(...values),
    pointCount: window.length,
    source,
    asOf: end.date,
    summary: `${a.slug} ${a.metric} moved ${startV !== 0 ? (((endV - startV) / startV) * 100).toFixed(2) : "?"}% over ${days}d (${start.date} to ${end.date}, source: ${source}).`,
  };
}

async function execChainReadLive(a: Args<"chain_readLive">) {
  const [supply, meta, transfers] = await Promise.all([
    fetchTotalSupply(a.address, a.decimals ?? null, 300),
    fetchTokenMetadata(a.address),
    fetchRecentTransfers(a.address, 3),
  ]);
  const available = supply.value !== null || Boolean(meta);
  return {
    address: a.address,
    name: meta?.name ?? null,
    symbol: meta?.symbol ?? null,
    decimals: meta?.decimals ?? a.decimals ?? null,
    totalSupply: supply.value,
    recentTransfers: transfers.length,
    updatedAt: supply.updatedAt,
    available,
    summary:
      supply.value !== null
        ? `On-chain supply for ${meta?.symbol ?? a.address}: ${supply.value}.`
        : `No live on-chain data for ${a.address} (Alchemy not configured?).`,
  };
}

async function execChainReadAaveRates(a: Args<"chain_readAaveRates">) {
  const rates = await fetchReserveRatesForSlug(a.slug);
  if (!rates || rates.supplyApyPct === null) {
    return {
      found: false,
      slug: a.slug,
      summary: `No live Aave reserve rates for "${a.slug}" (not an Aave reserve, or Alchemy not configured).`,
    };
  }
  return {
    found: true,
    slug: a.slug,
    underlyingSymbol: rates.underlyingSymbol,
    supplyApyPct: rates.supplyApyPct,
    variableBorrowApyPct: rates.variableBorrowApyPct,
    utilizationPct: rates.utilizationPct,
    updatedAt: rates.updatedAt,
    summary: `Aave V3 ${rates.underlyingSymbol ?? a.slug}: supply ${rates.supplyApyPct.toFixed(2)}% APY, borrow ${rates.variableBorrowApyPct?.toFixed(2) ?? "—"}%.`,
  };
}

async function execSkillLoad(agentId: string, a: Args<"skill_load">) {
  const skill = await getAgentSkillById(a.skillId);
  if (!skill) return { found: false, summary: `No skill "${a.skillId}".` };
  await markSkillStudied(agentId, a.skillId);
  return {
    found: true,
    id: skill.id,
    title: skill.title,
    overview: skill.summary,
    facts: skill.facts,
    actions: skill.actions.map((x) => x.name),
    studied: true,
    summary: `Studied skill ${skill.title}.`,
  };
}

async function execRemember(agentId: string, a: Args<"memory_remember">) {
  const fact = await appendMemory(agentId, { text: a.fact, source: a.source ?? "agent" });
  return {
    saved: Boolean(fact),
    fact: fact?.text ?? a.fact,
    summary: fact ? `Learned: ${fact.text}` : `Already knew: ${a.fact}`,
  };
}

async function execFrameLoad(agentId: string, a: Args<"frame_load">) {
  const frame = await getDataFrame(agentId, a.frameId);
  if (!frame) {
    return { found: false, summary: `No pinned data frame "${a.frameId}" on this agent.` };
  }
  const resolved = await resolveDataFrame(frame);
  return { found: true, ...resolved };
}

async function execKnowledgeSearch(agentId: string, a: Args<"knowledge_search">) {
  const hits = await searchKnowledge(agentId, a.query, a.k ?? 4);
  if (!hits.length) {
    return {
      found: false,
      hits: [],
      summary: `No knowledge passages matched "${a.query}".`,
    };
  }
  return {
    found: true,
    hits: hits.map((h) => ({
      content: h.content,
      docTitle: h.docTitle,
      sourceLabel: h.sourceLabel,
      sourceUrl: h.sourceUrl,
      similarity: h.score,
    })),
    summary: `Found ${hits.length} knowledge passage(s) for "${a.query}" (top: ${hits[0].docTitle}).`,
  };
}

async function execRecall(agentId: string) {
  const facts = await getMemory(agentId);
  return {
    count: facts.length,
    facts: facts.map((f) => f.text),
    summary: `Recalled ${facts.length} learned fact(s).`,
  };
}

async function execScope(scope: AgentScope) {
  const binding = scope.entitySlug ? await resolveEntityBinding(scope.entitySlug) : null;
  if (!binding) {
    return {
      bound: false,
      summary: "This is a general research agent — not bound to a specific project.",
    };
  }
  return {
    bound: true,
    entity: binding.entitySlug,
    entityName: binding.entityName,
    products: binding.associatedProducts,
    summary: `Scoped to ${binding.entityName} (${binding.associatedProducts.length} member product(s)).`,
  };
}

async function execPublishVerdict(
  agentId: string,
  ownerUserId: string | null | undefined,
  a: Args<"dune_publishVerdict">,
) {
  const gate = await canPublishVerdict(agentId, ownerUserId);
  if (!gate.ok) {
    return { published: false, reason: gate.reason, summary: `Did not publish to Dune: ${gate.reason}` };
  }
  // One verdict per asset per cooldown window — don't spam inserts / credits.
  const claimed = await claimVerdictSlot(agentId, a.asset);
  if (!claimed) {
    return {
      published: false,
      reason: "cooldown",
      summary: `Skipped Dune publish for ${a.asset}: a verdict was published for it recently.`,
    };
  }
  const ensured = await ensureVerdictTable();
  if (!ensured) {
    return {
      published: false,
      reason: "table",
      summary: "Could not prepare the Dune verdict table (check the key's Read/Write scope).",
    };
  }
  const published = await insertVerdict({
    ts: new Date().toISOString(),
    agent_id: agentId,
    asset: a.asset,
    signal: a.signal,
    severity: a.severity,
    rationale: a.rationale,
    confidence: a.confidence,
    source_refs: a.source_refs ?? "",
  });
  return {
    published,
    asset: a.asset,
    signal: a.signal,
    severity: a.severity,
    summary: published
      ? `Published a ${a.severity} verdict for ${a.asset} (${a.signal}) to Dune.`
      : `Dune insert failed for ${a.asset} (${a.signal}).`,
  };
}

async function execRefreshCombinedVerdict(
  _agentId: string,
  ownerUserId: string | null | undefined,
  a: Args<"research_refreshCombinedVerdict">,
) {
  const out = await refreshAssetCombinedVerdict(a.asset, ownerUserId);
  return {
    ok: out.ok,
    combined: out.combined,
    summary: out.summary,
  };
}

/**
 * Coerce a human cap input (whole USD) to the stored 30-decimal string.
 * Models routinely fill optional fields, so null/omitted means "leave
 * unchanged" (returns undefined); removing a cap is an explicit 0/"none"
 * (returns null). Non-numeric garbage is IGNORED (unchanged) rather than
 * silently clearing a safety cap, and never throws into the stream.
 */
function capInputToUsd30(value: number | string | null | undefined): string | null | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && /^(none|clear|remove|off)$/i.test(value.trim())) return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (n === 0) return null;
  return (BigInt(Math.floor(n)) * 10n ** 30n).toString();
}

/** Human-readable view of the trade-guardrail slice of a config. */
function describeGuardrails(cfg: AgentConfig) {
  const capToHuman = (raw: string | null) => (raw == null ? null : Number(BigInt(raw) / 10n ** 30n));
  const mode = TRADE_MODES.find((m) => m.value === cfg.tradeHitlMethod);
  return {
    tradeHitlMethod: cfg.tradeHitlMethod,
    methodName: mode?.name ?? cfg.tradeHitlMethod,
    perTradeCapUsd: capToHuman(cfg.tradeSpendingCapUsd),
    dailyCapUsd: capToHuman(cfg.tradeCumulativeCapUsd),
  };
}

function guardrailsLine(g: ReturnType<typeof describeGuardrails>): string {
  const caps = [
    g.perTradeCapUsd != null ? `$${g.perTradeCapUsd} per trade` : "no per-trade cap",
    g.dailyCapUsd != null ? `$${g.dailyCapUsd} per 24h` : "no 24h cap",
  ].join(", ");
  return `${g.methodName} (${g.tradeHitlMethod}); ${caps}`;
}

/**
 * Owner-only, two-phase guardrail update. Without `confirm` it returns a
 * current-vs-proposed preview and writes nothing; with `confirm: true` it
 * persists the merged config. The merge is mandatory: `setAgentConfig`
 * REPLACES the whole config, so we overlay only the provided trade fields on
 * top of the full existing config to preserve focusAreas/instructions/etc.
 */
async function execUpdateGuardrails(
  agentId: string,
  sessionUserId: string | null | undefined,
  a: Args<"config_updateGuardrails">,
) {
  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return {
      updated: false,
      reason: "no-profile",
      summary: "This agent has no stored profile, so guardrails cannot be updated here.",
    };
  }
  if (!sessionUserId || !(await userOwnsAgent(sessionUserId, agentId, profile.ownerUserId))) {
    return {
      updated: false,
      reason: "owner-only",
      summary: "Only this agent's owner can change its trade guardrails.",
    };
  }

  const current = profile.config ?? defaultAgentConfig();
  const spendingCap = capInputToUsd30(a.tradeSpendingCapUsd);
  const cumulativeCap = capInputToUsd30(a.tradeCumulativeCapUsd);
  const proposed = sanitizeAgentConfig({
    ...current,
    ...(a.tradeHitlMethod != null ? { tradeHitlMethod: a.tradeHitlMethod } : {}),
    ...(spendingCap !== undefined ? { tradeSpendingCapUsd: spendingCap } : {}),
    ...(cumulativeCap !== undefined ? { tradeCumulativeCapUsd: cumulativeCap } : {}),
  });

  const currentView = describeGuardrails(current);
  const proposedView = describeGuardrails(proposed);

  if (!a.confirm) {
    return {
      updated: false,
      preview: { current: currentView, proposed: proposedView },
      summary: `Preview only, nothing written. Current: ${guardrailsLine(currentView)}. Proposed: ${guardrailsLine(proposedView)}. Restate this to the owner and call again with confirm: true once they agree.`,
    };
  }

  const written = await setAgentConfig(agentId, proposed);
  if (!written) {
    return {
      updated: false,
      reason: "write-failed",
      summary: "Could not persist the guardrail update (agent profile disappeared).",
    };
  }
  return {
    updated: true,
    guardrails: proposedView,
    summary: `Updated trade guardrails: ${guardrailsLine(proposedView)}.`,
  };
}

/* -------------------------------------------------------------------------- */
/* AI SDK tool definitions (used by the streamText loop)                      */
/* -------------------------------------------------------------------------- */

/**
 * Wrap a tool executor so it NEVER throws into the `streamText` loop. A thrown
 * tool (a malformed/partial record, an upstream blip) otherwise surfaces as a
 * raw stream error and shows the generic "hit an unexpected error" message.
 * Instead we log it server-side and return a soft `{ found:false, error }` the
 * model can read and explain, keeping the research pillar degrading gracefully.
 */
function safe<T extends (...args: never[]) => Promise<unknown>>(label: string, fn: T): T {
  const wrapped = async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[agent.tool] ${label} failed:`, msg);
      return { found: false, error: msg, summary: `${label} unavailable: ${msg}` };
    }
  };
  return wrapped as unknown as T;
}

export async function buildAgentTools(
  agentId: string,
  scope?: AgentScope,
  ownerUserId?: string | null,
  viewerOwnsAgent?: boolean,
) {
  const base = {
    research_getEntity: tool({
      description: "Read a CanHav umbrella entity (issuer) profile by slug.",
      inputSchema: schemas.research_getEntity,
      execute: safe("research_getEntity", execGetEntity),
    }),
    research_getStablecoin: tool({
      description: "Read a stablecoin profile (peg target, supply, peg history) by slug.",
      inputSchema: schemas.research_getStablecoin,
      execute: safe("research_getStablecoin", execGetStablecoin),
    }),
    research_getToken: tool({
      description: "Read a governance/utility/yield/LST token profile by slug.",
      inputSchema: schemas.research_getToken,
      execute: safe("research_getToken", execGetToken),
    }),
    research_getRwa: tool({
      description: "Read a real-world-asset (RWA) protocol profile by slug.",
      inputSchema: schemas.research_getRwa,
      execute: safe("research_getRwa", execGetRwa),
    }),
    research_listByCategory: tool({
      description: "List all CanHav profiles in a category (networks/stablecoins/rwas/tokens).",
      inputSchema: schemas.research_listByCategory,
      execute: safe("research_listByCategory", execList),
    }),
    research_getHistory: tool({
      description: "Fetch historical peg (stablecoin) or TVL (RWA) series for a slug.",
      inputSchema: schemas.research_getHistory,
      execute: safe("research_getHistory", execHistory),
    }),
    research_compare: tool({
      description:
        "Screen and rank entities in a sector (optionally one tag, e.g. Credit / Lending) by TVL, tag metrics (APYs, utilization, leverage), risk counts and partnership counts. Call this FIRST for 'which protocol is best/safest' questions, then drill into the top slugs.",
      inputSchema: schemas.research_compare,
      execute: safe("research_compare", execCompare),
    }),
    research_getRisks: tool({
      description:
        "Read an entity's typed risk register (severity/likelihood/impact, mitigation, monitoring signal), risk-posture narrative and incident history. Call this before any risk or safety judgment.",
      inputSchema: schemas.research_getRisks,
      execute: safe("research_getRisks", execGetRisks),
    }),
    research_getPartnerships: tool({
      description:
        "Read an entity's curated partnership rows (partner, date, amount, description; slug when the partner is tracked on-platform).",
      inputSchema: schemas.research_getPartnerships,
      execute: safe("research_getPartnerships", execGetPartnerships),
    }),
    research_getCompetitors: tool({
      description:
        "Read an entity's ranked competitor set with positioning, similarities and differences.",
      inputSchema: schemas.research_getCompetitors,
      execute: safe("research_getCompetitors", execGetCompetitors),
    }),
    research_getAssetCoverage: tool({
      description:
        "Read an entity's curated asset-coverage table: per-asset LTV / liquidation threshold / caps / oracles (lending shape) or maturity / implied APY (fixed-income shape), plus flagged assets. Optionally filter by asset symbol.",
      inputSchema: schemas.research_getAssetCoverage,
      execute: safe("research_getAssetCoverage", execGetAssetCoverage),
    }),
    research_whatChanged: tool({
      description:
        "Compute the change in a stablecoin's peg or an RWA's TVL over a lookback window (default 7 days): start/end values, delta, percent change, min/max.",
      inputSchema: schemas.research_whatChanged,
      execute: safe("research_whatChanged", execWhatChanged),
    }),
    chain_readLive: tool({
      description: "Read live on-chain supply + metadata for a token contract (Arbitrum).",
      inputSchema: schemas.chain_readLive,
      execute: safe("chain_readLive", execChainReadLive),
    }),
    chain_readAaveRates: tool({
      description:
        "Read fresh, live Aave V3 supply/borrow APY + utilization for a reserve member coin (gho, ausdc, ausdt, aweth) on-chain via Alchemy.",
      inputSchema: schemas.chain_readAaveRates,
      execute: safe("chain_readAaveRates", execChainReadAaveRates),
    }),
    skill_load: tool({
      description: "Load a CanHav AgentSkill by id and mark it studied for this agent.",
      inputSchema: schemas.skill_load,
      execute: safe("skill_load", (a: Args<"skill_load">) => execSkillLoad(agentId, a)),
    }),
    memory_remember: tool({
      description:
        "Persist a durable, reusable fact so the agent learns over time (deduped).",
      inputSchema: schemas.memory_remember,
      execute: safe("memory_remember", (a: Args<"memory_remember">) => execRemember(agentId, a)),
    }),
    memory_recall: tool({
      description: "Recall everything this agent has learned so far.",
      inputSchema: schemas.memory_recall,
      execute: safe("memory_recall", () => execRecall(agentId)),
    }),
    frame_load: tool({
      description:
        "Load a data frame the owner pinned for this agent: fresh, cited values for its metrics (peg/TVL/price/supply/Aave rates). Call this FIRST when the user asks about a pinned frame's metrics.",
      inputSchema: schemas.frame_load,
      execute: safe("frame_load", (a: Args<"frame_load">) => execFrameLoad(agentId, a)),
    }),
    knowledge_search: tool({
      description:
        "Search the owner's uploaded knowledge documents for relevant passages. Call this FIRST when a question may be covered by the owner's docs, and cite each passage's sourceLabel/sourceUrl for any fact you use.",
      inputSchema: schemas.knowledge_search,
      execute: safe("knowledge_search", (a: Args<"knowledge_search">) =>
        execKnowledgeSearch(agentId, a),
      ),
    }),
    trade_propose: tool({
      description:
        "Propose a research-gated trade for a coin on this agent's desk: GMX majors (ETH, BTC) execute as perps on Arbitrum Sepolia; a skill token without a GMX market (e.g. AAVE) files a buy/sell recommendation only. Respects owner HITL settings: manual suggestion, propose→approve, or spending-cap auto. Never executes without gate clearance.",
      inputSchema: schemas.trade_propose,
      execute: safe("trade_propose", (a: Args<"trade_propose">) => execTradePropose(agentId, a)),
    }),
    research_refreshCombinedVerdict: tool({
      description:
        "Refresh the combined research verdict for a researched asset (sUSDe/sUSDai: stablecoin + yield passes; ETH/BTC/AAVE: market pass). Call this when trade_propose is blocked for a stale or missing verdict, then retry trade_propose.",
      inputSchema: schemas.research_refreshCombinedVerdict,
      execute: safe("research_refreshCombinedVerdict", (a: Args<"research_refreshCombinedVerdict">) =>
        execRefreshCombinedVerdict(agentId, ownerUserId, a),
      ),
    }),
  };

  // Owner-configured custom tools (typed read-only catalog). Fails soft: a
  // storage hiccup must never take down the base research toolset.
  let custom: Awaited<ReturnType<typeof buildCustomTools>> = {};
  try {
    custom = await buildCustomTools(agentId);
  } catch (e) {
    console.error("[agent.tools] buildCustomTools failed:", e instanceof Error ? e.message : e);
  }

  const tools: ToolSet = { ...base, ...custom };

  // The single write tool — only present when writes are enabled in this
  // environment, so non-configured deployments are byte-for-byte unchanged.
  if (hasDuneWrite()) {
    tools.dune_publishVerdict = tool({
      description:
        "Publish an off-chain risk verdict row to this agent's Dune table so a dashboard can overlay it on the on-chain chart. Only call AFTER reading the on-chain context, and only for a judgment Dune can't natively produce (e.g. an explained risk verdict). Requires the owner to have enabled publishing for this agent.",
      inputSchema: schemas.dune_publishVerdict,
      execute: safe("dune_publishVerdict", (a: Args<"dune_publishVerdict">) =>
        execPublishVerdict(agentId, ownerUserId, a),
      ),
    });
  }

  // Owner-only write tool: registered only when the chatting user owns this
  // agent (the route verifies ownership); the exec re-verifies server-side.
  if (viewerOwnsAgent && ownerUserId) {
    tools.config_updateGuardrails = tool({
      description:
        "Update this agent's trade guardrails (HITL method, per-trade cap, rolling 24h cap) for its owner. Set ONLY the fields the user asked to change; pass null for everything else. Two-phase: call WITHOUT confirm first to get a current-vs-proposed preview, restate the exact change in plain dollars, and only call with confirm: true after the owner explicitly agrees. Caps are whole USD.",
      inputSchema: schemas.config_updateGuardrails,
      execute: safe("config_updateGuardrails", (a: Args<"config_updateGuardrails">) =>
        execUpdateGuardrails(agentId, ownerUserId, a),
      ),
    });
  }

  if (scope?.entitySlug) {
    tools.agent_scope = tool({
      description:
        "Return this agent's bound project (entity) and its member products (stablecoins/tokens/RWAs). Call this first to orient before researching.",
      inputSchema: z.object({}),
      execute: safe("agent_scope", () => execScope(scope)),
    });
  }

  return tools;
}

/* -------------------------------------------------------------------------- */
/* Playground: catalog + single-tool runner                                  */
/* -------------------------------------------------------------------------- */

export interface ToolCatalogEntry {
  name: string;
  description: string;
  sample: Record<string, unknown>;
}

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  { name: "research_getEntity", description: "Read a CanHav umbrella entity by slug.", sample: { slug: "jupiter" } },
  { name: "research_getStablecoin", description: "Read a stablecoin by slug.", sample: { slug: "usdc" } },
  { name: "research_getToken", description: "Read a token by slug.", sample: { slug: "jlp" } },
  { name: "research_getRwa", description: "Read an RWA protocol by slug.", sample: { slug: "centrifuge" } },
  { name: "research_listByCategory", description: "List profiles in a category.", sample: { category: "networks" } },
  { name: "research_getHistory", description: "Historical peg/TVL series for a slug.", sample: { slug: "usdc", metric: "peg" } },
  {
    name: "research_compare",
    description: "Rank entities in a sector/tag by TVL, tag metrics and risk counts.",
    sample: { sector: "Credit", tag: "Lending", limit: 10 },
  },
  {
    name: "research_getRisks",
    description: "Typed risks + risk posture + incidents for an entity.",
    sample: { slug: "aave" },
  },
  {
    name: "research_getPartnerships",
    description: "Curated partnership rows for an entity.",
    sample: { slug: "aave", limit: 10 },
  },
  {
    name: "research_getCompetitors",
    description: "Ranked competitor set for an entity.",
    sample: { slug: "aave" },
  },
  {
    name: "research_getAssetCoverage",
    description: "Per-asset LTV/caps/oracles or maturity/APY rows for an entity.",
    sample: { slug: "aave", asset: "USDC" },
  },
  {
    name: "research_whatChanged",
    description: "Peg/TVL delta over a lookback window for a slug.",
    sample: { slug: "usdc", metric: "peg", days: 7 },
  },
  {
    name: "chain_readLive",
    description: "Live on-chain supply/metadata for a contract.",
    sample: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  },
  {
    name: "chain_readAaveRates",
    description: "Live Aave V3 supply/borrow APY + utilization for a reserve coin.",
    sample: { slug: "gho" },
  },
  { name: "skill_load", description: "Load + study an AgentSkill by id.", sample: { skillId: "jupiter" } },
  {
    name: "memory_remember",
    description: "Persist a learned fact.",
    sample: { fact: "JLP yield is fee-based, not emissions." },
  },
  { name: "memory_recall", description: "Recall learned facts.", sample: {} },
  {
    name: "frame_load",
    description: "Resolve a pinned data frame to fresh, cited metric values.",
    sample: { frameId: "frame_abc123" },
  },
  {
    name: "knowledge_search",
    description: "Search the owner's uploaded knowledge for relevant passages.",
    sample: { query: "yield sustainability", k: 4 },
  },
  {
    name: "dune_publishVerdict",
    description:
      "Publish an off-chain risk verdict to the agent's Dune table (gated: write-enabled env + owner opt-in + ownership).",
    sample: {
      asset: "sUSDe",
      signal: "yield_compression",
      severity: "medium",
      rationale: "APY fell as perp funding turned negative; not a solvency event.",
      confidence: 0.78,
      source_refs: "funding_feed; ethena_gov_post",
    },
  },
  {
    name: "trade_propose",
    description:
      "Propose a research-gated trade on a desk coin (ETH/BTC perps; skill tokens like AAVE are recommendation-only).",
    sample: { asset: "ETH", side: "long", sizeUsdHuman: 10, leverage: 1 },
  },
  {
    name: "research_refreshCombinedVerdict",
    description:
      "Refresh combined verdict for sUSDe/sUSDai/ETH/BTC/AAVE (unblocks stale trade gate).",
    sample: { asset: "sUSDe" },
  },
  {
    name: "config_updateGuardrails",
    description:
      "Owner-only: preview/apply a trade-guardrail change (HITL method + caps in whole USD; confirm: true writes).",
    sample: { tradeHitlMethod: "spending_cap", tradeSpendingCapUsd: 15, confirm: false },
  },
];

export interface RunToolResult {
  ok: boolean;
  summary?: string;
  result?: Record<string, unknown>;
  error?: string;
}

/** Execute a single tool by name with validated args (debug playground). */
export async function runTool(
  agentId: string,
  name: string,
  rawArgs: unknown,
  ownerUserId?: string | null,
): Promise<RunToolResult> {
  // Owner-configured custom tools run by their `custom_<id>` name (no args).
  if (name.startsWith("custom_")) {
    const toolId = name.slice("custom_".length);
    const custom = (await listCustomTools(agentId)).find((t) => t.id === toolId);
    if (!custom) return { ok: false, error: `Unknown custom tool "${name}".` };
    try {
      const { summary, ...rest } = (await executeCustomTool(custom.template)) as {
        summary?: string;
      } & Record<string, unknown>;
      return { ok: true, summary, result: rest };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const schema = (schemas as Record<string, z.ZodTypeAny>)[name];
  if (!schema) return { ok: false, error: `Unknown tool "${name}".` };

  const parsed = schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return { ok: false, error: `Invalid args: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
  }
  const a = parsed.data;

  let out: Record<string, unknown>;
  switch (name) {
    case "research_getEntity":
      out = await execGetEntity(a as Args<"research_getEntity">);
      break;
    case "research_getStablecoin":
      out = await execGetStablecoin(a as Args<"research_getStablecoin">);
      break;
    case "research_getToken":
      out = await execGetToken(a as Args<"research_getToken">);
      break;
    case "research_getRwa":
      out = await execGetRwa(a as Args<"research_getRwa">);
      break;
    case "research_listByCategory":
      out = await execList(a as Args<"research_listByCategory">);
      break;
    case "research_getHistory":
      out = await execHistory(a as Args<"research_getHistory">);
      break;
    case "research_compare":
      out = await execCompare(a as Args<"research_compare">);
      break;
    case "research_getRisks":
      out = await execGetRisks(a as Args<"research_getRisks">);
      break;
    case "research_getPartnerships":
      out = await execGetPartnerships(a as Args<"research_getPartnerships">);
      break;
    case "research_getCompetitors":
      out = await execGetCompetitors(a as Args<"research_getCompetitors">);
      break;
    case "research_getAssetCoverage":
      out = await execGetAssetCoverage(a as Args<"research_getAssetCoverage">);
      break;
    case "research_whatChanged":
      out = await execWhatChanged(a as Args<"research_whatChanged">);
      break;
    case "chain_readLive":
      out = await execChainReadLive(a as Args<"chain_readLive">);
      break;
    case "chain_readAaveRates":
      out = await execChainReadAaveRates(a as Args<"chain_readAaveRates">);
      break;
    case "skill_load":
      out = await execSkillLoad(agentId, a as Args<"skill_load">);
      break;
    case "memory_remember":
      out = await execRemember(agentId, a as Args<"memory_remember">);
      break;
    case "memory_recall":
      out = await execRecall(agentId);
      break;
    case "frame_load":
      out = await execFrameLoad(agentId, a as Args<"frame_load">);
      break;
    case "knowledge_search":
      out = await execKnowledgeSearch(agentId, a as Args<"knowledge_search">);
      break;
    case "dune_publishVerdict":
      out = await execPublishVerdict(agentId, ownerUserId, a as Args<"dune_publishVerdict">);
      break;
    case "trade_propose":
      out = await execTradePropose(agentId, a as Args<"trade_propose">);
      break;
    case "research_refreshCombinedVerdict":
      out = await execRefreshCombinedVerdict(agentId, ownerUserId, a as Args<"research_refreshCombinedVerdict">);
      break;
    case "config_updateGuardrails":
      out = await execUpdateGuardrails(agentId, ownerUserId, a as Args<"config_updateGuardrails">);
      break;
    default:
      return { ok: false, error: `Unhandled tool "${name}".` };
  }

  const { summary, ...rest } = out as { summary?: string } & Record<string, unknown>;
  return { ok: true, summary, result: rest };
}
