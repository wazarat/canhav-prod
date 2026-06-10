import "server-only";

import { tool } from "ai";
import { z } from "zod";

import {
  getApprovedEntities,
  getApprovedEntityBySlug,
  getApprovedRwaBySlug,
  getApprovedRwas,
  getApprovedStablecoinBySlug,
  getApprovedStablecoins,
  getApprovedTokenBySlug,
  getApprovedTokens,
} from "@/lib/data";
import { appendMemory, getMemory, markSkillStudied } from "@/lib/agent/memory";
import { resolveEntityBinding, type AgentScope } from "@/lib/agent/entity-binding";
import { getAgentSkillById } from "@/lib/agent/skills";
import { fetchRecentTransfers, fetchTokenMetadata, fetchTotalSupply } from "@/lib/server/alchemy";
import { fetchPegHistory, fetchTvlHistory } from "@/lib/server/dune";
import type { OffchainFact } from "@/lib/types";

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
 * The CanHav research agent's toolset.
 *
 * Every tool is a thin, read-only wrapper over data that already exists
 * (lib/data.ts / dune.ts / alchemy.ts / skills + memory). No new data sources,
 * no write/execute trading tools — the platform is research-only. Each executor
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
    category: z.enum(["entities", "stablecoins", "rwas", "tokens"]),
  }),
  research_getHistory: z.object({
    slug: z.string(),
    metric: z.enum(["peg", "tvl"]),
  }),
  chain_readLive: z.object({
    address: z.string().describe("Token contract address (Arbitrum)."),
    decimals: z.number().int().optional(),
  }),
  skill_load: z.object({ skillId: z.string().describe("Skill id (entity slug).") }),
  memory_remember: z.object({
    fact: z.string().describe("A durable, reusable fact to remember."),
    source: z.string().optional(),
  }),
  memory_recall: z.object({}),
};

type Args<K extends keyof typeof schemas> = z.infer<(typeof schemas)[K]>;

/* -------------------------------------------------------------------------- */
/* Executors (shared by the LLM tools and the playground)                     */
/* -------------------------------------------------------------------------- */

async function execGetEntity(a: Args<"research_getEntity">) {
  const p = await getApprovedEntityBySlug(a.slug);
  if (!p) return { found: false, summary: `No CanHav entity for "${a.slug}".` };
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
    offchainFacts: compactFacts(p.offchainFacts),
    contractAddress: p.contractAddress ?? null,
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
    offchainFacts: compactFacts(p.offchainFacts),
    summary: `Read RWA ${p.name} (${p.assetClass}).`,
  };
}

async function execList(a: Args<"research_listByCategory">) {
  const items =
    a.category === "entities"
      ? await getApprovedEntities()
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
  const points =
    a.metric === "peg" ? await fetchPegHistory(a.slug) : await fetchTvlHistory(a.slug);
  return {
    slug: a.slug,
    metric: a.metric,
    available: points.length > 0,
    count: points.length,
    points: points.slice(-30),
    summary: points.length
      ? `Pulled ${points.length} ${a.metric} points for ${a.slug}.`
      : `No ${a.metric} history for ${a.slug} (Dune query not configured).`,
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

/* -------------------------------------------------------------------------- */
/* AI SDK tool definitions (used by the streamText loop)                      */
/* -------------------------------------------------------------------------- */

export function buildAgentTools(agentId: string, scope?: AgentScope) {
  const base = {
    research_getEntity: tool({
      description: "Read a CanHav umbrella entity (issuer) profile by slug.",
      inputSchema: schemas.research_getEntity,
      execute: execGetEntity,
    }),
    research_getStablecoin: tool({
      description: "Read a stablecoin profile (peg target, supply, peg history) by slug.",
      inputSchema: schemas.research_getStablecoin,
      execute: execGetStablecoin,
    }),
    research_getToken: tool({
      description: "Read a governance/utility/yield/LST token profile by slug.",
      inputSchema: schemas.research_getToken,
      execute: execGetToken,
    }),
    research_getRwa: tool({
      description: "Read a real-world-asset (RWA) protocol profile by slug.",
      inputSchema: schemas.research_getRwa,
      execute: execGetRwa,
    }),
    research_listByCategory: tool({
      description: "List all CanHav profiles in a category (entities/stablecoins/rwas/tokens).",
      inputSchema: schemas.research_listByCategory,
      execute: execList,
    }),
    research_getHistory: tool({
      description: "Fetch historical peg (stablecoin) or TVL (RWA) series for a slug.",
      inputSchema: schemas.research_getHistory,
      execute: execHistory,
    }),
    chain_readLive: tool({
      description: "Read live on-chain supply + metadata for a token contract (Arbitrum).",
      inputSchema: schemas.chain_readLive,
      execute: execChainReadLive,
    }),
    skill_load: tool({
      description: "Load a CanHav AgentSkill by id and mark it studied for this agent.",
      inputSchema: schemas.skill_load,
      execute: (a: Args<"skill_load">) => execSkillLoad(agentId, a),
    }),
    memory_remember: tool({
      description:
        "Persist a durable, reusable fact so the agent learns over time (deduped).",
      inputSchema: schemas.memory_remember,
      execute: (a: Args<"memory_remember">) => execRemember(agentId, a),
    }),
    memory_recall: tool({
      description: "Recall everything this agent has learned so far.",
      inputSchema: schemas.memory_recall,
      execute: () => execRecall(agentId),
    }),
  };

  if (scope?.entitySlug) {
    return {
      ...base,
      agent_scope: tool({
        description:
          "Return this agent's bound project (entity) and its member products (stablecoins/tokens/RWAs). Call this first to orient before researching.",
        inputSchema: z.object({}),
        execute: () => execScope(scope),
      }),
    };
  }

  return base;
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
  { name: "research_listByCategory", description: "List profiles in a category.", sample: { category: "entities" } },
  { name: "research_getHistory", description: "Historical peg/TVL series for a slug.", sample: { slug: "usdc", metric: "peg" } },
  {
    name: "chain_readLive",
    description: "Live on-chain supply/metadata for a contract.",
    sample: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  },
  { name: "skill_load", description: "Load + study an AgentSkill by id.", sample: { skillId: "jupiter" } },
  {
    name: "memory_remember",
    description: "Persist a learned fact.",
    sample: { fact: "JLP yield is fee-based, not emissions." },
  },
  { name: "memory_recall", description: "Recall learned facts.", sample: {} },
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
): Promise<RunToolResult> {
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
    case "skill_load":
      out = await execSkillLoad(agentId, a as Args<"skill_load">);
      break;
    case "memory_remember":
      out = await execRemember(agentId, a as Args<"memory_remember">);
      break;
    case "memory_recall":
      out = await execRecall(agentId);
      break;
    default:
      return { ok: false, error: `Unhandled tool "${name}".` };
  }

  const { summary, ...rest } = out as { summary?: string } & Record<string, unknown>;
  return { ok: true, summary, result: rest };
}
