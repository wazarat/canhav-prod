/**
 * One-line definitions for credit-mechanism terms (CAN-63 glossary tooltip).
 * Keys are matched case-insensitively on word boundaries, except acronym keys
 * (all-caps), which match case-sensitively so prose like "pt" is never caught.
 * British spellings are separate keys because the M5 dataset uses them.
 */
export const CREDIT_GLOSSARY: Record<string, string> = {
  utilization:
    "Share of supplied assets currently borrowed. Interest rates rise with utilization; near 100% lenders cannot withdraw.",
  utilisation:
    "Share of supplied assets currently borrowed. Interest rates rise with utilisation; near 100% lenders cannot withdraw.",
  kink: "The utilization level where the interest-rate curve steepens sharply to pull borrowing back toward the target range.",
  PT: "Principal token: the redeemable-at-maturity half of a split yield-bearing asset. Trades at a discount that implies a fixed yield.",
  YT: "Yield token: the half of a split yield-bearing asset that collects all yield until maturity, then expires worthless.",
  fCash: "Notional's zero-coupon primitive: a claim on a fixed amount of currency at a set maturity, priced at a discount today.",
  "isolated market":
    "A lending market whose collateral and bad debt cannot spill into other markets on the same protocol.",
  "health factor":
    "Collateral value weighted by liquidation thresholds divided by debt. Below 1, the position can be liquidated.",
  overcollateralised:
    "Borrowers must post collateral worth more than the loan, so the loan is backed even through moderate price moves.",
  overcollateralized:
    "Borrowers must post collateral worth more than the loan, so the loan is backed even through moderate price moves.",
  rehypothecation:
    "Re-lending of posted collateral by the platform holding it. Increases capital efficiency and chains counterparty risk.",
};

const ACRONYM = /^[A-Z][A-Za-z]*$/;

/** Case-sensitive for acronym-style keys (PT, YT, fCash), else case-insensitive. */
export function glossaryTermRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const caseSensitive = ACRONYM.test(term) && term !== term.toLowerCase();
  return new RegExp(`\\b${escaped}\\b`, caseSensitive ? "" : "i");
}
