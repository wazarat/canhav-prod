import "server-only";

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
import { deriveSecurityStatus } from "@/lib/security";
import type {
  AgentSkill,
  AgentSkillAction,
  AgentSkillFact,
  AgentSkillSection,
  MemberCoinCategory,
  NetworkProfile,
  RiskSeverity,
  RwaProfile,
  SourceRef,
  StablecoinProfile,
  TokenProfile,
} from "@/lib/types";

/**
 * CanHav AgentSkills.
 *
 * A skill is the machine-readable knowledge bundle a user turns into an agent
 * (the ERC-8004 registration file is derived from it, see agent-service). The
 * store does not seed skills today, so we derive one deterministically from
 * each approved profile already in the store: umbrella Entities AND their
 * member products (stablecoins, RWAs, tokens). Deterministic = safe to
 * prerender / ISR (no Date.now()).
 *
 * Skill ids: entity skills keep the bare entity slug (backward compatible with
 * minted agents whose skillId === entitySlug); product skills are namespaced
 * (`stablecoin:{slug}` / `rwa:{slug}` / `token:{slug}`) so product slugs can
 * never collide with entity slugs.
 *
 * Actions are all read-only `research:*` capabilities — they map 1:1 to the
 * research tools the agent loop exposes (lib/agent/tools.ts), and the platform
 * is research-only, so no write/execute capabilities are emitted.
 */

const SKILL_VERSION = "1.0.0";

/** Which catalog surface a platform skill was derived from. */
export type SkillGroup = "entity" | "stablecoin" | "rwa" | "token";

/** A platform-derived skill plus the catalog group it belongs to. */
export interface PlatformSkill extends AgentSkill {
  group: SkillGroup;
}

export const SKILL_GROUPS: { id: SkillGroup; label: string }[] = [
  { id: "entity", label: "Networks" },
  { id: "stablecoin", label: "Stablecoins" },
  { id: "rwa", label: "RWAs" },
  { id: "token", label: "Tokens" },
];

/** Stable skill id for an entity-derived skill (also the [id] route param). */
export function entitySkillId(slug: string): string {
  return slug;
}

/** Namespaced skill id for a product-derived skill. */
export function productSkillId(group: Exclude<SkillGroup, "entity">, slug: string): string {
  return `${group}:${slug}`;
}

function compactUsd(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [threshold, suffix] of units) {
    if (abs >= threshold) return `$${(value / threshold).toFixed(2)}${suffix}`;
  }
  return `$${value.toFixed(0)}`;
}

function compactNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

function buildFacts(profile: NetworkProfile): AgentSkillFact[] {
  const meta = profile.arbitrumPortalMetadata;
  const security = deriveSecurityStatus({
    isPubliclyAudited: meta.isPubliclyAudited,
    auditUrl: profile.audits?.find((a) => a.url)?.url ?? null,
    audits: profile.audits?.map((a) => ({ url: a.url })) ?? null,
  });
  const scale = profile.currentScale;
  // Tier-1 universal metrics take precedence over curated/portal fallbacks.
  const universal = profile.universalMetrics ?? null;
  const chains = universal?.identity.chains.value?.length
    ? universal.identity.chains.value
    : meta.chains;
  const founded = universal?.identity.foundedDate.value ?? meta.foundedDate ?? null;
  const tvlUsd = universal?.tvl.tvlUsd.value ?? scale.tvlUsd;
  const mcapUsd = universal?.market.marketCapUsd.value ?? scale.marketCapUsd;
  const priceUsd = universal?.market.priceUsd.value ?? null;
  const change24h = universal?.market.priceChangePct.d1.value ?? null;
  const change7d = universal?.market.priceChangePct.d7.value ?? null;
  const change30d = universal?.market.priceChangePct.d30.value ?? null;
  const fdvUsd = universal?.market.fdvUsd.value ?? null;
  const rank = universal?.market.marketCapRank.value ?? null;
  const tvlChange1d = universal?.tvl.tvlChangePct.d1.value ?? null;
  const tvlChange7d = universal?.tvl.tvlChangePct.d7.value ?? null;
  const syncedAt = universal?.syncedAt ?? null;

  const facts: AgentSkillFact[] = [
    { key: "category", value: "Network" },
    { key: "symbol", value: profile.symbol || "—" },
    { key: "tagline", value: profile.tagline || profile.description.slice(0, 120) },
    {
      key: "arbitrumNative",
      value: meta.isArbitrumNative ? "yes" : "no",
    },
    {
      key: "chains",
      value: chains.length ? chains.join(", ") : "unspecified",
    },
    { key: "security", value: `${security.status} (${security.source})` },
    {
      key: "memberCoins",
      value: profile.memberCoins.length
        ? `${profile.memberCoins.length} (${profile.memberCoins
            .map((c) => c.symbol || c.name)
            .join(", ")})`
        : "none tracked",
    },
  ];

  if (founded) facts.push({ key: "founded", value: founded });

  const tvl = compactUsd(tvlUsd);
  if (tvl) facts.push({ key: "tvl", value: tvl });
  const mcap = compactUsd(mcapUsd);
  if (mcap) facts.push({ key: "marketCap", value: mcap });
  if (priceUsd != null) {
    facts.push({ key: "price", value: `$${priceUsd < 1 ? priceUsd.toFixed(4) : priceUsd.toFixed(2)}` });
  }
  if (change24h != null) facts.push({ key: "priceChange24h", value: `${change24h.toFixed(1)}%` });
  if (change7d != null) facts.push({ key: "priceChange7d", value: `${change7d.toFixed(1)}%` });
  if (change30d != null) facts.push({ key: "priceChange30d", value: `${change30d.toFixed(1)}%` });
  const fdv = compactUsd(fdvUsd);
  if (fdv) facts.push({ key: "fdv", value: fdv });
  if (rank != null) facts.push({ key: "marketCapRank", value: `#${rank}` });
  if (tvlChange1d != null) facts.push({ key: "tvlChange1d", value: `${tvlChange1d.toFixed(1)}%` });
  if (tvlChange7d != null) facts.push({ key: "tvlChange7d", value: `${tvlChange7d.toFixed(1)}%` });
  if (syncedAt) facts.push({ key: "universalMetricsSyncedAt", value: syncedAt });
  const users = compactNumber(scale.users);
  if (users) facts.push({ key: "users", value: users });
  if (scale.aprPct !== null) facts.push({ key: "apr", value: `${scale.aprPct}%` });

  return facts;
}

function buildSections(profile: NetworkProfile): AgentSkillSection[] {
  const sections: AgentSkillSection[] = [];

  const overview = [profile.description, profile.longDescription].filter(Boolean).join("\n\n");
  if (overview) sections.push({ heading: "Overview", body: overview });

  if (profile.differentiator) {
    sections.push({ heading: "What makes it different", body: profile.differentiator });
  }

  if (profile.components.length) {
    sections.push({
      heading: "Components",
      body: profile.components.map((c) => `- ${c.name}: ${c.description}`).join("\n"),
    });
  }

  if (profile.memberCoins.length) {
    sections.push({
      heading: "Member coins",
      body: profile.memberCoins
        .map((c) => `- ${c.name} (${c.symbol}) — ${c.category}${c.role ? `, ${c.role}` : ""}`)
        .join("\n"),
    });
  }

  if (profile.risks.length) {
    sections.push({
      heading: "Risks",
      body: profile.risks.map((r) => `- ${r.category}: ${r.description}`).join("\n"),
    });
  }

  if (profile.tradFiComparison.length) {
    sections.push({
      heading: "TradFi analogue",
      body: profile.tradFiComparison
        .map((t) => `- ${t.product}: similar — ${t.similarity}; differs — ${t.differences}`)
        .join("\n"),
    });
  }

  return sections;
}

function buildActions(profile: NetworkProfile): AgentSkillAction[] {
  const slug = profile.slug;
  return [
    {
      name: "getProfile",
      description: `Read the CanHav profile for ${profile.name}.`,
      signature: `research_getEntity({ slug: "${slug}" })`,
      readOnly: true,
    },
    {
      name: "listMembers",
      description: "List the member coins (stablecoins / tokens / RWAs) under this network.",
      signature: `research_listByCategory({ category: "networks" })`,
      readOnly: true,
    },
    {
      name: "readLiveMetrics",
      description: "Read live on-chain supply / metadata for a member contract (Arbitrum).",
      signature: `chain_readLive({ address: "0x..." })`,
      readOnly: true,
    },
    {
      name: "getHistory",
      description: "Pull historical peg / TVL series for a member protocol.",
      signature: `research_getHistory({ slug: "<member-slug>", metric: "peg" | "tvl" })`,
      readOnly: true,
    },
  ];
}

function buildSources(profile: NetworkProfile): SourceRef[] {
  if (profile.sources?.length) return profile.sources;
  const sources: SourceRef[] = [];
  if (profile.website) sources.push({ label: "Website", url: profile.website });
  if (profile.officialDocs) sources.push({ label: "Docs", url: profile.officialDocs });
  if (profile.twitter) sources.push({ label: "Twitter", url: profile.twitter });
  return sources;
}

const GLOSSARY: { term: string; definition: string }[] = [
  { term: "TVL", definition: "Total value locked — assets held or managed by a protocol, in USD." },
  { term: "APR", definition: "Annual percentage rate — yield before compounding." },
  { term: "RWA", definition: "Real-world asset — an off-chain asset represented as an on-chain token." },
  {
    term: "ERC-8004",
    definition: "Trustless-agent identity standard; an agent's portable on-chain identity (ERC-721).",
  },
];

/** Deterministically derive an AgentSkill from an umbrella Entity profile. */
export function buildSkillFromEntity(profile: NetworkProfile): PlatformSkill {
  return {
    id: entitySkillId(profile.slug),
    group: "entity",
    title: `${profile.name} · Research Skill`,
    summary: profile.tagline || profile.description,
    facts: buildFacts(profile),
    sections: buildSections(profile),
    actions: buildActions(profile),
    glossary: GLOSSARY,
    sources: buildSources(profile),
    version: SKILL_VERSION,
    updatedAt: profile.updatedAt || profile.createdAt || "",
  };
}

/* -------------------------------------------------------------------------- */
/* Product-derived skills (stablecoins / RWAs / tokens)                       */
/* -------------------------------------------------------------------------- */

function productSources(profile: {
  website: string | null;
  twitter: string | null;
  coingecko: string | null;
  auditUrl: string | null;
}): SourceRef[] {
  const sources: SourceRef[] = [];
  if (profile.website) sources.push({ label: "Website", url: profile.website });
  if (profile.coingecko) sources.push({ label: "CoinGecko", url: profile.coingecko });
  if (profile.auditUrl) sources.push({ label: "Audit", url: profile.auditUrl });
  if (profile.twitter) sources.push({ label: "Twitter", url: profile.twitter });
  return sources;
}

function productActions(
  tool: "research_getStablecoin" | "research_getRwa" | "research_getToken",
  slug: string,
  historyMetric: "peg" | "tvl" | null,
): AgentSkillAction[] {
  const actions: AgentSkillAction[] = [
    {
      name: "getProfile",
      description: `Read the CanHav profile for this protocol.`,
      signature: `${tool}({ slug: "${slug}" })`,
      readOnly: true,
    },
    {
      name: "readLiveMetrics",
      description: "Read live on-chain supply / metadata for the contract (Arbitrum).",
      signature: `chain_readLive({ address: "0x..." })`,
      readOnly: true,
    },
  ];
  if (historyMetric) {
    actions.push({
      name: "getHistory",
      description: `Pull the historical ${historyMetric} series.`,
      signature: `research_getHistory({ slug: "${slug}", metric: "${historyMetric}" })`,
      readOnly: true,
    });
  }
  return actions;
}

function commonProductFacts(meta: {
  chains: string[];
  isArbitrumNative: boolean;
}): AgentSkillFact[] {
  return [
    { key: "arbitrumNative", value: meta.isArbitrumNative ? "yes" : "no" },
    { key: "chains", value: meta.chains.length ? meta.chains.join(", ") : "unspecified" },
  ];
}

/** Deterministically derive an AgentSkill from a stablecoin profile. */
export function buildSkillFromStablecoin(profile: StablecoinProfile): PlatformSkill {
  const facts: AgentSkillFact[] = [
    { key: "category", value: "Stablecoin" },
    { key: "symbol", value: profile.symbol || "—" },
    { key: "pegTarget", value: profile.pegTarget },
    ...commonProductFacts(profile.arbitrumPortalMetadata),
  ];
  if (profile.subCategory) facts.push({ key: "subCategory", value: profile.subCategory });
  if (profile.pegMechanism) facts.push({ key: "pegMechanism", value: profile.pegMechanism });
  // Issuer-reported backing mechanism (DeFi Llama) when the curated one is absent.
  if (!profile.pegMechanism && profile.issuanceMeta?.pegMechanism) {
    facts.push({ key: "pegMechanism", value: profile.issuanceMeta.pegMechanism });
  }
  const supply = compactNumber(profile.totalSupply.value);
  if (supply) facts.push({ key: "circulatingSupply", value: supply });
  if (profile.chainDistribution?.chains.length) {
    facts.push({
      key: "chainFootprint",
      value: profile.chainDistribution.chains
        .slice(0, 5)
        .map((c) => `${c.chain} ${compactNumber(c.value) ?? c.value}`)
        .join(" · "),
    });
  }
  if (profile.entitySlug) facts.push({ key: "parentEntity", value: profile.entitySlug });

  const sections: AgentSkillSection[] = [];
  if (profile.description) sections.push({ heading: "Overview", body: profile.description });
  if (profile.issuanceMeta?.mintRedeemDescription) {
    sections.push({
      heading: "Mint / redeem",
      body: profile.issuanceMeta.mintRedeemDescription,
    });
  }
  if (profile.lendingMarket) {
    sections.push({
      heading: "Lending market",
      body: "This coin is an active Aave V3 reserve — supply/borrow rates are readable live.",
    });
  }

  return {
    id: productSkillId("stablecoin", profile.slug),
    group: "stablecoin",
    title: `${profile.name} (${profile.symbol}) · Stablecoin Skill`,
    summary: profile.description.slice(0, 200),
    facts,
    sections,
    actions: productActions("research_getStablecoin", profile.slug, "peg"),
    glossary: GLOSSARY,
    sources: productSources(profile),
    version: SKILL_VERSION,
    updatedAt: profile.updatedAt || profile.createdAt || "",
  };
}

/** Deterministically derive an AgentSkill from an RWA profile. */
export function buildSkillFromRwa(profile: RwaProfile): PlatformSkill {
  const facts: AgentSkillFact[] = [
    { key: "category", value: "RWA" },
    { key: "symbol", value: profile.symbol || "—" },
    { key: "assetClass", value: profile.assetClass },
    ...commonProductFacts(profile.arbitrumPortalMetadata),
  ];
  const tvl = compactUsd(profile.totalValueLocked.value);
  if (tvl) facts.push({ key: "tvl", value: tvl });
  if (profile.chainDistribution?.chains.length) {
    facts.push({
      key: "tvlByChain",
      value: profile.chainDistribution.chains
        .slice(0, 5)
        .map((c) => `${c.chain} ${compactUsd(c.value) ?? c.value}`)
        .join(" · "),
    });
  }
  if (profile.entitySlug) facts.push({ key: "parentEntity", value: profile.entitySlug });

  const sections: AgentSkillSection[] = [];
  if (profile.description) sections.push({ heading: "Overview", body: profile.description });

  return {
    id: productSkillId("rwa", profile.slug),
    group: "rwa",
    title: `${profile.name} · RWA Skill`,
    summary: profile.description.slice(0, 200),
    facts,
    sections,
    actions: productActions("research_getRwa", profile.slug, "tvl"),
    glossary: GLOSSARY,
    sources: productSources(profile),
    version: SKILL_VERSION,
    updatedAt: profile.updatedAt || profile.createdAt || "",
  };
}

/** Deterministically derive an AgentSkill from a token profile. */
export function buildSkillFromToken(profile: TokenProfile): PlatformSkill {
  const facts: AgentSkillFact[] = [
    { key: "category", value: "Token" },
    { key: "symbol", value: profile.symbol || "—" },
    { key: "tokenType", value: profile.tokenType },
    ...commonProductFacts(profile.arbitrumPortalMetadata),
  ];
  if (profile.subCategory) facts.push({ key: "subCategory", value: profile.subCategory });
  const supply = compactNumber(profile.totalSupply.value);
  if (supply) facts.push({ key: "circulatingSupply", value: supply });
  const mcap = compactUsd(profile.market?.marketCapUsd?.value ?? null);
  if (mcap) facts.push({ key: "marketCap", value: mcap });
  if (profile.entitySlug) facts.push({ key: "parentEntity", value: profile.entitySlug });

  const sections: AgentSkillSection[] = [];
  const overview = [profile.description, profile.longDescription].filter(Boolean).join("\n\n");
  if (overview) sections.push({ heading: "Overview", body: overview });
  if (profile.typedRisks?.length) {
    sections.push({
      heading: "Risks",
      body: profile.typedRisks.map((r) => `- ${r.category}: ${r.description}`).join("\n"),
    });
  }

  return {
    id: productSkillId("token", profile.slug),
    group: "token",
    title: `${profile.name} (${profile.symbol}) · Token Skill`,
    summary: profile.description.slice(0, 200),
    facts,
    sections,
    actions: productActions("research_getToken", profile.slug, null),
    glossary: GLOSSARY,
    sources: productSources(profile),
    version: SKILL_VERSION,
    updatedAt: profile.updatedAt || profile.createdAt || "",
  };
}

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

/** All platform skills (entities + stablecoins + RWAs + tokens), grouped order. */
export async function getAgentSkills(): Promise<PlatformSkill[]> {
  const [networks, stablecoins, rwas, tokens] = await Promise.all([
    getApprovedNetworks(),
    getApprovedStablecoins(),
    getApprovedRwas(),
    getApprovedTokens(),
  ]);
  const byTitle = (a: PlatformSkill, b: PlatformSkill) => a.title.localeCompare(b.title);
  return [
    ...networks.map(buildSkillFromEntity).sort(byTitle),
    ...stablecoins.map(buildSkillFromStablecoin).sort(byTitle),
    ...rwas.map(buildSkillFromRwa).sort(byTitle),
    ...tokens.map(buildSkillFromToken).sort(byTitle),
  ];
}

/** Entity-derived skills only (the mintable, agent-binding skills). */
export async function getEntityAgentSkills(): Promise<PlatformSkill[]> {
  const networks = await getApprovedNetworks();
  return networks.map(buildSkillFromEntity).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Resolve a single platform skill by id. Bare ids are entity slugs (legacy);
 * `stablecoin:` / `rwa:` / `token:` prefixes resolve product skills.
 */
export async function getAgentSkillById(id: string): Promise<PlatformSkill | null> {
  const sep = id.indexOf(":");
  if (sep > 0) {
    const group = id.slice(0, sep);
    const slug = id.slice(sep + 1);
    if (group === "stablecoin") {
      const profile = await getApprovedStablecoinBySlug(slug);
      return profile ? buildSkillFromStablecoin(profile) : null;
    }
    if (group === "rwa") {
      const profile = await getApprovedRwaBySlug(slug);
      return profile ? buildSkillFromRwa(profile) : null;
    }
    if (group === "token") {
      const profile = await getApprovedTokenBySlug(slug);
      return profile ? buildSkillFromToken(profile) : null;
    }
    return null;
  }
  const entity = await getApprovedNetworkBySlug(id);
  return entity ? buildSkillFromEntity(entity) : null;
}

/* -------------------------------------------------------------------------- */
/* Launch suggestions                                                         */
/* -------------------------------------------------------------------------- */

export type SkillSuggestionReason = "dependency" | "related" | "its token";

export interface SkillSuggestion {
  id: string;
  title: string;
  reason: SkillSuggestionReason;
}

const SEVERITY_RANK: Record<RiskSeverity, number> = { high: 0, medium: 1, low: 2 };

const MEMBER_COIN_GROUP: Partial<Record<MemberCoinCategory, Exclude<SkillGroup, "entity">>> = {
  Stablecoin: "stablecoin",
  Token: "token",
  RWA: "rwa",
  // Receipt tokens have no skill group and are intentionally absent.
};

/**
 * Related-skill suggestions for an entity core skill, derived from the
 * entity's own profile: dependency entities first (most severe first), then
 * competitor peers, then its member-coin product skills. Per-source quotas
 * keep the mix representative instead of letting one source fill the list.
 * Unknown slugs and off-platform names (no store entity) are skipped, so the
 * result only ever contains resolvable platform skill ids.
 */
export async function suggestSkillsForEntity(slug: string): Promise<SkillSuggestion[]> {
  const profile = await getApprovedNetworkBySlug(slug);
  if (!profile) return [];
  const networks = await getApprovedNetworks();
  const networkBySlug = new Map(networks.map((n) => [n.slug, n]));

  const seen = new Set<string>([entitySkillId(slug)]);
  const out: SkillSuggestion[] = [];
  const add = (id: string, title: string, reason: SkillSuggestionReason) => {
    if (seen.has(id)) return false;
    seen.add(id);
    out.push({ id, title, reason });
    return true;
  };

  // Dependencies, most severe first (stable within a severity tier).
  const deps = (profile.dependencies ?? [])
    .filter((dep) => Boolean(dep.slug))
    .sort(
      (a, b) =>
        (a.severity ? SEVERITY_RANK[a.severity] : 3) -
        (b.severity ? SEVERITY_RANK[b.severity] : 3),
    );
  let taken = 0;
  for (const dep of deps) {
    if (taken >= 2) break;
    const net = networkBySlug.get(dep.slug as string);
    if (net && add(entitySkillId(net.slug), net.name, "dependency")) taken += 1;
  }

  // Competitor peers by curated/derived rank.
  const competitors = [...(profile.competitors ?? [])].sort((a, b) => a.rank - b.rank);
  taken = 0;
  for (const competitor of competitors) {
    if (taken >= 2) break;
    if (!competitor.slug) continue;
    const net = networkBySlug.get(competitor.slug);
    if (net && add(entitySkillId(net.slug), net.name, "related")) taken += 1;
  }

  // Member coins: at most one per product category, two total.
  const usedGroups = new Set<string>();
  taken = 0;
  for (const coin of profile.memberCoins) {
    if (taken >= 2) break;
    const group = MEMBER_COIN_GROUP[coin.category];
    if (!group || usedGroups.has(group)) continue;
    const id = productSkillId(group, coin.slug);
    if (seen.has(id)) continue;
    const exists =
      group === "stablecoin"
        ? await getApprovedStablecoinBySlug(coin.slug)
        : group === "rwa"
          ? await getApprovedRwaBySlug(coin.slug)
          : await getApprovedTokenBySlug(coin.slug);
    if (exists && add(id, `${coin.name} (${coin.symbol})`, "its token")) {
      usedGroups.add(group);
      taken += 1;
    }
  }

  return out;
}
