import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

import { agentOfferHash } from "@/lib/agent/agentOffer";
import { sanitizeAgentConfig, type AgentConfig } from "@/lib/agent/agentConfig";
import { isAgentCategory, type AgentCategory } from "@/lib/agent/categories";
import type { DataFrame } from "@/lib/types";
import type { AssetSnapshot, ResearchVerdict } from "canhav-agent-service";

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

// Re-exported so server callers can keep importing from the memory layer.
export { AGENT_CATEGORIES, isAgentCategory, type AgentCategory } from "@/lib/agent/categories";

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

/**
 * A specific job a seller agent advertises it can do (e.g. "Weekly risk digest").
 * Buyers pick one when proposing a collaboration; the chosen title/description is
 * committed into the agreement terms (and its hash, on-chain).
 */
export interface AgentService {
  title: string;
  description: string;
}

export interface AgentProfile {
  agentId: string;
  name: string;
  /** Owner-chosen research category (one of five). Null = uncategorized. */
  category: AgentCategory | null;
  skillId: string | null;
  /** The Entity ("project") this agent lives on. Null = general research agent. */
  entitySlug: string | null;
  /** The Privy user id (DID) of the creator/owner. Null for legacy/seeded agents. */
  ownerUserId: string | null;
  /** Owner-authored bio shown in the collaboration marketplace. Null = none. */
  description: string | null;
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
  /**
   * True when a mint was reported by the client but the server has not yet
   * reconciled `ownerOf(agentId)` on-chain. The live verify route promotes this
   * to a confirmed `onChain:true` once the read succeeds.
   */
  pendingVerification: boolean;
  /** Owner opt-in: only discoverable agents appear in collaboration search. */
  discoverable: boolean;
  /** Price (testnet USDC) the agent charges per StrategyPacket. Null = default. */
  collabPriceUsdc: string | null;
  /** Seller ceiling: max interaction "units" (data slices) per exchange. Null = default. */
  collabMaxUnits: number | null;
  /** Specific jobs this seller advertises it can do (chosen by buyers at proposal). */
  services: AgentService[];
  /** Owner-tunable framework (focus, instructions, style). Null = defaults. */
  config: AgentConfig | null;
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
  attachedSkills: (id: string) => `agent:${id}:attached-skills`,
  skillHash: (id: string, skillId: string) => `agent:${id}:skillhash:${skillId}`,
  skillAgents: (skillId: string) => `skill:${skillId}:agents`,
  offerHash: (id: string) => `agent:${id}:offerHash`,
  frames: (id: string) => `agent:${id}:frames`,
  verdicts: (id: string) => `agent:${id}:verdicts`,
  snapshot: (id: string, asset: string) => `agent:${id}:snapshot:${asset}`,
};

export const MAX_VERDICTS = 50;

const combinedVerdictKey = (asset: string) => `combined:verdict:${asset}`;

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
  /** agentId -> attached user-skill ids (the skills the agent advertises). */
  attachedSkills?: Record<string, string[]>;
  /** `${agentId}|${skillId}` -> integrity hash of the advertised skill. */
  skillHashes?: Record<string, string>;
  /** skillId -> agentIds advertising it (reverse index for discovery). */
  skillAgents?: Record<string, string[]>;
  /** agentId -> bundled offer integrity hash. */
  offerHashes?: Record<string, string>;
  /** agentId -> pinned data frames. */
  frames?: Record<string, DataFrame[]>;
  /** agentId -> research verdict log (newest first). */
  verdicts?: Record<string, ResearchVerdict[]>;
  /** `${agentId}|${asset}` -> last snapshot for trend detection. */
  snapshots?: Record<string, AssetSnapshot>;
  /** asset symbol -> latest combined verdict. */
  combinedVerdicts?: Record<string, ResearchVerdict>;
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
      attachedSkills: parsed.attachedSkills ?? {},
      skillHashes: parsed.skillHashes ?? {},
      skillAgents: parsed.skillAgents ?? {},
      offerHashes: parsed.offerHashes ?? {},
      frames: parsed.frames ?? {},
      verdicts: parsed.verdicts ?? {},
      snapshots: parsed.snapshots ?? {},
      combinedVerdicts: parsed.combinedVerdicts ?? {},
    };
  } catch {
    return {
      profiles: {},
      runs: {},
      memory: {},
      skills: {},
      attachedSkills: {},
      skillHashes: {},
      skillAgents: {},
      offerHashes: {},
      frames: {},
      verdicts: {},
      snapshots: {},
      combinedVerdicts: {},
    };
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
    category: isAgentCategory(profile.category) ? profile.category : null,
    entitySlug: profile.entitySlug ?? null,
    ownerUserId: profile.ownerUserId ?? null,
    description: profile.description ?? null,
    associatedProducts: profile.associatedProducts ?? [],
    accountIndex: profile.accountIndex ?? null,
    agentWallet: profile.agentWallet ?? null,
    pendingVerification: profile.pendingVerification ?? false,
    discoverable: profile.discoverable ?? false,
    collabPriceUsdc: profile.collabPriceUsdc ?? null,
    collabMaxUnits: profile.collabMaxUnits ?? null,
    services: Array.isArray(profile.services) ? profile.services : [],
    config: profile.config ? sanitizeAgentConfig(profile.config) : null,
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
  category?: AgentCategory | null;
  skillId?: string | null;
  entitySlug?: string | null;
  ownerUserId?: string | null;
  description?: string | null;
  associatedProducts?: AgentProductRef[];
  accountIndex?: number | null;
  agentAddress?: string | null;
  agentURI?: string | null;
  agentWallet?: string | null;
  onChain?: boolean;
  pendingVerification?: boolean;
  discoverable?: boolean;
  collabPriceUsdc?: string | null;
  collabMaxUnits?: number | null;
  services?: AgentService[];
  config?: AgentConfig | null;
}

/** Create or update an agent profile and register it in the index. */
export async function seedAgentProfile(input: SeedProfileInput): Promise<AgentProfile> {
  const existing = await getAgentProfile(input.agentId);
  const profile: AgentProfile = {
    agentId: input.agentId,
    name: input.name || existing?.name || "CanHav Agent",
    category: input.category !== undefined ? input.category : (existing?.category ?? null),
    skillId: input.skillId ?? existing?.skillId ?? null,
    entitySlug: input.entitySlug ?? existing?.entitySlug ?? null,
    ownerUserId: input.ownerUserId ?? existing?.ownerUserId ?? null,
    description: input.description !== undefined ? input.description : (existing?.description ?? null),
    associatedProducts:
      input.associatedProducts ?? existing?.associatedProducts ?? [],
    accountIndex: input.accountIndex ?? existing?.accountIndex ?? null,
    agentAddress: input.agentAddress ?? existing?.agentAddress ?? null,
    agentURI: input.agentURI ?? existing?.agentURI ?? null,
    agentWallet: input.agentWallet ?? existing?.agentWallet ?? null,
    onChain: input.onChain ?? existing?.onChain ?? false,
    pendingVerification: input.pendingVerification ?? existing?.pendingVerification ?? false,
    discoverable: input.discoverable ?? existing?.discoverable ?? false,
    collabPriceUsdc: input.collabPriceUsdc ?? existing?.collabPriceUsdc ?? null,
    collabMaxUnits: input.collabMaxUnits ?? existing?.collabMaxUnits ?? null,
    services: input.services ?? existing?.services ?? [],
    config: input.config !== undefined ? input.config : (existing?.config ?? null),
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

/**
 * Owner-only: rename an agent and/or set its research category. Returns null
 * if the agent doesn't exist.
 */
export async function setAgentIdentity(
  agentId: string,
  updates: { name?: string; category?: AgentCategory | null },
): Promise<AgentProfile | null> {
  const existing = await getAgentProfile(agentId);
  if (!existing) return null;
  return seedAgentProfile({
    agentId,
    name: updates.name?.trim() || existing.name,
    category: updates.category !== undefined ? updates.category : existing.category,
  });
}

/**
 * Owner opt-in toggle: flip whether the agent is discoverable for collaboration
 * and (optionally) set its per-StrategyPacket price. Returns null if unknown.
 */
export async function setAgentDiscoverability(
  agentId: string,
  discoverable: boolean,
  collabPriceUsdc?: string | null,
): Promise<AgentProfile | null> {
  const existing = await getAgentProfile(agentId);
  if (!existing) return null;
  return seedAgentProfile({
    agentId,
    name: existing.name,
    discoverable,
    collabPriceUsdc: collabPriceUsdc !== undefined ? collabPriceUsdc : existing.collabPriceUsdc,
  });
}

/**
 * Owner-only: set the marketplace-facing collaboration settings in one shot —
 * discoverability, price, a public description, and the per-interaction unit
 * ceiling sellers advertise. Returns null if the agent doesn't exist.
 */
export async function setAgentCollabSettings(
  agentId: string,
  updates: {
    discoverable?: boolean;
    collabPriceUsdc?: string | null;
    description?: string | null;
    collabMaxUnits?: number | null;
    services?: AgentService[];
  },
): Promise<AgentProfile | null> {
  const existing = await getAgentProfile(agentId);
  if (!existing) return null;
  return seedAgentProfile({
    agentId,
    name: existing.name,
    discoverable: updates.discoverable !== undefined ? updates.discoverable : existing.discoverable,
    collabPriceUsdc:
      updates.collabPriceUsdc !== undefined ? updates.collabPriceUsdc : existing.collabPriceUsdc,
    description: updates.description !== undefined ? updates.description : existing.description,
    collabMaxUnits:
      updates.collabMaxUnits !== undefined ? updates.collabMaxUnits : existing.collabMaxUnits,
    services: updates.services !== undefined ? updates.services : existing.services,
  });
}

/**
 * Reconcile the stored `onChain` flag with a confirmed on-chain read. Called by
 * the verify route: when a mint that was persisted as `pendingVerification` is
 * confirmed owned by its smart account, promote it to a trusted `onChain:true`.
 * Returns the updated profile, or null if nothing changed / unknown agent.
 */
export async function confirmAgentOnChain(agentId: string): Promise<AgentProfile | null> {
  const existing = await getAgentProfile(agentId);
  if (!existing) return null;
  if (existing.onChain && !existing.pendingVerification) return existing;
  return seedAgentProfile({
    agentId,
    name: existing.name,
    onChain: true,
    pendingVerification: false,
  });
}

/**
 * Migrate an agent's canonical owner to `userId`. Used to durably reclaim an
 * agent whose off-chain `ownerUserId` link was orphaned by an identity change
 * (e.g. the passkey → Privy DID migration) once on-chain ownership has been
 * reconciled to the user's wallet. Returns the updated profile, or null if the
 * agent doesn't exist or already has this owner.
 */
export async function setAgentOwner(
  agentId: string,
  userId: string,
): Promise<AgentProfile | null> {
  const existing = await getAgentProfile(agentId);
  if (!existing) return null;
  if (existing.ownerUserId === userId) return existing;
  return seedAgentProfile({ agentId, name: existing.name, ownerUserId: userId });
}

/**
 * Owner-only: persist the agent's framework config (already sanitized by the
 * route). Returns null if the agent doesn't exist.
 */
export async function setAgentConfig(
  agentId: string,
  config: AgentConfig | null,
): Promise<AgentProfile | null> {
  const existing = await getAgentProfile(agentId);
  if (!existing) return null;
  return seedAgentProfile({ agentId, name: existing.name, config });
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
/* Attached user skills (the supply an agent advertises for collaboration)    */
/* -------------------------------------------------------------------------- */

/**
 * Record that an agent has a user-authored skill attached for training and
 * bundled collaboration offers. Recomputes the agent's offer hash. Idempotent.
 */
export async function attachSkillToAgent(
  agentId: string,
  skillId: string,
  skillHash: string,
): Promise<void> {
  if (!agentId || !skillId) return;
  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.sadd(key.attachedSkills(agentId), skillId);
    await redis.set(key.skillHash(agentId, skillId), skillHash);
    await redis.sadd(key.skillAgents(skillId), agentId);
  } else {
    const store = readFile();
    const attached = new Set(store.attachedSkills?.[agentId] ?? []);
    attached.add(skillId);
    store.attachedSkills = { ...(store.attachedSkills ?? {}), [agentId]: [...attached] };
    store.skillHashes = { ...(store.skillHashes ?? {}), [`${agentId}|${skillId}`]: skillHash };
    const agentsForSkill = new Set(store.skillAgents?.[skillId] ?? []);
    agentsForSkill.add(agentId);
    store.skillAgents = { ...(store.skillAgents ?? {}), [skillId]: [...agentsForSkill] };
    writeFile(store);
  }
  await refreshAgentOfferHash(agentId);
}

/** Recompute and persist the bundled offer hash after attach/detach. */
export async function refreshAgentOfferHash(agentId: string): Promise<`0x${string}` | null> {
  const hash = await agentOfferHash(agentId);
  if (hasUpstash()) {
    const redis = getRedisClient();
    if (hash) await redis.set(key.offerHash(agentId), hash);
    else await redis.del(key.offerHash(agentId));
  } else {
    const store = readFile();
    if (!store.offerHashes) store.offerHashes = {};
    if (hash) store.offerHashes[agentId] = hash;
    else delete store.offerHashes[agentId];
    writeFile(store);
  }
  return hash;
}

export async function getStoredAgentOfferHash(agentId: string): Promise<string | null> {
  if (hasUpstash()) {
    return ((await getRedisClient().get(key.offerHash(agentId))) as string | null) ?? null;
  }
  return readFile().offerHashes?.[agentId] ?? null;
}

export async function getAttachedSkillIds(agentId: string): Promise<string[]> {
  if (hasUpstash()) {
    return ((await getRedisClient().smembers(key.attachedSkills(agentId))) as string[] | null) ?? [];
  }
  return readFile().attachedSkills?.[agentId] ?? [];
}

export async function getAgentSkillHash(agentId: string, skillId: string): Promise<string | null> {
  if (hasUpstash()) {
    return ((await getRedisClient().get(key.skillHash(agentId, skillId))) as string | null) ?? null;
  }
  return readFile().skillHashes?.[`${agentId}|${skillId}`] ?? null;
}

/** Agents that advertise a given user-skill id (reverse index for discovery). */
export async function getAgentsForSkill(skillId: string): Promise<string[]> {
  if (!skillId) return [];
  if (hasUpstash()) {
    return ((await getRedisClient().smembers(key.skillAgents(skillId))) as string[] | null) ?? [];
  }
  return readFile().skillAgents?.[skillId] ?? [];
}

/* -------------------------------------------------------------------------- */
/* Data frames (user-pinned metric compositions; resolved by frame_load)      */
/* -------------------------------------------------------------------------- */

/** Per-agent cap — frames render into the system prompt, so keep them bounded. */
export const MAX_DATA_FRAMES = 10;

export async function listDataFrames(agentId: string): Promise<DataFrame[]> {
  if (hasUpstash()) {
    const raw = await getRedisClient().get(key.frames(agentId));
    return coerce<DataFrame[]>(raw) ?? [];
  }
  return readFile().frames?.[agentId] ?? [];
}

async function writeDataFrames(agentId: string, frames: DataFrame[]): Promise<void> {
  if (hasUpstash()) {
    await getRedisClient().set(key.frames(agentId), JSON.stringify(frames));
  } else {
    const store = readFile();
    store.frames = { ...(store.frames ?? {}), [agentId]: frames };
    writeFile(store);
  }
}

/**
 * Insert or replace (by id) a pinned data frame. Returns null when the cap is
 * hit for a NEW frame (replacing an existing one is always allowed).
 */
export async function saveDataFrame(agentId: string, frame: DataFrame): Promise<DataFrame | null> {
  const frames = await listDataFrames(agentId);
  const idx = frames.findIndex((f) => f.id === frame.id);
  if (idx >= 0) {
    frames[idx] = frame;
  } else {
    if (frames.length >= MAX_DATA_FRAMES) return null;
    frames.push(frame);
  }
  await writeDataFrames(agentId, frames);
  return frame;
}

export async function deleteDataFrame(agentId: string, frameId: string): Promise<boolean> {
  const frames = await listDataFrames(agentId);
  const next = frames.filter((f) => f.id !== frameId);
  if (next.length === frames.length) return false;
  await writeDataFrames(agentId, next);
  return true;
}

export async function getDataFrame(agentId: string, frameId: string): Promise<DataFrame | null> {
  const frames = await listDataFrames(agentId);
  return frames.find((f) => f.id === frameId) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Research verdicts (stablecoin / yield agent loop)                          */
/* -------------------------------------------------------------------------- */

function snapshotFileKey(agentId: string, asset: string): string {
  return `${agentId}|${asset}`;
}

export async function listVerdicts(agentId: string, limit = MAX_VERDICTS): Promise<ResearchVerdict[]> {
  if (hasUpstash()) {
    const raw = await getRedisClient().lrange(key.verdicts(agentId), 0, limit - 1);
    return raw
      .map((v) => coerce<ResearchVerdict>(v))
      .filter((v): v is ResearchVerdict => v != null);
  }
  return (readFile().verdicts?.[agentId] ?? []).slice(0, limit);
}

export async function appendVerdict(agentId: string, verdict: ResearchVerdict): Promise<void> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.lpush(key.verdicts(agentId), JSON.stringify(verdict));
    await redis.ltrim(key.verdicts(agentId), 0, MAX_VERDICTS - 1);
  } else {
    const store = readFile();
    const list = store.verdicts?.[agentId] ?? [];
    store.verdicts = {
      ...(store.verdicts ?? {}),
      [agentId]: [verdict, ...list].slice(0, MAX_VERDICTS),
    };
    writeFile(store);
  }
}

export async function getLastSnapshot(agentId: string, asset: string): Promise<AssetSnapshot | null> {
  if (hasUpstash()) {
    return coerce<AssetSnapshot>(await getRedisClient().get(key.snapshot(agentId, asset)));
  }
  const store = readFile();
  return store.snapshots?.[snapshotFileKey(agentId, asset)] ?? null;
}

export async function setSnapshot(
  agentId: string,
  asset: string,
  snapshot: AssetSnapshot,
): Promise<void> {
  if (hasUpstash()) {
    await getRedisClient().set(key.snapshot(agentId, asset), JSON.stringify(snapshot));
  } else {
    const store = readFile();
    store.snapshots = {
      ...(store.snapshots ?? {}),
      [snapshotFileKey(agentId, asset)]: snapshot,
    };
    writeFile(store);
  }
}

export async function getCombinedVerdict(asset: string): Promise<ResearchVerdict | null> {
  if (hasUpstash()) {
    return coerce<ResearchVerdict>(await getRedisClient().get(combinedVerdictKey(asset)));
  }
  return readFile().combinedVerdicts?.[asset] ?? null;
}

export async function setCombinedVerdict(asset: string, verdict: ResearchVerdict): Promise<void> {
  if (hasUpstash()) {
    await getRedisClient().set(combinedVerdictKey(asset), JSON.stringify(verdict));
  } else {
    const store = readFile();
    store.combinedVerdicts = { ...(store.combinedVerdicts ?? {}), [asset]: verdict };
    writeFile(store);
  }
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
/** Enrichment counts that feed the agent's level (the training gamification). */
export interface AgentEnrichmentCounts {
  frames?: number;
  knowledgeDocs?: number;
  customTools?: number;
  /** Memory facts tagged source "owner-correction". */
  corrections?: number;
}

/**
 * Level = f(learned facts, studied skills, enrichment). Each enrichment action
 * (pin a frame, upload a doc, add a tool, correct an answer) visibly moves the
 * level, so owners see the agent grow as they train it.
 */
export function agentLevel(
  memoryCount: number,
  skillCount: number,
  enrichment?: AgentEnrichmentCounts,
): number {
  const e = enrichment ?? {};
  const score =
    memoryCount +
    skillCount * 3 +
    (e.frames ?? 0) * 2 +
    (e.knowledgeDocs ?? 0) * 2 +
    (e.customTools ?? 0) * 2 +
    (e.corrections ?? 0);
  return Math.max(1, Math.floor(score / 5) + 1);
}
