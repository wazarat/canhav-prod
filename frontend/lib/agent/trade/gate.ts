import "server-only";

import type { ResearchVerdict } from "canhav-agent-service/src/types";

import { getCombinedVerdict } from "@/lib/agent/memory";
import { EXCHANGE_ROUTER, ORDER_VAULT } from "@/lib/agent/trade/gmx";
import { isTargetAllowed } from "@/lib/server/securityGate";

/** Verdicts older than this cannot gate a trade. */
export const VERDICT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Signals that block trading even when severity is not high.
 * Positive/stable: reserve_diversification, catalyst_positive, supply_growth (low/medium).
 */
const BLOCKED_SIGNALS = new Set(["peg_risk", "supply_contraction"]);

export type ResearchGateResult =
  | { ok: true; verdictRef: string }
  | { ok: false; reason: string };

function verdictRef(verdict: ResearchVerdict): string {
  return `${verdict.asset}:${verdict.ts}:${verdict.signal}`;
}

function isPositiveVerdict(verdict: ResearchVerdict): boolean {
  if (verdict.severity === "high") return false;
  if (BLOCKED_SIGNALS.has(verdict.signal)) return false;
  return true;
}

function isFreshVerdict(verdict: ResearchVerdict, now = Date.now()): boolean {
  const ts = Date.parse(verdict.ts);
  if (!Number.isFinite(ts)) return false;
  return now - ts <= VERDICT_MAX_AGE_MS;
}

/**
 * Server-side research + allowlist gate. Runs before any trade is built or signed.
 * Checks ExchangeRouter (gmxTarget) and OrderVault on SecurityRegistry.
 */
export async function assertResearchGate(
  asset: string,
  gmxTarget: `0x${string}` = EXCHANGE_ROUTER,
): Promise<ResearchGateResult> {
  const normalized = asset.trim();
  if (!normalized) {
    return { ok: false, reason: "Asset symbol is required." };
  }

  const verdict = await getCombinedVerdict(normalized);
  if (!verdict) {
    return {
      ok: false,
      reason: `No research verdict for ${normalized}. No research, no trade.`,
    };
  }

  if (!isFreshVerdict(verdict)) {
    return {
      ok: false,
      reason: `Research verdict for ${normalized} is stale (>${VERDICT_MAX_AGE_MS / 3_600_000}h). Refresh research first.`,
    };
  }

  if (!isPositiveVerdict(verdict)) {
    return {
      ok: false,
      reason: `Research blocks trading ${normalized}: signal=${verdict.signal}, severity=${verdict.severity}.`,
    };
  }

  const [routerAllowed, vaultAllowed] = await Promise.all([
    isTargetAllowed(gmxTarget),
    isTargetAllowed(ORDER_VAULT),
  ]);

  if (!routerAllowed) {
    return {
      ok: false,
      reason: `GMX target ${gmxTarget} is not on the SecurityRegistry allowlist.`,
    };
  }

  if (!vaultAllowed) {
    return {
      ok: false,
      reason: `GMX OrderVault ${ORDER_VAULT} is not on the SecurityRegistry allowlist.`,
    };
  }

  return { ok: true, verdictRef: verdictRef(verdict) };
}

/** Exported for unit/scripted checks without hitting the chain. */
export function evaluateVerdictGate(
  verdict: ResearchVerdict | null,
  now = Date.now(),
): ResearchGateResult {
  if (!verdict) {
    return { ok: false, reason: "No research verdict." };
  }
  if (!isFreshVerdict(verdict, now)) {
    return { ok: false, reason: "Stale verdict." };
  }
  if (!isPositiveVerdict(verdict)) {
    return { ok: false, reason: `Blocked signal: ${verdict.signal}` };
  }
  return { ok: true, verdictRef: verdictRef(verdict) };
}
