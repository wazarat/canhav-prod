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
import { appendMemory, getDataFrame, getMemory, markSkillStudied } from "@/lib/agent/memory";
import { buildCustomTools, executeCustomTool, listCustomTools } from "@/lib/agent/customTools";
import { resolveDataFrame } from "@/lib/agent/dataframes";
import { canPublishVerdict, claimVerdictSlot } from "@/lib/agent/dunePublish";
import { execTradePropose } from "@/lib/agent/trade/propose";
import { searchKnowledge } from "@/lib/agent/knowledge";
import { resolveEntityBinding, type AgentScope } from "@/lib/agent/entity-binding";
import { getAgentSkillById } from "@/lib/agent/skills";
import { fetchReserveRatesForSlug } from "@/lib/server/aave";
import { fetchRecentTransfers, fetchTokenMetadata, fetchTotalSupply } from "@/lib/server/alchemy";
import { ensureVerdictTable, hasDuneWrite, insertVerdict } from "@/lib/server/dune";
import { resolvePegSeries, resolveTvlSeries } from "@/lib/server/series";
import type { LendingMarket, OffchainFact } from "@/lib/types";

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
    asset: z.string().describe("Research asset symbol, e.g. sUSDe or sUSDai."),
    side: z.enum(["long", "short"]),
    sizeUsdHuman: z.number().positive().optional().describe("Approx USD notional (default 10)."),
    leverage: z.number().int().min(1).max(2).optional(),
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
        "Propose a research-gated GMX perp trade on Arbitrum Sepolia for a CanHav-researched coin (sUSDe, sUSDai). Respects owner HITL settings: manual suggestion, propose→approve, or spending-cap auto. Never executes without gate clearance.",
      inputSchema: schemas.trade_propose,
      execute: safe("trade_propose", (a: Args<"trade_propose">) => execTradePropose(agentId, a)),
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
    description: "Propose a research-gated GMX perp on sUSDe/sUSDai (Arbitrum Sepolia).",
    sample: { asset: "sUSDe", side: "long", sizeUsdHuman: 10, leverage: 1 },
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
    default:
      return { ok: false, error: `Unhandled tool "${name}".` };
  }

  const { summary, ...rest } = out as { summary?: string } & Record<string, unknown>;
  return { ok: true, summary, result: rest };
}
