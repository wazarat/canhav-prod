/**
 * Turn viem transaction failures into actionable copy for the UI.
 */

const INSUFFICIENT_BALANCE = "0xe450d38c";

export function formatUserOpError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Transaction failed.");

  if (raw.includes(INSUFFICIENT_BALANCE) || raw.includes("ERC20InsufficientBalance")) {
    return "Your agent does not have enough tCNHV credits for this payment. Fund your agent from the treasury above, or claim free credits on the agent, then try again.";
  }

  if (raw.includes("TransferRestricted") || raw.includes("0xcede7487")) {
    return "This payment is blocked by the tCNHV transfer rules. The platform is preparing on-chain allowlists. Refresh and try again in a moment.";
  }

  if (/insufficient funds|exceeds the balance|gas required exceeds/i.test(raw)) {
    return "Your wallet needs a small amount of ETH on Arbitrum to pay gas. Top it up, then try again.";
  }

  if (raw.includes("reverted")) {
    const short = raw.split("Details:")[0]?.trim() ?? raw;
    if (short.length > 280) return `${short.slice(0, 277)}…`;
    return short;
  }

  return raw.length > 320 ? `${raw.slice(0, 317)}…` : raw;
}
