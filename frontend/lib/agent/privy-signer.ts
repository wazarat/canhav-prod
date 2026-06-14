"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Signer } from "@zerodev/sdk/types";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";

/**
 * Resolve the wallet that signs ZeroDev userOps for this session.
 *
 * External wallets (MetaMask, etc.) take precedence over the Privy embedded
 * wallet so wallet-login users control their treasury + agent kernels from the
 * extension they connected with. Social-login users fall back to embedded.
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
