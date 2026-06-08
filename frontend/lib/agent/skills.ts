import "server-only";

import { getApprovedEntities, getApprovedEntityBySlug } from "@/lib/data";
import { deriveSecurityStatus } from "@/lib/security";
import type {
  AgentSkill,
  AgentSkillAction,
  AgentSkillFact,
  AgentSkillSection,
  EntityProfile,
  SourceRef,
} from "@/lib/types";

/**
 * CanHav AgentSkills.
 *
 * A skill is the machine-readable knowledge bundle a user turns into an agent
 * (the ERC-8004 registration file is derived from it, see agent-service). The
 * store does not seed skills today, so we derive one deterministically from each
 * umbrella Entity profile already in the store. Deterministic = safe to
 * prerender / ISR (no Date.now()).
 *
 * Actions are all read-only `research:*` capabilities — they map 1:1 to the
 * research tools the agent loop exposes (lib/agent/tools.ts), and the platform
 * is research-only, so no write/execute capabilities are emitted.
 */

const SKILL_VERSION = "1.0.0";

/** Stable skill id for an entity-derived skill (also the [id] route param). */
export function entitySkillId(slug: string): string {
  return slug;
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

function buildFacts(profile: EntityProfile): AgentSkillFact[] {
  const meta = profile.arbitrumPortalMetadata;
  const security = deriveSecurityStatus({
    isPubliclyAudited: meta.isPubliclyAudited,
    auditUrl: profile.audits?.find((a) => a.url)?.url ?? null,
    audits: profile.audits?.map((a) => ({ url: a.url })) ?? null,
  });
  const scale = profile.currentScale;

  const facts: AgentSkillFact[] = [
    { key: "category", value: "Umbrella Entity" },
    { key: "symbol", value: profile.symbol || "—" },
    { key: "tagline", value: profile.tagline || profile.description.slice(0, 120) },
    {
      key: "arbitrumNative",
      value: meta.isArbitrumNative ? "yes" : "no",
    },
    {
      key: "chains",
      value: meta.chains.length ? meta.chains.join(", ") : "unspecified",
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

  if (meta.foundedDate) facts.push({ key: "founded", value: meta.foundedDate });

  const tvl = compactUsd(scale.tvlUsd);
  if (tvl) facts.push({ key: "tvl", value: tvl });
  const mcap = compactUsd(scale.marketCapUsd);
  if (mcap) facts.push({ key: "marketCap", value: mcap });
  const users = compactNumber(scale.users);
  if (users) facts.push({ key: "users", value: users });
  if (scale.aprPct !== null) facts.push({ key: "apr", value: `${scale.aprPct}%` });

  return facts;
}

function buildSections(profile: EntityProfile): AgentSkillSection[] {
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

function buildActions(profile: EntityProfile): AgentSkillAction[] {
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
      description: "List the member coins (stablecoins / tokens / RWAs) under this entity.",
      signature: `research_listByCategory({ category: "entities" })`,
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

function buildSources(profile: EntityProfile): SourceRef[] {
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
export function buildSkillFromEntity(profile: EntityProfile): AgentSkill {
  return {
    id: entitySkillId(profile.slug),
    title: `${profile.name} — Research Skill`,
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

/** All entity-derived skills, sorted by title. */
export async function getAgentSkills(): Promise<AgentSkill[]> {
  const entities = await getApprovedEntities();
  return entities.map(buildSkillFromEntity).sort((a, b) => a.title.localeCompare(b.title));
}

/** Resolve a single skill by id (entity slug). Returns null if not found. */
export async function getAgentSkillById(id: string): Promise<AgentSkill | null> {
  const entity = await getApprovedEntityBySlug(id);
  return entity ? buildSkillFromEntity(entity) : null;
}
