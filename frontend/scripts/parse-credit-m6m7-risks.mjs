#!/usr/bin/env node
/**
 * parse-credit-m6m7-risks.mjs — parse the M6/M7 source dataset
 * (~/Downloads/CanHav Credit Sector  Asset Coverage and Risk Dataset.md) into
 * frontend/scripts/data/credit-m6m7-dataset.json.
 *
 * The WHOLE file is parsed so the M6 (asset coverage) and M7 (risks) windows
 * reuse the sidecar without re-parsing. The M5 window consumes only
 * `entities[slug].TypedRisks` (pushed to KV by push-credit-m5-research.mjs)
 * plus the project-level risk category distribution (used as a parser
 * fidelity gate and by lib/networks/riskScore.ts's 4/3/2/1 weights).
 *
 * Fidelity gate: per-entity typed-risk counts and severity-weighted sums per
 * category are recomputed and MUST match the dataset's own "Risk category
 * distribution" table exactly (weights: critical 4, high 3, medium 2, low 1).
 * Hard-fails otherwise. Also asserts 204 risks total and zero em dashes.
 *
 * Usage: node scripts/parse-credit-m6m7-risks.mjs [path-to-md]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC =
  process.argv[2] ??
  join(
    process.env.HOME ?? "",
    "Downloads",
    "CanHav Credit Sector  Asset Coverage and Risk Dataset.md",
  );
const OUT = join(__dirname, "data", "credit-m6m7-dataset.json");

const WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };
const CATEGORIES = ["Market", "Technological", "Counterparty", "Governance", "Regulatory"];
const EXPECTED_TOTAL_RISKS = 204;

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const firstLink = (t) => {
  LINK_RE.lastIndex = 0;
  const m = LINK_RE.exec(t ?? "");
  return m ? { label: m[1].trim(), url: m[2].trim() } : null;
};
const stripLinks = (t) => (t ?? "").replace(LINK_RE, "$1").trim();
const isNa = (t) => {
  const s = stripLinks(t).toLowerCase();
  return s === "" || s === "n.a." || s === "n.a";
};

function parseTable(lines) {
  const rows = [];
  let header = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    if (/^\|[\s:|-]+\|$/.test(t)) continue;
    const cells = t.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (!header) header = cells;
    else rows.push(cells);
  }
  return { header: header ?? [], rows };
}

function paragraphsOf(lines) {
  return lines
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("|") && p !== "---");
}

const prose = (lines) =>
  paragraphsOf(lines)
    .map((p) => p.replace(/\*\*([^*]+)\*\*/g, "$1"))
    .join("\n\n");

/* ------------------------- split into H1 blocks ------------------------ */

const raw = readFileSync(SRC, "utf8");
const lines = raw.split("\n");

const blocks = [];
let cur = null;
for (const line of lines) {
  const h1 = line.match(/^# (.+)$/);
  if (h1) {
    cur = { title: h1[1].trim(), lines: [] };
    blocks.push(cur);
    continue;
  }
  if (cur) cur.lines.push(line);
}

const preamble = blocks[0];
const trailingTitles = new Set([
  "implementation notes for m6 and m7",
  "deferred items and gaps found during this research",
  "provenance",
]);
const entityBlocks = blocks
  .slice(1)
  .filter((b) => !trailingTitles.has(b.title.toLowerCase()));
const trailing = blocks
  .slice(1)
  .filter((b) => trailingTitles.has(b.title.toLowerCase()));

/* ------------------------- preamble tables ----------------------------- */

function sectionLines(blockLines, headingPrefix) {
  const out = [];
  let inside = false;
  for (const line of blockLines) {
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      inside = h2[1].trim().toLowerCase().startsWith(headingPrefix);
      continue;
    }
    if (inside) out.push(line);
  }
  return out;
}

const coverageMatrix = parseTable(sectionLines(preamble.lines, "coverage matrix"));
const distributionTable = parseTable(sectionLines(preamble.lines, "risk category distribution"));
const sharedRiskDrivers = parseTable(sectionLines(preamble.lines, "shared risk drivers"));

/* "4 (14)" -> {n:4, wt:14}; "0" -> {n:0, wt:0} */
function parseDistCell(cell) {
  const m = cell.match(/^(\d+)\s*\((\d+)\)$/);
  if (m) return { n: Number(m[1]), wt: Number(m[2]) };
  const z = cell.match(/^(\d+)$/);
  if (z) return { n: Number(z[1]), wt: 0 };
  throw new Error(`Bad distribution cell: "${cell}"`);
}

/* ------------------------- entity parsing ------------------------------ */

function splitH2(blockLines) {
  const sections = {};
  let name = null;
  for (const line of blockLines) {
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      name = h2[1].trim().toLowerCase();
      sections[name] = [];
      continue;
    }
    if (name) sections[name].push(line);
    else (sections.__head ??= []).push(line);
  }
  return sections;
}

function parseTypedRisks(sectionLinesArr, slug) {
  const { header, rows } = parseTable(sectionLinesArr);
  if (header.length < 12) {
    throw new Error(`${slug}: typed risks table has ${header.length} columns`);
  }
  const risks = rows.map((cells) => {
    const [risk, category, severity, likelihood, impact, asOf, description, mitigation, monitoring, assets, partners, source] = cells;
    const sev = stripLinks(severity).toLowerCase();
    if (!(sev in WEIGHTS)) throw new Error(`${slug}: bad severity "${sev}"`);
    const cat = stripLinks(category);
    if (!CATEGORIES.includes(cat)) throw new Error(`${slug}: bad category "${cat}"`);
    const link = firstLink(source ?? "");
    const list = (cell) =>
      isNa(cell) ? [] : stripLinks(cell).split(/,\s*/).map((s) => s.trim()).filter(Boolean);
    const opt = (cell) => (isNa(cell) ? null : stripLinks(cell));
    return {
      name: stripLinks(risk),
      category: cat,
      severity: sev,
      description: stripLinks(description ?? ""),
      likelihood: opt(likelihood),
      impact: opt(impact),
      asOf: opt(asOf),
      mitigation: opt(mitigation),
      monitoringSignal: opt(monitoring),
      linkedAssets: list(assets),
      linkedPartners: list(partners),
      sourceLabel: link?.label ?? null,
      sourceUrl: link?.url ?? null,
    };
  });
  // Trailing italic footnote ("*Risk-linked assets with no row...*")
  const note = paragraphsOf(sectionLinesArr)
    .filter((p) => p.startsWith("*") && !p.startsWith("**"))
    .map((p) => p.replace(/^\*|\*$/g, "").trim())
    .join("\n\n") || null;
  return { risks, note };
}

const entities = {};
for (const block of entityBlocks) {
  const head = block.lines.join("\n");
  const slugMatch = head.match(/\*\*Slug:\*\*\s*`([a-z0-9-]+)`/);
  if (!slugMatch) throw new Error(`No **Slug:** line under "# ${block.title}"`);
  const slug = slugMatch[1];
  const tagMatch = head.match(/\*\*Tag:\*\*\s*([A-Za-z ]+)/);
  const sections = splitH2(block.lines);

  const grab = (prefix) => {
    const key = Object.keys(sections).find((k) => k.startsWith(prefix));
    return key ? sections[key] : null;
  };

  const typed = parseTypedRisks(grab("typed risks") ?? [], slug);
  entities[slug] = {
    name: block.title,
    tag: tagMatch ? tagMatch[1].trim() : null,
    AssetStrategy: prose(grab("asset strategy") ?? []),
    Assets: parseTable(grab("assets") ?? []),
    Oracles: parseTable(grab("oracle providers") ?? []),
    FlaggedAssets: parseTable(grab("flagged assets") ?? []),
    Adapters: grab("adapters") ? parseTable(grab("adapters")) : null,
    TypedRisks: typed.risks,
    TypedRisksNote: typed.note,
    Incidents: parseTable(grab("incident history") ?? []),
    RiskPosture: prose(grab("risk posture") ?? []),
  };
}

/* ------------------------- fidelity gate ------------------------------- */

const nameToSlug = Object.fromEntries(
  Object.entries(entities).map(([slug, e]) => [e.name, slug]),
);

let totalRisks = 0;
const failures = [];
for (const row of distributionTable.rows) {
  const [name, , ...catCells] = row;
  const slug = nameToSlug[name];
  if (!slug) throw new Error(`Distribution row for unknown entity "${name}"`);
  const risks = entities[slug].TypedRisks;
  totalRisks += risks.length;
  CATEGORIES.forEach((cat, i) => {
    const want = parseDistCell(catCells[i]);
    const got = risks.filter((r) => r.category === cat);
    const gotWt = got.reduce((s, r) => s + WEIGHTS[r.severity], 0);
    if (got.length !== want.n || gotWt !== want.wt) {
      failures.push(
        `${slug} ${cat}: parsed n=${got.length} wt=${gotWt}, table says n=${want.n} wt=${want.wt}`,
      );
    }
  });
}
if (failures.length) {
  throw new Error(`Distribution-table mismatch:\n  ${failures.join("\n  ")}`);
}
if (totalRisks !== EXPECTED_TOTAL_RISKS) {
  throw new Error(`Expected ${EXPECTED_TOTAL_RISKS} risks, parsed ${totalRisks}`);
}

const EM_DASH = "—";
function sweep(value, path) {
  if (typeof value === "string" && value.includes(EM_DASH)) {
    throw new Error(`Em dash at ${path}: ${value.slice(0, 100)}`);
  }
  if (Array.isArray(value)) value.forEach((v, i) => sweep(v, `${path}[${i}]`));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) sweep(v, `${path}.${k}`);
  }
}
sweep(entities, "entities");

/* ------------------------- write --------------------------------------- */

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      capturedAt: "2026-07-26",
      source: "CanHav Credit Sector Asset Coverage and Risk Dataset.md",
      weights: WEIGHTS,
      coverageMatrix,
      riskCategoryDistribution: distributionTable,
      sharedRiskDrivers,
      entities,
      notes: Object.fromEntries(trailing.map((b) => [b.title, prose(b.lines)])),
    },
    null,
    2,
  ) + "\n",
);

console.log(`Parsed ${Object.keys(entities).length} entities, ${totalRisks} typed risks -> ${OUT}`);
console.log("Distribution-table fidelity gate: PASS (n and weighted sums match for all 14 x 5 cells)");
for (const [slug, e] of Object.entries(entities)) {
  console.log(
    slug.padEnd(14),
    `risks ${String(e.TypedRisks.length).padStart(2)}  incidents ${String(e.Incidents.rows.length).padStart(2)}  assets ${String(e.Assets.rows.length).padStart(2)}  flagged ${String(e.FlaggedAssets.rows.length).padStart(2)}  oracles ${String(e.Oracles.rows.length).padStart(2)}`,
  );
}
