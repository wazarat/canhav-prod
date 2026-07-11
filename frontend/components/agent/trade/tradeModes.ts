import type { TradeHitlMethod } from "@/lib/agent/agentConfig";

/**
 * Canonical copy for the three HITL trade methods. Single source of truth for
 * every surface that names them (TradeModeSelector on the Trade Desk, the
 * launch card's guardrails section) so the honesty language (especially the
 * "no unattended signer" line) never drifts between surfaces.
 */
export interface TradeModeCopy {
  value: TradeHitlMethod;
  name: string;
  description: string;
}

export const TRADE_MODES: TradeModeCopy[] = [
  {
    value: "manual",
    name: "Research only",
    description:
      "The agent researches and suggests. Nothing is filed or executed; you place any trade yourself.",
  },
  {
    value: "propose_approve",
    name: "Propose & approve",
    description:
      "The agent files a proposal. Nothing executes until you approve it and sign with your wallet.",
  },
  {
    value: "spending_cap",
    name: "Auto within limits",
    description:
      "Proposals inside your spending caps skip the approval click. No unattended signer exists: every trade still requires your wallet signature. Auto replaces the approval step, not the signature.",
  },
];
