/**
 * Single doorway for trade "money numbers" — Pathway C will encrypt here later.
 * Do not introduce alternate size/collateral types outside this module.
 */

export type TradeSide = "long" | "short";

export type TradeProposalStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "executed"
  | "blocked";

export interface TradeIntent {
  asset: string;
  side: TradeSide;
  /** Money number (future euint64) — change only here. USD with 30 decimals. */
  sizeUsd: bigint;
  /** Fixed/capped in v1. */
  leverage: number;
  collateralToken: `0x${string}`;
  verdictRef: string;
  createdAt: string;
}

export interface TradeProposal extends TradeIntent {
  id: string;
  status: TradeProposalStatus;
  gmxTarget: `0x${string}`;
  reason?: string;
  txHash?: `0x${string}`;
}

/** Serializable shape for API / storage (bigint as string). */
export interface TradeIntentJson {
  asset: string;
  side: TradeSide;
  sizeUsd: string;
  leverage: number;
  collateralToken: `0x${string}`;
  verdictRef: string;
  createdAt: string;
}

export interface TradeProposalJson extends TradeIntentJson {
  id: string;
  status: TradeProposalStatus;
  gmxTarget: `0x${string}`;
  reason?: string;
  txHash?: `0x${string}`;
}

export function tradeIntentToJson(intent: TradeIntent): TradeIntentJson {
  return {
    asset: intent.asset,
    side: intent.side,
    sizeUsd: intent.sizeUsd.toString(),
    leverage: intent.leverage,
    collateralToken: intent.collateralToken,
    verdictRef: intent.verdictRef,
    createdAt: intent.createdAt,
  };
}

export function tradeIntentFromJson(json: TradeIntentJson): TradeIntent {
  return {
    ...json,
    sizeUsd: BigInt(json.sizeUsd),
  };
}

export function tradeProposalToJson(proposal: TradeProposal): TradeProposalJson {
  return {
    ...tradeIntentToJson(proposal),
    id: proposal.id,
    status: proposal.status,
    gmxTarget: proposal.gmxTarget,
    reason: proposal.reason,
    txHash: proposal.txHash,
  };
}

export function tradeProposalFromJson(json: TradeProposalJson): TradeProposal {
  return {
    ...tradeIntentFromJson(json),
    id: json.id,
    status: json.status,
    gmxTarget: json.gmxTarget,
    reason: json.reason,
    txHash: json.txHash,
  };
}
