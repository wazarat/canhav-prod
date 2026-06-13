import "server-only";

import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

import { readSecret } from "@/lib/server/env";

/**
 * Server-side AgentFactory / tCNHV owner writes.
 *
 * `createLedger`, `setTransferAllowed`, and `recordWork` are owner-gated on the
 * already-deployed contracts, so they are signed here with the platform deployer
 * key (a plain viem wallet client — NOT a ZeroDev smart account, and never the
 * agent's wallet). This is the one server-side signer in the app: it is the
 * platform owner key (can mint tCNHV) and is testnet-only — it must never reach
 * the client.
 *
 * Everything degrades gracefully: if `AGENT_FACTORY_ADDRESS` or
 * `FACTORY_DEPLOYER_PRIVATE_KEY` is unset, every write no-ops (mirroring the
 * `hasCollab()` posture), so the live USDC path is untouched until provisioned.
 */

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

const factoryAbi = [
  {
    type: "function",
    name: "ledgerOf",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "createLedger",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "owner_", type: "address" },
      { name: "agentWallet", type: "address" },
    ],
    outputs: [{ name: "ledger", type: "address" }],
  },
  {
    type: "function",
    name: "recordWork",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "counterpartyAgentId", type: "uint256" },
      { name: "cnhvDelta", type: "uint256" },
      { name: "earned", type: "bool" },
      { name: "gasWei", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const tokenAbi = [
  {
    type: "function",
    name: "transferAllowed",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "setTransferAllowed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
] as const;

const ZERO = "0x0000000000000000000000000000000000000000";

function rpcUrl(): string {
  return readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? DEFAULT_RPC;
}

function factoryAddress(): Address | null {
  const addr = readSecret("AGENT_FACTORY_ADDRESS");
  if (!addr) return null;
  try {
    return getAddress(addr);
  } catch {
    return null;
  }
}

function tokenAddress(): Address | null {
  const addr = readSecret("TCNHV_TOKEN_ADDRESS");
  if (!addr) return null;
  try {
    return getAddress(addr);
  } catch {
    return null;
  }
}

function deployerKey(): Hex | null {
  const raw = readSecret("FACTORY_DEPLOYER_PRIVATE_KEY");
  if (!raw) return null;
  const trimmed = raw.trim();
  const key = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return /^0x[0-9a-fA-F]{64}$/.test(key) ? (key as Hex) : null;
}

/** Whether the factory wiring is provisioned enough to write (address + owner key). */
export function hasFactory(): boolean {
  return Boolean(factoryAddress() && deployerKey());
}

function publicClient() {
  return createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
}

function walletClient() {
  const key = deployerKey();
  if (!key) return null;
  return createWalletClient({
    account: privateKeyToAccount(key),
    chain: arbitrumSepolia,
    transport: http(rpcUrl()),
  });
}

function toTokenId(agentId: string): bigint | null {
  try {
    const id = BigInt(agentId);
    return id;
  } catch {
    return null;
  }
}

function safeAddress(value: string | null | undefined): Address | null {
  if (!value) return null;
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

/**
 * Resolve an agent's deployed ledger address (`ledgerOf`), or null when the
 * factory is unconfigured, the id isn't numeric, no ledger exists, or the read
 * fails. Read-only — safe without the deployer key.
 */
export async function getLedgerAddress(agentId: string): Promise<Address | null> {
  const factory = factoryAddress();
  const tokenId = toTokenId(agentId);
  if (!factory || tokenId === null) return null;
  try {
    const ledger = await publicClient().readContract({
      address: factory,
      abi: factoryAbi,
      functionName: "ledgerOf",
      args: [tokenId],
    });
    const addr = getAddress(ledger);
    return addr === ZERO ? null : addr;
  } catch {
    return null;
  }
}

/** Allowlist an address for tCNHV transfers if configured and not already set. */
async function ensureTransferAllowed(account: Address): Promise<void> {
  const token = tokenAddress();
  const wallet = walletClient();
  if (!token || !wallet || account === ZERO) return;
  try {
    const already = await publicClient().readContract({
      address: token,
      abi: tokenAbi,
      functionName: "transferAllowed",
      args: [account],
    });
    if (already) return;
    const hash = await wallet.writeContract({
      address: token,
      abi: tokenAbi,
      functionName: "setTransferAllowed",
      args: [account, true],
    });
    await publicClient().waitForTransactionReceipt({ hash });
  } catch {
    /* best-effort allowlisting — never block the caller */
  }
}

export interface EnsureLedgerResult {
  ok: boolean;
  created: boolean;
  ledger: string | null;
}

/**
 * Ensure an agent has an on-chain ledger and that the addresses it transacts
 * tCNHV from/to are allowlisted. Idempotent: an existing ledger is returned as
 * `created:false`; a `LedgerExists` race is treated as success. No-ops cleanly
 * when the factory wiring is missing. Never throws.
 */
export async function ensureAgentLedger(params: {
  agentId: string;
  owner: string;
  agentWallet: string;
}): Promise<EnsureLedgerResult> {
  if (!hasFactory()) return { ok: false, created: false, ledger: null };

  const factory = factoryAddress();
  const wallet = walletClient();
  const tokenId = toTokenId(params.agentId);
  const owner = safeAddress(params.owner);
  const agentWallet = safeAddress(params.agentWallet) ?? owner;
  if (!factory || !wallet || tokenId === null || !owner) {
    return { ok: false, created: false, ledger: null };
  }

  // Allowlist the smart account (buyer-side sender) and the agent wallet
  // (seller-side payTo) so tCNHV settlement transfers are not restricted.
  const allowSet = new Set<Address>([owner]);
  if (agentWallet) allowSet.add(agentWallet);

  const existing = await getLedgerAddress(params.agentId);
  if (existing) {
    for (const a of allowSet) await ensureTransferAllowed(a);
    return { ok: true, created: false, ledger: existing };
  }

  try {
    const hash = await wallet.writeContract({
      address: factory,
      abi: factoryAbi,
      functionName: "createLedger",
      args: [tokenId, owner, agentWallet ?? owner],
    });
    await publicClient().waitForTransactionReceipt({ hash });
    for (const a of allowSet) await ensureTransferAllowed(a);
    return { ok: true, created: true, ledger: await getLedgerAddress(params.agentId) };
  } catch {
    // A concurrent create may have won (LedgerExists). Resolve + treat as success.
    const ledger = await getLedgerAddress(params.agentId);
    if (ledger) {
      for (const a of allowSet) await ensureTransferAllowed(a);
      return { ok: true, created: false, ledger };
    }
    return { ok: false, created: false, ledger: null };
  }
}

/** Gas (wei) a settled payment cost: `gasUsed * effectiveGasPrice`, or 0n. */
export async function readTxGasWei(txHash: string): Promise<bigint> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return 0n;
  try {
    const receipt = await publicClient().getTransactionReceipt({ hash: txHash as Hex });
    return receipt.gasUsed * receipt.effectiveGasPrice;
  } catch {
    return 0n;
  }
}

export interface RecordWorkResult {
  ok: boolean;
  txHash?: string;
}

/**
 * Record one unit of work on an agent's ledger via the factory (owner key).
 * Skips cleanly (never throws) when the factory is unconfigured, the ids aren't
 * numeric, or the agent has no ledger yet (the on-chain call would revert
 * `NoLedger`).
 */
export async function recordWorkOnLedger(params: {
  agentId: string;
  counterpartyAgentId: string;
  cnhvDelta: bigint;
  earned: boolean;
  gasWei: bigint;
}): Promise<RecordWorkResult> {
  if (!hasFactory()) return { ok: false };

  const factory = factoryAddress();
  const wallet = walletClient();
  const agentTokenId = toTokenId(params.agentId);
  const counterpartyTokenId = toTokenId(params.counterpartyAgentId);
  if (!factory || !wallet || agentTokenId === null || counterpartyTokenId === null) {
    return { ok: false };
  }

  // Pre-check the ledger exists so a missing one degrades silently.
  const ledger = await getLedgerAddress(params.agentId);
  if (!ledger) return { ok: false };

  try {
    const hash = await wallet.writeContract({
      address: factory,
      abi: factoryAbi,
      functionName: "recordWork",
      args: [
        agentTokenId,
        counterpartyTokenId,
        params.cnhvDelta,
        params.earned,
        params.gasWei,
      ],
    });
    await publicClient().waitForTransactionReceipt({ hash });
    return { ok: true, txHash: hash };
  } catch {
    return { ok: false };
  }
}
