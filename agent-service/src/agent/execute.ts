import type { Hex } from "viem";

import type { AgentServiceConfig } from "../config";
import type { ScopedAction } from "../types";
import type { AgentKernelAccount } from "../zerodev/account";
import { assertTargetAllowed } from "../security/gate";

export interface ExecuteResult {
  userOpHash: Hex;
  txHash: Hex;
}

/**
 * Execute a single scoped action through an agent's (session-key) kernel account.
 *
 * The {@link assertTargetAllowed} gate runs FIRST and rejects the action if the
 * target is not on the SecurityRegistry allowlist (unaudited/unverified) or if
 * the chain is not Arbitrum Sepolia. Only allowlisted, testnet targets proceed.
 */
export async function executeScopedAction(
  cfg: AgentServiceConfig,
  agent: AgentKernelAccount,
  action: ScopedAction,
): Promise<ExecuteResult> {
  await assertTargetAllowed(cfg, action.target);

  const userOpHash = await agent.kernelClient.sendUserOperation({
    account: agent.account,
    calls: [
      {
        to: action.target,
        value: action.value ?? 0n,
        data: action.data,
      },
    ],
  });

  const receipt = await agent.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { userOpHash, txHash: receipt.receipt.transactionHash };
}
