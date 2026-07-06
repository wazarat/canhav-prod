import "server-only";

import { randomUUID } from "node:crypto";

import {
  defaultAgentConfig,
  sanitizeAgentConfig,
  type TradeHitlMethod,
} from "@/lib/agent/agentConfig";
import { assertResearchGate } from "@/lib/agent/trade/gate";
import { defaultGmxTarget, getTradeCoin } from "@/lib/agent/trade/coins";
import { MAX_LEVERAGE, MAX_SIZE_USD, EXCHANGE_ROUTER } from "@/lib/agent/trade/gmx";
import type { TradeSide } from "@/lib/agent/trade/types";
import {
  appendTradeProposal,
  getAgentProfile,
} from "@/lib/agent/memory";
import { checkSpendingCap } from "@/lib/agent/trade/spendingCap";

export interface TradeProposeArgs {
  asset: string;
  side: TradeSide;
  /** Human USD amount (e.g. 10 = $10). */
  sizeUsdHuman?: number;
  leverage?: number;
}

export async function execTradePropose(agentId: string, args: TradeProposeArgs) {
  const asset = args.asset?.trim() ?? "";
  const side = args.side;
  if (!asset || (side !== "long" && side !== "short")) {
    return {
      ok: false,
      summary: "trade_propose needs asset and side (long|short).",
    };
  }

  const coin = getTradeCoin(asset);
  if (!coin) {
    return {
      ok: false,
      blocked: true,
      summary: `${asset} is not a supported trade coin (sUSDe, sUSDai).`,
    };
  }

  const gate = await assertResearchGate(asset, defaultGmxTarget());
  if (!gate.ok) {
    return {
      ok: false,
      blocked: true,
      summary: gate.reason,
      hint:
        gate.reason.includes("stale") || gate.reason.includes("No research verdict")
          ? "Call research_refreshCombinedVerdict for this asset, then retry trade_propose."
          : undefined,
    };
  }

  const profile = await getAgentProfile(agentId);
  const config = sanitizeAgentConfig(profile?.config ?? defaultAgentConfig());
  const method: TradeHitlMethod = config.tradeHitlMethod;

  const leverage = Math.min(
    Math.max(1, args.leverage ?? 1),
    MAX_LEVERAGE,
  );
  const human = args.sizeUsdHuman ?? 10;
  const sizeUsd = BigInt(Math.floor(human)) * 10n ** 30n;
  const clampedSize = sizeUsd > MAX_SIZE_USD ? MAX_SIZE_USD : sizeUsd;

  const intentSummary = {
    asset,
    side,
    sizeUsd: clampedSize.toString(),
    leverage,
    collateralToken: coin.collateralToken,
    verdictRef: gate.verdictRef,
    gmxTarget: EXCHANGE_ROUTER,
  };

  if (method === "manual") {
    return {
      ok: true,
      mode: "manual",
      suggestion: intentSummary,
      summary: `Trade suggestion (manual): ${side} ${asset} ~$${human} at ${leverage}x — owner executes manually on GMX Sepolia.`,
    };
  }

  const id = `tp_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();

  await appendTradeProposal(agentId, {
    id,
    asset,
    side,
    sizeUsd: clampedSize,
    leverage,
    collateralToken: coin.collateralToken,
    verdictRef: gate.verdictRef,
    createdAt: now,
    status: "proposed",
    gmxTarget: EXCHANGE_ROUTER,
  });

  const action =
    method === "spending_cap"
      ? "proposed (auto-executes if within spending cap)"
      : "proposed — awaiting owner approval";

  let autoExecute = false;
  if (method === "spending_cap") {
    const cap = await checkSpendingCap({
      agentId,
      sizeUsd: clampedSize,
      autoExecute: true,
    });
    autoExecute = cap.ok;
  }

  return {
    ok: true,
    mode: method,
    proposalId: id,
    autoExecute,
    proposal: { ...intentSummary, id, status: "proposed" },
    summary: `GMX ${side} on ${asset} ${action}.`,
  };
}
