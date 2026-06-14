import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { CollabExchangeProof } from "@/components/agent/CollabExchangeProof";
import { getAgentByAddress, getAgentProfile } from "@/lib/agent/memory";
import { collabRegistryAddress, collabSettlement } from "@/lib/agent/collab-config";
import { getFeedEntryByPaymentRef } from "@/lib/server/collabFeed";
import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  getAddress,
  http,
  parseAbi,
  type Address,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { readSecret } from "@/lib/server/env";

export const dynamic = "force-dynamic";

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

interface PageProps {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { hash } = await params;
  const short = hash.length > 14 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
  return {
    title: `Exchange proof · ${short}`,
    description: "Agent-to-agent collaboration settled on Arbitrum Sepolia testnet.",
  };
}

export default async function CollabExchangePage({ params }: PageProps) {
  const { hash: rawHash } = await params;
  const paymentRef = rawHash.startsWith("0x") ? rawHash : `0x${rawHash}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(paymentRef)) notFound();

  const feedEntry = await getFeedEntryByPaymentRef(paymentRef);
  const onChainOnly = !feedEntry;

  let fromAgentId = feedEntry?.fromAgentId ?? "";
  let toAgentId = feedEntry?.toAgentId ?? "";
  let skillHash = feedEntry?.skillHash ?? "";
  let amount = feedEntry?.amount ?? null;
  let at = feedEntry?.at ?? null;
  let onChain = feedEntry?.onChain ?? false;
  let recordTx = feedEntry?.txHash ?? null;
  let units = feedEntry?.units ?? null;
  let agreementId = feedEntry?.agreementId ?? null;

  // When the exchange isn't in our log yet, still render a minimal proof page
  // from the payment tx receipt (buyer → seller tCNHV transfer).
  if (onChainOnly) {
    const inferred = await inferFromPaymentTx(paymentRef);
    if (!inferred) notFound();
    fromAgentId = inferred.fromAgentId;
    toAgentId = inferred.toAgentId;
    skillHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    amount = inferred.amount;
    recordTx = null;
    onChain = false;
  }

  const [buyerProfile, sellerProfile] = await Promise.all([
    fromAgentId ? getAgentProfile(fromAgentId) : null,
    toAgentId ? getAgentProfile(toAgentId) : null,
  ]);

  const settlement = collabSettlement();
  const sharePath = `/collab/tx/${paymentRef}`;

  return (
    <div className="container max-w-3xl space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/collab" className="transition-colors hover:text-ink-50">
          Collaboration
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/collab/feed" className="transition-colors hover:text-ink-50">
          Observer feed
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Exchange proof</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Exchange proof
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
          A shareable record of one agent paying another on Arbitrum Sepolia testnet — the same
          visualization buyers see live, plus links to the underlying transactions on Arbiscan.
        </p>
      </header>

      <CollabExchangeProof
        paymentRef={paymentRef}
        fromAgentId={fromAgentId}
        toAgentId={toAgentId}
        fromAgentName={buyerProfile?.name ?? `Agent ${fromAgentId}`}
        toAgentName={sellerProfile?.name ?? `Agent ${toAgentId}`}
        amount={amount}
        at={at}
        onChain={onChain}
        recordTx={recordTx}
        units={units}
        agreementId={agreementId}
        skillHash={skillHash}
        registryAddress={collabRegistryAddress()}
        assetLabel={settlement.name}
        assetAddress={settlement.asset}
        sharePath={sharePath}
      />
    </div>
  );
}

const erc20TransferAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

/**
 * Best-effort decode of a tCNHV payment tx when the off-chain log hasn't caught
 * up: pull the settling ERC-20 `Transfer` (from the configured settlement asset)
 * out of the receipt and resolve the buyer/seller agent ids from their smart
 * account addresses, so a shared `canhav.co/collab/tx/0x…` link still renders a
 * real proof straight from chain.
 */
async function inferFromPaymentTx(paymentRef: string): Promise<{
  fromAgentId: string;
  toAgentId: string;
  amount: string | null;
} | null> {
  try {
    const rpc = readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? DEFAULT_RPC;
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpc) });
    const receipt = await client.getTransactionReceipt({ hash: paymentRef as `0x${string}` });
    if (receipt.status !== "success") return null;

    const { asset, decimals } = collabSettlement();
    let settlementAsset: Address;
    try {
      settlementAsset = getAddress(asset);
    } catch {
      return null;
    }

    for (const log of receipt.logs) {
      let logAddr: Address;
      try {
        logAddr = getAddress(log.address);
      } catch {
        continue;
      }
      if (logAddr !== settlementAsset) continue;
      try {
        const decoded = decodeEventLog({
          abi: erc20TransferAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "Transfer") continue;
        const { from, to, value } = decoded.args as {
          from: Address;
          to: Address;
          value: bigint;
        };
        const [buyer, seller] = await Promise.all([
          getAgentByAddress(from),
          getAgentByAddress(to),
        ]);
        return {
          fromAgentId: buyer?.agentId ?? "",
          toAgentId: seller?.agentId ?? "",
          amount: formatUnits(value, decimals),
        };
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}
