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
      meta: parsed.meta ?? {},
      messages: parsed.messages ?? {},
    };
  } catch {
    return { index: {}, meta: {}, messages: {} };
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
  } else {
    const store = readFile();
    const sk = storeKey(userId, meta.id);
    store.meta[sk] = meta;
    store.messages[sk] = [];
    store.index[userId] = [meta.id, ...(store.index[userId] ?? [])];
    writeFile(store);
  }
  return meta;
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
