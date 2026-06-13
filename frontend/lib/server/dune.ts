import "server-only";

import { readSecret } from "@/lib/server/env";
import { fetchJson, sleep } from "@/lib/server/http";
import type { PegDataPoint, TvlDataPoint } from "@/lib/types";

/**
 * Dune Analytics overlay — historical peg variance (stablecoins) and TVL / AUM
 * (RWAs). TS port of the deferred plan in `backend/app/live/dune.py`.
 *
 * Each metric is backed by a SAVED Dune query whose id is curated in
 * `DUNE_QUERY_IDS` below (the single place to map a protocol slug to its query).
 * The query must return one row per day with a date-like column and a numeric
 * value column (auto-detected, or named explicitly via the config).
 *
 * Fetch strategy, tuned for cached live-render:
 *   1. GET the query's latest results (no execution credits — ideal for a
 *      scheduled/free-tier query).
 *   2. Only if that is empty, POST execute -> poll status -> GET results.
 *
 * Everything fails soft: a missing `DUNE_API_KEY`, an unmapped slug, or any API
 * error yields `[]`, so the chart falls back to CoinGecko (see series.ts).
 */

const DUNE_BASE = "https://api.dune.com/api/v1";
const LIVE_REVALIDATE = 300;

export interface DuneQueryConfig {
  queryId: number;
  /** Column holding the date (auto-detected when omitted). */
  dateCol?: string;
  /** Column holding the numeric value (auto-detected when omitted). */
  valueCol?: string;
}

/**
 * Curated slug -> saved Dune query mapping. Fill these in once the queries exist
 * in your Dune account, e.g.:
 *
 *   usdc: { peg: { queryId: 1234567, dateCol: "day", valueCol: "price" } },
 *   centrifuge: { tvl: { queryId: 7654321 } },
 *
 * Until populated, Dune is skipped and charts use the CoinGecko fallback.
 */
export const DUNE_QUERY_IDS: Record<string, { peg?: DuneQueryConfig; tvl?: DuneQueryConfig }> = {};

export function hasDune(): boolean {
  return Boolean(readSecret("DUNE_API_KEY"));
}

function authHeaders(): Record<string, string> | null {
  const key = readSecret("DUNE_API_KEY");
  if (!key) return null;
  return { "X-Dune-API-Key": key, Accept: "application/json" };
}

type Row = Record<string, unknown>;

function pickDateColumn(row: Row, configured?: string): string | null {
  if (configured && configured in row) return configured;
  const keys = Object.keys(row);
  return keys.find((k) => /(date|day|time|ts|period)/i.test(k)) ?? null;
}

function pickValueColumn(row: Row, dateCol: string, configured?: string): string | null {
  if (configured && configured in row) return configured;
  const keys = Object.keys(row).filter((k) => k !== dateCol);
  return keys.find((k) => typeof row[k] === "number") ?? keys[0] ?? null;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value === "number") {
    // Heuristic: seconds vs milliseconds epoch.
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toISOString().slice(0, 10);
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Normalize Dune result rows into a sorted, de-duplicated daily series. */
function normalizeRows(rows: Row[], config: DuneQueryConfig, days: number): { date: string; value: number }[] {
  if (!rows.length) return [];
  const dateCol = pickDateColumn(rows[0], config.dateCol);
  if (!dateCol) return [];
  const valueCol = pickValueColumn(rows[0], dateCol, config.valueCol);
  if (!valueCol) return [];

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const date = toIsoDate(row[dateCol]);
    const value = toNumber(row[valueCol]);
    if (date === null || value === null) continue;
    byDate.set(date, value);
  }
  const series = Array.from(byDate, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return days > 0 ? series.slice(-days) : series;
}

function extractRows(data: any): Row[] {
  const rows = data?.result?.rows;
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

/** GET the most recent results for a saved query (no execution credits). */
async function getLatestResults(queryId: number): Promise<Row[]> {
  const headers = authHeaders();
  if (!headers) return [];
  const { status, data } = await fetchJson(`${DUNE_BASE}/query/${queryId}/results`, {
    headers,
    revalidate: LIVE_REVALIDATE,
  });
  if (status < 200 || status >= 300) return [];
  return extractRows(data);
}

/** POST execute -> poll status -> GET results. Used only as a fallback. */
async function executeAndWait(queryId: number, maxPolls = 8): Promise<Row[]> {
  const headers = authHeaders();
  if (!headers) return [];

  const exec = await fetchJson(`${DUNE_BASE}/query/${queryId}/execute`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    revalidate: LIVE_REVALIDATE,
  });
  const executionId = exec.data?.execution_id;
  if (typeof executionId !== "string") return [];

  for (let i = 0; i < maxPolls; i += 1) {
    const statusRes = await fetchJson(`${DUNE_BASE}/execution/${executionId}/status`, {
      headers,
    });
    const state = statusRes.data?.state;
    if (state === "QUERY_STATE_COMPLETED") break;
    if (state === "QUERY_STATE_FAILED" || state === "QUERY_STATE_CANCELLED") return [];
    await sleep(1_500);
  }

  const results = await fetchJson(`${DUNE_BASE}/execution/${executionId}/results`, {
    headers,
    revalidate: LIVE_REVALIDATE,
  });
  return extractRows(results.data);
}

async function fetchSeries(config: DuneQueryConfig, days: number): Promise<{ date: string; value: number }[]> {
  if (!hasDune()) return [];
  let rows = await getLatestResults(config.queryId);
  if (rows.length === 0) rows = await executeAndWait(config.queryId);
  return normalizeRows(rows, config, days);
}

/**
 * Daily series for an ARBITRARY saved query id (user-configured custom agent
 * tools). Same auth, caching, and fail-soft behavior as the curated fetchers.
 */
export async function fetchDuneQuerySeries(
  queryId: number,
  days = 30,
): Promise<{ date: string; value: number }[]> {
  if (!Number.isInteger(queryId) || queryId <= 0) return [];
  return fetchSeries({ queryId }, days);
}

/**
 * Latest raw rows for an arbitrary saved query (capped) — for custom tools
 * whose query is not a daily time series.
 */
export async function fetchDuneLatestRows(queryId: number, maxRows = 20): Promise<Row[]> {
  if (!hasDune() || !Number.isInteger(queryId) || queryId <= 0) return [];
  const rows = await getLatestResults(queryId);
  return rows.slice(0, maxRows);
}

/** Daily peg-price series for a stablecoin slug (≈1.0 for a healthy peg). */
export async function fetchPegHistory(slug: string, days = 30): Promise<PegDataPoint[]> {
  const config = DUNE_QUERY_IDS[slug]?.peg;
  if (!config) return [];
  return (await fetchSeries(config, days)).map((p) => ({ date: p.date, price: p.value }));
}

/** Daily TVL / AUM series (USD) for an RWA slug. */
export async function fetchTvlHistory(slug: string, days = 30): Promise<TvlDataPoint[]> {
  const config = DUNE_QUERY_IDS[slug]?.tvl;
  if (!config) return [];
  return (await fetchSeries(config, days)).map((p) => ({ date: p.date, value: p.value }));
}

/* -------------------------------------------------------------------------- */
/* Write path — agent verdict rows (Dune Tables / Uploads API)                */
/* -------------------------------------------------------------------------- */

/**
 * Off-chain "judgment" the agent publishes back to Dune so a dashboard can
 * overlay the agent's verdict on the existing on-chain chart. This is the only
 * write surface in the otherwise read-only Dune client.
 *
 * Feasibility: the Uploads API (create + insert) is available on Dune's Free
 * plan (create = 10 credits; insert >= 1 credit). The `DUNE_API_KEY` must have
 * Read/Write scope. Gated behind `DUNE_WRITE_ENABLED === "1"` so it lands dark.
 */

export const VERDICT_TABLE = "canhav_agent_verdicts";

/** Columns of `dune.{namespace}.canhav_agent_verdicts` (must match on insert). */
const VERDICT_SCHEMA: { name: string; type: string }[] = [
  { name: "ts", type: "timestamp" },
  { name: "agent_id", type: "varchar" },
  { name: "asset", type: "varchar" },
  { name: "signal", type: "varchar" },
  { name: "severity", type: "varchar" },
  { name: "rationale", type: "varchar" },
  { name: "confidence", type: "double" },
  { name: "source_refs", type: "varchar" },
];

export interface AgentVerdict {
  ts: string;
  agent_id: string;
  asset: string;
  signal: string;
  severity: "low" | "medium" | "high";
  rationale: string;
  confidence: number;
  source_refs: string;
}

/** Dune team handle / namespace the verdict table lives under. */
export function duneNamespace(): string {
  return readSecret("DUNE_NAMESPACE") ?? "canhav";
}

/** True only when a key is set AND writes are explicitly enabled (land-dark flag). */
export function hasDuneWrite(): boolean {
  return hasDune() && readSecret("DUNE_WRITE_ENABLED") === "1";
}

// Per-process guard so we attempt the (credit-charging) create at most once.
let verdictTableEnsured = false;

/**
 * Create the verdict table once. Idempotent: a fresh create succeeds; an
 * "already exists" failure is treated as success so we never re-spend the
 * 10-credit create. Fails soft (returns false) on any other error.
 */
export async function ensureVerdictTable(): Promise<boolean> {
  if (verdictTableEnsured) return true;
  const headers = authHeaders();
  if (!headers) return false;
  try {
    const res = await fetch(`${DUNE_BASE}/uploads`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        namespace: duneNamespace(),
        table_name: VERDICT_TABLE,
        is_private: false,
        schema: VERDICT_SCHEMA,
      }),
      cache: "no-store",
    });
    if (res.ok) {
      verdictTableEnsured = true;
      return true;
    }
    const text = await res.text().catch(() => "");
    if (/exist/i.test(text)) {
      verdictTableEnsured = true;
      return true;
    }
    console.error(`[dune] ensureVerdictTable failed (${res.status}): ${text.slice(0, 200)}`);
    return false;
  } catch (e) {
    console.error("[dune] ensureVerdictTable error:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Append one verdict row to the table via the Uploads insert endpoint. Uses
 * NDJSON (one JSON object per line) so values with commas/quotes/newlines are
 * encoded safely — no hand-rolled CSV escaping. Fails soft (returns false).
 * Callers should `ensureVerdictTable()` first.
 */
export async function insertVerdict(v: AgentVerdict): Promise<boolean> {
  if (!hasDuneWrite()) return false;
  const headers = authHeaders();
  if (!headers) return false;
  const line = JSON.stringify({
    ts: v.ts,
    agent_id: v.agent_id,
    asset: v.asset,
    signal: v.signal,
    severity: v.severity,
    rationale: v.rationale,
    confidence: v.confidence,
    source_refs: v.source_refs,
  });
  try {
    const res = await fetch(`${DUNE_BASE}/uploads/${duneNamespace()}/${VERDICT_TABLE}/insert`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-ndjson" },
      body: `${line}\n`,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[dune] insertVerdict failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return res.ok;
  } catch (e) {
    console.error("[dune] insertVerdict error:", e instanceof Error ? e.message : e);
    return false;
  }
}
