import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { embed, embedMany } from "ai";

import { resolveEmbeddingModel } from "@/lib/agent/config";
import { readSecret, repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * "Bring your own knowledge" — per-agent RAG with zero new infrastructure.
 *
 * Owners paste text, upload .txt/.md files, or add allowlisted URLs; the text is
 * chunked, embedded (OpenAI text-embedding-3-small via the existing provider
 * config), and stored in Upstash Redis (local JSON fallback offline). Retrieval
 * is in-process cosine similarity over the agent's own chunks — the corpus is
 * hard-capped per agent, so a vector index is unnecessary.
 *
 * Graceful degradation: with no embedding provider, chunks store `embedding:
 * null` and retrieval falls back to keyword scoring. Per-agent isolation: every
 * read/write is keyed by agentId; the knowledge_search tool only ever sees its
 * own agent's corpus.
 *
 * Keys:
 *   agent:{id}:kdocs            -> JSON KnowledgeDoc[] (capped)
 *   agent:{id}:kchunks:{docId}  -> JSON KnowledgeChunk[] for one doc
 */

export const KNOWLEDGE_LIMITS = {
  docsMax: 20,
  docMaxChars: 400_000,
  chunksPerDocMax: 150,
  /** ~800 tokens. */
  chunkChars: 3200,
  /** ~100 tokens. */
  chunkOverlapChars: 400,
  titleMaxChars: 120,
  sourceLabelMaxChars: 80,
  searchMaxK: 8,
  /** Per-hit content cap in tool output (keeps the loop's token use sane). */
  hitContentMaxChars: 1200,
  urlFetchMaxBytes: 2_000_000,
} as const;

export type KnowledgeOrigin = "paste" | "upload" | "url";

export interface KnowledgeDoc {
  id: string;
  agentId: string;
  ownerUserId: string;
  title: string;
  /** Provenance label cited by the agent (matches the OffchainFact style). */
  sourceLabel: string;
  sourceUrl: string | null;
  origin: KnowledgeOrigin;
  chunkCount: number;
  charCount: number;
  /** False when ingested without an embedding provider (keyword-only). */
  embedded: boolean;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  agentId: string;
  index: number;
  content: string;
  embedding: number[] | null;
}

export interface KnowledgeHit {
  content: string;
  docId: string;
  docTitle: string;
  sourceLabel: string;
  sourceUrl: string | null;
  chunkIndex: number;
  /** Cosine similarity (embeddings) or normalized keyword score. */
  score: number;
  mode: "vector" | "keyword";
}

const key = {
  docs: (agentId: string) => `agent:${agentId}:kdocs`,
  chunks: (agentId: string, docId: string) => `agent:${agentId}:kchunks:${docId}`,
};

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
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

interface FileKnowledgeStore {
  docs: Record<string, KnowledgeDoc[]>;
  /** `${agentId}|${docId}` -> chunks */
  chunks: Record<string, KnowledgeChunk[]>;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "knowledge-store.json");
}

function readFile(): FileKnowledgeStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileKnowledgeStore>;
    return { docs: parsed.docs ?? {}, chunks: parsed.chunks ?? {} };
  } catch {
    return { docs: {}, chunks: {} };
  }
}

function writeFile(store: FileKnowledgeStore): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store)}\n`, "utf-8");
  } catch {
    // best-effort offline dev
  }
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

export async function listKnowledgeDocs(agentId: string): Promise<KnowledgeDoc[]> {
  if (hasUpstash()) {
    return coerce<KnowledgeDoc[]>(await getRedisClient().get(key.docs(agentId))) ?? [];
  }
  return readFile().docs[agentId] ?? [];
}

async function writeDocs(agentId: string, docs: KnowledgeDoc[]): Promise<void> {
  if (hasUpstash()) {
    await getRedisClient().set(key.docs(agentId), JSON.stringify(docs));
  } else {
    const store = readFile();
    store.docs[agentId] = docs;
    writeFile(store);
  }
}

async function getChunks(agentId: string, docId: string): Promise<KnowledgeChunk[]> {
  if (hasUpstash()) {
    return coerce<KnowledgeChunk[]>(await getRedisClient().get(key.chunks(agentId, docId))) ?? [];
  }
  return readFile().chunks[`${agentId}|${docId}`] ?? [];
}

async function writeChunks(
  agentId: string,
  docId: string,
  chunks: KnowledgeChunk[],
): Promise<void> {
  if (hasUpstash()) {
    await getRedisClient().set(key.chunks(agentId, docId), JSON.stringify(chunks));
  } else {
    const store = readFile();
    store.chunks[`${agentId}|${docId}`] = chunks;
    writeFile(store);
  }
}

export async function deleteKnowledgeDoc(agentId: string, docId: string): Promise<boolean> {
  const docs = await listKnowledgeDocs(agentId);
  const next = docs.filter((d) => d.id !== docId);
  if (next.length === docs.length) return false;
  await writeDocs(agentId, next);
  if (hasUpstash()) {
    await getRedisClient().del(key.chunks(agentId, docId));
  } else {
    const store = readFile();
    delete store.chunks[`${agentId}|${docId}`];
    writeFile(store);
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* Chunking + embedding                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Split text into ~chunkChars windows with overlap, preferring paragraph and
 * sentence boundaries so chunks stay coherent for retrieval.
 */
export function chunkText(text: string): string[] {
  const L = KNOWLEDGE_LIMITS;
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= L.chunkChars) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < L.chunksPerDocMax) {
    let end = Math.min(start + L.chunkChars, clean.length);
    if (end < clean.length) {
      // Prefer to break on a paragraph, then a sentence, within the last 20%.
      const windowStart = end - Math.floor(L.chunkChars * 0.2);
      const slice = clean.slice(windowStart, end);
      const paraBreak = slice.lastIndexOf("\n\n");
      const sentenceBreak = slice.lastIndexOf(". ");
      if (paraBreak > 0) end = windowStart + paraBreak;
      else if (sentenceBreak > 0) end = windowStart + sentenceBreak + 1;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = Math.max(end - L.chunkOverlapChars, start + 1);
  }
  return chunks;
}

/** Embed many texts; returns null on any failure (degrade to keyword search). */
async function tryEmbedMany(values: string[]): Promise<number[][] | null> {
  const model = resolveEmbeddingModel();
  if (!model || !values.length) return null;
  try {
    const { embeddings } = await embedMany({ model, values });
    return embeddings as number[][];
  } catch (e) {
    console.error("[knowledge] embedMany failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function tryEmbedOne(value: string): Promise<number[] | null> {
  const model = resolveEmbeddingModel();
  if (!model) return null;
  try {
    const { embedding } = await embed({ model, value });
    return embedding as number[];
  } catch (e) {
    console.error("[knowledge] embed failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Ingestion                                                                  */
/* -------------------------------------------------------------------------- */

export interface IngestInput {
  agentId: string;
  ownerUserId: string;
  title: string;
  sourceLabel?: string;
  sourceUrl?: string | null;
  origin: KnowledgeOrigin;
  text: string;
}

export interface IngestResult {
  doc?: KnowledgeDoc;
  error?: string;
}

export async function ingestText(input: IngestInput): Promise<IngestResult> {
  const L = KNOWLEDGE_LIMITS;
  const title = input.title.trim().slice(0, L.titleMaxChars);
  if (!title) return { error: "Document title is required." };

  const text = input.text.trim();
  if (!text) return { error: "Document text is empty." };
  if (text.length > L.docMaxChars) {
    return { error: `Document too large (max ${Math.floor(L.docMaxChars / 1000)}k characters).` };
  }

  const docs = await listKnowledgeDocs(input.agentId);
  if (docs.length >= L.docsMax) {
    return { error: `This agent already has ${L.docsMax} documents — delete one first.` };
  }

  const pieces = chunkText(text);
  if (!pieces.length) return { error: "Could not extract any text to index." };

  const embeddings = await tryEmbedMany(pieces);
  const docId = randomId("kdoc");
  const chunks: KnowledgeChunk[] = pieces.map((content, index) => ({
    id: `${docId}_${index}`,
    docId,
    agentId: input.agentId,
    index,
    content,
    embedding: embeddings?.[index] ?? null,
  }));

  const doc: KnowledgeDoc = {
    id: docId,
    agentId: input.agentId,
    ownerUserId: input.ownerUserId,
    title,
    sourceLabel:
      (input.sourceLabel ?? "").trim().slice(0, L.sourceLabelMaxChars) || `Owner upload: ${title}`,
    sourceUrl: input.sourceUrl?.trim() || null,
    origin: input.origin,
    chunkCount: chunks.length,
    charCount: text.length,
    embedded: Boolean(embeddings),
    createdAt: nowIso(),
  };

  await writeChunks(input.agentId, docId, chunks);
  await writeDocs(input.agentId, [...docs, doc]);
  return { doc };
}

/* ----------------------------- URL ingestion ------------------------------ */

/**
 * Hostname allowlist for owner-added URLs (comma-separated env, e.g.
 * "docs.usd.ai,github.com"). Subdomains of an allowlisted host are allowed.
 * Agents NEVER fetch URLs themselves — this path is an explicit owner action.
 */
export function knowledgeUrlAllowlist(): string[] {
  const raw = readSecret("KNOWLEDGE_URL_ALLOWLIST") ?? "";
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function hostAllowed(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** Strip HTML to readable text without any new dependencies. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export async function ingestUrl(input: {
  agentId: string;
  ownerUserId: string;
  url: string;
  title?: string;
}): Promise<IngestResult> {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    return { error: "Invalid URL." };
  }
  if (parsed.protocol !== "https:") return { error: "Only https:// URLs are allowed." };

  const allowlist = knowledgeUrlAllowlist();
  if (!allowlist.length) {
    return { error: "URL ingestion is not enabled (KNOWLEDGE_URL_ALLOWLIST is not set)." };
  }
  if (!hostAllowed(parsed.hostname, allowlist)) {
    return { error: `Host "${parsed.hostname}" is not on the knowledge allowlist.` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let text: string;
  let contentType: string;
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "text/html, text/plain, text/markdown" },
    });
    if (!res.ok) return { error: `Fetch failed (${res.status}).` };
    contentType = res.headers.get("content-type") ?? "";
    if (!/text\/(html|plain|markdown)|application\/json/i.test(contentType)) {
      return { error: `Unsupported content type "${contentType}".` };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > KNOWLEDGE_LIMITS.urlFetchMaxBytes) {
      return { error: "Page too large to ingest (2 MB cap)." };
    }
    text = new TextDecoder().decode(buf);
  } catch {
    return { error: "Fetch failed (network error or timeout)." };
  } finally {
    clearTimeout(timer);
  }

  const readable = /text\/html/i.test(contentType) ? htmlToText(text) : text.trim();
  return ingestText({
    agentId: input.agentId,
    ownerUserId: input.ownerUserId,
    title: input.title?.trim() || parsed.hostname + parsed.pathname,
    sourceLabel: parsed.hostname,
    sourceUrl: parsed.toString(),
    origin: "url",
    text: readable,
  });
}

/* -------------------------------------------------------------------------- */
/* Retrieval                                                                  */
/* -------------------------------------------------------------------------- */

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function keywordScore(query: string, content: string): number {
  const terms = [...new Set(query.toLowerCase().split(/\W+/).filter((t) => t.length > 2))];
  if (!terms.length) return 0;
  const haystack = content.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) hits += 1;
  }
  return hits / terms.length;
}

/**
 * Search this agent's own knowledge corpus. Vector cosine when both the query
 * and chunks have embeddings; keyword overlap otherwise. Never cross-agent.
 */
export async function searchKnowledge(
  agentId: string,
  query: string,
  k = 4,
): Promise<KnowledgeHit[]> {
  const limit = Math.max(1, Math.min(k, KNOWLEDGE_LIMITS.searchMaxK));
  const docs = await listKnowledgeDocs(agentId);
  if (!docs.length || !query.trim()) return [];

  const anyEmbedded = docs.some((d) => d.embedded);
  const queryEmbedding = anyEmbedded ? await tryEmbedOne(query) : null;

  const hits: KnowledgeHit[] = [];
  for (const doc of docs) {
    const chunks = await getChunks(agentId, doc.id);
    for (const chunk of chunks) {
      let score: number;
      let mode: KnowledgeHit["mode"];
      if (queryEmbedding && chunk.embedding) {
        score = cosine(queryEmbedding, chunk.embedding);
        mode = "vector";
      } else {
        // Scaled down so genuine vector matches outrank keyword fallbacks.
        score = keywordScore(query, chunk.content) * 0.5;
        mode = "keyword";
      }
      if (score <= 0) continue;
      hits.push({
        content: chunk.content.slice(0, KNOWLEDGE_LIMITS.hitContentMaxChars),
        docId: doc.id,
        docTitle: doc.title,
        sourceLabel: doc.sourceLabel,
        sourceUrl: doc.sourceUrl,
        chunkIndex: chunk.index,
        score: Math.round(score * 1000) / 1000,
        mode,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
