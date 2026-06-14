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
