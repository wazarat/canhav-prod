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
  /** Extra attempts on transient socket failures (GET only). Default 2 → 3 total. */
  retries?: number;
  /** Base backoff before a retry; grows exponentially per attempt. Default 300ms. */
  retryBackoffMs?: number;
}

export async function fetchJson(url: string, opts: FetchJsonOptions = {}): Promise<FetchResult> {
  const {
    headers,
    method = "GET",
    body,
    timeoutMs = 20_000,
    revalidate,
    retries = 2,
    retryBackoffMs = 300,
  } = opts;

  // Only idempotent GETs are safe to replay. A POST retry could double-submit.
  const maxAttempts = method === "POST" ? 1 : retries + 1;
  let lastResult: FetchResult = { status: 0, data: null };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Fresh controller + timer per attempt — an aborted signal can't be reused.
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

      // Real non-2xx (4xx/5xx) is terminal — not a transient socket failure, so
      // don't burn retries on it. Return the status (with body if any) as before.
      if (res.status < 200 || res.status >= 300) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        return { status: res.status, data };
      }

      // 2xx: parse the body. If parsing throws, the stream was likely cut off
      // mid-flight (the classic `terminated` symptom) — treat as retryable.
      try {
        const data = await res.json();
        return { status: res.status, data };
      } catch {
        lastResult = { status: 0, data: null };
      }
    } catch {
      // Network/abort/UND_ERR_SOCKET/terminated — retryable.
      lastResult = { status: 0, data: null };
    } finally {
      clearTimeout(timer);
    }

    // Backoff before the next attempt (skip after the final one).
    if (attempt < maxAttempts - 1) {
      await sleep(retryBackoffMs * 2 ** attempt);
    }
  }

  return lastResult;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Canonical ISO timestamp (seconds precision) for `updatedAt` fields. */
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
