#!/usr/bin/env node
/**
 * Credit M9 partnership store sync (Credits completion CAN-81 / M9.4).
 *
 * Writes a curated human-readable subset of the M9 partnership dataset into
 * the legacy `Partnerships` field for the 14 covered entities: the four
 * minimum categories (oracles, chain deployments, security auditors, major
 * integrations), ~6-10 rows per entity, `slug` set for on-platform partners
 * (the first store rows ever to carry it). REPLACE-per-field for the 14 (the
 * M5 precedent): the dataset supersedes the sparse legacy rows on covered
 * entities. Rendering does NOT depend on this — the explorer reads the
 * committed generated model; this field exists for non-explorer surfaces and
 * M10 agent-skills parity.
 *
 * NOTE (user-acknowledged 2026-07-27): `npm run build` seed-merges bootstrap
 * fields that are EMPTY in live KV, so after --local the ~12 covered entities
 * with no live Partnerships rows go live on the next build even before the
 * live push runs. Every row is sourced.
 *
 * Modes:
 *   node scripts/push-credit-m9-partnerships.mjs --local
 *   PATCH_DRY_RUN=1 node scripts/push-credit-m9-partnerships.mjs
 *   node scripts/push-credit-m9-partnerships.mjs            # live (user-run)
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const sidecar = JSON.parse(
  readFileSync(path.join(here, "data", "credit-m9-partnership-sidecar.json"), "utf-8"),
);
const SLUGS = sidecar.meta.subjects;
if (SLUGS.length !== 14) {
  console.error(`Expected 14 subjects, sidecar has ${SLUGS.length}.`);
  process.exit(1);
}

const EM_DASH = "—";
const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source on file";
  }
};
const usdLabel = (usd) => {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(usd % 1e9 === 0 ? 0 : 1)}b`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(usd % 1e6 === 0 ? 0 : 1)}m`;
  return `$${Math.round(usd / 1e3)}k`;
};

const nodes = sidecar.nodes;

/** Build the curated legacy rows for one subject. */
function buildRows(slug) {
  const incident = sidecar.edges.filter((e) => e.a === slug || e.b === slug);
  const partnerOf = (e) => (e.a === slug ? e.b : e.a);
  const rows = [];
  const usedNames = new Set();

  const pushRow = (name, date, amountLabel, description, partnerSlug) => {
    if (usedNames.has(name)) return;
    usedNames.add(name);
    rows.push({ name, date: date ?? "", amountLabel: amountLabel ?? null, description, slug: partnerSlug ?? null });
  };

  // 1. Oracle providers (cap 4, active first).
  const oracles = incident
    .filter((e) => e.category === "oracle")
    .sort((x, y) => (x.status === "active" ? -1 : 1) - (y.status === "active" ? -1 : 1) || y.weight - x.weight)
    .slice(0, 4);
  for (const e of oracles) {
    const pid = partnerOf(e);
    const node = nodes[pid];
    const row = e.rows[0];
    pushRow(
      `${node.name} (oracle)`,
      row.startDate,
      null,
      `${row.description} Source: ${domainOf(row.sourceUrl)}.`,
      node.slug && node.slug !== slug ? node.slug : null,
    );
  }

  // 2. Chain deployments, one summary row.
  const chains = sidecar.chainStrips[slug] ?? [];
  if (chains.length > 0) {
    const names = chains.map((c) => c.chain);
    const shown = names.slice(0, 12).join(", ");
    const more = names.length > 12 ? ` and ${names.length - 12} more` : "";
    pushRow(
      `Chain deployments (${names.length})`,
      "",
      null,
      `Deployed on ${shown}${more}. Source: ${domainOf(chains[0].sourceUrl)}.`,
      null,
    );
  }

  // 3. Security auditors, one summary row.
  const auditors = incident.filter((e) => e.category === "security_audit");
  if (auditors.length > 0) {
    const names = [...new Set(auditors.map((e) => nodes[partnerOf(e)].name))];
    const shown = names.slice(0, 8).join(", ");
    const more = names.length > 8 ? ` and ${names.length - 8} more` : "";
    pushRow(
      `Security auditors (${names.length})`,
      "",
      null,
      `Audited or reviewed by ${shown}${more}. Source: ${domainOf(auditors[0].rows[0].sourceUrl)}.`,
      null,
    );
  }

  // 4. Major integrations: top 4 remaining edges — active before deprecated,
  // then by weight, stated dollar figures as the tiebreak.
  const majors = incident
    .filter((e) => e.category !== "oracle" && e.category !== "security_audit")
    .sort(
      (x, y) =>
        (x.status === "deprecated" ? 1 : 0) - (y.status === "deprecated" ? 1 : 0) ||
        y.weight - x.weight ||
        (y.usdFigure ?? 0) - (x.usdFigure ?? 0),
    )
    .slice(0, 4);
  for (const e of majors) {
    const pid = partnerOf(e);
    const node = nodes[pid];
    const row = e.rows[0];
    pushRow(
      node.name,
      row.startDate,
      e.usdFigure ? usdLabel(e.usdFigure) : null,
      `${row.description} Source: ${domainOf(row.sourceUrl)}.`,
      node.slug && node.slug !== slug ? node.slug : null,
    );
  }

  return rows;
}

const ROWS_BY_SLUG = {};
for (const slug of SLUGS) {
  const rows = buildRows(slug);
  if (rows.length < 4 || rows.length > 12) {
    console.error(`${slug}: ${rows.length} rows outside the 4-12 envelope — refusing to push.`);
    process.exit(1);
  }
  for (const row of rows) {
    for (const field of ["name", "description"]) {
      if (String(row[field]).includes(EM_DASH)) {
        console.error(`${slug}: em dash in ${field} of "${row.name}" — refusing to push.`);
        process.exit(1);
      }
    }
    if (!/Source: [a-z0-9.-]+\.$/i.test(row.description)) {
      console.error(`${slug}: description missing source suffix on "${row.name}".`);
      process.exit(1);
    }
  }
  ROWS_BY_SLUG[slug] = rows;
}

/** Mutates record; returns true when the field changed. */
function applyRows(record, slug) {
  const next = ROWS_BY_SLUG[slug];
  const current = JSON.stringify(record.Partnerships ?? []);
  if (current === JSON.stringify(next)) return false;
  record.Partnerships = next;
  return true;
}

function loadEnvLocal() {
  const envPath = path.join(frontendRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const eq = t.indexOf("=");
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

async function pushKv(dryRun) {
  loadEnvLocal();
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error("Missing Upstash REST credentials (KV_REST_API_URL + KV_REST_API_TOKEN).");
    process.exit(1);
  }
  const redis = new Redis({ url, token });
  const writes = {};
  for (const slug of SLUGS) {
    const key = `CATEGORY#Entity|PROTOCOL#${slug}`;
    const raw = await redis.hget(STORE_KEY, key);
    const record = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (!record) {
      console.error(`ABORT: ${slug} missing from live KV.`);
      process.exit(1);
    }
    const before = (record.Partnerships ?? []).length;
    if (applyRows(record, slug)) {
      record.UpdatedAt = new Date().toISOString();
      writes[key] = JSON.stringify(record);
      console.log(`${slug}: Partnerships ${before} -> ${ROWS_BY_SLUG[slug].length} row(s)`);
    } else {
      console.log(`${slug}: no changes`);
    }
  }
  const n = Object.keys(writes).length;
  if (n === 0) return console.log("Nothing to write.");
  if (dryRun) return console.log(`\n[dry-run] would HSET ${n} key(s). No write performed.`);
  await redis.hset(STORE_KEY, writes);
  console.log(`\nWrote ${n} patched item(s) into "${STORE_KEY}".`);
}

function patchLocalFile(filePath) {
  if (!existsSync(filePath)) return console.warn(`SKIP missing ${filePath}`);
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const items = data.items ?? data;
  let changed = 0;
  for (const slug of SLUGS) {
    const record = items[`CATEGORY#Entity|PROTOCOL#${slug}`];
    if (!record) {
      console.error(`ABORT: ${slug} missing locally.`);
      process.exit(1);
    }
    if (applyRows(record, slug)) {
      record.UpdatedAt = new Date().toISOString();
      changed++;
    }
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${path.relative(repoRoot, filePath)}: Partnerships replaced on ${changed} item(s)`);
}

const mode = process.argv[2];
if (mode === "--local") {
  patchLocalFile(path.join(frontendRoot, "data", "bootstrap-store.json"));
  patchLocalFile(path.join(repoRoot, "backend", "data", "store.json"));
} else {
  await pushKv(process.env.PATCH_DRY_RUN === "1");
}
