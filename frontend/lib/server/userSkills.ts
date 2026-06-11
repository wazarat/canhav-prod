import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";
import type { SkillVisibility, UserSkill } from "@/lib/types";

/**
 * User-authored skill store.
 *
 * Production persists to Upstash Redis under a `userskill:*` namespace; offline
 * dev (no Upstash creds) falls back to a single JSON file
 * (`backend/data/user-skills.json`, gitignored). Both back the same API.
 *
 * Keys:
 *   userskill:index                 -> set of all user-skill ids
 *   userskill:{id}                  -> JSON UserSkill string
 *   user:{userId}:authored-skills   -> set of skill ids authored by the user
 *   skill:discoverable              -> set of discoverable skill ids
 */

const SKILL_VERSION = "1.0.0";

const INDEX_KEY = "userskill:index";
const DISCOVERABLE_KEY = "skill:discoverable";
const key = {
  skill: (id: string) => `userskill:${id}`,
  authored: (userId: string) => `user:${userId}:authored-skills`,
};

function nowIso(): string {
  return new Date().toISOString();
}

export function newUserSkillId(): string {
  return `uskill_${randomBytes(8).toString("hex")}`;
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

/* -------------------------------------------------------------------------- */
/* Local file fallback (offline dev only)                                     */
/* -------------------------------------------------------------------------- */

interface FileStore {
  skills: Record<string, UserSkill>;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "user-skills.json");
}

function readFile(): FileStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileStore>;
    return { skills: parsed.skills ?? {} };
  } catch {
    return { skills: {} };
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
/* CRUD                                                                       */
/* -------------------------------------------------------------------------- */

export interface SaveUserSkillInput {
  id?: string;
  authorUserId: string;
  title: string;
  summary: string;
  facts: UserSkill["facts"];
  sections: UserSkill["sections"];
  actions: UserSkill["actions"];
  sources: UserSkill["sources"];
  glossary?: UserSkill["glossary"];
  visibility?: SkillVisibility;
}

/** Create or update a user-authored skill (preserving createdAt across edits). */
export async function saveUserSkill(input: SaveUserSkillInput): Promise<UserSkill> {
  const id = input.id ?? newUserSkillId();
  const existing = input.id ? await getUserSkill(input.id) : null;
  const visibility: SkillVisibility = input.visibility ?? existing?.visibility ?? "private";

  const skill: UserSkill = {
    id,
    title: input.title,
    summary: input.summary,
    facts: input.facts,
    sections: input.sections,
    actions: input.actions,
    sources: input.sources,
    glossary: input.glossary,
    origin: "user-authored",
    authorUserId: input.authorUserId,
    visibility,
    version: existing?.version ?? SKILL_VERSION,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };

  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.set(key.skill(id), JSON.stringify(skill));
    await redis.sadd(INDEX_KEY, id);
    await redis.sadd(key.authored(skill.authorUserId), id);
    if (visibility === "discoverable") await redis.sadd(DISCOVERABLE_KEY, id);
    else await redis.srem(DISCOVERABLE_KEY, id);
  } else {
    const store = readFile();
    store.skills[id] = skill;
    writeFile(store);
  }
  return skill;
}

export async function getUserSkill(id: string): Promise<UserSkill | null> {
  if (!id) return null;
  if (hasUpstash()) {
    return coerce<UserSkill>(await getRedisClient().get(key.skill(id)));
  }
  return readFile().skills[id] ?? null;
}

export async function listUserSkillsByAuthor(userId: string): Promise<UserSkill[]> {
  if (!userId) return [];
  if (hasUpstash()) {
    const ids = ((await getRedisClient().smembers(key.authored(userId))) as string[] | null) ?? [];
    const skills = await Promise.all(ids.map((id) => getUserSkill(id)));
    return skills
      .filter((s): s is UserSkill => Boolean(s))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return Object.values(readFile().skills)
    .filter((s) => s.authorUserId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listDiscoverableSkills(): Promise<UserSkill[]> {
  if (hasUpstash()) {
    const ids = ((await getRedisClient().smembers(DISCOVERABLE_KEY)) as string[] | null) ?? [];
    const skills = await Promise.all(ids.map((id) => getUserSkill(id)));
    return skills
      .filter((s): s is UserSkill => Boolean(s) && s!.visibility === "discoverable")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return Object.values(readFile().skills)
    .filter((s) => s.visibility === "discoverable")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Flip a skill's visibility. Returns the updated skill, or null if not found / not owner. */
export async function setUserSkillVisibility(
  id: string,
  authorUserId: string,
  visibility: SkillVisibility,
): Promise<UserSkill | null> {
  const existing = await getUserSkill(id);
  if (!existing || existing.authorUserId !== authorUserId) return null;
  return saveUserSkill({ ...existing, visibility });
}
