import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  http,
  stringToHex,
  type Address,
  type Hex,
  type LocalAccount,
  type Log,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";

import { chain, type AgentServiceConfig } from "../config";
import type { AgentProductRef, AgentSkill } from "../types";
import { identityRegistryAbi } from "../abi/registries";
import { buildAgentRegistrationFile, toAgentURI } from "./registration";

/** EIP-712 domain name/version of the ERC-8004 IdentityRegistry (reference impl). */
const WALLET_BINDING_DOMAIN_NAME = "ERC8004IdentityRegistry";
const WALLET_BINDING_DOMAIN_VERSION = "1";
/** Seconds added to the chain timestamp for the wallet-binding deadline (< 5 min). */
const WALLET_BINDING_TTL_SECONDS = 240n;

const agentWalletSetTypes = {
  AgentWalletSet: [
    { name: "agentId", type: "uint256" },
    { name: "newWallet", type: "address" },
    { name: "owner", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export interface SpawnParams {
  cfg: AgentServiceConfig;
  /** The CanHav skill the agent is spun up from. */
  skill: AgentSkill;
  /** The signer that owns the identity and pays its own Sepolia gas (testnet EOA). */
  signer: LocalAccount;
  /** The Entity ("project") slug this agent is bound to. */
  entity?: string;
  /** Member products the agent is scoped to (written on-chain as metadata). */
  associatedProducts?: AgentProductRef[];
  /**
   * Public base URL of the CanHav app. When set, the minted `tokenURI` points at
   * the hosted, discoverable agent card instead of the on-chain data URI.
   */
  baseUrl?: string;
}

export interface SpawnResult {
  agentId: bigint;
  agentAddress: Address;
  agentURI: string;
  /** The verified ERC-8004 `agentWallet` (== `agentAddress` on success), else null. */
  agentWallet: Address | null;
  /** Whether the signed wallet binding (setAgentWallet) landed on-chain. */
  walletVerified: boolean;
}

/**
 * Spin up an agent from a CanHav skill, signed directly by the owner's wallet
 * (mirrors the browser mint in `frontend/lib/agent/spawn-client.ts`):
 *   1. build the ERC-8004 registration file from the skill,
 *   2. mint the identity via `IdentityRegistry.register(...)` — with a hosted
 *      card the URI embeds the agentId (only known after the mint), so it is
 *      written in a second `setAgentURI` call; the fully on-chain `data:` URI
 *      fallback registers in a single shot,
 *   3. best-effort: bind the wallet to the identity via a signed EIP-712
 *      `AgentWalletSet` (plain ECDSA), powering the "wallet verified" badge.
 *
 * One wallet can mint MANY agents — each identity is a distinct tokenId owned
 * by (and addressed at) the same signer address.
 */
export async function spawnAgentFromSkill(params: SpawnParams): Promise<SpawnResult> {
  const { cfg, skill, signer, entity, associatedProducts, baseUrl } = params;

  const publicClient = createPublicClient({ chain, transport: http(cfg.rpcUrl) });
  const walletClient = createWalletClient({
    account: signer,
    chain,
    transport: http(cfg.rpcUrl),
  });

  const registrationFile = buildAgentRegistrationFile(skill, { entity, associatedProducts });
  const metadata = buildMetadataEntries(entity, associatedProducts);
  const hostedBase = baseUrl?.replace(/\/+$/, "");

  // With a hosted card the URI is only known post-mint (it embeds the agentId),
  // so mint with an empty URI and set it in a second call. The data: URI
  // fallback is self-contained and registers in one shot.
  const initialURI = hostedBase ? "" : toAgentURI(registrationFile);
  const registerHash =
    metadata.length > 0
      ? await walletClient.writeContract({
          address: cfg.identityRegistry,
          abi: identityRegistryAbi,
          functionName: "register",
          args: [initialURI, metadata],
        })
      : await walletClient.writeContract({
          address: cfg.identityRegistry,
          abi: identityRegistryAbi,
          functionName: "register",
          args: [initialURI],
        });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: registerHash });
  const agentId = parseRegisteredAgentId(receipt.logs, cfg.identityRegistry);

  let agentURI = initialURI;
  if (hostedBase) {
    agentURI = `${hostedBase}/api/agent/${agentId.toString()}/agent-card`;
    const uriHash = await walletClient.writeContract({
      address: cfg.identityRegistry,
      abi: identityRegistryAbi,
      functionName: "setAgentURI",
      args: [agentId, agentURI],
    });
    await publicClient.waitForTransactionReceipt({ hash: uriHash });
  }

  const walletVerified = await bindAgentWallet(cfg, walletClient, publicClient, agentId);

  return {
    agentId,
    agentAddress: signer.address,
    agentURI,
    agentWallet: walletVerified ? signer.address : null,
    walletVerified,
  };
}

type SpawnWalletClient = WalletClient<Transport, typeof chain, LocalAccount>;
type SpawnPublicClient = PublicClient<Transport, typeof chain>;

/**
 * Bind the signer wallet to the identity by signing the ERC-8004
 * `AgentWalletSet` typed data (plain ECDSA — the registry's SignatureChecker
 * covers EOAs) and submitting `setAgentWallet`. Best-effort: a successful mint
 * is kept even if the binding fails (it can be re-verified later).
 */
async function bindAgentWallet(
  cfg: AgentServiceConfig,
  walletClient: SpawnWalletClient,
  publicClient: SpawnPublicClient,
  agentId: bigint,
): Promise<boolean> {
  try {
    const wallet = walletClient.account.address;
    const block = await publicClient.getBlock();
    const deadline = block.timestamp + WALLET_BINDING_TTL_SECONDS;

    const signature = (await walletClient.signTypedData({
      domain: {
        name: WALLET_BINDING_DOMAIN_NAME,
        version: WALLET_BINDING_DOMAIN_VERSION,
        chainId: cfg.chainId,
        verifyingContract: cfg.identityRegistry,
      },
      types: agentWalletSetTypes,
      primaryType: "AgentWalletSet",
      message: { agentId, newWallet: wallet, owner: wallet, deadline },
    })) as Hex;

    const bindHash = await walletClient.writeContract({
      address: cfg.identityRegistry,
      abi: identityRegistryAbi,
      functionName: "setAgentWallet",
      args: [agentId, wallet, deadline, signature],
    });
    await publicClient.waitForTransactionReceipt({ hash: bindHash });
    return true;
  } catch (e) {
    // Non-fatal: the identity is minted; the wallet can be re-verified later.
    console.error(
      "[spawn] setAgentWallet binding failed:",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** Build ERC-8004 MetadataEntry[] (key/bytes) for the agent's project binding. */
function buildMetadataEntries(
  entity: string | undefined,
  associatedProducts: AgentProductRef[] | undefined,
): { metadataKey: string; metadataValue: `0x${string}` }[] {
  const entries: { metadataKey: string; metadataValue: `0x${string}` }[] = [];
  if (entity) {
    entries.push({ metadataKey: "entity", metadataValue: stringToHex(entity) });
  }
  if (associatedProducts && associatedProducts.length > 0) {
    const csv = associatedProducts.map((p) => p.symbol).join(",");
    entries.push({ metadataKey: "products", metadataValue: stringToHex(csv) });
  }
  return entries;
}

/** Extract the minted agentId from the IdentityRegistry `Registered` event. */
function parseRegisteredAgentId(logs: readonly Log[], identityRegistry: Address): bigint {
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
  throw new Error("Registered event not found in the mint transaction receipt logs.");
}
