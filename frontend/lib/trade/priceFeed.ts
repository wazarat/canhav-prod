import { JLP_MARKET } from "./jlpMarket";

/** Seeded value-noise so the same minute always yields the same mark price. */
function noise(t: number): number {
  const x = Math.sin(t * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/** Mark price = anchor * (1 + small drift + bounded noise). */
export function markPriceAt(ms: number): number {
  const minutes = ms / 60_000;
  const drift = Math.sin(minutes / 90) * 0.004;
  const jitter = noise(Math.floor(ms / 2000)) * 0.0015;
  return +(JLP_MARKET.priceUsd * (1 + drift + jitter)).toFixed(4);
}

/** Build a back-dated series for the chart (points spaced `stepMin` apart). */
export function buildSeries(
  points: number,
  stepMin: number,
): { t: number; price: number }[] {
  const now = Date.now();
  const out: { t: number; price: number }[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const t = now - i * stepMin * 60_000;
    out.push({ t, price: markPriceAt(t) });
  }
  return out;
}
