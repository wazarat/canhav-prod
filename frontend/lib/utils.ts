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

/** Format a user/depositor count compactly (125.5K, 1.2M). */
export function formatUsersCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

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

/** Currency symbol for a stablecoin peg target (USD/EUR/GBP/AUD/CAD/HKD/ISK). */
export function pegSymbol(pegTarget: string | null | undefined): string {
  switch (pegTarget) {
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "AUD":
      return "A$";
    case "CAD":
      return "C$";
    case "HKD":
      return "HK$";
    case "ISK":
      return "kr";
    default:
      return "$";
  }
}

/** Format a large bare number compactly (1.2B, 340.0M, 12.3K) — no currency. */
export function formatNumberCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(abs >= 1 ? 0 : 4);
}

/** Format a signed percentage, e.g. +4.2% / -1.8%. */
export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Shorten an EVM address to 0x1234…abcd. */
export function truncateAddress(address: string | null | undefined): string {
  if (!address) return "—";
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Compact relative time from an ISO timestamp, e.g. "3h ago", "5d ago". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Arbiscan token page URL for a contract address, or null. */
export function arbiscanToken(address: string | null | undefined): string | null {
  return address ? `https://arbiscan.io/token/${address}` : null;
}

/** Arbiscan transaction URL for a tx hash, or null. */
export function arbiscanTx(hash: string | null | undefined): string | null {
  return hash ? `https://arbiscan.io/tx/${hash}` : null;
}

/** Arbitrum Sepolia Arbiscan transaction URL (agent collab / testnet stack). */
export function arbiscanSepoliaTx(hash: string | null | undefined): string | null {
  return hash ? `https://sepolia.arbiscan.io/tx/${hash}` : null;
}

/** Arbitrum Sepolia Arbiscan address page. */
export function arbiscanSepoliaAddress(address: string | null | undefined): string | null {
  return address ? `https://sepolia.arbiscan.io/address/${address}` : null;
}
