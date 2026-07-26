#!/usr/bin/env node
/**
 * M4 curated-value seed (CAN-69 / CAN-68 / CAN-64): per-entity curated fields
 * the tag panels render, patched surgically into CreditTagMetrics. Values are
 * editorial (protocol docs, governance params) and marked "curated" in the UI;
 * live cron overlays spread ON TOP of these and always win for Sourced cells.
 *
 * Only fields that are currently ABSENT are written (no clobbering of live or
 * previously-curated data).
 *
 * Usage:
 *   PATCH_DRY_RUN=1 node frontend/scripts/push-credit-m4-curated.mjs (report)
 *   node frontend/scripts/push-credit-m4-curated.mjs                 (writes)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(frontendRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^"|"$/g, "");
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const dryRun = process.env.PATCH_DRY_RUN === "1";
if (!url || !token) {
  console.error("Missing KV_REST_API_URL / KV_REST_API_TOKEN.");
  process.exit(1);
}
const redis = new Redis({ url, token });

const curated = (value) => ({
  value,
  dataSource: "demo",
  sourceLabel: "Curated",
  updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
});

/**
 * slug -> { lending?, leveragedYield?, fixedIncome? } curated patches.
 * Rate-model params are the flagship market's governance-set interest-rate
 * strategy (docs), labelled per market so the chart is honest about scope.
 */
const CURATED = {
  aave: {
    lending: {
      rateModel: {
        optimalUsagePct: 92,
        baseRatePct: 0,
        slope1Pct: 5.5,
        slope2Pct: 40,
        reserveFactorPct: 10,
        marketLabel: "USDC, Ethereum core",
      },
      eModeCategories: ["ETH correlated", "Stablecoins", "wstETH/ETH", "weETH/ETH"],
      healthFactorNote:
        "Most borrow value sits above 1.5 health factor; sub-1.1 positions are a small tail routinely cleared by keepers.",
    },
  },
  compound: {
    lending: {
      rateModel: {
        optimalUsagePct: 93,
        baseRatePct: 1.5,
        slope1Pct: 3.3,
        slope2Pct: 400,
        reserveFactorPct: 10,
        marketLabel: "USDC Comet, Ethereum",
      },
    },
  },
  morpho: {
    lending: {
      rateModel: {
        optimalUsagePct: 90,
        baseRatePct: 0,
        slope1Pct: 4,
        slope2Pct: 300,
        reserveFactorPct: 0,
        marketLabel: "AdaptiveCurveIRM, typical market",
      },
    },
  },
  spark: {
    lending: {
      rateModel: {
        optimalUsagePct: 95,
        baseRatePct: 0,
        slope1Pct: 4,
        slope2Pct: 20,
        reserveFactorPct: 10,
        marketLabel: "DAI, SparkLend Ethereum",
      },
    },
  },
  venus: {
    lending: {
      oracles: ["Chainlink", "RedStone", "Binance Oracle"],
      collateralAssets: ["BNB", "BTCB", "ETH", "USDT", "USDC"],
      loanAssets: ["USDT", "USDC", "BNB", "BTCB", "ETH"],
      rateModel: {
        optimalUsagePct: 80,
        baseRatePct: 0,
        slope1Pct: 6.75,
        slope2Pct: 250,
        reserveFactorPct: 25,
        marketLabel: "USDT core pool, BNB Chain",
      },
    },
  },
  justlend: {
    lending: {
      oracles: ["WINkLink"],
      collateralAssets: ["TRX", "USDT", "USDD", "BTC", "ETH"],
      loanAssets: ["USDT", "TRX", "USDD"],
    },
  },
  maple: {
    lending: {
      oracles: ["Chainlink"],
      collateralAssets: ["BTC", "ETH", "SOL"],
      loanAssets: ["USDC", "USDT"],
      healthFactorNote:
        "Overcollateralized institutional loans; margin calls precede liquidation, so distribution data is not public.",
    },
  },
  fluid: {
    lending: {
      oracles: ["Chainlink", "Fluid internal"],
      collateralAssets: ["ETH", "wstETH", "WBTC", "USDC", "USDT"],
      loanAssets: ["USDC", "USDT", "ETH", "GHO"],
    },
    leveragedYield: {
      maxLeverageX: 20,
      supportedStrategies: ["wstETH/ETH looping", "Stable smart lending"],
      integratedProtocols: ["Lido", "Fluid"],
      borrowModel: "Smart collateral / smart debt on the Fluid liquidity layer",
      liquidationThresholdPct: curated(95),
    },
  },
  gearbox: {
    leveragedYield: {
      borrowApyPct: curated(6.5),
      liquidationThresholdPct: curated(94),
    },
  },
  "extra-finance": {
    leveragedYield: {
      borrowApyPct: curated(8),
      liquidationThresholdPct: curated(85),
    },
  },
  stella: {
    leveragedYield: {
      borrowApyPct: curated(0),
      liquidationThresholdPct: curated(90),
    },
  },
  pendle: {
    fixedIncome: {
      mechanism: "PT/YT split",
      underlyingYieldSource: "LSTs, LRTs, stablecoin yield (sUSDS, sUSDe), money markets",
    },
  },
  notional: {
    fixedIncome: {
      mechanism: "fCash (zero-coupon)",
      underlyingYieldSource: "Lending against fCash pools (USDC, ETH, DAI, wstETH)",
    },
  },
  spectra: {
    fixedIncome: {
      mechanism: "PT/YT split",
      underlyingYieldSource: "Interest-bearing tokens (stETH, sUSDS, Aave aTokens)",
    },
  },
  sense: {
    fixedIncome: {
      mechanism: "PT/YT split (Divider)",
      underlyingYieldSource: "Yield-bearing DeFi positions (wstETH, cUSDC era)",
    },
  },
};

let changed = 0;
const toWrite = {};
for (const [slug, patch] of Object.entries(CURATED)) {
  const field = `CATEGORY#Entity|PROTOCOL#${slug}`;
  const raw = await redis.hget(STORE_KEY, field);
  if (raw == null) {
    console.log(`SKIP (missing in store): ${field}`);
    continue;
  }
  const it = typeof raw === "string" ? JSON.parse(raw) : raw;
  const ctm = it.CreditTagMetrics && typeof it.CreditTagMetrics === "object" ? { ...it.CreditTagMetrics } : {};
  const applied = [];

  for (const [blockKey, fields] of Object.entries(patch)) {
    const block = ctm[blockKey] && typeof ctm[blockKey] === "object" ? { ...ctm[blockKey] } : {};
    for (const [k, v] of Object.entries(fields)) {
      const existing = block[k];
      const empty =
        existing == null ||
        (Array.isArray(existing) && existing.length === 0) ||
        (typeof existing === "object" && !Array.isArray(existing) && existing.value == null && !("optimalUsagePct" in existing));
      if (!empty) continue;
      block[k] = v;
      applied.push(`${blockKey}.${k}`);
    }
    ctm[blockKey] = block;
  }

  if (applied.length === 0) {
    console.log(`OK (already curated): ${slug}`);
    continue;
  }
  const patched = { ...it, CreditTagMetrics: ctm };
  patched.UpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  toWrite[field] = JSON.stringify(patched);
  changed += 1;
  console.log(`CURATE ${slug}: ${applied.join(", ")}`);
}

if (changed === 0) {
  console.log("Nothing to write.");
} else if (dryRun) {
  console.log(`\n[dry-run] would HSET ${changed} key(s). No write performed.`);
} else {
  await redis.hset(STORE_KEY, toWrite);
  console.log(`\nWrote ${changed} curated item(s) into "${STORE_KEY}".`);
}
