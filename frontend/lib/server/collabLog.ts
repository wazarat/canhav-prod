import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * Off-chain mirror of collaboration exchanges.
 *
 * The on-chain CollabRegistry `CollabRecorded` events are the source of truth
 * for the observer feed, but recording is a best-effort client-signed userOp; we
 * also append every settled exchange here so the feed and demos work even when
 * the registry isn't deployed (or the record userOp is skipped).
 *
 * Key: `collab:log` -> capped JSON list (newest first).
 */

const LOG_KEY = "collab:log";
const MAX_ENTRIES = 200;

export interface CollabLogEntry {
  fromAgentId: string;
  toAgentId: string;
  skillId: string;
  skillHash: string;
  paymentRef: string;
  amount: string;
  at: string;
  /** Interaction magnitude (data slices) disclosed in this exchange. */
  units?: number;
  /** The agreement this interaction belongs to (null for one-off). */
  agreementId?: string | null;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "collab-log.json");
}

function readFile(): CollabLogEntry[] {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as CollabLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFile(entries: CollabLogEntry[]): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(entries, null, 2)}\n`, "utf-8");
  } catch {
    /* read-only fs — best-effort */
  }
}

export async function recordCollabExchange(entry: CollabLogEntry): Promise<void> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.lpush(LOG_KEY, JSON.stringify(entry));
    await redis.ltrim(LOG_KEY, 0, MAX_ENTRIES - 1);
    return;
  }
  const entries = [entry, ...readFile()].slice(0, MAX_ENTRIES);
  writeFile(entries);
}

export async function listCollabExchanges(limit = 50): Promise<CollabLogEntry[]> {
  if (hasUpstash()) {
    const raw = ((await getRedisClient().lrange(LOG_KEY, 0, limit - 1)) as unknown[]) ?? [];
    return raw
      .map((v) => {
        if (v == null) return null;
        if (typeof v === "object") return v as CollabLogEntry;
        try {
          return JSON.parse(v as string) as CollabLogEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is CollabLogEntry => Boolean(e));
  }
  return readFile().slice(0, limit);
}
