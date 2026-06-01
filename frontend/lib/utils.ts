import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE = {
  name: "CanHav Research",
  tagline: "Arbitrum ecosystem intelligence for capital markets.",
  url: "https://research.canhav.com",
  socials: {
    x: "https://x.com/wazarat",
    linkedin: "https://www.linkedin.com/in/wazarat",
  },
} as const;

/** Format a large USD figure into a compact string ($1.2B, $340.0M, $12.3K). */
export function formatUsdCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/** Format a peg price with 4 decimals, e.g. 0.9987. */
export function formatPeg(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(4);
}
