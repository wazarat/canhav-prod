import "server-only";

import {
  collabRegistryAddress,
  collabSettlement,
  defaultCollabPriceUsdc,
  formatAmount,
  parseAmountToBaseUnits,
} from "@/lib/agent/collab-config";
import { getAgentProfile } from "@/lib/agent/memory";
import { readAgentWallet, readTcnhvBalance } from "@/lib/agent/onchain";
import { readSecret } from "@/lib/server/env";
import { ensureAgentLedger, getLedgerAddress, hasFactory } from "@/lib/server/factory";

/** Demo marketplace seeds use sequential low addresses — not real smart accounts. */
export function isPlaceholderWallet(address: string | null | undefined): boolean {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return true;
  const lower = address.toLowerCase();
  if (lower === "0x0000000000000000000000000000000000000000") return true;
  if (/^0x0{24}0?10[0-9a-f]$/.test(lower)) return true;
  return false;
}

/** Resolve where collab payment should settle — on-chain agent wallet only. */
export async function resolveSellerPayTo(toAgentId: string): Promise<string | null> {
  const onChain = await readAgentWallet(toAgentId);
  if (onChain && !isPlaceholderWallet(onChain)) return onChain;

  const profile = await getAgentProfile(toAgentId);
  const candidates = [profile?.agentAddress, profile?.agentWallet];
  for (const c of candidates) {
    if (c && !isPlaceholderWallet(c)) return c;
  }
  return null;
}

export interface CollabProofLinks {
  paymentToken: string | null;
  factory: string | null;
  collabRegistry: string | null;
  identityRegistry: string | null;
  buyerLedger: string | null;
  sellerLedger: string | null;
  buyerWallet: string | null;
  sellerPayTo: string | null;
}

export interface CollabPrepareResult {
  ready: boolean;
  sufficient: boolean;
  error?: string;
  requiredAmountRaw: string;
  buyerBalanceRaw: string;
  humanRequired: string;
  humanBalance: string;
  assetName: string;
  proof: CollabProofLinks;
}

/**
 * Validate a buyer→seller collab payment path: resolve wallets, ensure tCNHV
 * allowlists + factory ledgers exist, and check the buyer agent's on-chain balance.
 */
export async function prepareCollabSettlement(
  fromAgentId: string,
  toAgentId: string,
  options?: { payerAddress?: string | null },
): Promise<CollabPrepareResult> {
  const settle = collabSettlement();
  const [buyer, seller] = await Promise.all([
    getAgentProfile(fromAgentId),
    getAgentProfile(toAgentId),
  ]);

  const proof: CollabProofLinks = {
    paymentToken: settle.asset,
    factory: readSecret("AGENT_FACTORY_ADDRESS"),
    collabRegistry: collabRegistryAddress(),
    identityRegistry: readSecret("IDENTITY_REGISTRY_ADDRESS"),
    buyerLedger: null,
    sellerLedger: null,
    buyerWallet: null,
    sellerPayTo: null,
  };

  if (!options?.payerAddress && (!buyer?.onChain || buyer.accountIndex == null)) {
    return fail(proof, "Buyer agent must be minted on-chain to pay.");
  }

  const sellerPayTo = await resolveSellerPayTo(toAgentId);
  proof.sellerPayTo = sellerPayTo;
  if (!sellerPayTo) {
    return fail(
      proof,
      "This seller cannot receive payments yet — they need a minted on-chain agent wallet (demo listings without a real wallet are hidden from checkout).",
    );
  }

  const buyerWallet =
    options?.payerAddress ??
    buyer?.agentAddress ??
    (await readAgentWallet(fromAgentId)) ??
    null;
  proof.buyerWallet = buyerWallet;
  if (!buyerWallet) {
    return fail(proof, "Buyer agent wallet is not available on-chain.");
  }

  const priceHuman = seller?.collabPriceUsdc ?? defaultCollabPriceUsdc();
  let requiredAmount: bigint;
  try {
    requiredAmount = parseAmountToBaseUnits(priceHuman, settle.decimals);
  } catch {
    return fail(proof, "Seller price is misconfigured.");
  }

  const buyerBalance = BigInt((await readTcnhvBalance(buyerWallet)) ?? "0");
  const sufficient = buyerBalance >= requiredAmount;

  if (hasFactory()) {
    try {
      await ensureAgentLedger({
        agentId: fromAgentId,
        owner: buyerWallet,
        agentWallet: buyerWallet,
      });
      await ensureAgentLedger({
        agentId: toAgentId,
        owner: sellerPayTo,
        agentWallet: sellerPayTo,
      });
    } catch {
      /* additive — payment may still succeed if already allowlisted */
    }
    proof.buyerLedger = await getLedgerAddress(fromAgentId);
    proof.sellerLedger = await getLedgerAddress(toAgentId);
  }

  const humanRequired = formatAmount(requiredAmount, settle.decimals);
  const humanBalance = formatAmount(buyerBalance, settle.decimals);

  return {
    ready: sufficient,
    sufficient,
    requiredAmountRaw: requiredAmount.toString(),
    buyerBalanceRaw: buyerBalance.toString(),
    humanRequired,
    humanBalance,
    assetName: settle.name,
    proof,
    error: sufficient
      ? undefined
      : options?.payerAddress
        ? `Your wallet has ${humanBalance} ${settle.name} but this costs ${humanRequired}. Fund your Privy wallet from the treasury above.`
        : `Your agent has ${humanBalance} ${settle.name} but this costs ${humanRequired}. Fund your agent from the treasury above, or tap “Claim free credits” on the agent.`,
  };
}

function fail(proof: CollabProofLinks, error: string): CollabPrepareResult {
  return {
    ready: false,
    sufficient: false,
    error,
    requiredAmountRaw: "0",
    buyerBalanceRaw: "0",
    humanRequired: "0",
    humanBalance: "0",
    assetName: collabSettlement().name,
    proof,
  };
}
