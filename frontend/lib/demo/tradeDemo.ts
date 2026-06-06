import type { TradeConfig } from "@/lib/types";

/** Demo price anchors (2026-06-05). */
const DEMO_PRICES: Record<string, number> = {
  SOL: 63.85,
  BTC: 98_500,
  ETH: 3_450,
};

export interface DemoSmartAccount {
  address: string;
  deployed: boolean;
  gasSponsored: boolean;
}

export interface ReplicationLeg {
  symbol: string;
  gmxMarket: string;
  weightPct: number;
  usdSize: number;
  estPrice: number;
  estFeeUsd: number;
}

export interface ReplicationQuote {
  usdAmount: number;
  legs: ReplicationLeg[];
  stableCollateralUsd: number;
  expressTxHash: string;
}

export type OrderFlowStep = "prepareOrder" | "signOrder" | "submitOrder";

export interface OrderFlowEvent {
  step: OrderFlowStep;
  label: string;
  status: "pending" | "done";
}

const STEP_LABELS: Record<OrderFlowStep, string> = {
  prepareOrder: "prepareOrder",
  signOrder: "signOrder (passkey)",
  submitOrder: "submitOrder (Gelato-relayed)",
};

export function createDemoSmartAccount(): DemoSmartAccount {
  return {
    address: "0xDEMO00000000000000000000000000000000000001",
    deployed: true,
    gasSponsored: true,
  };
}

export function quoteReplication(
  usdAmount: number,
  basket: TradeConfig["replicationBasket"],
): ReplicationQuote {
  const volatileTotal = basket.reduce((s, b) => s + b.weightPct, 0);
  const stablePct = Math.max(0, 100 - volatileTotal);

  const legs: ReplicationLeg[] = basket.map((b) => {
    const usdSize = (usdAmount * b.weightPct) / 100;
    const estPrice = DEMO_PRICES[b.symbol] ?? 1;
    const estFeeUsd = usdSize * 0.001;
    return {
      symbol: b.symbol,
      gmxMarket: b.gmxMarket,
      weightPct: b.weightPct,
      usdSize,
      estPrice,
      estFeeUsd,
    };
  });

  return {
    usdAmount,
    legs,
    stableCollateralUsd: (usdAmount * stablePct) / 100,
    expressTxHash: `0xdemo${Date.now().toString(16).padStart(16, "0")}`,
  };
}

export function getOrderFlowSteps(): OrderFlowStep[] {
  return ["prepareOrder", "signOrder", "submitOrder"];
}

export function getStepLabel(step: OrderFlowStep): string {
  return STEP_LABELS[step];
}

export async function simulateOrderFlow(
  onStep: (event: OrderFlowEvent) => void,
): Promise<void> {
  const steps = getOrderFlowSteps();
  for (const step of steps) {
    onStep({ step, label: getStepLabel(step), status: "pending" });
    await delay(600);
    onStep({ step, label: getStepLabel(step), status: "done" });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sepoliaExplorerTxHash(hash: string): string {
  return `https://sepolia.arbiscan.io/tx/${hash}`;
}
