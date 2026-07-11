"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Plus, Trash2, Wrench } from "lucide-react";

import type { CustomTool, CustomToolTemplate } from "@/lib/types";

type Kind = CustomToolTemplate["kind"];

const KIND_LABELS: Record<Kind, string> = {
  duneQuery: "Dune query",
  coingeckoMarket: "CoinGecko market",
  alchemyTokenSupply: "On-chain supply",
  httpJson: "JSON endpoint",
};

/**
 * Owner-only custom tool builder: typed, read-only data feeds from a fixed
 * catalog (Dune query / CoinGecko market / on-chain supply / allowlisted JSON
 * endpoint). The description is what the LLM reads when deciding to call it.
 */
export function CustomToolsPanel({
  agentId,
  tools: initialTools,
  max,
  httpEnabled,
}: {
  agentId: string;
  tools: CustomTool[];
  max: number;
  httpEnabled: boolean;
}) {
  const router = useRouter();
  const [tools, setTools] = useState<CustomTool[]>(initialTools);
  const [kind, setKind] = useState<Kind>("coingeckoMarket");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [queryId, setQueryId] = useState("");
  const [coinId, setCoinId] = useState("");
  const [address, setAddress] = useState("");
  const [url, setUrl] = useState("");
  const [jsonPath, setJsonPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ toolId: string; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/agent/${encodeURIComponent(agentId)}/custom-tools`;

  const inputClass =
    "w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50";

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { kind, title, description };
      if (kind === "duneQuery") payload.queryId = Number(queryId);
      if (kind === "coingeckoMarket") payload.coinId = coinId;
      if (kind === "alchemyTokenSupply") payload.address = address;
      if (kind === "httpJson") {
        payload.url = url;
        if (jsonPath.trim()) payload.jsonPath = jsonPath.trim();
      }
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; tool?: CustomTool; error?: string };
      if (!res.ok || !data.ok || !data.tool) {
        throw new Error(data.error ?? `Save failed (${res.status}).`);
      }
      setTools([...tools, data.tool]);
      setTitle("");
      setDescription("");
      setQueryId("");
      setCoinId("");
      setAddress("");
      setUrl("");
      setJsonPath("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(toolId: string, enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, enabled }),
      });
      const data = (await res.json()) as { ok?: boolean; tool?: CustomTool; error?: string };
      if (!res.ok || !data.ok || !data.tool) {
        throw new Error(data.error ?? `Update failed (${res.status}).`);
      }
      setTools(tools.map((t) => (t.id === toolId ? data.tool! : t)));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(toolId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${base}?toolId=${encodeURIComponent(toolId)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Delete failed (${res.status}).`);
      setTools(tools.filter((t) => t.id !== toolId));
      if (testResult?.toolId === toolId) setTestResult(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function test(toolId: string) {
    setTesting(toolId);
    setError(null);
    try {
      const res = await fetch(`${base}?test=${encodeURIComponent(toolId)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        test?: { summary?: string; available?: boolean };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.test) {
        throw new Error(data.error ?? `Test failed (${res.status}).`);
      }
      setTestResult({ toolId, summary: data.test.summary ?? "Ran (no summary)." });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
        <Wrench className="h-4 w-4 text-amber-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Custom tools
        </h3>
        <span className="ml-auto text-[11px] text-ink-500">
          {tools.length}/{max} · read-only
        </span>
      </div>

      {/* Existing tools */}
      {tools.length > 0 && (
        <ul className="space-y-2">
          {tools.map((t) => (
            <li
              key={t.id}
              className="space-y-1 rounded-lg border border-ink-800/60 bg-ink-900/40 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-100">{t.template.title}</p>
                  <p className="truncate text-[11px] text-ink-500">
                    {KIND_LABELS[t.template.kind]} · {t.template.description}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-ink-400">
                  <input
                    type="checkbox"
                    checked={t.enabled}
                    onChange={(e) => toggle(t.id, e.target.checked)}
                    disabled={busy}
                    className="h-3.5 w-3.5 rounded border-ink-600 bg-ink-900"
                  />
                  on
                </label>
                <button
                  type="button"
                  aria-label={`Test ${t.template.title}`}
                  onClick={() => test(t.id)}
                  disabled={busy || testing !== null}
                  className="shrink-0 text-ink-400 transition-colors hover:text-amber-300 disabled:opacity-50"
                >
                  {testing === t.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${t.template.title}`}
                  onClick={() => remove(t.id)}
                  disabled={busy}
                  className="shrink-0 text-ink-400 transition-colors hover:text-rose-300 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {testResult?.toolId === t.id && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-200">
                  {testResult.summary}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Builder */}
      {tools.length >= max ? (
        <p className="text-xs text-ink-500">Tool limit reached. Delete one to add another.</p>
      ) : (
        <div className="space-y-3 border-t border-ink-800/60 pt-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            disabled={busy}
            className={inputClass}
          >
            <option value="coingeckoMarket">CoinGecko market snapshot</option>
            <option value="duneQuery">Dune saved-query results</option>
            <option value="alchemyTokenSupply">On-chain token supply (Alchemy)</option>
            <option value="httpJson" disabled={!httpEnabled}>
              JSON endpoint (allowlisted){httpEnabled ? "" : " (disabled)"}
            </option>
          </select>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            disabled={busy}
            placeholder="Tool name, e.g. “JUP market snapshot”"
            className={inputClass}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 240))}
            disabled={busy}
            placeholder="When should the agent use it? (the LLM reads this)"
            className={inputClass}
          />

          {kind === "duneQuery" && (
            <input
              value={queryId}
              onChange={(e) => setQueryId(e.target.value.replace(/\D/g, ""))}
              disabled={busy}
              inputMode="numeric"
              placeholder="Saved Dune query id, e.g. 1234567"
              className={inputClass}
            />
          )}
          {kind === "coingeckoMarket" && (
            <input
              value={coinId}
              onChange={(e) => setCoinId(e.target.value)}
              disabled={busy}
              placeholder="CoinGecko coin id, e.g. jupiter-exchange-solana"
              className={inputClass}
            />
          )}
          {kind === "alchemyTokenSupply" && (
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={busy}
              placeholder="Token contract address (0x…)"
              className={inputClass}
            />
          )}
          {kind === "httpJson" && (
            <>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy || !httpEnabled}
                placeholder="https://api.example.com/stats.json"
                className={inputClass}
              />
              <input
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
                disabled={busy || !httpEnabled}
                placeholder="Optional JSON path, e.g. data.tvl"
                className={inputClass}
              />
              {!httpEnabled && (
                <p className="text-[11px] text-ink-500">
                  Set CUSTOM_TOOL_HTTP_ALLOWLIST to enable JSON endpoint tools.
                </p>
              )}
            </>
          )}

          <button
            type="button"
            onClick={add}
            disabled={
              busy ||
              !title.trim() ||
              !description.trim() ||
              (kind === "duneQuery" && !queryId) ||
              (kind === "coingeckoMarket" && !coinId.trim()) ||
              (kind === "alchemyTokenSupply" && !address.trim()) ||
              (kind === "httpJson" && (!url.trim() || !httpEnabled))
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add tool
          </button>
        </div>
      )}

      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
