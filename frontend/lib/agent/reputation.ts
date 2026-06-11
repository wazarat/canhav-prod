import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * Lightweight agent reputation store.
 *
 * The on-chain ERC-8004 ReputationRegistry keeps per-client signed feedback but
 * exposes no enumerable aggregate, so the discovery ranking reads a Redis-backed
 * running average of buyer ratings (1–5). The on-chain `giveFeedback` write is
 * the durable attestation (wired but flag-off); this is the fast read model.
 *
 * Key: `agent:{id}:reputation` -> JSON `{ sum, count }`.
 */

export interface ReputationSummary {
  /** Mean rating in [1,5], rounded to 2 decimals. */
  score: number;
  count: number;
}

interface RepRecord {
  sum: number;
  count: number;
}

const key = (agentId: string) => `agent:${agentId}:reputation`;

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "reputation.json");
}

function readFile(): Record<string, RepRecord> {
  try {
    return JSON.parse(readFileSync(filePath(), "utf-8")) as Record<string, RepRecord>;
  } catch {
    return {};
  }
}

function writeFile(store: Record<string, RepRecord>): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    /* read-only fs — best-effort */
  }
}

function summarize(rec: RepRecord | null): ReputationSummary | null {
  if (!rec || rec.count <= 0) return null;
  return { score: Math.round((rec.sum / rec.count) * 100) / 100, count: rec.count };
}

function coerce(value: unknown): RepRecord | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as RepRecord;
    } catch {
      return null;
    }
  }
  return value as RepRecord;
}

/** Record a buyer rating (1–5) for an agent and return the updated summary. */
export async function recordReputation(
  agentId: string,
  rating: number,
): Promise<ReputationSummary | null> {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  if (hasUpstash()) {
    const redis = getRedisClient();
    const current = coerce(await redis.get(key(agentId))) ?? { sum: 0, count: 0 };
    const next: RepRecord = { sum: current.sum + clamped, count: current.count + 1 };
    await redis.set(key(agentId), JSON.stringify(next));
    return summarize(next);
  }
  const store = readFile();
  const current = store[agentId] ?? { sum: 0, count: 0 };
  const next: RepRecord = { sum: current.sum + clamped, count: current.count + 1 };
  store[agentId] = next;
  writeFile(store);
  return summarize(next);
}

export async function readAgentReputation(agentId: string): Promise<ReputationSummary | null> {
  if (hasUpstash()) {
    return summarize(coerce(await getRedisClient().get(key(agentId))));
  }
  return summarize(readFile()[agentId] ?? null);
}
