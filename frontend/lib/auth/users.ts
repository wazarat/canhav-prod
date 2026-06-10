import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

import { seedAgentProfile } from "@/lib/agent/memory";
import { userAgentId } from "@/lib/agent/user-agent";

export interface UserProfile {
  userId: string;
  authenticatorId: string;
  /**
   * Human-readable name the user is identified by (captured on first passkey
   * login). The passkey is the wallet/login; this is the thin profile layer on
   * top — no second auth provider. Null until the user provides one.
   */
  displayName: string | null;
  /**
   * The user's primary smart-account (wallet) address. Optional — derived later
   * (e.g. via SIWE + ERC-1271 wallet-proof, see note below) or backfilled.
   */
  address: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

const USER_INDEX = "user:index";

const key = {
  profile: (userId: string) => `user:${userId}:profile`,
  agents: (userId: string) => `user:${userId}:agents`,
  entityAgent: (userId: string, entitySlug: string) =>
    `user:${userId}:entity:${entitySlug}:agent`,
};

function nowIso(): string {
  return new Date().toISOString();
}

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

interface FileUserStore {
  profiles: Record<string, UserProfile>;
  agents: Record<string, string[]>;
  /** `${userId}|${entitySlug}` -> agentId */
  entityAgents: Record<string, string>;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "user-store.json");
}

function readFile(): FileUserStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileUserStore>;
    return {
      profiles: parsed.profiles ?? {},
      agents: parsed.agents ?? {},
      entityAgents: parsed.entityAgents ?? {},
    };
  } catch {
    return { profiles: {}, agents: {}, entityAgents: {} };
  }
}

function writeFile(store: FileUserStore): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    // best-effort offline dev
  }
}

/** Backfill the profile fields added after the first release (name/address). */
function normalizeUserProfile(profile: UserProfile | null): UserProfile | null {
  if (!profile) return null;
  return {
    ...profile,
    displayName: profile.displayName ?? null,
    address: profile.address ?? null,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (hasUpstash()) {
    return normalizeUserProfile(coerce<UserProfile>(await getRedisClient().get(key.profile(userId))));
  }
  return normalizeUserProfile(readFile().profiles[userId] ?? null);
}

/**
 * Upsert a user after passkey register/login and ensure their default research
 * agent profile exists. `displayName`/`address` are preserved across logins
 * (only overwritten when a non-empty value is supplied).
 */
export async function upsertUserFromPasskey(input: {
  userId: string;
  authenticatorId: string;
  displayName?: string | null;
  address?: string | null;
}): Promise<UserProfile> {
  const existing = await getUserProfile(input.userId);
  const profile: UserProfile = {
    userId: input.userId,
    authenticatorId: input.authenticatorId,
    displayName: (input.displayName?.trim() || existing?.displayName) ?? null,
    address: (input.address?.trim() || existing?.address) ?? null,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    lastLoginAt: nowIso(),
  };

  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.set(key.profile(profile.userId), JSON.stringify(profile));
    await redis.sadd(USER_INDEX, profile.userId);
  } else {
    const store = readFile();
    store.profiles[profile.userId] = profile;
    writeFile(store);
  }

  const agentId = userAgentId(profile.userId);
  await seedAgentProfile({
    agentId,
    name: "My Research Agent",
    skillId: null,
    onChain: false,
  });

  return profile;
}

/**
 * Update mutable profile fields (the human name, and optionally the proven
 * wallet address). Returns null if the user doesn't exist yet.
 *
 * NOTE (auth roadmap): the passkey → ZeroDev Kernel account is the only login.
 * To cryptographically PROVE the wallet owns this session (not just trust the
 * HMAC cookie), the next layer is SIWE (EIP-4361) verified via ERC-1271 (smart
 * account signatures) — at which point `address` is set from the proven signer.
 * ENS / subnames can later supply a human-readable on-chain identifier. Both are
 * additive and out of scope for this layer.
 */
export async function updateUserProfile(
  userId: string,
  patch: { displayName?: string | null; address?: string | null },
): Promise<UserProfile | null> {
  const existing = await getUserProfile(userId);
  if (!existing) return null;
  const updated: UserProfile = {
    ...existing,
    displayName:
      patch.displayName !== undefined ? (patch.displayName?.trim() || null) : existing.displayName,
    address: patch.address !== undefined ? (patch.address?.trim() || null) : existing.address,
    updatedAt: nowIso(),
  };

  if (hasUpstash()) {
    await getRedisClient().set(key.profile(userId), JSON.stringify(updated));
  } else {
    const store = readFile();
    store.profiles[userId] = updated;
    writeFile(store);
  }
  return updated;
}

export async function linkAgentToUser(userId: string, agentId: string): Promise<void> {
  if (!userId || !agentId) return;
  if (hasUpstash()) {
    await getRedisClient().sadd(key.agents(userId), agentId);
  } else {
    const store = readFile();
    const set = new Set(store.agents[userId] ?? []);
    set.add(agentId);
    store.agents[userId] = [...set];
    writeFile(store);
  }
}

export async function listUserAgentIds(userId: string): Promise<string[]> {
  if (hasUpstash()) {
    return ((await getRedisClient().smembers(key.agents(userId))) as string[] | null) ?? [];
  }
  return readFile().agents[userId] ?? [];
}

/** Record which agent this wallet uses for a given project (Entity slug). */
export async function setUserEntityAgent(
  userId: string,
  entitySlug: string,
  agentId: string,
): Promise<void> {
  if (!userId || !entitySlug || !agentId) return;
  if (hasUpstash()) {
    await getRedisClient().set(key.entityAgent(userId, entitySlug), agentId);
  } else {
    const store = readFile();
    store.entityAgents[`${userId}|${entitySlug}`] = agentId;
    writeFile(store);
  }
}

/** Resolve the wallet's agent for a project (Entity slug), or null. */
export async function getUserEntityAgent(
  userId: string,
  entitySlug: string,
): Promise<string | null> {
  if (!userId || !entitySlug) return null;
  if (hasUpstash()) {
    return ((await getRedisClient().get(key.entityAgent(userId, entitySlug))) as string | null) ?? null;
  }
  return readFile().entityAgents[`${userId}|${entitySlug}`] ?? null;
}
