import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * Off-chain log of wallet treasury credit transfers (user -> agent / peer).
 *
 * The on-chain ERC-20 `Transfer` event is the source of truth; this is a
 * convenience trail per user so the UI can show recent sends. Capped, newest
 * first. Upstash in production, a gitignored JSON file for offline dev.
 *
 * Key: `wallet:transfers:{userId}`.
 */

const MAX_ENTRIES = 100;

export type WalletTransferKind = "address" | "agent" | "user";

export interface WalletTransferEntry {
  to: string;
  toLabel: string | null;
  kind: WalletTransferKind;
  /** Human amount sent. */
  amount: string;
  /** Settlement asset symbol (e.g. tCNHV). */
  asset: string;
  txHash: string;
  at: string;
}

const logKey = (userId: string) => `wallet:transfers:${userId}`;

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "wallet-transfers.json");
}

function readFile(): Record<string, WalletTransferEntry[]> {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Record<
      string,
      WalletTransferEntry[]
    >;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFile(store: Record<string, WalletTransferEntry[]>): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    /* read-only fs — best-effort */
  }
}

export async function recordWalletTransfer(
  userId: string,
  entry: WalletTransferEntry,
): Promise<void> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.lpush(logKey(userId), JSON.stringify(entry));
    await redis.ltrim(logKey(userId), 0, MAX_ENTRIES - 1);
    return;
  }
  const store = readFile();
  store[userId] = [entry, ...(store[userId] ?? [])].slice(0, MAX_ENTRIES);
  writeFile(store);
}

export async function listWalletTransfers(
  userId: string,
  limit = 20,
): Promise<WalletTransferEntry[]> {
  if (hasUpstash()) {
    const raw = ((await getRedisClient().lrange(logKey(userId), 0, limit - 1)) as unknown[]) ?? [];
    return raw
      .map((v) => {
        if (v == null) return null;
        if (typeof v === "object") return v as WalletTransferEntry;
        try {
          return JSON.parse(v as string) as WalletTransferEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is WalletTransferEntry => Boolean(e));
  }
  return (readFile()[userId] ?? []).slice(0, limit);
}
