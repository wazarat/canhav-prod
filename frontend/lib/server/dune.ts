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
