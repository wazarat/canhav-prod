import "server-only";

import { readSecret } from "@/lib/server/env";
import { fetchJson } from "@/lib/server/http";

/** KMNO mint on Solana — from Protocol-Symbol-Chain-Contract.csv. */
export const KMNO_MINT = "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS";

export function hasHelius(): boolean {
  return Boolean(readSecret("HELIUS_API_KEY"));
}

function heliusRpcUrl(): string | null {
  const key = readSecret("HELIUS_API_KEY");
  return key ? `https://mainnet.helius-rpc.com/?api-key=${key}` : null;
}

export interface HeliusTokenSupply {
  supply: number | null;
  decimals: number | null;
}

/** Fetch SPL token supply via Helius JSON-RPC (getTokenSupply). */
export async function fetchHeliusTokenSupply(
  mint: string,
  revalidate?: number,
): Promise<HeliusTokenSupply | null> {
  const url = heliusRpcUrl();
  if (!url) return null;

  const { status, data } = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "canhav-kmno-supply",
      method: "getTokenSupply",
      params: [mint],
    }),
    revalidate,
  });

  if (status !== 200 || !data?.result?.value) return null;

  const value = data.result.value;
  const amount = value.amount as string | undefined;
  const decimals = typeof value.decimals === "number" ? value.decimals : null;
  if (!amount || decimals == null) return null;

  const raw = BigInt(amount);
  const supply = Number(raw) / 10 ** decimals;

  return {
    supply: Number.isFinite(supply) ? supply : null,
    decimals,
  };
}
