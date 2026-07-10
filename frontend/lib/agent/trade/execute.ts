"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";

import { erc20ApproveAbi } from "@/lib/agent/trade/abi/gmx";
import { buildOpenPositionCall } from "@/lib/agent/trade/gmxAdapter";
import { ROUTER } from "@/lib/agent/trade/gmx";
import type { TradeIntent } from "@/lib/agent/trade/types";
import { buildPrivyWalletClient } from "@/lib/agent/privy-signer";

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

export interface ExecuteTradeParams {
  wallet: ConnectedWallet;
  intent: TradeIntent;
  market: `0x${string}`;
  collateralAmount: bigint;
  rpcUrl?: string;
}

/**
 * Privy-signed GMX open position. Gate must run server-side before calling this.
 * 1. approve(Router) if needed
 * 2. ExchangeRouter.multicall (sendWnt + sendTokens + createOrder)
 */
export async function executeTrade(params: ExecuteTradeParams): Promise<{ txHash: `0x${string}` }> {
  const { wallet, intent, market, collateralAmount, rpcUrl } = params;
  const client = await buildPrivyWalletClient(wallet);
  const { createPublicClient, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl ?? DEFAULT_RPC),
  });

  const account = wallet.address as `0x${string}`;

  // Fee headroom: wallet estimators on Arbitrum Sepolia quote maxFeePerGas at
  // the current base fee with no margin, so the signed tx is rejected with
  // "max fee per gas less than block base fee" whenever the base fee ticks up
  // between estimate and submission. Quote 3x the estimate — the chain only
  // charges the actual base fee, so the surplus is never spent.
  const fees = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (fees.maxFeePerGas ?? 20_000_000n) * 3n;
  const maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 0n;

  const allowance = await publicClient.readContract({
    address: intent.collateralToken,
    abi: erc20ApproveAbi,
    functionName: "allowance",
    args: [account, ROUTER],
  });

  if (allowance < collateralAmount) {
    const approveHash = await client.writeContract({
      abi: erc20ApproveAbi,
      address: intent.collateralToken,
      functionName: "approve",
      args: [ROUTER, collateralAmount],
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const call = buildOpenPositionCall(intent, {
    receiver: account,
    market,
    collateralAmount,
  });

  const hash = await client.sendTransaction({
    to: call.target,
    data: call.data,
    value: call.value,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}
