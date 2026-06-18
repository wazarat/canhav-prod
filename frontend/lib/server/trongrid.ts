import "server-only";

import { readSecret } from "@/lib/server/env";
import { fetchJson, nowIso } from "@/lib/server/http";

const TRONGRID_BASE = "https://api.trongrid.io";

/** JustLend DAO governance token (JST) on Tron — from Protocol-Symbol-Chain-Contract.csv. */
const JST_CONTRACT = "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9";

export function hasTronGrid(): boolean {
  return Boolean(readSecret("TRONGRID_API_KEY"));
}

function tronHeaders(): Record<string, string> {
  const key = readSecret("TRONGRID_API_KEY");
  return key ? { "TRON-PRO-API-KEY": key } : {};
}

export interface JustLendLiveMetrics {
  jstSupply: number | null;
  /** Placeholder for future JustLend market TVL via Tron contract reads. */
  notes: string;
}

/** Best-effort JustLend / Tron metrics via TronGrid (requires TRONGRID_API_KEY). */
export async function fetchJustLendLiveMetrics(
  revalidate?: number,
): Promise<JustLendLiveMetrics | null> {
  if (!hasTronGrid()) return null;

  const { status, data } = await fetchJson(
    `${TRONGRID_BASE}/v1/contracts/${JST_CONTRACT}`,
    { headers: tronHeaders(), revalidate },
  );

  if (status !== 200 || !data) return null;

  const supply =
    typeof data.total_supply === "number"
      ? data.total_supply
      : typeof data.totalSupply === "number"
        ? data.totalSupply
        : null;

  return {
    jstSupply: supply,
    notes: "JST contract metadata via TronGrid; protocol TVL remains on DeFi Llama until dedicated JustLend indexer is wired.",
  };
}

export function justLendMetricsToLendingOverlay(metrics: JustLendLiveMetrics) {
  return {
    governanceDetail: {
      notes: `TronGrid live read ${nowIso()}. JST on-chain supply: ${metrics.jstSupply ?? "unavailable"}. ${metrics.notes}`,
      proposals: null,
      treasuryUsd: null,
      voterTurnoutPct: null,
    },
  };
}
