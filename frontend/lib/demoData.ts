import { jlpToken } from "@/lib/mock/jlpMockData";
import { jupToken } from "@/lib/mock/jupMockData";
import { jupiterEntity } from "@/lib/mock/jupiterMockData";
import type {
  AgentSkill,
  DataSource,
  EntityProfile,
  Sourced,
  TokenProfile,
} from "@/lib/types";

/** Demo profiles merged into store results when the live store lacks them. */
export const DEMO_ENTITIES: EntityProfile[] = [jupiterEntity];
export const DEMO_TOKENS: TokenProfile[] = [jlpToken, jupToken];

function isSourced(value: unknown): value is Sourced<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "dataSource" in value &&
    "value" in value
  );
}

function collectDataSources(value: unknown, found: DataSource[]): void {
  if (value === null || value === undefined) return;
  if (isSourced(value)) {
    found.push(value.dataSource);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectDataSources(item, found));
    return;
  }
  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((v) =>
      collectDataSources(v, found),
    );
  }
}

/** True when any nested block carries dataSource: "demo". */
export function hasDemoData(profile: EntityProfile | TokenProfile): boolean {
  const sources: DataSource[] = [];
  collectDataSources(profile, sources);
  return sources.includes("demo");
}

/** Merge demo optional fields onto a store profile, or inject demo when absent. */
export function mergeDemoEntity(
  storeItems: EntityProfile[],
  demo: EntityProfile,
): EntityProfile[] {
  const idx = storeItems.findIndex((p) => p.slug === demo.slug);
  if (idx === -1) return [...storeItems, demo];
  const merged = { ...storeItems[idx], ...demo, slug: storeItems[idx].slug };
  const next = [...storeItems];
  next[idx] = merged;
  return next;
}

export function mergeDemoToken(
  storeItems: TokenProfile[],
  demo: TokenProfile,
): TokenProfile[] {
  const idx = storeItems.findIndex((p) => p.slug === demo.slug);
  if (idx === -1) return [...storeItems, demo];
  const merged = { ...storeItems[idx], ...demo, slug: storeItems[idx].slug };
  const next = [...storeItems];
  next[idx] = merged;
  return next;
}

export function mergeAllDemoEntities(storeItems: EntityProfile[]): EntityProfile[] {
  return DEMO_ENTITIES.reduce(mergeDemoEntity, [...storeItems]);
}

export function mergeAllDemoTokens(storeItems: TokenProfile[]): TokenProfile[] {
  return DEMO_TOKENS.reduce(mergeDemoToken, [...storeItems]);
}

const AGENT_SKILLS: AgentSkill[] = [
  ...(jupiterEntity.agentSkill ? [jupiterEntity.agentSkill] : []),
  ...(jlpToken.agentSkill ? [jlpToken.agentSkill] : []),
];

export function getAgentSkillById(id: string): AgentSkill | null {
  return AGENT_SKILLS.find((s) => s.id === id) ?? null;
}
