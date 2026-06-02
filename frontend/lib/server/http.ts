import "server-only";

/**
 * Shared server-only HTTP helper for the live-data overlays (Alchemy, CoinGecko,
 * Dune).
 *
 * Two caching modes:
 *   - Pass `revalidate` (seconds) to opt into Next's data cache. Detail pages
 *     fetch live on render, so identical requests within the revalidate window
 *     are served from cache (one upstream call per URL per window).
 *   - Omit `revalidate` to force `cache: "no-store"` (always fresh) — used by the
 *     daily cron refresh, which must not read a stale cached response.
 *
 * Every call fails soft: a non-2xx status, malformed body, timeout, or network
 * error resolves to `{ status, data: null }` rather than throwing, so a single
 * flaky upstream never blocks a page render.
 */

export interface FetchResult {
  /** HTTP status code, or 0 on network/timeout error. */
  status: number;
  /** Parsed JSON body if present (even on non-2xx), else null. */
  data: any | null;
}

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: string;
  timeoutMs?: number;
  /** Seconds for Next's data cache. Omit for no-store (always fresh). */
  revalidate?: number;
}

export async function fetchJson(url: string, opts: FetchJsonOptions = {}): Promise<FetchResult> {
  const { headers, method = "GET", body, timeoutMs = 20_000, revalidate } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init: RequestInit & { next?: { revalidate: number } } = {
      method,
      headers,
      body,
      signal: controller.signal,
    };
    if (typeof revalidate === "number") {
      init.next = { revalidate };
    } else {
      init.cache = "no-store";
    }

    const res = await fetch(url, init);
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Canonical ISO timestamp (seconds precision) for `updatedAt` fields. */
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
