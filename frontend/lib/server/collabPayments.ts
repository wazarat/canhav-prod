import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { arbitrumSepolia } from "viem/chains";

import { repoRoot, readSecret } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * x402 settlement verification for agent collaboration.
 *
 * The buyer's smart account can't produce a canonical EIP-3009 authorization, so
 * settlement is a plain gas-sponsored USDC `transfer` userOp; the seller route
 * proves it on-chain here by decoding the ERC-20 `Transfer` event from the
 * payment asset to its verified `agentWallet`. A Redis (or local) replay guard
 * ensures each tx hash settles exactly one StrategyPacket.
 */

const erc20TransferAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

/** How old a settling transfer may be (seconds). Generous for testnet demos. */
const MAX_PAYMENT_AGE_SECONDS = 86_400;

function rpcUrl(): string {
  return readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? DEFAULT_RPC;
}

export interface VerifyTransferParams {
  txHash: string;
  asset: string;
  payTo: string;
  /** Minimum amount in base units (USDC = 6 decimals). */
  minAmount: bigint;
  /** When set, also require the transfer's `from` to match (the buyer wallet). */
  expectedFrom?: string | null;
}

export type VerifyTransferResult =
  | { ok: true; from: string; to: string; value: bigint; blockNumber: bigint }
  | { ok: false; error: string };

/** Verify an on-chain USDC transfer settled the payment (status, asset, to, amount, age). */
export async function verifyUsdcTransfer(
  params: VerifyTransferParams,
): Promise<VerifyTransferResult> {
  let hash: Hex;
  let asset: Address;
  let payTo: Address;
  try {
    if (!/^0x[0-9a-fA-F]{64}$/.test(params.txHash)) throw new Error("bad hash");
    hash = params.txHash as Hex;
    asset = getAddress(params.asset);
    payTo = getAddress(params.payTo);
  } catch {
    return { ok: false, error: "Invalid payment reference, asset, or payTo address." };
  }

  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash });
  } catch {
    return { ok: false, error: "Payment transaction not found or not yet mined." };
  }
  if (receipt.status !== "success") {
    return { ok: false, error: "Payment transaction reverted." };
  }

  const expectedFrom = params.expectedFrom ? safeAddr(params.expectedFrom) : null;

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== asset) continue;
    try {
      const decoded = decodeEventLog({
        abi: erc20TransferAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;
      const { from, to, value } = decoded.args as { from: Address; to: Address; value: bigint };
      if (getAddress(to) !== payTo) continue;
      if (value < params.minAmount) continue;
      if (expectedFrom && getAddress(from) !== expectedFrom) continue;

      // Recency: reject very old transfers so stale hashes can't be replayed
      // (belt-and-suspenders alongside the consume-once guard).
      try {
        const block = await client.getBlock({ blockNumber: receipt.blockNumber });
        const ageSeconds = Math.floor(Date.now() / 1000) - Number(block.timestamp);
        if (ageSeconds > MAX_PAYMENT_AGE_SECONDS) {
          return { ok: false, error: "Payment transaction is too old." };
        }
      } catch {
        /* non-fatal: if block read fails, accept (already confirmed + guarded) */
      }

      return {
        ok: true,
        from: getAddress(from),
        to: payTo,
        value,
        blockNumber: receipt.blockNumber,
      };
    } catch {
      continue;
    }
  }

  return { ok: false, error: "No matching USDC transfer to the seller in this transaction." };
}

function safeAddr(value: string): string | null {
  try {
    return getAddress(value as Address);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Replay guard — each payment reference settles exactly one packet            */
/* -------------------------------------------------------------------------- */

const refKey = (txHash: string) => `collab:payref:${txHash.toLowerCase()}`;
const ratingKey = (txHash: string) => `collab:ratingref:${txHash.toLowerCase()}`;

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "collab-payrefs.json");
}

function readRefs(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(filePath(), "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeRefs(store: Record<string, string>): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    /* read-only fs — best-effort */
  }
}

/**
 * Atomically claim a payment reference. Returns true if this caller won the
 * claim (first use), false if it was already consumed (replay).
 */
export async function tryConsumePaymentRef(txHash: string, meta: string): Promise<boolean> {
  const k = refKey(txHash);
  if (hasUpstash()) {
    const res = await getRedisClient().set(k, meta, { nx: true });
    return res === "OK";
  }
  const store = readRefs();
  if (store[k]) return false;
  store[k] = meta;
  writeRefs(store);
  return true;
}

/**
 * Atomically claim a payment reference for RATING purposes — each settled
 * exchange yields at most one reputation rating (prevents repeat-rating spam).
 */
export async function tryConsumeRatingRef(txHash: string, meta: string): Promise<boolean> {
  const k = ratingKey(txHash);
  if (hasUpstash()) {
    const res = await getRedisClient().set(k, meta, { nx: true });
    return res === "OK";
  }
  const store = readRefs();
  if (store[k]) return false;
  store[k] = meta;
  writeRefs(store);
  return true;
}

/** Release a claimed reference (used to roll back if packet production fails). */
export async function releasePaymentRef(txHash: string): Promise<void> {
  const k = refKey(txHash);
  if (hasUpstash()) {
    await getRedisClient().del(k);
    return;
  }
  const store = readRefs();
  delete store[k];
  writeRefs(store);
}
