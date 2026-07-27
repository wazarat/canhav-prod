#!/usr/bin/env node
/**
 * Fetch-and-commit comparable metrics for the 32 tagged Credit entities
 * (Credits completion CAN-87 / M8.2 percentile bars) into
 * lib/networks/creditComparables.ts.
 *
 * Source: https://api.llama.fi/protocol/<slug> for every cohort member (the
 * dataset's own rule: "Cite the API, not the web page"). Multi-slug entities
 * are summed, matching LLAMA_PROTOCOL_SLUGS semantics. Audit counts come from
 * the local bootstrap store (incumbents) or the M8 dataset (new entities).
 *
 * Honesty rules (CAN-87):
 *  - utilizationPct is ONLY ever a protocol-reported figure. It is NEVER
 *    computed as borrowed/supplied (DefiLlama nets borrowed collateral out of
 *    supplied for dolomite, contango, origami-finance, euler and fira, which
 *    would produce >100%). No protocol-level source exists this pass, so it
 *    stays null everywhere and the bars render a placeholder.
 *  - No APY fields at all: DefiLlama's protocol endpoint does not expose
 *    per-market rates and no substitute covers all cohort members.
 *  - fira's borrowed figure is withheld (dataset data-quality flag).
 *
 *   node scripts/fetch-credit-comparables.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

const sidecar = JSON.parse(
  readFileSync(path.join(here, "data", "credit-m8-store-patch.json"), "utf-8"),
);
const dataset = JSON.parse(
  readFileSync(path.join(here, "data", "credit-competitors-m8.json"), "utf-8"),
);
const bootstrap = JSON.parse(
  readFileSync(path.join(frontendRoot, "data", "bootstrap-store.json"), "utf-8"),
);
const storeItems = bootstrap.items ?? bootstrap;

const TAGGED = Object.values(sidecar.tagCohorts).flat();
if (TAGGED.length !== 32) {
  console.error(`Expected 32 tagged slugs, found ${TAGGED.length}`);
  process.exit(1);
}

/** Llama protocol slug(s) per canhav slug — mirrors LLAMA_PROTOCOL_SLUGS for
 * the incumbents; new/migrated slugs from the M8 dataset. */
const LLAMA_SLUGS = {
  aave: ["aave-v3", "aave-v2"],
  morpho: "morpho-blue",
  spark: "spark",
  compound: ["compound-v3", "compound-v2"],
  fluid: "fluid",
  maple: "maple",
  gearbox: "gearbox",
  stella: "stella",
  "extra-finance": ["extra-finance-leverage-farming", "extra-finance-xlend"],
  pendle: "pendle",
  notional: ["notional-v2", "notional-v3"],
  spectra: "spectra-v2",
  sense: "sense",
  radiant: "radiant-v2",
  // M8 new entities (dataset llamaSlug, verified against api.llama.fi 26 Jul 2026)
  "steakhouse-financial": "steakhouse-financial",
  "native-credit-pool": "native-credit-pool",
  dolomite: "dolomite",
  euler: "euler-v2",
  "csigma-finance": "csigma-finance",
  "t3tris-finance": "t3tris-finance",
  contango: "contango-v2",
  "yield-basis": "yield-basis",
  "origami-finance": "origami-finance",
  deltaprime: "deltaprime",
  termmax: "termmax",
  "term-finance": ["termfinance-lend", "termfinance-vaults"],
  boros: "boros",
  fira: "fira",
  exactly: "exactly",
  // M8 migrations
  liquity: "liquity-v2",
  "curve-stablecoin": ["crvusd", "curve-llamalend"],
  "inverse-finance": "inverse-finance-firm",
};

const DATASET_TVL = Object.fromEntries(
  [...dataset.newEntities, ...dataset.migrationCandidates].map((e) => [
    e.slug,
    { tvlUsd: e.tvlUsd ?? null, totalBorrowedUsd: e.totalBorrowedUsd ?? null },
  ]),
);
const DATASET_AUDIT_COUNT = Object.fromEntries(
  dataset.newEntities.map((e) => [e.slug, (e.audits ?? []).length || null]),
);

/** Chain-key filter: currentChainTvls carries "Ethereum", "Ethereum-borrowed",
 * "borrowed", "staking", "pool2" etc. Real chains are the un-suffixed,
 * non-meta keys. */
const META_KEYS = new Set(["borrowed", "staking", "pool2", "vesting", "offers", "treasury", "doublecounted", "liquidstaking"]);
function chainsOf(chainTvls) {
  return Object.keys(chainTvls ?? {}).filter(
    (k) => !k.includes("-") && !META_KEYS.has(k.toLowerCase()),
  );
}

async function fetchProtocol(slug) {
  const res = await fetch(`https://api.llama.fi/protocol/${slug}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${slug}`);
  return res.json();
}

function sumTvl(chainTvls) {
  let total = 0;
  for (const [k, v] of Object.entries(chainTvls ?? {})) {
    if (k.includes("-") || META_KEYS.has(k.toLowerCase())) continue;
    if (typeof v === "number") total += v;
  }
  return total;
}

const asOf = new Date().toISOString().slice(0, 10);
const rows = {};
const failures = [];

for (const slug of TAGGED) {
  const llama = LLAMA_SLUGS[slug];
  const llamaSlugs = Array.isArray(llama) ? llama : [llama];
  let tvlUsd = 0;
  let borrowed = 0;
  let sawBorrowed = false;
  const chains = new Set();
  let listedAt = null;
  let ok = true;

  for (const ls of llamaSlugs) {
    try {
      const p = await fetchProtocol(ls);
      tvlUsd += sumTvl(p.currentChainTvls);
      const b = p.currentChainTvls?.borrowed;
      if (typeof b === "number") {
        borrowed += b;
        sawBorrowed = true;
      }
      for (const c of chainsOf(p.currentChainTvls)) chains.add(c);
      if (typeof p.listedAt === "number") {
        listedAt = listedAt == null ? p.listedAt : Math.min(listedAt, p.listedAt);
      }
    } catch (err) {
      ok = false;
      failures.push(`${slug} (${ls}): ${err.message}`);
    }
  }

  const fallback = DATASET_TVL[slug];
  const record = storeItems[`CATEGORY#Entity|PROTOCOL#${slug}`];
  const storeAudits = Array.isArray(record?.Audits) ? record.Audits.length : 0;

  rows[slug] = {
    slug,
    tvlUsd: ok && tvlUsd > 0 ? Math.round(tvlUsd) : (fallback?.tvlUsd ?? null),
    totalBorrowedUsd:
      slug === "fira"
        ? null // dataset data-quality flag: $429.7m vs $16.5m TVL, unverified
        : ok && sawBorrowed
          ? Math.round(borrowed)
          : (fallback?.totalBorrowedUsd ?? null),
    utilizationPct: null, // no protocol-reported source this pass; never derived
    chainCount: ok && chains.size > 0 ? chains.size : null,
    launchDate: listedAt ? new Date(listedAt * 1000).toISOString().slice(0, 10) : null,
    auditCount: storeAudits > 0 ? storeAudits : (DATASET_AUDIT_COUNT[slug] ?? null),
    asOf: ok ? asOf : (fallback ? "2026-07-26" : asOf),
    source: ok ? "defillama-snapshot" : "m8-dataset",
  };
  console.log(
    `${slug}: tvl ${rows[slug].tvlUsd ?? "null"}, borrowed ${rows[slug].totalBorrowedUsd ?? "null"}, ` +
      `chains ${rows[slug].chainCount ?? "null"}, listed ${rows[slug].launchDate ?? "null"}, audits ${rows[slug].auditCount ?? "null"}${ok ? "" : " [FELL BACK TO DATASET]"}`,
  );
}

if (failures.length) {
  console.warn(`\n${failures.length} fetch failure(s):\n  ${failures.join("\n  ")}`);
}

const entries = TAGGED.sort()
  .map((slug) => `  ${JSON.stringify(slug)}: ${JSON.stringify(rows[slug])},`)
  .join("\n");

const out = `// GENERATED by scripts/fetch-credit-comparables.mjs — do not hand-edit.
// Snapshot of comparable metrics for the 32 tagged Credit entities
// (percentile-bar inputs, CAN-87). Source: api.llama.fi/protocol/<slug>
// (multi-slug entities summed), with the committed M8 dataset (compiled
// 2026-07-26) as fallback where a fetch failed. Re-run to refresh; every
// consumer must surface asOf.
//
// utilizationPct is ONLY ever protocol-reported and is null this pass: it is
// NEVER computed as borrowed/supplied (DefiLlama nets borrowed collateral out
// of supplied for dolomite, contango, origami-finance, euler and fira). No
// APY fields exist: no source covers the whole cohort. fira's borrowed figure
// is withheld as a data-quality flag.

export interface CreditComparable {
  slug: string;
  tvlUsd: number | null;
  totalBorrowedUsd: number | null;
  /** Protocol-reported only; never derived. Null this pass. */
  utilizationPct: number | null;
  chainCount: number | null;
  /** DefiLlama listing date ("Listed since"), not protocol genesis. */
  launchDate: string | null;
  /** Known audits count (store or dataset); null = unverified, not zero. */
  auditCount: number | null;
  asOf: string;
  source: "defillama-snapshot" | "m8-dataset";
}

export const CREDIT_COMPARABLES: Record<string, CreditComparable> = {
${entries}
};
`;

const target = path.resolve(frontendRoot, "lib", "networks", "creditComparables.ts");
writeFileSync(target, out);
console.log(`\nWrote ${TAGGED.length} comparables -> ${path.relative(process.cwd(), target)}`);
