"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileUp, Link2, Loader2, Plus, Search, Trash2 } from "lucide-react";

import type { KnowledgeDoc, KnowledgeHit } from "@/lib/agent/knowledge";

type Tab = "paste" | "upload" | "url";

/**
 * Owner-only knowledge manager: paste text, upload .txt/.md, or add an
 * allowlisted URL. The agent retrieves passages via its knowledge_search tool
 * and cites the source label/url. Includes a "test retrieval" box that shows
 * exactly what a query would surface.
 */
export function KnowledgePanel({
  agentId,
  docs: initialDocs,
  max,
  embeddings,
  urlIngestionEnabled,
}: {
  agentId: string;
  docs: KnowledgeDoc[];
  max: number;
  embeddings: boolean;
  urlIngestionEnabled: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs);
  const [tab, setTab] = useState<Tab>("paste");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testHits, setTestHits] = useState<KnowledgeHit[] | null>(null);

  const base = `/api/agent/${encodeURIComponent(agentId)}/knowledge`;

  async function readFileText(file: File): Promise<string> {
    if (!/\.(txt|md|markdown)$/i.test(file.name)) {
      throw new Error("Only .txt and .md files are supported.");
    }
    if (file.size > 1_000_000) throw new Error("File too large (1 MB cap).");
    return file.text();
  }

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const content = await readFileText(file);
      setText(content);
      setFileName(file.name);
      if (!title.trim()) setTitle(file.name.replace(/\.(txt|md|markdown)$/i, ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    }
  }

  async function add() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload =
        tab === "url"
          ? { url: url.trim(), title: title.trim() || undefined }
          : {
              title: title.trim(),
              text,
              origin: tab,
              sourceLabel: tab === "upload" && fileName ? fileName : undefined,
            };
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; doc?: KnowledgeDoc; error?: string };
      if (!res.ok || !data.ok || !data.doc) {
        throw new Error(data.error ?? `Ingest failed (${res.status}).`);
      }
      setDocs([...docs, data.doc]);
      setNotice(
        `Indexed "${data.doc.title}" (${data.doc.chunkCount} passage${data.doc.chunkCount === 1 ? "" : "s"}${data.doc.embedded ? ", embedded" : ", keyword-only"}).`,
      );
      setTitle("");
      setText("");
      setUrl("");
      setFileName(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(docId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${base}?docId=${encodeURIComponent(docId)}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Delete failed (${res.status}).`);
      setDocs(docs.filter((d) => d.id !== docId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    if (!testQuery.trim()) return;
    setTestBusy(true);
    setError(null);
    try {
      const res = await fetch(`${base}?q=${encodeURIComponent(testQuery.trim())}`);
      const data = (await res.json()) as { ok?: boolean; preview?: KnowledgeHit[]; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Search failed (${res.status}).`);
      setTestHits(data.preview ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setTestBusy(false);
    }
  }

  const tabClass = (t: Tab) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      tab === t ? "bg-electric-500/15 text-electric-300" : "text-ink-400 hover:text-ink-200"
    }`;

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
        <BookOpen className="h-4 w-4 text-electric-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Knowledge
        </h3>
        <span className="ml-auto text-[11px] text-ink-500">
          {docs.length}/{max} docs{embeddings ? "" : " · keyword-only (no embedding key)"}
        </span>
      </div>

      {/* Docs list */}
      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-lg border border-ink-800/60 bg-ink-900/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-100">{d.title}</p>
                <p className="truncate text-[11px] text-ink-500">
                  {d.chunkCount} passage{d.chunkCount === 1 ? "" : "s"} · {d.origin} ·{" "}
                  {d.embedded ? "embedded" : "keyword"} · {d.sourceLabel}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete ${d.title}`}
                onClick={() => remove(d.id)}
                disabled={busy}
                className="text-ink-400 transition-colors hover:text-rose-300 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add */}
      {docs.length >= max ? (
        <p className="text-xs text-ink-500">Document limit reached — delete one to add another.</p>
      ) : (
        <div className="space-y-3 border-t border-ink-800/60 pt-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setTab("paste")} className={tabClass("paste")}>
              Paste text
            </button>
            <button type="button" onClick={() => setTab("upload")} className={tabClass("upload")}>
              <FileUp className="mr-1 inline h-3 w-3" />
              Upload file
            </button>
            <button type="button" onClick={() => setTab("url")} className={tabClass("url")}>
              <Link2 className="mr-1 inline h-3 w-3" />
              Add URL
            </button>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            disabled={busy}
            placeholder={tab === "url" ? "Title (optional)" : "Title, e.g. “JLP research notes”"}
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
          />

          {tab === "paste" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              rows={4}
              placeholder="Paste research notes, a report excerpt, governance summary…"
              className="w-full resize-y rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
          )}

          {tab === "upload" && (
            <div className="space-y-1.5">
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.md,.markdown"
                onChange={(e) => onFilePicked(e.target.files?.[0])}
                disabled={busy}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-300 transition-colors hover:border-electric-500/40 hover:text-electric-300 disabled:opacity-50"
              >
                <FileUp className="h-4 w-4" />
                {fileName ?? "Choose a .txt / .md file"}
              </button>
              {fileName && text && (
                <p className="text-[11px] text-ink-500">{text.length.toLocaleString()} characters loaded.</p>
              )}
            </div>
          )}

          {tab === "url" && (
            <div className="space-y-1.5">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy || !urlIngestionEnabled}
                placeholder="https://docs.example.com/page"
                className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
              />
              {!urlIngestionEnabled && (
                <p className="text-[11px] text-ink-500">
                  URL ingestion is disabled — set KNOWLEDGE_URL_ALLOWLIST to enable it.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={add}
            disabled={
              busy ||
              (tab === "url"
                ? !url.trim() || !urlIngestionEnabled
                : !title.trim() || !text.trim())
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to knowledge
          </button>
        </div>
      )}

      {/* Test retrieval */}
      {docs.length > 0 && (
        <div className="space-y-2 border-t border-ink-800/60 pt-3">
          <div className="flex gap-1.5">
            <input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runTest();
                }
              }}
              disabled={testBusy}
              placeholder="Test retrieval, e.g. “what backs the yield?”"
              className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
            <button
              type="button"
              aria-label="Run test retrieval"
              onClick={runTest}
              disabled={testBusy || !testQuery.trim()}
              className="inline-flex shrink-0 items-center rounded-lg border border-ink-700 px-2.5 py-1.5 text-ink-300 transition-colors hover:border-electric-500/40 hover:text-electric-300 disabled:opacity-50"
            >
              {testBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
          {testHits !== null &&
            (testHits.length === 0 ? (
              <p className="text-xs text-ink-500">No passages matched.</p>
            ) : (
              <ul className="space-y-1.5">
                {testHits.map((h, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-ink-800/60 bg-ink-900/40 px-3 py-2"
                  >
                    <p className="line-clamp-3 text-xs text-ink-300">{h.content}</p>
                    <p className="mt-1 text-[10px] text-ink-500">
                      {h.docTitle} · {h.sourceLabel} · {h.mode} {h.score}
                    </p>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}

      {notice && <p className="text-xs text-signal-300">{notice}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
