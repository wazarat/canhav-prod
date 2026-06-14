import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

import { getAgentProfile, seedAgentProfile } from "@/lib/agent/memory";
import { userAgentId } from "@/lib/agent/user-agent";

export interface UserProfile {
  /** Stable user id = the Privy DID (e.g. `did:privy:...`) from social login. */
  userId: string;
  /** Linked email captured from the Privy account, when available. */
  email: string | null;
  /**
   * Human-readable name the user is identified by. Privy social login is the
   * wallet/login; this is the thin profile layer on top. Null until provided.
   */
  displayName: string | null;
  /**
   * The user's canonical ZeroDev Kernel smart-account (wallet) address, derived
   * from their Privy embedded signer (index 0). Null until first derived. This
   * is the wallet "treasury" that holds the user's spendable tCNHV credits.
   */
  address: string | null;
  /**
   * Whether the one-time tCNHV starting grant (10,000) has already been minted
   * to this user's wallet. Guards against double-granting across logins.
   */
  tcnhvGranted: boolean;
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

/** Backfill optional profile fields (email/name/address). */
function normalizeUserProfile(profile: UserProfile | null): UserProfile | null {
  if (!profile) return null;
  return {
    ...profile,
    email: profile.email ?? null,
    displayName: profile.displayName ?? null,
    address: profile.address ?? null,
    tcnhvGranted: profile.tcnhvGranted ?? false,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (hasUpstash()) {
    return normalizeUserProfile(coerce<UserProfile>(await getRedisClient().get(key.profile(userId))));
  }
  return normalizeUserProfile(readFile().profiles[userId] ?? null);
}

/**
 * Upsert a user after a verified Privy social login and ensure their default
 * research agent profile exists. `email`/`displayName`/`address` are preserved
 * across logins (only overwritten when a non-empty value is supplied).
 */
export async function upsertUserFromPrivy(input: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  address?: string | null;
}): Promise<UserProfile> {
  const existing = await getUserProfile(input.userId);
  const profile: UserProfile = {
    userId: input.userId,
    email: (input.email?.trim() || existing?.email) ?? null,
    displayName: (input.displayName?.trim() || existing?.displayName) ?? null,
    address: (input.address?.trim() || existing?.address) ?? null,
    tcnhvGranted: existing?.tcnhvGranted ?? false,
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
 * NOTE: login is a Privy social login → self-custodial embedded wallet →
 * ZeroDev Kernel account. The session cookie is minted only after the Privy
 * access token is verified server-side (see lib/auth/privy.ts), so the cookie is
 * backed by a real, verified identity. `address` holds the canonical Kernel
 * smart account derived from the embedded signer.
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

/**
 * Mark the one-time tCNHV starting grant as delivered, and persist the wallet
 * address it was minted to (so the canonical treasury wallet is recorded even if
 * login didn't carry it). Idempotent: returns null if the user doesn't exist.
 */
export async function markTcnhvGranted(
  userId: string,
  address: string,
): Promise<UserProfile | null> {
  const existing = await getUserProfile(userId);
  if (!existing) return null;
  const updated: UserProfile = {
    ...existing,
    address: address?.trim() || existing.address,
    tcnhvGranted: true,
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

  // Minted agents are exclusive: never link when another user is canonical owner.
  if (/^\d+$/.test(agentId)) {
    const profile = await getAgentProfile(agentId);
    if (profile?.ownerUserId && profile.ownerUserId !== userId) return;
  }

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

/** Remove a stale agent id from a user's index (e.g. cross-account reconcile leak). */
export async function unlinkAgentFromUser(userId: string, agentId: string): Promise<void> {
  if (!userId || !agentId) return;
  if (hasUpstash()) {
    await getRedisClient().srem(key.agents(userId), agentId);
  } else {
    const store = readFile();
    store.agents[userId] = (store.agents[userId] ?? []).filter((id) => id !== agentId);
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
