import "server-only";

import {
  getApprovedRwaBySlug,
  getApprovedStablecoinBySlug,
  getApprovedTokenBySlug,
} from "@/lib/data";
import { fetchReserveRatesForSlug, isAaveReserveSlug } from "@/lib/server/aave";
import { fetchTotalSupply } from "@/lib/server/alchemy";
import {
  changePct,
  pegDeviationBps,
  resolvePegSeries,
  resolvePriceSeries,
  resolveTvlSeries,
} from "@/lib/server/series";
import type {
  AgentProductRef,
} from "@/lib/agent/memory";
import type { DataFrame, DataFrameMetric, DataFrameWindow } from "@/lib/types";

/**
 * Data frames: user-pinned compositions of EXISTING read-only metrics that an
 * agent should always be able to pull for its entity. Every metric kind maps
 * 1:1 to a fetcher that already exists (series/alchemy/aave) — no new data
 * sources, and resolution degrades gracefully exactly like those fetchers do.
 */

export const DATA_FRAME_LIMITS = {
  titleMaxChars: 80,
  notesMaxChars: 300,
  metricsMax: 6,
  /** Max series points returned per metric (older windows are downsampled). */
  pointsMax: 30,
} as const;

const WINDOWS: DataFrameWindow[] = ["7d", "30d", "90d"];

function windowDays(window: DataFrameWindow): number {
  return window === "7d" ? 7 : window === "90d" ? 90 : 30;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export interface FrameValidation {
  frame?: DataFrame;
  error?: string;
}

/** Validate untrusted input into a DataFrame (slugs checked against the store). */
export async function validateDataFrameInput(
  agentId: string,
  body: unknown,
  existingId?: string,
): Promise<FrameValidation> {
  const L = DATA_FRAME_LIMITS;
  const input = (body ?? {}) as {
    title?: unknown;
    metrics?: unknown;
    window?: unknown;
    notes?: unknown;
  };

  const title = typeof input.title === "string" ? input.title.trim().slice(0, L.titleMaxChars) : "";
  if (!title) return { error: "Frame title is required." };

  const window = WINDOWS.includes(input.window as DataFrameWindow)
    ? (input.window as DataFrameWindow)
    : "30d";

  const rawMetrics = Array.isArray(input.metrics) ? input.metrics : [];
  if (!rawMetrics.length) return { error: "Pick at least one metric." };
  if (rawMetrics.length > L.metricsMax) {
    return { error: `A frame can hold at most ${L.metricsMax} metrics.` };
  }

  const metrics: DataFrameMetric[] = [];
  for (const raw of rawMetrics) {
    const m = raw as { kind?: string; slug?: string; address?: string; decimals?: number; label?: string };
    switch (m.kind) {
      case "peg": {
        const slug = typeof m.slug === "string" ? m.slug : "";
        if (!slug || !(await getApprovedStablecoinBySlug(slug))) {
          return { error: `"${slug}" is not an approved stablecoin (peg metric).` };
        }
        metrics.push({ kind: "peg", slug });
        break;
      }
      case "tvl": {
        const slug = typeof m.slug === "string" ? m.slug : "";
        if (!slug || !(await getApprovedRwaBySlug(slug))) {
          return { error: `"${slug}" is not an approved RWA (tvl metric).` };
        }
        metrics.push({ kind: "tvl", slug });
        break;
      }
      case "price": {
        const slug = typeof m.slug === "string" ? m.slug : "";
        if (!slug || !(await getApprovedTokenBySlug(slug))) {
          return { error: `"${slug}" is not an approved token (price metric).` };
        }
        metrics.push({ kind: "price", slug });
        break;
      }
      case "supply": {
        const address = typeof m.address === "string" ? m.address.trim() : "";
        if (!ADDRESS_RE.test(address)) {
          return { error: "Supply metric needs a valid 0x token address." };
        }
        metrics.push({
          kind: "supply",
          address,
          decimals: typeof m.decimals === "number" ? m.decimals : null,
          label: typeof m.label === "string" ? m.label.trim().slice(0, 40) : undefined,
        });
        break;
      }
      case "aaveRates": {
        const slug = typeof m.slug === "string" ? m.slug : "";
        if (!slug || !isAaveReserveSlug(slug)) {
          return { error: `"${slug}" is not an Aave reserve slug (gho/ausdc/ausdt/aweth).` };
        }
        metrics.push({ kind: "aaveRates", slug });
        break;
      }
      default:
        return { error: `Unknown metric kind "${String(m.kind)}".` };
    }
  }

  return {
    frame: {
      id: existingId ?? `frame_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      title,
      metrics,
      window,
      notes:
        typeof input.notes === "string" && input.notes.trim()
          ? input.notes.trim().slice(0, L.notesMaxChars)
          : undefined,
      createdAt: new Date().toISOString(),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Resolution (frame_load)                                                    */
/* -------------------------------------------------------------------------- */

interface SeriesStats {
  latest: number | null;
  changePct: number | null;
  points: { date: string; value: number }[];
}

export interface ResolvedFrameMetric {
  kind: DataFrameMetric["kind"];
  label: string;
  available: boolean;
  source: string | null;
  /** Compact metric payload (stats + downsampled series, or live values). */
  data: Record<string, unknown>;
}

export interface ResolvedFrame {
  frameId: string;
  title: string;
  window: DataFrameWindow;
  notes: string | null;
  resolvedAt: string;
  metrics: ResolvedFrameMetric[];
  summary: string;
}

function downsample(points: { date: string; value: number }[], max: number) {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: { date: string; value: number }[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)]);
  out[out.length - 1] = points[points.length - 1];
  return out;
}

function seriesStats(
  points: { date: string; value: number }[],
  days: number,
): SeriesStats {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const windowed = points.filter((p) => p.date >= cutoff);
  const usable = windowed.length >= 2 ? windowed : points.slice(-days);
  return {
    latest: usable.length ? usable[usable.length - 1].value : null,
    changePct: changePct(usable),
    points: downsample(usable, DATA_FRAME_LIMITS.pointsMax),
  };
}

async function resolveMetric(
  metric: DataFrameMetric,
  days: number,
): Promise<ResolvedFrameMetric> {
  try {
    switch (metric.kind) {
      case "peg": {
        const profile = await getApprovedStablecoinBySlug(metric.slug);
        if (!profile) return missing(metric, metric.slug);
        const series = await resolvePegSeries(profile);
        const stats = seriesStats(
          series.points.map((p) => ({ date: p.date, value: p.price })),
          days,
        );
        return {
          kind: "peg",
          label: `${profile.symbol} peg`,
          available: stats.points.length > 0,
          source: series.source,
          data: {
            ...stats,
            pegTarget: profile.pegTarget,
            deviationBps: pegDeviationBps(series.points),
          },
        };
      }
      case "tvl": {
        const profile = await getApprovedRwaBySlug(metric.slug);
        if (!profile) return missing(metric, metric.slug);
        const series = await resolveTvlSeries(profile);
        const stats = seriesStats(series.points, days);
        return {
          kind: "tvl",
          label: `${profile.symbol} TVL (USD)`,
          available: stats.points.length > 0,
          source: series.source,
          data: { ...stats },
        };
      }
      case "price": {
        const profile = await getApprovedTokenBySlug(metric.slug);
        if (!profile) return missing(metric, metric.slug);
        const series = await resolvePriceSeries(profile);
        const stats = seriesStats(
          series.points.map((p) => ({ date: p.date, value: p.price })),
          days,
        );
        return {
          kind: "price",
          label: `${profile.symbol} price (USD)`,
          available: stats.points.length > 0,
          source: series.source,
          data: { ...stats },
        };
      }
      case "supply": {
        const supply = await fetchTotalSupply(metric.address, metric.decimals ?? null, 300);
        return {
          kind: "supply",
          label: metric.label ?? `Supply ${metric.address.slice(0, 8)}…`,
          available: supply.value !== null,
          source: supply.value !== null ? "alchemy" : null,
          data: { totalSupply: supply.value, updatedAt: supply.updatedAt, address: metric.address },
        };
      }
      case "aaveRates": {
        const rates = await fetchReserveRatesForSlug(metric.slug);
        return {
          kind: "aaveRates",
          label: `Aave V3 ${rates?.underlyingSymbol ?? metric.slug}`,
          available: Boolean(rates && rates.supplyApyPct !== null),
          source: rates ? "aave" : null,
          data: rates
            ? {
                supplyApyPct: rates.supplyApyPct,
                variableBorrowApyPct: rates.variableBorrowApyPct,
                utilizationPct: rates.utilizationPct,
                updatedAt: rates.updatedAt,
              }
            : {},
        };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      kind: metric.kind,
      label: metric.kind,
      available: false,
      source: null,
      data: { error: msg },
    };
  }
}

function missing(metric: DataFrameMetric, slug: string): ResolvedFrameMetric {
  return {
    kind: metric.kind,
    label: `${metric.kind} ${slug}`,
    available: false,
    source: null,
    data: { error: `No approved profile for "${slug}".` },
  };
}

/** Resolve every metric in a frame through its existing fetcher (parallel). */
export async function resolveDataFrame(frame: DataFrame): Promise<ResolvedFrame> {
  const days = windowDays(frame.window);
  const metrics = await Promise.all(frame.metrics.map((m) => resolveMetric(m, days)));
  const live = metrics.filter((m) => m.available).length;
  return {
    frameId: frame.id,
    title: frame.title,
    window: frame.window,
    notes: frame.notes ?? null,
    resolvedAt: new Date().toISOString(),
    metrics,
    summary: `Loaded data frame "${frame.title}" (${live}/${metrics.length} metrics live, ${frame.window}).`,
  };
}

/* -------------------------------------------------------------------------- */
/* UI helper: which metrics make sense for this agent                         */
/* -------------------------------------------------------------------------- */

export interface FrameMetricOption {
  kind: DataFrameMetric["kind"];
  slug?: string;
  address?: string;
  decimals?: number | null;
  label: string;
}

/**
 * Build the metric picker options for an agent from its associated products
 * (member coins of the bound entity). Supply options are derived from each
 * product's known contract address, Aave options from the reserve map.
 */
export async function frameMetricOptionsForProducts(
  products: AgentProductRef[],
): Promise<FrameMetricOption[]> {
  const options: FrameMetricOption[] = [];
  for (const p of products) {
    if (p.category === "Stablecoin") {
      const profile = await getApprovedStablecoinBySlug(p.slug);
      if (!profile) continue;
      options.push({ kind: "peg", slug: p.slug, label: `${p.symbol} peg history` });
      if (profile.contractAddress) {
        options.push({
          kind: "supply",
          address: profile.contractAddress,
          decimals: null,
          label: `${p.symbol} on-chain supply`,
        });
      }
    } else if (p.category === "Token") {
      const profile = await getApprovedTokenBySlug(p.slug);
      if (!profile) continue;
      options.push({ kind: "price", slug: p.slug, label: `${p.symbol} price history` });
      if (profile.contractAddress) {
        options.push({
          kind: "supply",
          address: profile.contractAddress,
          decimals: null,
          label: `${p.symbol} on-chain supply`,
        });
      }
    } else if (p.category === "RWA") {
      options.push({ kind: "tvl", slug: p.slug, label: `${p.symbol} TVL history` });
    }
    if (isAaveReserveSlug(p.slug)) {
      options.push({ kind: "aaveRates", slug: p.slug, label: `${p.symbol} Aave V3 rates` });
    }
  }
  return options;
}
