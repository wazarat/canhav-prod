import "server-only";

import type { AgentConfig } from "@/lib/agent/agentConfig";
import { EXCHANGE_ROUTER, ORDER_VAULT } from "@/lib/agent/trade/gmx";
import { isTargetAllowed } from "@/lib/server/securityGate";
import { sumTradeSizeUsd } from "@/lib/server/tradeLog";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AllowlistStatus {
  routerAllowed: boolean;
  vaultAllowed: boolean;
}

/**
 * SecurityRegistry allowlist state for the two GMX trade targets the research
 * gate checks (ExchangeRouter + OrderVault). Display-only: `assertResearchGate`
 * re-reads the registry server-side before any trade is built or signed.
 * Fails soft to null so an RPC hiccup never breaks the Trade Desk.
 */
export async function readAllowlistStatus(): Promise<AllowlistStatus | null> {
  try {
    const [routerAllowed, vaultAllowed] = await Promise.all([
      isTargetAllowed(EXCHANGE_ROUTER),
      isTargetAllowed(ORDER_VAULT),
    ]);
    return { routerAllowed, vaultAllowed };
  } catch {
    return null;
  }
}

export interface CapStatus {
  /** Human USD (caps are stored whole-dollar); null = no cap set. */
  perTradeCapUsd: number | null;
  cumulativeCapUsd: number | null;
  /** Executed size over the rolling 24h window, human USD. */
  spent24hUsd: number;
  /** Cumulative-cap headroom, human USD; null when no cumulative cap. */
  remaining24hUsd: number | null;
  /** Raw 30-dec values for RSC-side comparisons (never pass to client props). */
  perTradeCapRaw: bigint | null;
  cumulativeCapRaw: bigint | null;
  spentRaw: bigint;
}

function parseCapRaw(raw: string | null): bigint | null {
  if (!raw) return null;
  try {
    const v = BigInt(raw);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
}

function toHumanUsd(raw: bigint): number {
  return Number(raw) / 1e30;
}

/**
 * Display-only mirror of `checkSpendingCap`'s inputs
 * (lib/agent/trade/spendingCap.ts): caps from the agent config + the rolling
 * 24h spend from the trade log. Enforcement always re-runs server-side at
 * /api/agent/trade — this only tells the owner where they stand pre-trade.
 */
export async function readCapStatus(agentId: string, config: AgentConfig): Promise<CapStatus> {
  const perTradeCapRaw = parseCapRaw(config.tradeSpendingCapUsd);
  const cumulativeCapRaw = parseCapRaw(config.tradeCumulativeCapUsd);

  let spentRaw = 0n;
  try {
    spentRaw = await sumTradeSizeUsd(agentId, Date.now() - DAY_MS);
  } catch {
    /* storage hiccup — show zero spent rather than break the desk */
  }

  const cumulativeCapUsd = cumulativeCapRaw != null ? toHumanUsd(cumulativeCapRaw) : null;
  const spent24hUsd = toHumanUsd(spentRaw);
  return {
    perTradeCapUsd: perTradeCapRaw != null ? toHumanUsd(perTradeCapRaw) : null,
    cumulativeCapUsd,
    spent24hUsd,
    remaining24hUsd:
      cumulativeCapUsd != null ? Math.max(0, cumulativeCapUsd - spent24hUsd) : null,
    perTradeCapRaw,
    cumulativeCapRaw,
    spentRaw,
  };
}

/**
 * Would this proposal auto-approve under the spending caps? Literal mirror of
 * `checkSpendingCap`'s two cap comparisons — keep them in sync. Display-only.
 */
export function isWithinCaps(sizeUsd: bigint, caps: CapStatus): boolean {
  if (caps.perTradeCapRaw != null && sizeUsd > caps.perTradeCapRaw) return false;
  if (caps.cumulativeCapRaw != null && caps.spentRaw + sizeUsd > caps.cumulativeCapRaw) {
    return false;
  }
  return true;
}
