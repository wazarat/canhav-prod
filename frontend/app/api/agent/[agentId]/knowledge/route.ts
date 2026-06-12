import { NextResponse } from "next/server";

import { hasEmbeddings } from "@/lib/agent/config";
import {
  deleteKnowledgeDoc,
  ingestText,
  ingestUrl,
  KNOWLEDGE_LIMITS,
  knowledgeUrlAllowlist,
  listKnowledgeDocs,
  searchKnowledge,
} from "@/lib/agent/knowledge";
import { requireOwnedAgent } from "@/lib/agent/ownership";

/**
 * Owner-only knowledge manager for an agent ("bring your own knowledge" RAG).
 *
 * GET                -> list docs; `?q=<query>` also returns a test-retrieval
 *                       preview (what knowledge_search would surface)
 * POST               -> ingest pasted/uploaded text (`{title, text, sourceLabel?,
 *                       sourceUrl?, origin?}`) or a URL (`{url, title?}`,
 *                       allowlisted hosts only)
 * DELETE ?docId=     -> remove a doc + its chunks
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Embedding a large doc can take a while; stay within the Hobby ceiling.
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const docs = await listKnowledgeDocs(agentId);
  const query = new URL(req.url).searchParams.get("q");
  const payload: Record<string, unknown> = {
    ok: true,
    docs,
    max: KNOWLEDGE_LIMITS.docsMax,
    embeddings: hasEmbeddings(),
    urlIngestionEnabled: knowledgeUrlAllowlist().length > 0,
  };
  if (query) payload.preview = await searchKnowledge(agentId, query, 4);
  return NextResponse.json(payload);
}

export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: {
    title?: unknown;
    text?: unknown;
    sourceLabel?: unknown;
    sourceUrl?: unknown;
    origin?: unknown;
    url?: unknown;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const ownerUserId = guard.session?.userId ?? "";

  // URL ingestion path (explicit owner action; allowlisted hosts only).
  if (typeof body.url === "string" && body.url.trim()) {
    const result = await ingestUrl({
      agentId,
      ownerUserId,
      url: body.url.trim(),
      title: typeof body.title === "string" ? body.title : undefined,
    });
    if (!result.doc) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, doc: result.doc });
  }

  // Paste / file-upload path (the client reads .txt/.md files into `text`).
  const title = typeof body.title === "string" ? body.title : "";
  const text = typeof body.text === "string" ? body.text : "";
  const origin = body.origin === "upload" ? "upload" : "paste";
  const result = await ingestText({
    agentId,
    ownerUserId,
    title,
    sourceLabel: typeof body.sourceLabel === "string" ? body.sourceLabel : undefined,
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : null,
    origin,
    text,
  });
  if (!result.doc) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, doc: result.doc });
}

export async function DELETE(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const docId = new URL(req.url).searchParams.get("docId") ?? "";
  if (!docId) {
    return NextResponse.json({ ok: false, error: "docId is required." }, { status: 400 });
  }
  const removed = await deleteKnowledgeDoc(agentId, docId);
  if (!removed) {
    return NextResponse.json({ ok: false, error: "Document not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
