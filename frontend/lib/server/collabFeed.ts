import "server-only";

import { createPublicClient, getAddress, http, parseAbiItem, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { collabRegistryAddress } from "@/lib/agent/collab-config";
import { listCollabExchanges } from "@/lib/server/collabLog";
import { readSecret } from "@/lib/server/env";

/**
 * Observer feed data: every agent-to-agent collaboration, newest first.
 *
 * Source of truth is the on-chain CollabRegistry `CollabRecorded` event; we also
 * merge the off-chain Redis log so exchanges that weren't (or couldn't be)
 * attested on-chain still show. Dedupe is by `paymentRef` (the settling tx hash).
 */

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
/** How many recent blocks to scan for events (bounded to keep getLogs cheap). */
const LOOKBACK_BLOCKS = 200_000n;

const collabRecordedEvent = parseAbiItem(
  "event CollabRecorded(uint256 indexed collabId, uint256 indexed fromAgentId, uint256 indexed toAgentId, bytes32 skillHash, bytes32 paymentRef, bytes32 agreementId, uint32 units, address recorder)",
);

export interface FeedEntry {
  fromAgentId: string;
  toAgentId: string;
  skillHash: string;
  paymentRef: string;
  recorder: string | null;
  amount: string | null;
  at: string | null;
  onChain: boolean;
  txHash: string | null;
  /** Interaction magnitude recorded on-chain (data slices). */
  units: number | null;
  /** Agreement this interaction belongs to (bytes32(0) / null for one-off). */
  agreementId: string | null;
}

function rpcUrl(): string {
  return readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? DEFAULT_RPC;
}

async function readOnChain(): Promise<FeedEntry[]> {
  const registry = collabRegistryAddress();
  if (!registry) return [];
  let address: Address;
  try {
    address = getAddress(registry);
  } catch {
    return [];
  }

  try {
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
    const latest = await client.getBlockNumber();
    const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
    const logs = await client.getLogs({
      address,
      event: collabRecordedEvent,
      fromBlock,
      toBlock: latest,
    });
    const ZERO_BYTES32 =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    return logs
      .map((log) => {
        const agreementId = log.args.agreementId ?? null;
        return {
          fromAgentId: log.args.fromAgentId?.toString() ?? "",
          toAgentId: log.args.toAgentId?.toString() ?? "",
          skillHash: log.args.skillHash ?? "",
          paymentRef: log.args.paymentRef ?? "",
          recorder: log.args.recorder ?? null,
          amount: null,
          at: null,
          onChain: true,
          txHash: log.transactionHash,
          units: log.args.units != null ? Number(log.args.units) : null,
          agreementId: agreementId && agreementId !== ZERO_BYTES32 ? agreementId : null,
        };
      })
      .reverse();
  } catch {
    // RPC unavailable / range too large — degrade to the off-chain log.
    return [];
  }
}

/** Look up one exchange by its settling payment tx hash (`paymentRef`). */
export async function getFeedEntryByPaymentRef(paymentRef: string): Promise<FeedEntry | null> {
  const normalized = paymentRef.trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) return null;
  const entries = await listFeed(500);
  return entries.find((e) => e.paymentRef.toLowerCase() === normalized) ?? null;
}

export async function listFeed(limit = 50): Promise<FeedEntry[]> {
  const [onChain, offChain] = await Promise.all([readOnChain(), listCollabExchanges(limit)]);

  const byRef = new Map<string, FeedEntry>();
  // On-chain first (authoritative), then enrich/fill from the off-chain log.
  for (const e of onChain) {
    byRef.set(e.paymentRef.toLowerCase(), e);
  }
  for (const e of offChain) {
    const k = e.paymentRef.toLowerCase();
    const existing = byRef.get(k);
    if (existing) {
      existing.amount = e.amount;
      existing.at = e.at;
      if (existing.units == null && e.units != null) existing.units = e.units;
      if (!existing.agreementId && e.agreementId) existing.agreementId = e.agreementId;
    } else {
      byRef.set(k, {
        fromAgentId: e.fromAgentId,
        toAgentId: e.toAgentId,
        skillHash: e.skillHash,
        paymentRef: e.paymentRef,
        recorder: null,
        amount: e.amount,
        at: e.at,
        onChain: false,
        txHash: e.paymentRef,
        units: e.units ?? null,
        agreementId: e.agreementId ?? null,
      });
    }
  }

  return [...byRef.values()]
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, limit);
}
