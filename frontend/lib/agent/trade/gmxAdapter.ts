import { encodeFunctionData, maxUint256, zeroAddress } from "viem";

import { exchangeRouterAbi, DECREASE_SWAP_NONE, ORDER_TYPE_MARKET_INCREASE } from "@/lib/agent/trade/abi/gmx";
import {
  DEFAULT_EXECUTION_FEE,
  EXCHANGE_ROUTER,
  MAX_LEVERAGE,
  MAX_SIZE_USD,
  ORDER_VAULT,
} from "@/lib/agent/trade/gmx";
import type { TradeIntent } from "@/lib/agent/trade/types";

export interface OpenPositionParams {
  receiver: `0x${string}`;
  market: `0x${string}`;
  collateralAmount: bigint;
  executionFee?: bigint;
}

export interface ScopedTradeCall {
  target: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
}

/** Cap leverage and size for v1. */
export function clampTradeIntent(intent: TradeIntent): TradeIntent {
  const leverage = Math.min(Math.max(1, intent.leverage), MAX_LEVERAGE);
  const sizeUsd = intent.sizeUsd > MAX_SIZE_USD ? MAX_SIZE_USD : intent.sizeUsd;
  return { ...intent, leverage, sizeUsd };
}

/**
 * Build ExchangeRouter.multicall calldata: sendWnt + sendTokens + createOrder.
 * Pure encoding — no signing.
 */
export function buildOpenPositionCall(
  intent: TradeIntent,
  params: OpenPositionParams,
): ScopedTradeCall {
  const clamped = clampTradeIntent(intent);
  const executionFee = params.executionFee ?? DEFAULT_EXECUTION_FEE;

  // Collateral scales with size and leverage (USDC 6 decimals).
  const collateralAmount =
    params.collateralAmount > 0n
      ? params.collateralAmount
      : (clamped.sizeUsd / 10n ** 24n / BigInt(clamped.leverage)) || 1_000_000n;

  const sizeDeltaUsd = clamped.sizeUsd;
  const isLong = clamped.side === "long";

  // Market order slippage bounds per GMX docs.
  const acceptablePrice = isLong ? maxUint256 / 2n : 1n;

  const createOrderData = encodeFunctionData({
    abi: exchangeRouterAbi,
    functionName: "createOrder",
    args: [
      {
        addresses: {
          receiver: params.receiver,
          cancellationReceiver: params.receiver,
          callbackContract: zeroAddress,
          uiFeeReceiver: zeroAddress,
          market: params.market,
          initialCollateralToken: clamped.collateralToken,
          swapPath: [],
        },
        numbers: {
          sizeDeltaUsd,
          initialCollateralDeltaAmount: collateralAmount,
          triggerPrice: 0n,
          acceptablePrice,
          executionFee,
          callbackGasLimit: 0n,
          minOutputAmount: 0n,
          validFromTime: 0n,
        },
        orderType: ORDER_TYPE_MARKET_INCREASE,
        decreasePositionSwapType: DECREASE_SWAP_NONE,
        isLong,
        shouldUnwrapNativeToken: false,
        autoCancel: false,
        referralCode:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        dataList: [],
      },
    ],
  });

  const sendWntData = encodeFunctionData({
    abi: exchangeRouterAbi,
    functionName: "sendWnt",
    args: [ORDER_VAULT, executionFee],
  });

  const sendTokensData = encodeFunctionData({
    abi: exchangeRouterAbi,
    functionName: "sendTokens",
    args: [clamped.collateralToken, ORDER_VAULT, collateralAmount],
  });

  const data = encodeFunctionData({
    abi: exchangeRouterAbi,
    functionName: "multicall",
    args: [[sendWntData, sendTokensData, createOrderData]],
  });

  return {
    target: EXCHANGE_ROUTER,
    data,
    value: executionFee,
  };
}
