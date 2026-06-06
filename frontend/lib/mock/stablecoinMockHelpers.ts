import type { PegDataPoint } from "@/lib/types";
import { hashSeed, lcg, SERIES_ANCHOR } from "@/lib/mock/seriesHelpers";

/** Build a deterministic ~30-day peg series centered on `center`. */
export function makePegSeries(
  slug: string,
  center: number,
  vol: number,
  days = 30,
): PegDataPoint[] {
  const rand = lcg(hashSeed(slug));
  const points: PegDataPoint[] = [];
  let price = center;
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(SERIES_ANCHOR.getTime() - i * 24 * 60 * 60 * 1000);
    const shock = (rand() - 0.5) * 2 * vol;
    price = price + shock + (center - price) * 0.35;
    points.push({
      date: date.toISOString().slice(0, 10),
      price: Math.round(price * 10000) / 10000,
    });
  }
  points[points.length - 1] = { date: points[points.length - 1].date, price: center };
  return points;
}
