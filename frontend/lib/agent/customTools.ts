import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import { fetchTokenMetadata, fetchTotalSupply } from "@/lib/server/alchemy";
import { fetchMarketData } from "@/lib/server/coingecko";
import { fetchDuneLatestRows, fetchDuneQuerySeries } from "@/lib/server/dune";
import { readSecret, repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";
import type { CustomTool, CustomToolTemplate } from "@/lib/types";

/**
 * Owner-configured custom tools: typed, READ-ONLY data feeds from a fixed
 * catalog of kinds. Users never write code — each kind wraps a fetcher that
 * already exists (dune/coingecko/alchemy) or the gated httpJson fetcher below.
 *
 * Guardrails:
 *   - httpJson is restricted to an env allowlist of hostnames, HTTPS only,
 *     with timeout + response-size caps. Agents cannot fetch arbitrary URLs.
 *   - Per-agent cap keeps the merged toolset bounded.
 *   - Every executor fails soft (the agent loop's safe() wrapper catches the
 *     rest), matching the platform's graceful-degradation pattern.
 *
 * Key: agent:{id}:custom-tools -> JSON CustomTool[]
 */

export const CUSTOM_TOOL_LIMITS = {
  toolsMax: 8,
  titleMaxChars: 60,
  descriptionMaxChars: 240,
  httpTimeoutMs: 15_000,
  httpMaxBytes: 500_000,
  /** Truncate tool output JSON to keep the loop's token use sane. */
  outputMaxChars: 4_000,
  duneMaxRows: 20,
} as const;

const key = (agentId: string) => `agent:${agentId}:custom-tools`;

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

interface FileToolStore {
  tools: Record<string, CustomTool[]>;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "custom-tools-store.json");
}

function readFile(): FileToolStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileToolStore>;
    return { tools: parsed.tools ?? {} };
  } catch {
    return { tools: {} };
  }
}

function writeFile(store: FileToolStore): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    // best-effort offline dev
  }
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

export async function listCustomTools(agentId: string): Promise<CustomTool[]> {
  if (hasUpstash()) {
    return coerce<CustomTool[]>(await getRedisClient().get(key(agentId))) ?? [];
  }
  return readFile().tools[agentId] ?? [];
}

async function writeTools(agentId: string, tools: CustomTool[]): Promise<void> {
  if (hasUpstash()) {
    await getRedisClient().set(key(agentId), JSON.stringify(tools));
  } else {
    const store = readFile();
    store.tools[agentId] = tools;
    writeFile(store);
  }
}

export async function saveCustomTool(
  agentId: string,
  toolDef: CustomTool,
): Promise<CustomTool | null> {
  const tools = await listCustomTools(agentId);
  const idx = tools.findIndex((t) => t.id === toolDef.id);
  if (idx >= 0) {
    tools[idx] = toolDef;
  } else {
    if (tools.length >= CUSTOM_TOOL_LIMITS.toolsMax) return null;
    tools.push(toolDef);
  }
  await writeTools(agentId, tools);
  return toolDef;
}

export async function deleteCustomTool(agentId: string, toolId: string): Promise<boolean> {
  const tools = await listCustomTools(agentId);
  const next = tools.filter((t) => t.id !== toolId);
  if (next.length === tools.length) return false;
  await writeTools(agentId, next);
  return true;
}

export async function setCustomToolEnabled(
  agentId: string,
  toolId: string,
  enabled: boolean,
): Promise<CustomTool | null> {
  const tools = await listCustomTools(agentId);
  const target = tools.find((t) => t.id === toolId);
  if (!target) return null;
  target.enabled = enabled;
  await writeTools(agentId, tools);
  return target;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/** Allowlisted hostnames for httpJson tools (comma-separated env). */
export function customToolHttpAllowlist(): string[] {
  const raw = readSecret("CUSTOM_TOOL_HTTP_ALLOWLIST") ?? "";
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function hostAllowed(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const JSON_PATH_RE = /^[\w.[\]-]{0,120}$/;

export interface CustomToolValidation {
  template?: CustomToolTemplate;
  error?: string;
}

/** Coerce untrusted input into a valid CustomToolTemplate (typed catalog only). */
export function validateCustomToolTemplate(body: unknown): CustomToolValidation {
  const L = CUSTOM_TOOL_LIMITS;
  const input = (body ?? {}) as Record<string, unknown>;

  const title =
    typeof input.title === "string" ? input.title.trim().slice(0, L.titleMaxChars) : "";
  const description =
    typeof input.description === "string"
      ? input.description.trim().slice(0, L.descriptionMaxChars)
      : "";
  if (!title) return { error: "Tool title is required." };
  if (!description) return { error: "Tool description is required (the LLM reads it)." };

  switch (input.kind) {
    case "duneQuery": {
      const queryId = Number(input.queryId);
      if (!Number.isInteger(queryId) || queryId <= 0) {
        return { error: "duneQuery needs a positive integer queryId." };
      }
      return { template: { kind: "duneQuery", queryId, title, description } };
    }
    case "coingeckoMarket": {
      const coinId = typeof input.coinId === "string" ? input.coinId.trim().toLowerCase() : "";
      if (!coinId || !/^[a-z0-9-]{2,60}$/.test(coinId)) {
        return { error: "coingeckoMarket needs a valid CoinGecko coin id (e.g. 'jupiter-exchange-solana')." };
      }
      return { template: { kind: "coingeckoMarket", coinId, title, description } };
    }
    case "alchemyTokenSupply": {
      const address = typeof input.address === "string" ? input.address.trim() : "";
      if (!ADDRESS_RE.test(address)) {
        return { error: "alchemyTokenSupply needs a valid 0x token address." };
      }
      const decimals = typeof input.decimals === "number" ? input.decimals : null;
      return { template: { kind: "alchemyTokenSupply", address, decimals, title, description } };
    }
    case "httpJson": {
      const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return { error: "httpJson needs a valid URL." };
      }
      if (parsed.protocol !== "https:") return { error: "httpJson URLs must be https://." };
      const allowlist = customToolHttpAllowlist();
      if (!allowlist.length) {
        return { error: "httpJson tools are disabled (CUSTOM_TOOL_HTTP_ALLOWLIST is not set)." };
      }
      if (!hostAllowed(parsed.hostname, allowlist)) {
        return { error: `Host "${parsed.hostname}" is not on the custom-tool allowlist.` };
      }
      const jsonPath = typeof input.jsonPath === "string" ? input.jsonPath.trim() : "";
      if (jsonPath && !JSON_PATH_RE.test(jsonPath)) {
        return { error: "jsonPath may only contain letters, digits, dots, brackets, dashes." };
      }
      return {
        template: {
          kind: "httpJson",
          url: parsed.toString(),
          jsonPath: jsonPath || undefined,
          title,
          description,
        },
      };
    }
    default:
      return { error: `Unknown tool kind "${String(input.kind)}".` };
  }
}

/* -------------------------------------------------------------------------- */
/* Execution                                                                  */
/* -------------------------------------------------------------------------- */

/** Walk a bounded dot/bracket path ("result.rows[0].tvl") into a JSON value. */
function jsonPathGet(value: unknown, jsonPath: string): unknown {
  const parts = jsonPath
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .slice(0, 12);
  let current: unknown = value;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function truncateJson(value: unknown): unknown {
  const text = JSON.stringify(value);
  if (text.length <= CUSTOM_TOOL_LIMITS.outputMaxChars) return value;
  return `${text.slice(0, CUSTOM_TOOL_LIMITS.outputMaxChars)}… (truncated)`;
}

/** Gated server-side fetch for httpJson tools (allowlist re-checked at run time). */
async function runHttpJson(template: Extract<CustomToolTemplate, { kind: "httpJson" }>) {
  const parsed = new URL(template.url);
  if (parsed.protocol !== "https:" || !hostAllowed(parsed.hostname, customToolHttpAllowlist())) {
    return { available: false, summary: `Host "${parsed.hostname}" is no longer allowlisted.` };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CUSTOM_TOOL_LIMITS.httpTimeoutMs);
  try {
    const res = await fetch(template.url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { available: false, summary: `${template.title}: fetch failed (${res.status}).` };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > CUSTOM_TOOL_LIMITS.httpMaxBytes) {
      return { available: false, summary: `${template.title}: response too large.` };
    }
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(buf));
    } catch {
      return { available: false, summary: `${template.title}: response was not JSON.` };
    }
    const selected = template.jsonPath ? jsonPathGet(json, template.jsonPath) : json;
    return {
      available: selected !== undefined,
      url: template.url,
      jsonPath: template.jsonPath ?? null,
      data: truncateJson(selected),
      summary:
        selected !== undefined
          ? `${template.title}: fetched ${parsed.hostname}${template.jsonPath ? ` → ${template.jsonPath}` : ""}.`
          : `${template.title}: jsonPath "${template.jsonPath}" matched nothing.`,
    };
  } catch {
    return { available: false, summary: `${template.title}: fetch failed (timeout/network).` };
  } finally {
    clearTimeout(timer);
  }
}

/** Execute one custom tool template through its existing gated fetcher. */
export async function executeCustomTool(
  template: CustomToolTemplate,
): Promise<Record<string, unknown>> {
  switch (template.kind) {
    case "duneQuery": {
      const [series, rows] = await Promise.all([
        fetchDuneQuerySeries(template.queryId, 30),
        fetchDuneLatestRows(template.queryId, CUSTOM_TOOL_LIMITS.duneMaxRows),
      ]);
      const available = series.length > 0 || rows.length > 0;
      return {
        available,
        queryId: template.queryId,
        series: series.slice(-30),
        rows: truncateJson(rows),
        source: "dune",
        summary: available
          ? `${template.title}: Dune query ${template.queryId} returned ${series.length ? `${series.length} series points` : `${rows.length} rows`}.`
          : `${template.title}: Dune query ${template.queryId} returned nothing (no DUNE_API_KEY or empty results).`,
      };
    }
    case "coingeckoMarket": {
      const market = await fetchMarketData(template.coinId, 300);
      return {
        available: Boolean(market),
        coinId: template.coinId,
        market,
        source: "coingecko",
        summary: market
          ? `${template.title}: ${template.coinId} price $${market.currentPrice ?? "—"}.`
          : `${template.title}: no CoinGecko data for "${template.coinId}".`,
      };
    }
    case "alchemyTokenSupply": {
      const [supply, meta] = await Promise.all([
        fetchTotalSupply(template.address, template.decimals ?? null, 300),
        fetchTokenMetadata(template.address),
      ]);
      return {
        available: supply.value !== null,
        address: template.address,
        symbol: meta?.symbol ?? null,
        totalSupply: supply.value,
        updatedAt: supply.updatedAt,
        source: "alchemy",
        summary:
          supply.value !== null
            ? `${template.title}: on-chain supply ${supply.value} (${meta?.symbol ?? template.address.slice(0, 8)}).`
            : `${template.title}: no on-chain data (Alchemy not configured?).`,
      };
    }
    case "httpJson":
      return runHttpJson(template);
  }
}

/* -------------------------------------------------------------------------- */
/* AI SDK tool materialization                                                */
/* -------------------------------------------------------------------------- */

/** LLM tool name for a custom tool (must match ^[a-zA-Z0-9_-]+$). */
export function customToolName(toolDef: CustomTool): string {
  return `custom_${toolDef.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * Materialize the agent's ENABLED custom tools as AI SDK tool definitions.
 * Executors never throw (errors become soft summaries the model can read).
 */
export async function buildCustomTools(agentId: string) {
  const tools = await listCustomTools(agentId);
  const entries = tools
    .filter((t) => t.enabled)
    .map((t) => [
      customToolName(t),
      tool({
        description: `${t.template.title} — ${t.template.description} (owner-configured read-only data feed)`,
        inputSchema: z.object({}),
        execute: async () => {
          try {
            return await executeCustomTool(t.template);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { available: false, summary: `${t.template.title} unavailable: ${msg}` };
          }
        },
      }),
    ]);
  return Object.fromEntries(entries) as Record<string, (typeof entries)[number][1]>;
}
