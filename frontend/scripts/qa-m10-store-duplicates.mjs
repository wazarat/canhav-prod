#!/usr/bin/env node
/**
 * M10 (CAN-80) sweep 4 — duplicate entity check. READ-ONLY (HKEYS + HGET only).
 *
 * Verifies: every store field key parses as CATEGORY#<Category>|PROTOCOL#<slug>,
 * exactly one record per (Category, slug), no near-duplicate Entity slugs/names,
 * no orphan product records pointing at a missing parent entity, and reports
 * live-vs-bootstrap key drift.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

function loadEnvLocal() {
  const envPath = path.join(here, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

loadEnvLocal();
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Missing Upstash REST credentials.");
  process.exit(1);
}
const redis = new Redis({ url, token });

const keys = await redis.hkeys(STORE_KEY);
console.log(`Live store fields: ${keys.length}`);

const KEY_RE = /^CATEGORY#([A-Za-z]+)\|PROTOCOL#([a-z0-9-]+)$/;
const malformed = keys.filter((k) => !KEY_RE.test(k));
const parsed = keys
  .map((k) => k.match(KEY_RE))
  .filter(Boolean)
  .map((m) => ({ key: m[0], category: m[1], slug: m[2] }));

// Exactly one record per (Category, slug): hash fields are unique by
// definition, so the real risk is the SAME protocol under near-duplicate slugs.
const byCat = {};
for (const p of parsed) (byCat[p.category] ??= []).push(p.slug);
console.log(
  "By category:",
  Object.entries(byCat)
    .map(([c, s]) => `${c}=${s.length}`)
    .join(" "),
);

const entitySlugs = (byCat.Entity ?? []).sort();
const nearDupes = [];
for (let i = 0; i < entitySlugs.length; i += 1) {
  for (let j = i + 1; j < entitySlugs.length; j += 1) {
    const a = entitySlugs[i];
    const b = entitySlugs[j];
    const stripped = (s) => s.replace(/-(finance|protocol|network|dao|labs)$/, "");
    if (a !== b && (stripped(a) === stripped(b) || b === `${a}-v2` || b === `${a}-v3`)) {
      nearDupes.push([a, b]);
    }
  }
}

// Names: fetch every Entity record (batched), compare normalised names, and
// collect entity slugs for the orphan check.
const entityKeys = parsed.filter((p) => p.category === "Entity").map((p) => p.key);
const names = new Map();
for (let i = 0; i < entityKeys.length; i += 25) {
  const batch = entityKeys.slice(i, i + 25);
  const vals = await Promise.all(batch.map((k) => redis.hget(STORE_KEY, k)));
  vals.forEach((raw, idx) => {
    const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (rec?.Name) names.set(batch[idx], rec.Name.trim().toLowerCase());
  });
}
const nameIndex = new Map();
const nameDupes = [];
for (const [key, name] of names) {
  if (nameIndex.has(name)) nameDupes.push([nameIndex.get(name), key, name]);
  else nameIndex.set(name, key);
}

// Orphan products: product records whose EntitySlug names a missing entity.
const productKeys = parsed.filter((p) => p.category !== "Entity" && p.category !== "Receipt");
const entitySet = new Set(entitySlugs);
const orphans = [];
for (let i = 0; i < productKeys.length; i += 25) {
  const batch = productKeys.slice(i, i + 25);
  const vals = await Promise.all(batch.map((p) => redis.hget(STORE_KEY, p.key)));
  vals.forEach((raw, idx) => {
    const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
    const parent = rec?.EntitySlug;
    if (parent && !entitySet.has(parent)) orphans.push(`${batch[idx].key} -> ${parent}`);
  });
}

// Live vs bootstrap drift (informational).
const bootstrap = JSON.parse(
  fs.readFileSync(path.join(here, "..", "data", "bootstrap-store.json"), "utf-8"),
);
const bootKeys = new Set(Object.keys(bootstrap.items));
const liveSet = new Set(keys);
const liveOnly = keys.filter((k) => !bootKeys.has(k));
const bootOnly = [...bootKeys].filter((k) => !liveSet.has(k));

console.log(`\nMalformed keys: ${malformed.length}`, malformed.slice(0, 10));
console.log(`Near-duplicate entity slugs: ${nearDupes.length}`, nearDupes);
console.log(`Duplicate entity names: ${nameDupes.length}`, nameDupes);
console.log(`Orphan product records (missing parent entity): ${orphans.length}`, orphans.slice(0, 20));
console.log(`Live-only keys (not in bootstrap): ${liveOnly.length}`, liveOnly.slice(0, 20));
console.log(`Bootstrap-only keys (not live): ${bootOnly.length}`, bootOnly.slice(0, 20));

const ok = malformed.length === 0 && nearDupes.length === 0 && nameDupes.length === 0 && orphans.length === 0;
console.log(`\nSweep 4 ${ok ? "PASS" : "REVIEW NEEDED"}`);
