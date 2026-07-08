#!/usr/bin/env node
/**
 * Verify live GMX markets on Arbitrum Sepolia (chain 421614).
 *
 * GMX testnet contracts churn, so the tradable-majors list must be re-verified
 * against the chain before every rewire (roadmap Steps B1/B2/B3). This script
 * enumerates Reader.getMarkets and resolves each token's symbol/decimals,
 * printing a markdown table to paste into the (local-only) roadmap file.
 *
 *   node frontend/scripts/verify-gmx-markets.mjs
 *
 * Env: ARBITRUM_SEPOLIA_RPC_URL (optional; falls back to the public RPC).
 * Addresses mirror frontend/lib/agent/trade/gmx.ts — that module is
 * `server-only`, so they are restated here for standalone use.
 */

import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

const READER = "0x4750376b9378294138Cf7B7D69a2d243f4940f71";
const DATA_STORE = "0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201";
const SEPOLIA_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d".toLowerCase();

const readerAbi = [
  {
    type: "function",
    name: "getMarkets",
    stateMutability: "view",
    inputs: [
      { name: "dataStore", type: "address" },
      { name: "start", type: "uint256" },
      { name: "end", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "marketToken", type: "address" },
          { name: "indexToken", type: "address" },
          { name: "longToken", type: "address" },
          { name: "shortToken", type: "address" },
        ],
      },
    ],
  },
];

const erc20Abi = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];

const ZERO = "0x0000000000000000000000000000000000000000";

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc"),
});

const symbolCache = new Map();

async function tokenLabel(address) {
  const key = address.toLowerCase();
  if (key === ZERO) return "(zero — swap-only market)";
  if (symbolCache.has(key)) return symbolCache.get(key);
  let label;
  try {
    const [symbol, decimals] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
      client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
    ]);
    label = `${symbol} (${decimals}d)`;
  } catch {
    label = "(no symbol)";
  }
  symbolCache.set(key, label);
  return label;
}

async function main() {
  const markets = await client.readContract({
    address: READER,
    abi: readerAbi,
    functionName: "getMarkets",
    args: [DATA_STORE, 0n, 50n],
  });

  if (!markets.length) {
    console.error("No markets returned — Reader/DataStore addresses may have churned again.");
    process.exit(1);
  }

  console.log(`GMX Arbitrum Sepolia markets — verified ${new Date().toISOString()}`);
  console.log(`Reader ${READER} · DataStore ${DATA_STORE} · ${markets.length} markets\n`);
  console.log("| # | Market token | Index token | Index | Long token | Long | Short token | Short | Platform USDC |");
  console.log("|---|---|---|---|---|---|---|---|---|");

  for (const [i, m] of markets.entries()) {
    const [index, long, short] = await Promise.all([
      tokenLabel(m.indexToken),
      tokenLabel(m.longToken),
      tokenLabel(m.shortToken),
    ]);
    const usdcShort = m.shortToken.toLowerCase() === SEPOLIA_USDC ? "yes" : "no";
    console.log(
      `| ${i} | ${m.marketToken} | ${m.indexToken} | ${index} | ${m.longToken} | ${long} | ${m.shortToken} | ${short} | ${usdcShort} |`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
