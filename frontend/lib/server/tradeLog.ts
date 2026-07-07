import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { TradeSide } from "@/lib/agent/trade/types";
import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * Off-chain log of agent GMX trades (user-owned agents).
 * Key: `agent:trades:{agentId}` — newest first, capped.
 */

const MAX_ENTRIES = 100;

export interface TradeLogEntry {
  agentId: string;
  userId: string;
  asset: string;
  side: TradeSide;
  sizeUsd: string;
  leverage: number;
  collateralToken: string;
  gmxTarget: string;
  market: string;
  verdictRef: string;
  txHash: string;
  at: string;
}

const logKey = (agentId: string) => `agent:trades:${agentId}`;

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "agent-trades.json");
}

function readFile(): Record<string, TradeLogEntry[]> {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Record<
      string,
      TradeLogEntry[]
    >;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFile(store: Record<string, TradeLogEntry[]>): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    /* read-only fs */
  }
}

export async function recordTrade(entry: TradeLogEntry): Promise<void> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.lpush(logKey(entry.agentId), JSON.stringify(entry));
    await redis.ltrim(logKey(entry.agentId), 0, MAX_ENTRIES - 1);
    return;
  }
  const store = readFile();
  store[entry.agentId] = [entry, ...(store[entry.agentId] ?? [])].slice(0, MAX_ENTRIES);
  writeFile(store);
}

export async function listTrades(agentId: string, limit = 20): Promise<TradeLogEntry[]> {
  if (hasUpstash()) {
    const raw = await getRedisClient().lrange(logKey(agentId), 0, limit - 1);
    return raw
      .map((line) => {
        try {
          return JSON.parse(line) as TradeLogEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is TradeLogEntry => e !== null);
  }
  return (readFile()[agentId] ?? []).slice(0, limit);
}

/** Sum executed trade sizes (USD 30-dec string) for spending-cap enforcement. */
export async function sumTradeSizeUsd(
  agentId: string,
  sinceMs?: number,
): Promise<bigint> {
  const trades = await listTrades(agentId, MAX_ENTRIES);
  let total = 0n;
  for (const t of trades) {
    if (sinceMs != null) {
      const at = Date.parse(t.at);
      if (!Number.isFinite(at) || at < sinceMs) continue;
    }
    try {
      total += BigInt(t.sizeUsd);
    } catch {
      /* skip malformed */
    }
  }
  return total;
}
