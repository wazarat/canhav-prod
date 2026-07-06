import "server-only";

import { getAgentProfile } from "@/lib/agent/memory";
import {
  defaultAgentConfig,
  sanitizeAgentConfig,
  type TradeHitlMethod,
} from "@/lib/agent/agentConfig";
import { sumTradeSizeUsd } from "@/lib/server/tradeLog";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SpendingCapCheck {
  ok: boolean;
  reason?: string;
  hitlMethod: TradeHitlMethod;
}

function parseCapUsd(raw: string | null | undefined): bigint | null {
  if (!raw) return null;
  try {
    const v = BigInt(raw);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
}

/**
 * Enforce per-agent spending caps and HITL method.
 * - manual: always requires humanApproved
 * - propose_approve: requires humanApproved unless overridden
 * - spending_cap: auto when within per-trade + cumulative caps
 */
export async function checkSpendingCap(params: {
  agentId: string;
  sizeUsd: bigint;
  humanApproved?: boolean;
  autoExecute?: boolean;
}): Promise<SpendingCapCheck> {
  const profile = await getAgentProfile(params.agentId);
  const config = sanitizeAgentConfig(profile?.config ?? defaultAgentConfig());
  const method = config.tradeHitlMethod;

  if (method === "manual") {
    if (!params.humanApproved) {
      return {
        ok: false,
        reason: "Manual HITL: owner must execute the trade themselves.",
        hitlMethod: method,
      };
    }
    return { ok: true, hitlMethod: method };
  }

  if (method === "propose_approve") {
    if (!params.humanApproved) {
      return {
        ok: false,
        reason: "Trade requires owner approval (propose → approve).",
        hitlMethod: method,
      };
    }
    return { ok: true, hitlMethod: method };
  }

  // spending_cap — auto-execute when within caps and autoExecute flag set
  const perTradeCap = parseCapUsd(config.tradeSpendingCapUsd);
  const cumulativeCap = parseCapUsd(config.tradeCumulativeCapUsd);

  if (perTradeCap != null && params.sizeUsd > perTradeCap) {
    return {
      ok: false,
      reason: `Trade size exceeds per-trade cap (${perTradeCap.toString()} USD-30d).`,
      hitlMethod: method,
    };
  }

  if (cumulativeCap != null) {
    const since = Date.now() - DAY_MS;
    const spent = await sumTradeSizeUsd(params.agentId, since);
    if (spent + params.sizeUsd > cumulativeCap) {
      return {
        ok: false,
        reason: `Trade would exceed daily cumulative cap (${cumulativeCap.toString()} USD-30d).`,
        hitlMethod: method,
      };
    }
  }

  if (!params.autoExecute && !params.humanApproved) {
    return {
      ok: false,
      reason: "Within cap but autoExecute not requested — approve manually or enable spending_cap auto.",
      hitlMethod: method,
    };
  }

  return { ok: true, hitlMethod: method };
}
