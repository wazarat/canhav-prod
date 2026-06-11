import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * Agent memory layer (no Supabase).
 *
 * Production persists to Upstash Redis under an `agent:*` namespace; offline dev
 * (no Upstash creds) falls back to a single JSON file
 * (`backend/data/agent-store.json`, gitignored). Both back the same API so the
 * UI and the LLM loop behave identically.
 *
 * Keys:
 *   agent:index            -> set of known agentIds
 *   agent:{id}:profile     -> JSON profile string
 *   agent:{id}:runs        -> list of run JSON strings (newest first)
 *   agent:{id}:memory      -> list of learned-fact JSON strings (oldest first)
 *   agent:{id}:skills      -> set of studied skillIds
 */

export const AGENT_CHAIN = "arbitrum-sepolia" as const;

export interface AgentToolCall {
  name: string;
  args?: unknown;
  summary: string;
}

export interface AgentRun {
  id: string;
  ts: string;
  question: string;
  toolCalls: AgentToolCall[];
  answer: string;
  learned: string[];
}

export interface AgentMemoryFact {
  id: string;
  ts: string;
  text: string;
  source?: string | null;
}

/** A member product (stablecoin / token / RWA) this agent is scoped to. */
export interface AgentProductRef {
  slug: string;
  symbol: string;
  category: "Stablecoin" | "Token" | "RWA";
}

export interface AgentProfile {
  agentId: string;
  name: string;
  skillId: string | null;
  /** The Entity ("project") this agent lives on. Null = general research agent. */
  entitySlug: string | null;
  /** Member products of the bound entity, denormalized for fast scoping. */
  associatedProducts: AgentProductRef[];
  /** Deterministic salt used for this agent's ZeroDev sub-account (per project). */
  accountIndex: number | null;
  agentAddress: string | null;
  agentURI: string | null;
  /** Verified ERC-8004 `agentWallet` (signed binding); null until verified/cleared. */
  agentWallet: string | null;
  /** Whether an ERC-8004 identity was minted on-chain for this agent. */
  onChain: boolean;
  chain: typeof AGENT_CHAIN;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSnapshot {
  profile: AgentProfile | null;
  memory: AgentMemoryFact[];
  runs: AgentRun[];
  studiedSkills: string[];
}

const INDEX_KEY = "agent:index";
const key = {
  profile: (id: string) => `agent:${id}:profile`,
  runs: (id: string) => `agent:${id}:runs`,
  memory: (id: string) => `agent:${id}:memory`,
  skills: (id: string) => `agent:${id}:skills`,
};

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** @upstash/redis may return objects or JSON strings; normalize either to T. */
function coerce<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

/* -------------------------------------------------------------------------- */
/* Local file fallback (offline dev only)                                     */
/* -------------------------------------------------------------------------- */

interface FileStore {
  profiles: Record<string, AgentProfile>;
  runs: Record<string, AgentRun[]>;
  memory: Record<string, AgentMemoryFact[]>;
  skills: Record<string, string[]>;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "agent-store.json");
}

function readFile(): FileStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileStore>;
    return {
      profiles: parsed.profiles ?? {},
      runs: parsed.runs ?? {},
      memory: parsed.memory ?? {},
      skills: parsed.skills ?? {},
    };
  } catch {
    return { profiles: {}, runs: {}, memory: {}, skills: {} };
  }
}

function writeFile(store: FileStore): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    // Read-only filesystem (e.g. Vercel without Upstash) — best-effort no-op.
  }
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

/** Backfill defaults for profiles persisted before the project-binding fields. */
function normalizeProfile(profile: AgentProfile | null): AgentProfile | null {
  if (!profile) return null;
  return {
    ...profile,
    entitySlug: profile.entitySlug ?? null,
    associatedProducts: profile.associatedProducts ?? [],
    accountIndex: profile.accountIndex ?? null,
    agentWallet: profile.agentWallet ?? null,
  };
}

export async function getAgentProfile(agentId: string): Promise<AgentProfile | null> {
  if (hasUpstash()) {
    return normalizeProfile(coerce<AgentProfile>(await getRedisClient().get(key.profile(agentId))));
  }
  return normalizeProfile(readFile().profiles[agentId] ?? null);
}

export interface SeedProfileInput {
  agentId: string;
  name: string;
  skillId?: string | null;
  entitySlug?: string | null;
  associatedProducts?: AgentProductRef[];
  accountIndex?: number | null;
  agentAddress?: string | null;
  agentURI?: string | null;
  agentWallet?: string | null;
  onChain?: boolean;
}

/** Create or update an agent profile and register it in the index. */
export async function seedAgentProfile(input: SeedProfileInput): Promise<AgentProfile> {
  const existing = await getAgentProfile(input.agentId);
  const profile: AgentProfile = {
    agentId: input.agentId,
    name: input.name || existing?.name || "CanHav Agent",
    skillId: input.skillId ?? existing?.skillId ?? null,
    entitySlug: input.entitySlug ?? existing?.entitySlug ?? null,
    associatedProducts:
      input.associatedProducts ?? existing?.associatedProducts ?? [],
    accountIndex: input.accountIndex ?? existing?.accountIndex ?? null,
    agentAddress: input.agentAddress ?? existing?.agentAddress ?? null,
    agentURI: input.agentURI ?? existing?.agentURI ?? null,
    agentWallet: input.agentWallet ?? existing?.agentWallet ?? null,
    onChain: input.onChain ?? existing?.onChain ?? false,
    chain: AGENT_CHAIN,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };

  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.set(key.profile(profile.agentId), JSON.stringify(profile));
    await redis.sadd(INDEX_KEY, profile.agentId);
  } else {
    const store = readFile();
    store.profiles[profile.agentId] = profile;
    writeFile(store);
  }
  return profile;
}

export async function listAgents(): Promise<AgentProfile[]> {
  if (hasUpstash()) {
    const ids = ((await getRedisClient().smembers(INDEX_KEY)) as string[] | null) ?? [];
    const profiles = await Promise.all(ids.map((id) => getAgentProfile(id)));
    return profiles
      .filter((p): p is AgentProfile => Boolean(p))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return Object.values(readFile().profiles)
    .map((p) => normalizeProfile(p)!)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Resolve an agent profile by its smart-account address (case-insensitive). The
 * agent roster is tiny, so a scan is fine; powers the address-based agent-card
 * route whose URL is stable and known before the ERC-8004 tokenId is minted.
 */
export async function getAgentByAddress(address: string): Promise<AgentProfile | null> {
  if (!address) return null;
  const target = address.toLowerCase();
  const all = await listAgents();
  return all.find((p) => (p.agentAddress ?? "").toLowerCase() === target) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Runs                                                                       */
/* -------------------------------------------------------------------------- */

export async function appendRun(agentId: string, run: AgentRun): Promise<void> {
  if (hasUpstash()) {
    await getRedisClient().lpush(key.runs(agentId), JSON.stringify(run));
  } else {
    const store = readFile();
    store.runs[agentId] = [run, ...(store.runs[agentId] ?? [])];
    writeFile(store);
  }
}

export async function getRuns(agentId: string, limit = 20): Promise<AgentRun[]> {
  if (hasUpstash()) {
    const raw = (await getRedisClient().lrange(key.runs(agentId), 0, limit - 1)) as unknown[];
    return raw.map((v) => coerce<AgentRun>(v)).filter((r): r is AgentRun => Boolean(r));
  }
  return (readFile().runs[agentId] ?? []).slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Memory (learned facts)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Append a learned fact, de-duplicated by text (case-insensitive). Returns the
 * stored fact, or null if it was empty or already known.
 */
export async function appendMemory(
  agentId: string,
  fact: string | { text: string; source?: string | null },
): Promise<AgentMemoryFact | null> {
  const text = (typeof fact === "string" ? fact : fact.text).trim();
  if (!text) return null;
  const source = typeof fact === "string" ? null : (fact.source ?? null);

  const existing = await getMemory(agentId);
  if (existing.some((f) => f.text.toLowerCase() === text.toLowerCase())) return null;

  const entry: AgentMemoryFact = { id: randomId("fact"), ts: nowIso(), text, source };
  if (hasUpstash()) {
    await getRedisClient().rpush(key.memory(agentId), JSON.stringify(entry));
  } else {
    const store = readFile();
    store.memory[agentId] = [...(store.memory[agentId] ?? []), entry];
    writeFile(store);
  }
  return entry;
}

export async function getMemory(agentId: string): Promise<AgentMemoryFact[]> {
  if (hasUpstash()) {
    const raw = (await getRedisClient().lrange(key.memory(agentId), 0, -1)) as unknown[];
    return raw.map((v) => coerce<AgentMemoryFact>(v)).filter((f): f is AgentMemoryFact => Boolean(f));
  }
  return readFile().memory[agentId] ?? [];
}

/* -------------------------------------------------------------------------- */
/* Studied skills                                                             */
/* -------------------------------------------------------------------------- */

export async function markSkillStudied(agentId: string, skillId: string): Promise<void> {
  if (!skillId) return;
  if (hasUpstash()) {
    await getRedisClient().sadd(key.skills(agentId), skillId);
  } else {
    const store = readFile();
    const set = new Set(store.skills[agentId] ?? []);
    set.add(skillId);
    store.skills[agentId] = [...set];
    writeFile(store);
  }
}

export async function getStudiedSkills(agentId: string): Promise<string[]> {
  if (hasUpstash()) {
    return ((await getRedisClient().smembers(key.skills(agentId))) as string[] | null) ?? [];
  }
  return readFile().skills[agentId] ?? [];
}

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                 */
/* -------------------------------------------------------------------------- */

export async function getAgentSnapshot(agentId: string): Promise<AgentSnapshot> {
  const [profile, memory, runs, studiedSkills] = await Promise.all([
    getAgentProfile(agentId),
    getMemory(agentId),
    getRuns(agentId),
    getStudiedSkills(agentId),
  ]);
  return { profile, memory, runs, studiedSkills };
}

/**
 * Derive a playful "researcher level" from how much the agent has learned.
 * Memory facts count 1 each, studied skills count 3 each.
 */
export function agentLevel(memoryCount: number, skillCount: number): number {
  const score = memoryCount + skillCount * 3;
  return Math.max(1, Math.floor(score / 5) + 1);
}
