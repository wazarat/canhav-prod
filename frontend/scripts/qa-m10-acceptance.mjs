#!/usr/bin/env node
/**
 * M10 (CAN-80) acceptance sweep — READ-ONLY.
 *
 * Fetches the rendered prod Credit surface (all Credit-affiliated entities,
 * every visible tab) and records, per entity × tab cell: pass / fail /
 * not-applicable(gate), plus the global sweeps:
 *   1. em dashes in rendered visible text (prose vs standalone placeholder)
 *   2. false zeros near high-risk metric labels
 *   3. source/freshness marker counts (Pending / Tier 2 / as-of labels)
 *
 * No KV access, no writes anywhere except the local --out directory.
 * Usage: node scripts/qa-m10-acceptance.mjs --out /path/to/outdir [--base https://www.canhav.co]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const BASE = flag("base", "https://www.canhav.co");
const OUT = flag("out", path.join(__dirname, "..", ".qa-m10"));
const CONCURRENCY = Number(flag("concurrency", "5"));
fs.mkdirSync(path.join(OUT, "html"), { recursive: true });

/* ------------------------------ entity set ------------------------------- */

const bootstrap = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "bootstrap-store.json"), "utf8"),
);
const creditEntities = Object.entries(bootstrap.items)
  .filter(
    ([, r]) =>
      r.Category === "Entity" &&
      (r.Sector === "Credit" || (r.SecondarySectors || []).includes("Credit")),
  )
  .map(([key, r]) => ({
    key,
    slug: r.Slug,
    name: r.Name,
    primary: r.Sector === "Credit",
  }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

// The CAN-80 matrix scope: the 22 entities that made up the Credit surface at
// project start (pre-M8 expansion). The other 18 (15 new + 3 migrated) are
// swept for data integrity but reported in a supplementary table.
const ORIGINAL_22 = [
  "aave", "centrifuge", "clearpool", "compound", "extra-finance", "fluid",
  "gearbox", "goldfinch", "justlend", "kamino", "maple", "morpho", "notional",
  "pendle", "radiant", "sense", "sky", "spark", "spectra", "stella", "usd-ai",
  "venus",
];

const TABS = [
  "overview", "metrics", "research", "asset-coverage", "risks", "competitors",
  "partnerships", "agent-skills",
];
const TAB_LABELS = {
  overview: "Overview",
  metrics: "Metrics",
  research: "Research",
  "asset-coverage": "Asset coverage",
  risks: "Risks",
  competitors: "Competitors",
  partnerships: "Partnerships",
  "agent-skills": "AI agent skills",
};
// A stable rendered marker per tab (SectionHeading titles / tab-specific UI).
const TAB_MARKERS = {
  overview: ["At a glance", "About"],
  metrics: ["Credit rollup", "rollup"],
  research: ["Key facts", "Sources"],
  "asset-coverage": ["Asset coverage"],
  risks: ["Risk profile"],
  competitors: ["Competitors"],
  partnerships: ["Partnerships"],
  "agent-skills": ["AI Agent Skill"],
};

/* ------------------------------- fetching -------------------------------- */

async function fetchPage(url, attempts = 3) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(300_000),
        headers: { "user-agent": "canhav-qa-m10 (read-only acceptance sweep)" },
      });
      const body = await res.text();
      if (res.status >= 500 && i < attempts) {
        await new Promise((r) => setTimeout(r, 3000 * i));
        continue; // transient SSR 500s are retryable (documented)
      }
      return { status: res.status, body };
    } catch (err) {
      if (i === attempts) return { status: 0, body: "", error: String(err) };
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
  return { status: 0, body: "" };
}

async function pool(items, worker, size) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

/* ----------------------------- text analysis ----------------------------- */

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;|&#8212;|&#x2014;/gi, "—")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
}

function emDashFindings(text) {
  const prose = [];
  let standalone = 0;
  let idx = text.indexOf("—");
  while (idx !== -1) {
    const before = text[idx - 1] ?? " ";
    const after = text[idx + 1] ?? " ";
    if (before === " " && after === " ") standalone += 1;
    else prose.push(text.slice(Math.max(0, idx - 60), idx + 60).trim());
    idx = text.indexOf("—", idx + 1);
  }
  return { standalone, prose };
}

const ZERO_LABELS = [
  "market cap", "volume", "tvl", "total value locked", "bad debt",
  "liquidation", "active positions", "total borrowed", "total supplied",
];
function falseZeroFindings(text) {
  const findings = [];
  const lower = text.toLowerCase();
  for (const label of ZERO_LABELS) {
    let from = 0;
    while (true) {
      const i = lower.indexOf(label, from);
      if (i === -1) break;
      const windowText = text.slice(i, i + label.length + 60);
      const m = windowText.match(/\$0(?:\.0+)?(?![\d.,BMK%])|(?<![\d.,$])\b0\b(?!\.\d|[%xd])/);
      if (m) findings.push(windowText.trim());
      from = i + label.length;
    }
  }
  return findings;
}

const FRESHNESS_MARKERS = [
  "Pending live refresh", "Tier 2", "As of", "as of", "Updated", "Synced",
  "· live", "CoinGecko", "DefiLlama", "DeFi Llama", "Alchemy",
];
function freshnessCounts(text) {
  const counts = {};
  for (const marker of FRESHNESS_MARKERS) {
    counts[marker] = text.split(marker).length - 1;
  }
  return counts;
}

/* --------------------------------- main ---------------------------------- */

function availableTabs(html, slug) {
  const found = new Set(["overview"]);
  const re = new RegExp(`/networks/${slug}\\?tab=([a-z-]+)`, "g");
  let m;
  while ((m = re.exec(html)) !== null) found.add(m[1]);
  return TABS.filter((t) => found.has(t));
}

function activeTab(html) {
  const m = html.match(/aria-selected="true"[^>]*>([^<]+)</);
  if (!m) return null;
  const label = m[1].trim();
  return Object.entries(TAB_LABELS).find(([, l]) => l === label)?.[0] ?? label;
}

const results = { fetchedAt: new Date().toISOString(), base: BASE, entities: {} };

console.log(`Sweeping ${creditEntities.length} Credit entities against ${BASE}`);

// Pass 1: overview pages (tab discovery + overview cell).
await pool(
  creditEntities,
  async (entity) => {
    const url = `${BASE}/networks/${entity.slug}`;
    const { status, body, error } = await fetchPage(url);
    fs.writeFileSync(path.join(OUT, "html", `${entity.slug}--overview.html`), body);
    const tabs = status === 200 ? availableTabs(body, entity.slug) : [];
    results.entities[entity.slug] = {
      name: entity.name,
      primary: entity.primary,
      inMatrix22: ORIGINAL_22.includes(entity.slug),
      overviewStatus: status,
      error: error ?? null,
      visibleTabs: tabs,
      cells: {},
    };
    console.log(`  ${entity.slug}: ${status} tabs=[${tabs.join(",")}]`);
  },
  CONCURRENCY,
);

// Pass 2: every visible non-overview tab.
const tabJobs = [];
for (const entity of creditEntities) {
  const rec = results.entities[entity.slug];
  for (const tab of TABS) {
    if (tab === "overview" || rec.visibleTabs.includes(tab)) {
      tabJobs.push({ slug: entity.slug, tab });
    }
  }
}
await pool(
  tabJobs,
  async ({ slug, tab }) => {
    const rec = results.entities[slug];
    const file = path.join(OUT, "html", `${slug}--${tab}.html`);
    let status;
    let body;
    if (tab === "overview") {
      body = fs.readFileSync(file, "utf8");
      status = rec.overviewStatus;
    } else {
      ({ status, body } = await fetchPage(`${BASE}/networks/${slug}?tab=${tab}`));
      fs.writeFileSync(file, body);
    }
    const text = visibleText(body);
    const active = activeTab(body);
    const markers = TAB_MARKERS[tab].filter((m) => body.includes(m));
    rec.cells[tab] = {
      status,
      activeTab: active,
      markerHit: markers.length > 0,
      emDash: emDashFindings(text),
      falseZeros: falseZeroFindings(text),
      freshness: freshnessCounts(text),
      textChars: text.length,
      htmlBytes: body.length,
    };
    console.log(
      `  ${slug} ?tab=${tab}: ${status} active=${active} marker=${markers.length > 0} ` +
        `emdash(prose=${rec.cells[tab].emDash.prose.length}, standalone=${rec.cells[tab].emDash.standalone}) ` +
        `zeros=${rec.cells[tab].falseZeros.length}`,
    );
  },
  CONCURRENCY,
);

fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));

/* -------------------------------- summary -------------------------------- */

let pass = 0;
let fail = 0;
let na = 0;
const failures = [];
for (const entity of creditEntities) {
  const rec = results.entities[entity.slug];
  if (!rec.inMatrix22) continue;
  for (const tab of TABS) {
    if (!rec.visibleTabs.includes(tab)) {
      na += 1;
      continue;
    }
    const cell = rec.cells[tab];
    const ok = cell && cell.status === 200 && cell.activeTab === tab && cell.markerHit;
    if (ok) pass += 1;
    else {
      fail += 1;
      failures.push(`${entity.slug}/${tab}: status=${cell?.status} active=${cell?.activeTab} marker=${cell?.markerHit}`);
    }
  }
}
console.log(`\n22-entity matrix: pass=${pass} fail=${fail} n/a(gated)=${na} of 176`);
if (failures.length) console.log(failures.join("\n"));

const proseTotal = Object.values(results.entities)
  .flatMap((r) => Object.values(r.cells))
  .reduce((n, c) => n + c.emDash.prose.length, 0);
const zeroTotal = Object.values(results.entities)
  .flatMap((r) => Object.values(r.cells))
  .reduce((n, c) => n + c.falseZeros.length, 0);
console.log(`All-40 sweep: prose-em-dash findings=${proseTotal}, false-zero candidates=${zeroTotal}`);
console.log(`Results: ${path.join(OUT, "results.json")}`);
