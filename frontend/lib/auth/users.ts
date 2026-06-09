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
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

const USER_INDEX = "user:index";

const key = {
  profile: (userId: string) => `user:${userId}:profile`,
  agents: (userId: string) => `user:${userId}:agents`,
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
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "user-store.json");
}

function readFile(): FileUserStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileUserStore>;
    return { profiles: parsed.profiles ?? {}, agents: parsed.agents ?? {} };
  } catch {
    return { profiles: {}, agents: {} };
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

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (hasUpstash()) {
    return coerce<UserProfile>(await getRedisClient().get(key.profile(userId)));
  }
  return readFile().profiles[userId] ?? null;
}

/**
 * Upsert a user after passkey register/login and ensure their default research
 * agent profile exists.
 */
export async function upsertUserFromPasskey(input: {
  userId: string;
  authenticatorId: string;
}): Promise<UserProfile> {
  const existing = await getUserProfile(input.userId);
  const profile: UserProfile = {
    userId: input.userId,
    authenticatorId: input.authenticatorId,
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
