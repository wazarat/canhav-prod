import "server-only";

import { randomUUID } from "node:crypto";

import {
  defaultAgentConfig,
  sanitizeAgentConfig,
  type TradeHitlMethod,
} from "@/lib/agent/agentConfig";
import { assertResearchGate } from "@/lib/agent/trade/gate";
import { defaultGmxTarget, getTradeCoin, listTradeCoinSymbols } from "@/lib/agent/trade/coins";
import { MAX_LEVERAGE, MAX_SIZE_USD, EXCHANGE_ROUTER } from "@/lib/agent/trade/gmx";
import {
  encryptedUsdFromCipherJson,
  plainUsd,
  type EncryptedUsdCipherJson,
  type TradeSide,
} from "@/lib/agent/trade/types";
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
  /**
   * FHE Phase 1 (form path, flag ON): CoFHE ciphertext envelope instead of a
   * plaintext size. Mutually exclusive with sizeUsdHuman. The caller (route)
   * MUST run validateEncryptedEnvelope first — this module trusts it.
   */
  sizeUsdEnc?: EncryptedUsdCipherJson;
  /**
   * FHE Phase 2: result of the ON-CHAIN encrypted cap check, present only
   * after the route verified the threshold-network attestation
   * (verifyCapCheckClaim) — this module trusts it, mirroring sizeUsdEnc.
   */
  capCheckOnchain?: { within: boolean };
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
      summary: `${asset} is not a supported trade coin (${listTradeCoinSymbols().join(", ")}).`,
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
  // Encrypted sizes (FHE flag ON, form path) skip the human→30-dec conversion
  // and the MAX_SIZE_USD clamp — both impossible on ciphertext. The clamp and
  // cap check re-run authoritatively at /api/agent/trade, where plaintext
  // legitimately exists at signing time.
  const encrypted = args.sizeUsdEnc ?? null;
  const human = args.sizeUsdHuman ?? 10;
  const sizeUsd = BigInt(Math.floor(human)) * 10n ** 30n;
  const clampedSize = sizeUsd > MAX_SIZE_USD ? MAX_SIZE_USD : sizeUsd;

  const intentSummary = {
    asset,
    side,
    sizeUsd: encrypted ? "encrypted" : clampedSize.toString(),
    leverage,
    collateralToken: coin.collateralToken,
    verdictRef: gate.verdictRef,
    gmxTarget: EXCHANGE_ROUTER,
  };

  if (method === "manual") {
    // Manual suggestions are never persisted, so the form does not encrypt
    // them; tolerate an envelope anyway without inventing a plaintext size.
    return {
      ok: true,
      mode: "manual",
      suggestion: intentSummary,
      summary: encrypted
        ? `Trade suggestion (manual): ${side} ${asset} (size encrypted) at ${leverage}x — owner executes manually on GMX Sepolia.`
        : `Trade suggestion (manual): ${side} ${asset} ~$${human} at ${leverage}x — owner executes manually on GMX Sepolia.`,
    };
  }

  const id = `tp_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();

  // Phase 2: only spending_cap mode carries a cap verdict — other modes
  // approve by click, so a stray claim is dropped rather than persisted.
  const onchainCap =
    method === "spending_cap" && encrypted ? args.capCheckOnchain ?? null : null;

  await appendTradeProposal(agentId, {
    id,
    asset,
    side,
    sizeUsd: encrypted ? encryptedUsdFromCipherJson(encrypted) : plainUsd(clampedSize),
    leverage,
    collateralToken: coin.collateralToken,
    verdictRef: gate.verdictRef,
    createdAt: now,
    status: "proposed",
    gmxTarget: EXCHANGE_ROUTER,
    capCheckOnchain: onchainCap ? (onchainCap.within ? "within" : "over") : undefined,
  });

  const action =
    method === "spending_cap"
      ? encrypted
        ? onchainCap
          ? onchainCap.within
            ? "proposed (within caps — verified on ciphertext, auto-approved)"
            : "proposed (over caps — verified on ciphertext, needs approval)"
          : "proposed (size encrypted — caps are checked when you sign)"
        : "proposed (auto-executes if within spending cap)"
      : "proposed — awaiting owner approval";

  // Without an on-chain check, ciphertext can't be compared to caps here:
  // auto-execute is off and the cap verdict is deferred to the authoritative
  // execute-time check.
  let autoExecute = false;
  let capCheck: "checked" | "deferred" | "onchain" = "checked";
  if (method === "spending_cap") {
    if (encrypted && onchainCap) {
      capCheck = "onchain";
      autoExecute = onchainCap.within;
    } else if (encrypted) {
      capCheck = "deferred";
    } else {
      const cap = await checkSpendingCap({
        agentId,
        sizeUsd: clampedSize,
        autoExecute: true,
      });
      autoExecute = cap.ok;
    }
  }

  return {
    ok: true,
    mode: method,
    proposalId: id,
    autoExecute,
    capCheck,
    proposal: { ...intentSummary, id, status: "proposed" },
    summary: `GMX ${side} on ${asset} ${action}.`,
  };
}
