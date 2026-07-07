"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Signer } from "@zerodev/sdk/types";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";

/**
 * Resolve the wallet that signs transactions for this session.
 *
 * External wallets (MetaMask, etc.) take precedence over the Privy embedded
 * wallet so wallet-login users control their treasury from the extension they
 * connected with. Social-login users fall back to embedded.
 */
export function resolveActiveWallet(wallets: ConnectedWallet[]): ConnectedWallet | null {
  const external = wallets.find((w) => w.walletClientType !== "privy");
  if (external) return external;
  return wallets.find((w) => w.walletClientType === "privy") ?? wallets[0] ?? null;
}

/** Human label for the active wallet (UI copy). */
export function activeWalletLabel(wallet: ConnectedWallet | null): string {
  if (!wallet) return "wallet";
  if (wallet.walletClientType === "privy") return "embedded wallet";
  if (wallet.walletClientType === "metamask") return "MetaMask";
  return wallet.walletClientType.replace(/_/g, " ");
}

/**
 * Build a viem wallet client from a Privy-connected wallet (embedded or external).
 * Pins Arbitrum Sepolia — the only chain agents touch.
 */
export async function walletToSigner(wallet: ConnectedWallet): Promise<Signer> {
  try {
    await wallet.switchChain(ARBITRUM_SEPOLIA_CHAIN_ID);
  } catch {
    /* kernel client pins the chain regardless */
  }
  const provider = await wallet.getEthereumProvider();
  const { createWalletClient, custom } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");
  return createWalletClient({
    account: wallet.address as `0x${string}`,
    chain: arbitrumSepolia,
    transport: custom(provider),
  });
}

/** Resolve the active connected wallet and return a viem signer, or throw. */
export async function buildPrivySigner(wallets: ConnectedWallet[]): Promise<Signer> {
  const wallet = resolveActiveWallet(wallets);
  if (!wallet) {
    throw new Error(
      "No wallet connected yet — sign in with MetaMask or wait for your embedded wallet to finish loading.",
    );
  }
  return walletToSigner(wallet);
}

const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

/**
 * Build a viem wallet client from a Privy-connected wallet, pinned to Arbitrum Sepolia.
 */
export async function buildPrivyWalletClient(wallet: ConnectedWallet) {
  try {
    await wallet.switchChain(ARBITRUM_SEPOLIA_CHAIN_ID);
  } catch {
    /* wallet client pins the chain regardless */
  }
  const provider = await wallet.getEthereumProvider();
  const { createWalletClient, custom } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");
  return createWalletClient({
    account: wallet.address as `0x${string}`,
    chain: arbitrumSepolia,
    transport: custom(provider),
  });
}

/**
 * Sign and broadcast a plain ERC-20 transfer from the Privy wallet (no ZeroDev kernel).
 */
export async function sendErc20Transfer(params: {
  wallet: ConnectedWallet;
  token: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  rpcUrl?: string;
}): Promise<{ txHash: `0x${string}` }> {
  const client = await buildPrivyWalletClient(params.wallet);
  const { createPublicClient, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");

  const hash = await client.writeContract({
    abi: erc20TransferAbi,
    address: params.token,
    functionName: "transfer",
    args: [params.to, params.amount],
  });

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(params.rpcUrl ?? DEFAULT_RPC),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}

/**
 * Resolve the wallet that controls a minted agent kernel. Each agent smart
 * account is salted from (mint-signer EOA, accountIndex) — paying or claiming
 * with a different connected wallet targets a different address (0 balance).
 */
export function resolveWalletForAgent(
  wallets: ConnectedWallet[],
  agentSignerAddress?: string | null,
): ConnectedWallet | null {
  if (agentSignerAddress) {
    const want = agentSignerAddress.toLowerCase();
    return wallets.find((w) => w.address.toLowerCase() === want) ?? null;
  }
  return resolveActiveWallet(wallets);
}

export async function buildAgentSigner(
  wallets: ConnectedWallet[],
  agentSignerAddress?: string | null,
): Promise<Signer> {
  const wallet = resolveWalletForAgent(wallets, agentSignerAddress);
  if (!wallet) {
    if (agentSignerAddress) {
      const short = `${agentSignerAddress.slice(0, 6)}…${agentSignerAddress.slice(-4)}`;
      throw new Error(
        `This agent was minted with wallet ${short}. Connect that wallet in Privy (Wallet menu), or disconnect MetaMask if you minted with the embedded wallet, then try again.`,
      );
    }
    throw new Error(
      "No wallet connected yet — sign in with MetaMask or wait for your embedded wallet to finish loading.",
    );
  }
  return walletToSigner(wallet);
}
