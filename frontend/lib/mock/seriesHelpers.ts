import type { PricePoint } from "@/lib/types";

export const SERIES_ANCHOR = new Date("2026-06-05T00:00:00Z");

/** Deterministic 32-bit hash (FNV-1a) so each slug yields a stable series. */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tiny seeded LCG in [0, 1). */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Build a deterministic price/APY series ending at `endPrice` with total drift
 * `driftPct` across the window plus small day-to-day wobble.
 */
export function makePriceSeries(
  slug: string,
  endPrice: number,
  driftPct: number,
  vol = 0.02,
  days = 90,
): PricePoint[] {
  const rand = lcg(hashSeed(slug));
  const start = endPrice / (1 + driftPct);
  const points: PricePoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const t = i / (days - 1);
    const date = new Date(
      SERIES_ANCHOR.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000,
    );
    const trend = start + (endPrice - start) * t;
    const wobble = 1 + (rand() - 0.5) * 2 * vol;
    const price =
      endPrice >= 1
        ? Math.round(trend * wobble * 100) / 100
        : Math.round(trend * wobble * 10000) / 10000;
    points.push({ date: date.toISOString().slice(0, 10), price });
  }
  points[points.length - 1] = {
    date: points[points.length - 1].date,
    price: endPrice,
  };
  return points;
}
