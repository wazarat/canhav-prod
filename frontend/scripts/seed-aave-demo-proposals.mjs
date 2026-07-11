// Seed three recent AAVE recommendation proposals for the demo agent's
// Proposed-trades panel. Recommendation-mode rows only (AAVE has no GMX
// Sepolia market): no txHash, status "proposed", sizes inside the $50 cap.
// Reasons cite the historical incidents the card rails catch, so the desk's
// proposals column reads as live agent activity backed by the backtest.
//
// Usage (from frontend/):
//   node --env-file=.env.local scripts/seed-aave-demo-proposals.mjs
//
// Idempotent: LPUSH-only (never deletes), and any tp_demo_* id already in
// the list is skipped, so re-running after a dismissal restores only what's
// missing.

import { Redis } from "@upstash/redis";

const AGENT_ID = process.env.DEMO_AGENT_ID || "3";
const KEY = `agent:${AGENT_ID}:trade-proposals`;

// USDC.SG collateral + GMX ExchangeRouter, mirroring lib/agent/trade
// (gmxTarget is a required proposal field even in recommendation mode).
const USDC_SG = "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773";
const EXCHANGE_ROUTER = "0xEd50B2A1eF0C35DAaF08Da6486971180237909c3";

const usd30 = (usd) => `${usd}${"0".repeat(30)}`;

function proposal({ id, side, sizeUsd, signal, createdAt, reason }) {
  return {
    id,
    asset: "AAVE",
    side,
    sizeUsd: usd30(sizeUsd),
    leverage: 1,
    collateralToken: USDC_SG,
    verdictRef: `AAVE:${createdAt}:${signal}`,
    createdAt,
    status: "proposed",
    gmxTarget: EXCHANGE_ROUTER,
    executionMode: "recommendation",
    reason,
  };
}

// Oldest first: LPUSH prepends, so the last pushed lands at index 0 and the
// panel (newest first) shows the momentum buy on top.
const PROPOSALS = [
  proposal({
    id: "tp_demo_util_spike",
    side: "short",
    sizeUsd: 30,
    signal: "peg_risk",
    createdAt: "2026-07-10T09:20:00.000Z",
    reason:
      "Collateral utilization spike rail: ETH reserve utilization is climbing toward the trip level. Same shape as the 2024-08-05 carry-trade unwind, when utilization hit ~93% before the DAO tightened E-Mode limits. Suggest trimming AAVE exposure.",
  }),
  proposal({
    id: "tp_demo_lrt_depeg",
    side: "short",
    sizeUsd: 25,
    signal: "peg_risk",
    createdAt: "2026-07-11T14:05:00.000Z",
    reason:
      "LRT depeg guard rail: rsETH secondary-market pricing is wobbling against ETH. The pattern matches the 2026-04 Kelp DAO incident that ended with Aave freezing the rsETH reserves. Suggest de-risking and freezing new LRT-backed longs.",
  }),
  proposal({
    id: "tp_demo_momentum_add",
    side: "long",
    sizeUsd: 10,
    signal: "catalyst_positive",
    createdAt: "2026-07-12T08:45:00.000Z",
    reason:
      "Momentum-positive add rail: AAVE holds a fresh positive research verdict with a 24h base forming. Gated like every call, no research, no recommendation. Suggest a small starter buy.",
  }),
];

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const existing = await redis.lrange(KEY, 0, 49);
const existingIds = new Set(
  existing
    .map((v) => {
      try {
        return (typeof v === "string" ? JSON.parse(v) : v).id;
      } catch {
        return null;
      }
    })
    .filter(Boolean),
);

for (const p of PROPOSALS) {
  if (existingIds.has(p.id)) {
    console.log(`skip ${p.id} (already present)`);
    continue;
  }
  await redis.lpush(KEY, JSON.stringify(p));
  console.log(`seeded ${p.id} (${p.side} $${Number(p.sizeUsd.slice(0, -30))})`);
}

const after = await redis.lrange(KEY, 0, 9);
console.log(`${KEY} now has ${after.length} entr${after.length === 1 ? "y" : "ies"}`);
