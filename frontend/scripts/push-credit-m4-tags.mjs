#!/usr/bin/env node
/**
 * M4.1 (CAN-70): surgical Upstash Tags patch so every Credit-primary lender
 * renders its Lending metrics sub-tab.
 *
 *   - aave / justlend / venus / maple / kamino  -> Tags ["Lending"]
 *   - fluid -> Tags ["Lending", "Leveraged Yield"]  (lending protocol with a
 *     leverage product; both DeFi Llama mappings exist)
 *
 * kamino is included even though CAN-70's title omits it: it already carries
 * CreditTagMetrics.lending from the chain-native cron overlay, but with empty
 * Tags the sub-tab can never render.
 *
 * The RWA/Stablecoin-primary secondaries (centrifuge, clearpool, goldfinch,
 * sky) and usd-ai are DEFERRED to the CAN-48 tagging decision; pass
 * --secondaries to include them once that lands.
 *
 * Reads the live item, patches ONLY Tags, writes back (push-list-fixes.mjs
 * pattern).
 *
 * Usage:
 *   node frontend/scripts/push-credit-m4-tags.mjs                 (writes)
 *   PATCH_DRY_RUN=1 node frontend/scripts/push-credit-m4-tags.mjs (report)
 *   node frontend/scripts/push-credit-m4-tags.mjs --secondaries   (CAN-48)
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
const includeSecondaries = process.argv.includes("--secondaries");
if (!url || !token) {
  console.error("Missing KV_REST_API_URL / KV_REST_API_TOKEN.");
  process.exit(1);
}
const redis = new Redis({ url, token });

/** slug -> desired Tags. Existing non-Credit tags are preserved. */
const TAGS = {
  aave: ["Lending"],
  justlend: ["Lending"],
  venus: ["Lending"],
  maple: ["Lending"],
  kamino: ["Lending"],
  fluid: ["Lending", "Leveraged Yield"],
  ...(includeSecondaries
    ? {
        centrifuge: ["Lending"],
        clearpool: ["Lending"],
        goldfinch: ["Lending"],
        sky: ["Lending"],
      }
    : {}),
};

function sameSet(a, b) {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((t) => s.has(t));
}

let changed = 0;
const toWrite = {};
for (const [slug, want] of Object.entries(TAGS)) {
  const field = `CATEGORY#Entity|PROTOCOL#${slug}`;
  const raw = await redis.hget(STORE_KEY, field);
  if (raw == null) {
    console.log(`SKIP (missing in store): ${field}`);
    continue;
  }
  const it = typeof raw === "string" ? JSON.parse(raw) : raw;
  const current = Array.isArray(it.Tags) ? it.Tags : [];
  // Pure union: never drop an existing tag (live KV is authoritative and may
  // carry tags the local stores lack, e.g. maple's "Fixed Income").
  const next = [...want, ...current.filter((t) => !want.includes(t))];
  if (sameSet(current, next)) {
    console.log(`OK (already tagged): ${slug} ${JSON.stringify(current)}`);
    continue;
  }
  const patched = { ...it, Tags: next };
  patched.UpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  toWrite[field] = JSON.stringify(patched);
  changed += 1;
  console.log(`PATCH: ${slug}.Tags ${JSON.stringify(current)} -> ${JSON.stringify(next)}`);
}

if (changed === 0) {
  console.log("Nothing to write.");
} else if (dryRun) {
  console.log(`\n[dry-run] would HSET ${changed} key(s). No write performed.`);
} else {
  await redis.hset(STORE_KEY, toWrite);
  console.log(`\nWrote ${changed} patched item(s) into "${STORE_KEY}".`);
}
