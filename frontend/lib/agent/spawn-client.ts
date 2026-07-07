"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Log } from "viem";

// Deep import (not the package barrel): keeps the TS program limited to the
// type/runner modules the frontend actually uses — the barrel pulls the whole
// service (Node-side spawn/registration) into the Vercel typecheck.
import type { AgentProductRef, AgentSkill } from "canhav-agent-service/src/types";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";
import {
  agentWalletSetTypes,
  identityRegistryAbi,
  WALLET_BINDING_DOMAIN_NAME,
  WALLET_BINDING_DOMAIN_VERSION,
} from "@/lib/agent/identity-abi";
import { buildPrivyWalletClient } from "@/lib/agent/privy-signer";

/** Mint config returned by GET /api/agent/spawn/preflight (session-gated). */
export interface SpawnMintConfig {
  rpcUrl: string;
  identityRegistry: `0x${string}`;
  securityRegistry: `0x${string}`;
}

export interface SpawnPreflightResponse {
  configured: boolean;
  reused?: boolean;
  agentId?: string;
  agentAddress?: string | null;
  agentURI?: string | null;
  arbiscanUrl?: string | null;
  tokenUrl?: string | null;
  accountIndex?: number;
  skill?: AgentSkill;
  entitySlug?: string;
  associatedProducts?: AgentProductRef[];
  mintConfig?: SpawnMintConfig;
  baseUrl?: string;
  error?: string;
}

export interface ClientMintResult {
  agentId: string;
  agentAddress: `0x${string}`;
  agentURI: string;
  agentWallet: `0x${string}` | null;
  walletVerified: boolean;
  arbiscanUrl: string;
  tokenUrl: string | null;
}

/** Seconds added to the chain timestamp for the wallet-binding deadline (< 5 min). */
const WALLET_BINDING_TTL_SECONDS = 240n;

/** Surface out-of-gas mint failures as an actionable message. */
function formatMintError(e: unknown): Error {
  const raw = e instanceof Error ? e.message : String(e ?? "Mint failed.");
  if (/insufficient funds|exceeds the balance|gas required exceeds/i.test(raw)) {
    return new Error(
      "Your wallet needs a small amount of Arbitrum Sepolia ETH to pay gas for the mint. Fund it from an Arbitrum Sepolia faucet, then retry.",
    );
  }
  return e instanceof Error ? e : new Error(raw);
}

/** Extract the minted agentId from the IdentityRegistry `Registered` event. */
async function parseRegisteredAgentId(
  logs: readonly Log[],
  identityRegistry: `0x${string}`,
): Promise<bigint> {
  const { decodeEventLog, getAddress } = await import("viem");
  const registry = getAddress(identityRegistry);
  for (const log of logs) {
    if (getAddress(log.address) !== registry) continue;
    try {
      const decoded = decodeEventLog({
        abi: identityRegistryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "Registered") {
        return decoded.args.agentId;
      }
    } catch {
      // Not a Registered event from our ABI — skip.
    }
  }
  throw new Error("Registered event not found in the mint transaction receipt.");
}

/** ERC-8004 MetadataEntry[] (key/bytes) for the agent's project binding. */
async function buildMetadataEntries(
  entity: string | null | undefined,
  associatedProducts: AgentProductRef[],
): Promise<{ metadataKey: string; metadataValue: `0x${string}` }[]> {
  const { stringToHex } = await import("viem");
  const entries: { metadataKey: string; metadataValue: `0x${string}` }[] = [];
  if (entity) {
    entries.push({ metadataKey: "entity", metadataValue: stringToHex(entity) });
  }
  if (associatedProducts.length > 0) {
    const csv = associatedProducts.map((p) => p.symbol).join(",");
    entries.push({ metadataKey: "products", metadataValue: stringToHex(csv) });
  }
  return entries;
}

/**
 * Mint an ERC-8004 identity in the browser, signed directly by the user's
 * Privy wallet (embedded or external), which owns the identity and pays its
 * own Sepolia gas:
 *   1. `register(...)` mints the identity NFT to the wallet; the hosted agent
 *      card URL embeds the agentId (only known after the mint), so the URI is
 *      written in a second `setAgentURI` call,
 *   2. best-effort `setAgentWallet` binds the wallet to the identity via a
 *      signed EIP-712 `AgentWalletSet` (plain ECDSA — the registry's
 *      SignatureChecker covers EOAs), powering the "wallet verified" badge.
 */
export async function mintAgentOnClient(params: {
  /** The user's Privy-connected wallet (embedded or external). */
  wallet: ConnectedWallet;
  /** Real entity slug for legacy entity-bound mints; null/undefined for general agents. */
  entitySlug?: string | null;
  associatedProducts: AgentProductRef[];
  mintConfig: SpawnMintConfig;
  baseUrl: string;
}): Promise<ClientMintResult> {
  const { createPublicClient, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");

  const walletClient = await buildPrivyWalletClient(params.wallet);
  const owner = params.wallet.address as `0x${string}`;
  const registry = params.mintConfig.identityRegistry;
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(params.mintConfig.rpcUrl),
  });

  let tokenId: bigint;
  let agentURI: string;
  try {
    // 1) Mint. Entity-bound agents write their project binding as ERC-8004
    //    metadata in the same call; the URI stays empty until step 2.
    const metadata = await buildMetadataEntries(params.entitySlug, params.associatedProducts);
    const registerHash =
      metadata.length > 0
        ? await walletClient.writeContract({
            address: registry,
            abi: identityRegistryAbi,
            functionName: "register",
            args: ["", metadata],
          })
        : await walletClient.writeContract({
            address: registry,
            abi: identityRegistryAbi,
            functionName: "register",
            args: [""],
          });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: registerHash });
    tokenId = await parseRegisteredAgentId(receipt.logs, registry);

    // 2) Point tokenURI at the hosted, discoverable agent card (by agentId —
    //    stable even though every agent minted by this wallet shares its address).
    agentURI = `${params.baseUrl.replace(/\/+$/, "")}/api/agent/${tokenId.toString()}/agent-card`;
    const uriHash = await walletClient.writeContract({
      address: registry,
      abi: identityRegistryAbi,
      functionName: "setAgentURI",
      args: [tokenId, agentURI],
    });
    await publicClient.waitForTransactionReceipt({ hash: uriHash });
  } catch (e) {
    throw formatMintError(e);
  }

  // 3) Best-effort wallet binding: a successful mint is kept even if the
  //    binding fails (it can be re-verified later).
  let walletVerified = false;
  try {
    const block = await publicClient.getBlock();
    const deadline = block.timestamp + WALLET_BINDING_TTL_SECONDS;
    const signature = await walletClient.signTypedData({
      account: owner,
      domain: {
        name: WALLET_BINDING_DOMAIN_NAME,
        version: WALLET_BINDING_DOMAIN_VERSION,
        chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
        verifyingContract: registry,
      },
      types: agentWalletSetTypes,
      primaryType: "AgentWalletSet",
      message: { agentId: tokenId, newWallet: owner, owner, deadline },
    });
    const bindHash = await walletClient.writeContract({
      address: registry,
      abi: identityRegistryAbi,
      functionName: "setAgentWallet",
      args: [tokenId, owner, deadline, signature],
    });
    await publicClient.waitForTransactionReceipt({ hash: bindHash });
    walletVerified = true;
  } catch (e) {
    console.error("[mint] setAgentWallet binding failed:", e instanceof Error ? e.message : e);
  }

  const agentId = tokenId.toString();
  return {
    agentId,
    agentAddress: owner,
    agentURI,
    agentWallet: walletVerified ? owner : null,
    walletVerified,
    arbiscanUrl: `https://sepolia.arbiscan.io/address/${owner}`,
    tokenUrl: `https://sepolia.arbiscan.io/token/${registry}?a=${agentId}`,
  };
}
