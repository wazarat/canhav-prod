import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { UIMessage } from "ai";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

export interface ConversationMeta {
  id: string;
  userId: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const key = {
  index: (userId: string) => `user:${userId}:conversations`,
  agentIndex: (agentId: string) => `agent:${agentId}:conversations`,
  meta: (userId: string, id: string) => `user:${userId}:chat:${id}:meta`,
  messages: (userId: string, id: string) => `user:${userId}:chat:${id}:messages`,
};

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  return `conv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
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

interface FileConvStore {
  index: Record<string, string[]>;
  /** agentId -> conversationIds (newest first) */
  agentIndex: Record<string, string[]>;
  meta: Record<string, ConversationMeta>;
  messages: Record<string, UIMessage[]>;
}

function storeKey(userId: string, convId: string): string {
  return `${userId}|${convId}`;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "conversation-store.json");
}

function readFile(): FileConvStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileConvStore>;
    return {
      index: parsed.index ?? {},
      agentIndex: parsed.agentIndex ?? {},
      meta: parsed.meta ?? {},
      messages: parsed.messages ?? {},
    };
  } catch {
    return { index: {}, agentIndex: {}, meta: {}, messages: {} };
  }
}

function writeFile(store: FileConvStore): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    // best-effort offline dev
  }
}

function titleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser?.parts) return "New chat";
  const text = firstUser.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

export async function listConversations(userId: string, limit = 30): Promise<ConversationMeta[]> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    const ids = ((await redis.lrange(key.index(userId), 0, limit - 1)) as string[] | null) ?? [];
    const metas = await Promise.all(
      ids.map(async (id) => coerce<ConversationMeta>(await redis.get(key.meta(userId, id)))),
    );
    return metas.filter((m): m is ConversationMeta => Boolean(m));
  }
  const store = readFile();
  const ids = (store.index[userId] ?? []).slice(0, limit);
  return ids.map((id) => store.meta[storeKey(userId, id)]).filter((m): m is ConversationMeta => Boolean(m));
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<{ meta: ConversationMeta; messages: UIMessage[] } | null> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    const meta = coerce<ConversationMeta>(await redis.get(key.meta(userId, conversationId)));
    if (!meta || meta.userId !== userId) return null;
    const messages =
      coerce<UIMessage[]>(await redis.get(key.messages(userId, conversationId))) ?? [];
    return { meta, messages };
  }
  const store = readFile();
  const sk = storeKey(userId, conversationId);
  const meta = store.meta[sk];
  if (!meta) return null;
  return { meta, messages: store.messages[sk] ?? [] };
}

export async function createConversation(
  userId: string,
  agentId: string,
  title?: string,
): Promise<ConversationMeta> {
  const meta: ConversationMeta = {
    id: randomId(),
    userId,
    agentId,
    title: title?.trim() || "New chat",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.set(key.meta(userId, meta.id), JSON.stringify(meta));
    await redis.set(key.messages(userId, meta.id), JSON.stringify([]));
    await redis.lpush(key.index(userId), meta.id);
    await redis.lpush(key.agentIndex(agentId), meta.id);
  } else {
    const store = readFile();
    const sk = storeKey(userId, meta.id);
    store.meta[sk] = meta;
    store.messages[sk] = [];
    store.index[userId] = [meta.id, ...(store.index[userId] ?? [])];
    store.agentIndex[agentId] = [meta.id, ...(store.agentIndex[agentId] ?? [])];
    writeFile(store);
  }
  return meta;
}

/**
 * List a wallet's conversations for ONE agent. Reads the per-agent index; if
 * that is empty (chats created before per-agent scoping), falls back to
 * filtering the user's full conversation list by `meta.agentId`.
 */
export async function listConversationsForAgent(
  userId: string,
  agentId: string,
  limit = 30,
): Promise<ConversationMeta[]> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    const ids = ((await redis.lrange(key.agentIndex(agentId), 0, limit - 1)) as string[] | null) ?? [];
    if (ids.length > 0) {
      const metas = await Promise.all(
        ids.map(async (id) => coerce<ConversationMeta>(await redis.get(key.meta(userId, id)))),
      );
      return metas.filter((m): m is ConversationMeta => Boolean(m));
    }
  } else {
    const store = readFile();
    const ids = (store.agentIndex[agentId] ?? []).slice(0, limit);
    if (ids.length > 0) {
      return ids
        .map((id) => store.meta[storeKey(userId, id)])
        .filter((m): m is ConversationMeta => Boolean(m));
    }
  }

  // Fallback for chats created before per-agent scoping: filter the user's list
  // by agentId, then lazily backfill the per-agent index so the next read is O(1).
  const all = await listConversations(userId, limit);
  const scoped = all.filter((m) => m.agentId === agentId);
  if (scoped.length > 0) {
    await backfillAgentIndex(agentId, scoped.map((m) => m.id)).catch(() => {
      // best-effort migration; never fail the read over it
    });
  }
  return scoped;
}

/**
 * One-time, best-effort migration: populate `agent:{id}:conversations` from the
 * conversations discovered via the user index. Newest-first to match the write
 * path. Only runs when the per-agent index is empty (the call site guarantees
 * this), so it is safe to overwrite.
 */
async function backfillAgentIndex(agentId: string, idsNewestFirst: string[]): Promise<void> {
  if (idsNewestFirst.length === 0) return;
  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.del(key.agentIndex(agentId));
    // rpush in newest-first order so lrange(0, n) returns newest-first.
    await redis.rpush(key.agentIndex(agentId), ...idsNewestFirst);
  } else {
    const store = readFile();
    store.agentIndex[agentId] = idsNewestFirst;
    writeFile(store);
  }
}

export async function saveConversationMessages(
  userId: string,
  conversationId: string,
  messages: UIMessage[],
  assistantText?: string,
): Promise<ConversationMeta | null> {
  const existing = await getConversation(userId, conversationId);
  if (!existing) return null;

  let finalMessages = messages;
  if (assistantText && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") {
      finalMessages = [
        ...messages,
        {
          id: `msg_${Date.now().toString(36)}`,
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: assistantText }],
        },
      ];
    }
  }

  const meta: ConversationMeta = {
    ...existing.meta,
    title: existing.meta.title === "New chat" ? titleFromMessages(finalMessages) : existing.meta.title,
    updatedAt: nowIso(),
  };

  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.set(key.messages(userId, conversationId), JSON.stringify(finalMessages));
    await redis.set(key.meta(userId, conversationId), JSON.stringify(meta));
  } else {
    const store = readFile();
    const sk = storeKey(userId, conversationId);
    store.messages[sk] = finalMessages;
    store.meta[sk] = meta;
    writeFile(store);
  }
  return meta;
}
