import "server-only";

import { createPublicClient, getAddress, http, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/config";
import { readSecret } from "@/lib/server/env";
import { getLedgerAddress } from "@/lib/server/factory";

/**
 * On-chain ERC-8004 identity verification (read-only).
 *
 * Lets the platform prove an agent's identity itself instead of depending on a
 * third-party explorer that may not index Arbitrum Sepolia (421614): we read
 * `ownerOf(agentId)` + `tokenURI(agentId)` from the deployed IdentityRegistry
 * and confirm the owner matches the agent's smart-account address. Everything
 * degrades gracefully — a missing registry/RPC returns `configured:false` rather
 * than throwing, so the research pillar is never blocked.
 */

const identityReadAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "getAgentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

export interface OnChainVerification {
  /** True only when an on-chain read succeeded AND the owner matches the agent. */
  verified: boolean;
  /** Whether the registry address is provisioned (else nothing can be read). */
  configured: boolean;
  agentId: string;
  chainId: number;
  registry: string | null;
  /** `ownerOf(agentId)` as read from chain. */
  owner: string | null;
  /** The agent's smart account we expect to own the token. */
  expectedOwner: string | null;
  /** `tokenURI(agentId)` (the agent card / registration URI). */
  tokenURI: string | null;
  /** Arbiscan link to the token on Arbitrum Sepolia. */
  arbiscanUrl: string | null;
  error?: string;
}

function rpcUrl(): string {
  return readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? DEFAULT_RPC;
}

function registryAddress(): Address | null {
  const addr = readSecret("IDENTITY_REGISTRY_ADDRESS");
  if (!addr) return null;
  try {
    return getAddress(addr);
  } catch {
    return null;
  }
}

function safeChecksum(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return getAddress(value as Address);
  } catch {
    return value;
  }
}

/**
 * Verify an agent's ERC-8004 identity on Arbitrum Sepolia. `agentId` must be the
 * numeric ERC-721 tokenId (minted agents); non-minted/local agents return
 * `verified:false` with an explanatory message.
 */
export async function verifyAgentOnChain(
  agentId: string,
  expectedAddress?: string | null,
): Promise<OnChainVerification> {
  const registry = registryAddress();
  const base: OnChainVerification = {
    verified: false,
    configured: Boolean(registry),
    agentId,
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    registry,
    owner: null,
    expectedOwner: safeChecksum(expectedAddress),
    tokenURI: null,
    arbiscanUrl: registry ? `https://sepolia.arbiscan.io/token/${registry}?a=${agentId}` : null,
  };

  if (!registry) {
    return { ...base, error: "IDENTITY_REGISTRY_ADDRESS not configured." };
  }

  let tokenId: bigint;
  try {
    tokenId = BigInt(agentId);
  } catch {
    return { ...base, error: "Agent has no on-chain tokenId yet (not minted)." };
  }

  try {
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
    const [owner, tokenURI] = await Promise.all([
      client.readContract({
        address: registry,
        abi: identityReadAbi,
        functionName: "ownerOf",
        args: [tokenId],
      }),
      client.readContract({
        address: registry,
        abi: identityReadAbi,
        functionName: "tokenURI",
        args: [tokenId],
      }),
    ]);

    const ownerStr = getAddress(owner);
    const verified = base.expectedOwner
      ? ownerStr.toLowerCase() === base.expectedOwner.toLowerCase()
      : true;

    return { ...base, owner: ownerStr, tokenURI, verified };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "On-chain read failed." };
  }
}

/**
 * Read the ERC-8004 reserved `agentWallet` for a minted agent. Returns the
 * checksummed wallet address, or `null` when unconfigured, not minted, unset
 * (zero address), or unreadable. Powers the "wallet verified" badge.
 */
export async function readAgentWallet(agentId: string): Promise<string | null> {
  const registry = registryAddress();
  if (!registry) return null;

  let tokenId: bigint;
  try {
    tokenId = BigInt(agentId);
  } catch {
    return null;
  }

  try {
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
    const wallet = await client.readContract({
      address: registry,
      abi: identityReadAbi,
      functionName: "getAgentWallet",
      args: [tokenId],
    });
    const walletStr = getAddress(wallet);
    return walletStr === "0x0000000000000000000000000000000000000000" ? null : walletStr;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* AgentLedger merit signals + tCNHV credits (read-only)                      */
/* -------------------------------------------------------------------------- */

const agentLedgerReadAbi = [
  {
    type: "function",
    name: "stats",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "agentWallet", type: "address" },
          { name: "firstSeen", type: "uint64" },
          { name: "lastActive", type: "uint64" },
          { name: "collabCount", type: "uint256" },
          { name: "cnhvEarned", type: "uint256" },
          { name: "cnhvSpent", type: "uint256" },
          { name: "totalGasSpentWei", type: "uint256" },
          { name: "uniqueCounterparties", type: "uint256" },
          { name: "repeatCounterparties", type: "uint256" },
        ],
      },
    ],
  },
  { type: "function", name: "netFlow", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "int256" }] },
  { type: "function", name: "repeatRate", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function",
    name: "earnedPerCollab",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const tcnhvReadAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lastClaim",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  { type: "function", name: "FAUCET_COOLDOWN", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

export interface AgentLedgerStats {
  /** The deployed ledger clone address. */
  ledger: string;
  collabCount: number;
  /** Cumulative tCNHV earned (base units, 18 decimals), as a string. */
  cnhvEarned: string;
  cnhvSpent: string;
  totalGasSpentWei: string;
  uniqueCounterparties: number;
  repeatCounterparties: number;
  /** Net tCNHV flow (earned - spent), signed base-unit string. */
  netFlow: string;
  /** True when net flow is >= 0 (net producer). */
  netProducer: boolean;
  /** Repeat-counterparty share in basis points (0-10000). */
  repeatRateBps: number;
  /** Average tCNHV earned per collaboration (base-unit string). */
  earnedPerCollab: string;
  /** Unix seconds of the most recent recorded activity (0 if none). */
  lastActive: number;
  firstSeen: number;
}

/**
 * Read an agent's on-chain ledger (the objective merit signal). Returns null
 * when the factory is unconfigured, the agent has no ledger yet, or the read
 * fails — callers render a "no on-chain activity" state.
 */
export async function readAgentLedger(agentId: string): Promise<AgentLedgerStats | null> {
  const ledger = await getLedgerAddress(agentId);
  if (!ledger) return null;
  try {
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
    const ledgerAddr = ledger as Address;
    const [stats, netFlow, repeatRate, earnedPer] = await Promise.all([
      client.readContract({ address: ledgerAddr, abi: agentLedgerReadAbi, functionName: "stats" }),
      client.readContract({ address: ledgerAddr, abi: agentLedgerReadAbi, functionName: "netFlow" }),
      client.readContract({ address: ledgerAddr, abi: agentLedgerReadAbi, functionName: "repeatRate" }),
      client.readContract({ address: ledgerAddr, abi: agentLedgerReadAbi, functionName: "earnedPerCollab" }),
    ]);
    return {
      ledger,
      collabCount: Number(stats.collabCount),
      cnhvEarned: stats.cnhvEarned.toString(),
      cnhvSpent: stats.cnhvSpent.toString(),
      totalGasSpentWei: stats.totalGasSpentWei.toString(),
      uniqueCounterparties: Number(stats.uniqueCounterparties),
      repeatCounterparties: Number(stats.repeatCounterparties),
      netFlow: netFlow.toString(),
      netProducer: netFlow >= 0n,
      repeatRateBps: Number(repeatRate),
      earnedPerCollab: earnedPer.toString(),
      lastActive: Number(stats.lastActive),
      firstSeen: Number(stats.firstSeen),
    };
  } catch {
    return null;
  }
}

/** tCNHV balance of an account in base units (string), or null when unconfigured/unreadable. */
export async function readTcnhvBalance(account: string): Promise<string | null> {
  const token = readSecret("TCNHV_TOKEN_ADDRESS");
  if (!token) return null;
  let tokenAddr: Address;
  let acct: Address;
  try {
    tokenAddr = getAddress(token);
    acct = getAddress(account);
  } catch {
    return null;
  }
  try {
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
    const balance = await client.readContract({
      address: tokenAddr,
      abi: tcnhvReadAbi,
      functionName: "balanceOf",
      args: [acct],
    });
    return balance.toString();
  } catch {
    return null;
  }
}

export interface FaucetStatus {
  /** Unix seconds of the account's last faucet claim (0 = never). */
  lastClaim: number;
  cooldownSeconds: number;
  /** Unix seconds when the next claim is allowed (0 = claimable now). */
  nextClaimAt: number;
  canClaim: boolean;
}

/** Faucet cooldown state for an account, or null when unconfigured/unreadable. */
export async function readFaucetStatus(account: string): Promise<FaucetStatus | null> {
  const token = readSecret("TCNHV_TOKEN_ADDRESS");
  if (!token) return null;
  let tokenAddr: Address;
  let acct: Address;
  try {
    tokenAddr = getAddress(token);
    acct = getAddress(account);
  } catch {
    return null;
  }
  try {
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl()) });
    const [last, cooldown] = await Promise.all([
      client.readContract({ address: tokenAddr, abi: tcnhvReadAbi, functionName: "lastClaim", args: [acct] }),
      client.readContract({ address: tokenAddr, abi: tcnhvReadAbi, functionName: "FAUCET_COOLDOWN" }),
    ]);
    const lastClaim = Number(last);
    const cooldownSeconds = Number(cooldown);
    const nextClaimAt = lastClaim === 0 ? 0 : lastClaim + cooldownSeconds;
    const now = Math.floor(Date.now() / 1000);
    return { lastClaim, cooldownSeconds, nextClaimAt, canClaim: lastClaim === 0 || now >= nextClaimAt };
  } catch {
    return null;
  }
}
