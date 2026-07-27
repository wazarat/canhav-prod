#!/usr/bin/env node
/**
 * Credit M8 competitor dataset parser (Credits completion CAN-84 / M8.1).
 *
 * Reads scripts/data/credit-competitors-m8.{json,md} plus the local bootstrap
 * store and emits scripts/data/credit-m8-store-patch.json:
 *   - newEntities: 15 store-ready CATEGORY#Entity records (general field
 *     coverage: taxonomy, prose, links, audits, risks, incidents, scale,
 *     member coins, competitors)
 *   - migrations: taxonomy patches for liquity / curve-stablecoin /
 *     inverse-finance (lista-dao PARKED to M11 by user decision 2026-07-27)
 *   - mapleTagUnion: pure union to ["Lending","Fixed Income"] (KV already has
 *     it; bootstrap reconcile only)
 *   - competitorAdditions: per-slug Competitor rows that close reciprocity
 *     across the whole Credit-affiliated set (dataset reciprocity map PLUS the
 *     15 pre-existing curated asymmetries found in the bootstrap audit)
 *   - edges / nodes / tierB: input for generate-credit-competitor-model.mjs
 *
 * Fidelity gates (hard-fail): 15 new entities / 4 migration candidates /
 * 15 tier-B rows in the dataset; 3 closestIncumbents + 3 reciprocalListedBy
 * per new entity and the two lists identical; every incumbent slug resolves in
 * the bootstrap store; md "Closest incumbents" reasons parse for all 15; zero
 * em dashes in any store-bound prose; post-closure reciprocity is total.
 *
 *   node scripts/parse-credit-m8-competitors.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

const dataset = JSON.parse(
  readFileSync(path.join(here, "data", "credit-competitors-m8.json"), "utf-8"),
);
const md = readFileSync(path.join(here, "data", "credit-competitors-m8.md"), "utf-8");
const bootstrap = JSON.parse(
  readFileSync(path.join(frontendRoot, "data", "bootstrap-store.json"), "utf-8"),
);
const storeItems = bootstrap.items ?? bootstrap;

function storeRecord(slug) {
  return storeItems[`CATEGORY#Entity|PROTOCOL#${slug}`] ?? null;
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Gates on the raw dataset
// ---------------------------------------------------------------------------

const newEntities = dataset.newEntities;
if (!Array.isArray(newEntities) || newEntities.length !== 15) {
  fail(`expected 15 newEntities, found ${newEntities?.length}`);
}
if ((dataset.migrationCandidates ?? []).length !== 4) {
  fail(`expected 4 migrationCandidates, found ${dataset.migrationCandidates?.length}`);
}
if ((dataset.tierB ?? []).length !== 15) {
  fail(`expected 15 tierB rows, found ${dataset.tierB?.length}`);
}
for (const e of newEntities) {
  if ((e.closestIncumbents ?? []).length !== 3) fail(`${e.slug}: closestIncumbents != 3`);
  if ((e.reciprocalListedBy ?? []).length !== 3) fail(`${e.slug}: reciprocalListedBy != 3`);
  const a = [...e.closestIncumbents].sort().join(",");
  const b = [...e.reciprocalListedBy].sort().join(",");
  if (a !== b) fail(`${e.slug}: closestIncumbents and reciprocalListedBy differ (${a} vs ${b})`);
}

const NEW_SLUGS = newEntities.map((e) => e.slug);
const MIGRATED = ["liquity", "curve-stablecoin", "inverse-finance"]; // lista-dao parked (M11)
const TAG_OF_MIGRATED = {
  liquity: "Lending",
  "curve-stablecoin": "Lending",
  "inverse-finance": "Fixed Income",
};
const SUBSECTOR_OF_MIGRATED = {
  liquity: "Decentralized CDP",
  "curve-stablecoin": "Decentralized CDP",
  "inverse-finance": "Fixed-rate lending",
};
// Section 6 migration reciprocity rows (md), minus lista-dao.
const MIGRATION_COMPETITORS = {
  liquity: ["curve-stablecoin", "sky", "inverse-finance"],
  "inverse-finance": ["notional", "pendle", "liquity"],
  "curve-stablecoin": ["liquity", "sky", "morpho"],
};
const MIGRATION_REASONS = {
  "liquity|curve-stablecoin":
    "Both are decentralized CDP borrowing venues on Ethereum with continuous or soft liquidation designs.",
  "liquity|sky": "Both issue a decentralized stablecoin against overcollateralised positions.",
  "liquity|inverse-finance":
    "Both offer rate-certain borrowing against ETH-class collateral, user-set at Liquity and fixed at FiRM.",
  "inverse-finance|notional": "Both offer fixed-rate on-chain lending instruments.",
  "inverse-finance|pendle":
    "Both tokenise interest to fix a rate: DBR prepays borrowing cost, YT trades the yield leg.",
  "curve-stablecoin|sky": "Both issue a decentralized CDP stablecoin against overcollateralised positions.",
  "curve-stablecoin|morpho":
    "Curve LlamaLend's isolated markets compete with Morpho Blue's isolated lending markets.",
};

// Curated short taglines for the 15 (store Tagline field; kept to one line,
// facts from the dataset).
const TAGLINES = {
  "steakhouse-financial": "Largest risk curator in DeFi lending.",
  "native-credit-pool": "Credit pool funding market-maker inventory.",
  dolomite: "Money market where collateral keeps its native rights.",
  euler: "Permissionless modular lending vaults.",
  "csigma-finance": "Institutional credit desk concentrated on Arbitrum.",
  "t3tris-finance": "Permissionless vault infrastructure on Robinhood Chain and Arbitrum.",
  contango: "One-click looping across external money markets.",
  "yield-basis": "Levered Curve LP exposure built to cancel impermanent loss.",
  "origami-finance": "Folded yield-token vaults held as a single receipt token.",
  deltaprime: "Undercollateralised prime accounts for leveraged farming.",
  termmax: "Fixed-rate, fixed-maturity credit with built-in leverage tokens.",
  "term-finance": "Sealed-bid on-chain repo auctions with a real term structure.",
  boros: "Pendle's venue for trading funding rates, fixed versus floating.",
  fira: "Bond and coupon tokens splitting loans into principal and yield legs.",
  exactly: "Fixed and variable rate pools on Base and Optimism.",
};

// Risk categories for dataset riskFlags (aligned with the categories already
// used in store Risks entries).
const RISK_FLAG_CATEGORIES = {
  "steakhouse-financial": ["Operational", "Counterparty"],
  dolomite: ["Collateral"],
  euler: ["Smart Contract"],
};

// Incidents documented in the dataset/companion md (Incident store shape).
const INCIDENTS = {
  deltaprime: [
    {
      date: "Sep 2024",
      title: "First key-compromise exploit",
      description:
        "An attacker gained control of an admin private key and drained roughly $6m from DeltaPrime pools, the first of two operational breaches in under two months.",
      eventType: "exploit",
      amountUsd: 6000000,
      amountUsdDisplay: "$6m",
      outcome: "Team continued operating; a second breach followed in November 2024.",
      link: "https://www.certik.com/blog/deltaprime-incident-analysis",
    },
    {
      date: "11 Nov 2024",
      title: "Second key-compromise exploit",
      description:
        "Compromised admin keys were used to drain roughly $4.75m to $4.8m across Arbitrum and Avalanche deployments.",
      eventType: "exploit",
      amountUsd: 4800000,
      amountUsdDisplay: "$4.8m",
      outcome:
        "Post-mortem and reimbursement plan published December 2024. Audits predate the incidents, which were operational rather than contract-logic failures.",
      link: "https://www.halborn.com/blog/post/explained-the-deltaprime-hack-november-2024",
    },
  ],
  euler: [
    {
      date: "13 Mar 2023",
      title: "V1 flash-loan attack",
      description:
        "A $197m flash-loan attack exploited a missing health check in Euler V1's donation function.",
      eventType: "exploit",
      amountUsd: 197000000,
      amountUsdDisplay: "$197m",
      outcome:
        "The attacker returned substantially all funds. Euler V2 is a full rewrite deployed after the incident; no V2-specific exploit found as of 26 July 2026.",
      link: "https://www.chainalysis.com/blog/euler-finance-flash-loan-attack/",
    },
  ],
  "steakhouse-financial": [
    {
      date: "Apr 2026",
      title: "DNS hijack via registrar 2FA",
      description:
        "Attackers social-engineered OVH Cloud's phone-based 2FA, modified DNS records for the main site and app subdomains and attempted a five-day domain transfer, freezing front-end deposits and withdrawals.",
      eventType: "infrastructure",
      amountUsd: null,
      amountUsdDisplay: null,
      outcome: "Vaults remained reachable directly through Morpho; no vault losses reported.",
      link: "https://www.ainvest.com/news/steakhouse-dns-hijack-flow-driven-analysis-incident-financial-impact-2604/",
    },
  ],
};

// Display-name -> slug map for parsing the md "Closest incumbents." reasons.
const NAME_TO_SLUG = {
  Morpho: "morpho",
  Spark: "spark",
  Maple: "maple",
  Aave: "aave",
  Radiant: "radiant",
  Fluid: "fluid",
  Compound: "compound",
  Goldfinch: "goldfinch",
  Clearpool: "clearpool",
  Gearbox: "gearbox",
  Stella: "stella",
  "Extra Finance": "extra-finance",
  "Curve stablecoin / crvUSD": "curve-stablecoin",
  "Curve stablecoin": "curve-stablecoin",
  Notional: "notional",
  Pendle: "pendle",
  Spectra: "spectra",
  Sense: "sense",
};

// ---------------------------------------------------------------------------
// Companion-md extraction
// ---------------------------------------------------------------------------

/** Per-entity md sections keyed by slug ("### Name" blocks). */
function extractEntitySections() {
  const bySlug = {};
  const nameOf = Object.fromEntries(newEntities.map((e) => [e.name.replace(/ \(.*\)$/, ""), e.slug]));
  // Headings in the md use the display name, sometimes shortened.
  const headingToSlug = {
    "Steakhouse Financial": "steakhouse-financial",
    "Native (Native Credit Pool)": "native-credit-pool",
    Dolomite: "dolomite",
    "Euler V2": "euler",
    "cSigma Finance": "csigma-finance",
    "T3tris Finance": "t3tris-finance",
    "Contango V2": "contango",
    "Yield Basis": "yield-basis",
    "Origami Finance": "origami-finance",
    DeltaPrime: "deltaprime",
    TermMax: "termmax",
    "Term Finance": "term-finance",
    Boros: "boros",
    Fira: "fira",
    Exactly: "exactly",
    ...nameOf,
  };
  const parts = md.split(/^### /m).slice(1);
  for (const part of parts) {
    const heading = part.slice(0, part.indexOf("\n")).trim();
    const slug = headingToSlug[heading];
    if (!slug) continue;
    bySlug[slug] = part;
  }
  return bySlug;
}

const sections = extractEntitySections();
for (const slug of NEW_SLUGS) {
  if (!sections[slug]) fail(`no md section found for ${slug}`);
}

function mdParagraph(section, label) {
  const re = new RegExp(`\\*\\*${label}\\.\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n|$)`);
  const m = section.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

/** Strip markdown links ("[text](url)" -> "text") and bold markers. */
function plainProse(text) {
  if (!text) return null;
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse "Name (reason), Name (reason), Name (reason)" from the md. */
function parseIncumbentReasons(section, slug) {
  const raw = mdParagraph(section, "Closest incumbents");
  if (!raw) fail(`${slug}: no "Closest incumbents." paragraph`);
  const text = plainProse(raw);
  const out = {};
  const re = /([A-Za-z0-9\/.' -]+?)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].replace(/^[,\s]+/, "").trim();
    const peer = NAME_TO_SLUG[name];
    if (!peer) fail(`${slug}: unmapped incumbent display name "${name}"`);
    out[peer] = m[2].trim().replace(/^both/i, "Both");
  }
  const want = [...(newEntities.find((e) => e.slug === slug).closestIncumbents)].sort();
  const got = Object.keys(out).sort();
  if (want.join(",") !== got.join(",")) {
    fail(`${slug}: parsed incumbent reasons ${got} do not match dataset ${want}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// New-entity store records
// ---------------------------------------------------------------------------

function sentenceCase(reason) {
  const t = reason.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Em dashes are banned in store prose (M0 rule). Pre-M8 non-Credit records
 * (liquity et al.) still carry them; sanitize any text we QUOTE into new rows
 * without touching the source records themselves. */
function noEmDash(text) {
  if (!text) return text;
  return text.replace(/\s*—\s*/g, ", ").replace(/—/g, "-");
}

function competitorRow(rank, peerSlug, positioning, similarities, differences) {
  return {
    rank,
    name: null, // filled below once names are resolved
    slug: peerSlug,
    positioning: positioning || "-",
    similarities: sentenceCase(similarities),
    differences: differences || "-",
  };
}

function resolveName(slug) {
  const rec = storeRecord(slug);
  if (rec?.Name) return rec.Name;
  const fresh = newEntities.find((e) => e.slug === slug);
  if (fresh) return fresh.name.replace(/ \(.*\)$/, "");
  fail(`cannot resolve display name for slug ${slug}`);
}

function resolveTagline(slug) {
  return noEmDash(storeRecord(slug)?.Tagline ?? TAGLINES[slug] ?? "-");
}

function resolveDifferentiator(slug) {
  const rec = storeRecord(slug);
  if (rec?.Differentiator) return noEmDash(rec.Differentiator);
  const fresh = newEntities.find((e) => e.slug === slug);
  if (fresh?.differentiator) return sentenceCase(fresh.differentiator);
  const section = sections[slug];
  if (section) {
    const p = plainProse(mdParagraph(section, "Differentiator"));
    if (p) return p.split(/(?<=\.)\s/)[0];
  }
  return "-";
}

const nowIso = "2026-07-27T00:00:00.000Z"; // deterministic; scripts stamp real UpdatedAt on push

const builtEntities = {};
for (const e of newEntities) {
  const section = sections[e.slug];
  const reasons = parseIncumbentReasons(section, e.slug);
  const whyTag = plainProse(mdParagraph(section, "Why this tag"));
  const differentiatorPara = plainProse(mdParagraph(section, "Differentiator"));
  const metricsPara = plainProse(mdParagraph(section, "Comparable metrics"));
  const auditsPara = plainProse(mdParagraph(section, "Audits"));
  if (!whyTag || !differentiatorPara) fail(`${e.slug}: missing Why-this-tag or Differentiator prose`);

  const competitors = e.closestIncumbents.map((peer, i) =>
    competitorRow(
      i + 1,
      peer,
      resolveTagline(peer),
      reasons[peer],
      resolveDifferentiator(peer),
    ),
  );

  const audits = (e.audits ?? []).map((a) => ({
    firm: a.firm,
    date: a.date ?? null,
    url: e.docs ?? e.website ?? null,
  }));

  // The md audits paragraph names firms for several entities whose dataset
  // audits array is empty (dates unresolvable). Carry the prose as the note;
  // it says "zero audits recorded" itself where that is the actual finding.
  const auditsNote =
    e.slug === "steakhouse-financial"
      ? "No audits by design: Steakhouse is a risk curator and deploys no contracts of its own. Smart-contract risk sits with the venues it allocates to (Morpho, Euler, Kamino)."
      : audits.length === 0
        ? (auditsPara ??
          "No structured audit metadata was resolvable from public sources as of 26 July 2026. An open verification item, not a finding of no audit.")
        : null;

  const risks = (e.riskFlags ?? []).map((flag, i) => ({
    category: (RISK_FLAG_CATEGORIES[e.slug] ?? ["Operational"])[i] ?? "Operational",
    description: sentenceCase(flag),
  }));
  if (e.slug === "boros") {
    risks.push({
      category: "Counterparty",
      description:
        "Boros is built and operated by Pendle Labs; it shares team, brand and operational dependencies with Pendle rather than standing as an independent protocol.",
    });
  }
  if (e.slug === "fira") {
    risks.push({
      category: "Data Quality",
      description:
        "DefiLlama reports $429.7m borrowed against $16.5m supplied TVL for Fira, a ratio that implies extreme rehypothecation or an accounting artefact. Verify independently before relying on the borrowed figure.",
    });
  }

  const description = whyTag;
  const longDescription = [whyTag, differentiatorPara, metricsPara].filter(Boolean).join(" ");

  const record = {
    PK: "CATEGORY#Entity",
    SK: `PROTOCOL#${e.slug}`,
    Category: "Entity",
    SubCategory: e.entityType === "risk curator" ? "Risk Curator" : "Protocol",
    Slug: e.slug,
    Name: resolveName(e.slug),
    Symbol: e.governanceToken ?? null,
    Status: "APPROVED",
    Sector: "Credit",
    SubSector: e.tag,
    Tags: [e.tag],
    SecondarySectors: null,
    Tagline: TAGLINES[e.slug],
    Description: description,
    LongDescription: longDescription,
    Differentiator: sentenceCase(e.differentiator ?? differentiatorPara.split(/(?<=\.)\s/)[0]),
    Website: e.website ?? null,
    OfficialDocs: e.docs ?? null,
    GitHub: e.github ?? null,
    Audits: audits,
    AuditsNote: auditsNote,
    Risks: risks.length ? risks : null,
    Incidents: INCIDENTS[e.slug] ?? null,
    Competitors: competitors,
    CurrentScale: {
      aprPct: null,
      loanPipelineUsd: null,
      marketCapUsd: null,
      partnerships: null,
      targetAprPct: null,
      tvlUsd: e.tvlUsd ?? null,
      users: null,
    },
    ScaleLabels: { tvl: "Protocol TVL" },
    ArbitrumPortalMetadata: {
      bannerUrl: null,
      chains: e.chains ?? [],
      foundedDate: null,
      isArbitrumNative: false,
      isLive: true,
      isPubliclyAudited: audits.length > 0,
    },
    MemberCoins:
      e.coingeckoId && e.governanceToken
        ? [
            {
              slug: e.coingeckoId,
              name: resolveName(e.slug),
              symbol: e.governanceToken,
              category: "Token",
              role: "Governance & Utility Token",
              subCategory: "Governance Token",
            },
          ]
        : null,
    Sources: [
      {
        label: `DefiLlama API: ${e.llamaSlug}`,
        url: `https://api.llama.fi/protocol/${e.llamaSlug}`,
      },
      ...(e.docs ? [{ label: "Official docs", url: e.docs }] : []),
    ],
    Partnerships: [],
    Events: [],
    CreatedAt: nowIso,
    UpdatedAt: nowIso,
  };

  if (e.parentProtocol) record.ParentSlug = e.parentProtocol;
  if (e.tagFit === "partial") {
    record.TagFitNote =
      "Tag fit is provisional: T3tris is permissionless vault infrastructure (DefiLlama: Onchain Capital Allocator) included for its live Robinhood Chain presence in the levered-strategy stack; no maximum-leverage figure was confirmable from a fetched page.";
  }
  if (e.slug === "steakhouse-financial") {
    record.EntityTypeNote =
      "Steakhouse Financial is a risk curator, not a protocol: it curates vaults on Morpho, Euler and Kamino, and its TVL books inside those venues (Robinhood Earn USDG vaults included).";
  }

  builtEntities[e.slug] = record;
}

// ---------------------------------------------------------------------------
// Migration patches
// ---------------------------------------------------------------------------

const migrations = {};
for (const slug of MIGRATED) {
  const rec = storeRecord(slug);
  if (!rec) fail(`migration target ${slug} not in bootstrap store`);
  if (rec.Sector !== "Stablecoin") fail(`${slug}: expected Sector Stablecoin, found ${rec.Sector}`);
  const secondary = Array.isArray(rec.SecondarySectors) ? rec.SecondarySectors : [];
  migrations[slug] = {
    Sector: "Credit",
    SubSector: SUBSECTOR_OF_MIGRATED[slug],
    Tags: [TAG_OF_MIGRATED[slug]],
    SecondarySectors: secondary.includes("Stablecoin") ? secondary : [...secondary, "Stablecoin"],
  };
}

// ---------------------------------------------------------------------------
// Edges + reciprocity closure across the Credit-affiliated scope
// ---------------------------------------------------------------------------

const CREDIT_AFFILIATED = new Set([
  // 14 tagged incumbents
  "aave", "compound", "morpho", "radiant", "spark",
  "extra-finance", "fluid", "gearbox", "stella",
  "maple", "notional", "pendle", "sense", "spectra",
  // 8 parked
  "justlend", "kamino", "venus", "usd-ai", "sky", "centrifuge", "clearpool", "goldfinch",
  // 3 migrated this window
  ...MIGRATED,
  // 15 new
  ...NEW_SLUGS,
]);

/** slug -> Set of slugs whose Competitor ROW actually exists (store or built). */
const rowsPresent = new Map();
/** slug -> Set of slugs this entity is REQUIRED to list (rows + dataset). */
const required = new Map();
const setOf = (map, slug) => {
  if (!map.has(slug)) map.set(slug, new Set());
  return map.get(slug);
};
for (const slug of CREDIT_AFFILIATED) {
  const rec = builtEntities[slug] ?? storeRecord(slug);
  if (!rec) fail(`credit-affiliated slug ${slug} has no record`);
  for (const c of rec.Competitors ?? []) {
    if (c.slug && CREDIT_AFFILIATED.has(c.slug)) {
      setOf(rowsPresent, slug).add(c.slug);
      setOf(required, slug).add(c.slug);
    }
  }
}
// Dataset migration competitor rows are required but have no store row yet.
for (const [slug, peers] of Object.entries(MIGRATION_COMPETITORS)) {
  for (const p of peers) setOf(required, slug).add(p);
}

// Undirected edge set from every required listing
const edgeKey = (a, b) => [a, b].sort().join("|");
const edgePairs = new Map();
for (const [a, peers] of required) {
  for (const b of peers) {
    if (a === b) fail(`self-listing on ${a}`);
    edgePairs.set(edgeKey(a, b), [a, b].sort());
  }
}

// Closure: a Competitor ROW must exist in both directions for every edge.
const additions = new Map(); // slug -> peer slugs needing a new row
for (const [, [a, b]] of edgePairs) {
  for (const [from, to] of [[a, b], [b, a]]) {
    if (!setOf(rowsPresent, from).has(to)) {
      if (!additions.has(from)) additions.set(from, []);
      additions.get(from).push(to);
      setOf(rowsPresent, from).add(to);
    }
  }
}

// Reasons for added rows: dataset incumbent reasons (reversed direction reuses
// the same pair prose), migration reasons, else honest shared-taxonomy prose.
const pairReason = new Map();
for (const e of newEntities) {
  const reasons = parseIncumbentReasons(sections[e.slug], e.slug);
  for (const [peer, reason] of Object.entries(reasons)) {
    pairReason.set(edgeKey(e.slug, peer), sentenceCase(reason));
  }
}
for (const [pair, reason] of Object.entries(MIGRATION_REASONS)) {
  const [a, b] = pair.split("|");
  pairReason.set(edgeKey(a, b), reason);
}

function tagsOf(slug) {
  if (builtEntities[slug]) return builtEntities[slug].Tags;
  if (migrations[slug]) return migrations[slug].Tags;
  if (slug === "maple") return ["Lending", "Fixed Income"]; // KV truth; union below
  const rec = storeRecord(slug);
  return Array.isArray(rec?.Tags) && rec.Tags.length ? rec.Tags : [];
}

function fallbackReason(a, b) {
  const shared = tagsOf(a).filter((t) => tagsOf(b).includes(t));
  return shared.length
    ? `Both compete in Credit (${shared.join(", ")}).`
    : "Both compete in the Credit sector.";
}

const competitorAdditions = {};
for (const [slug, peers] of additions) {
  const rec = builtEntities[slug] ?? storeRecord(slug);
  const existingRows = (builtEntities[slug]?.Competitors ?? rec?.Competitors ?? []).length;
  competitorAdditions[slug] = peers.map((peer, i) => ({
    rank: existingRows + i + 1,
    name: resolveName(peer),
    slug: peer,
    positioning: resolveTagline(peer),
    similarities: pairReason.get(edgeKey(slug, peer)) ?? fallbackReason(slug, peer),
    differences: resolveDifferentiator(peer),
  }));
}
// New-entity records already carry their 3 rows; closure additions for them
// (none expected) would be merged by the push script the same way.

// Fill names on the new-entity competitor rows now that resolution exists.
for (const rec of Object.values(builtEntities)) {
  for (const row of rec.Competitors) row.name = resolveName(row.slug);
}

// Final total-reciprocity assertion (the parser-level gate; the store-level
// gate is scripts/verify-m8-reciprocity.mjs after --local pushes).
for (const [, [a, b]] of edgePairs) {
  if (!setOf(rowsPresent, a).has(b) || !setOf(rowsPresent, b).has(a)) {
    fail(`closure failed for ${a} <-> ${b}`);
  }
}

// ---------------------------------------------------------------------------
// Nodes / edges / tierB for the generated model
// ---------------------------------------------------------------------------

const NON_STEADY_STATE = new Set(["radiant", "notional", "sense", "stella"]);
const ALSO_PARTNER_PAIRS = new Set(
  [
    ["aave", "maple"], ["maple", "spark"], ["morpho", "maple"], ["pendle", "notional"],
    ["spectra", "morpho"], ["gearbox", "pendle"], ["fluid", "maple"],
  ].map(([a, b]) => edgeKey(a, b)),
);
// Zero structured audit metadata resolvable (open verification item, not a
// finding of "unaudited"): the four dataset-flagged candidates plus the three
// migrated records, whose bootstrap Audits arrays are empty even though audit
// registries exist (firm names/dates unresolved in the dataset).
const UNVERIFIED_AUDITS = new Set([
  "native-credit-pool", "yield-basis", "boros", "term-finance",
  "liquity", "curve-stablecoin", "inverse-finance",
]);

const TAG_COHORTS = {
  Lending: [
    "aave", "compound", "morpho", "radiant", "spark",
    "steakhouse-financial", "native-credit-pool", "dolomite", "euler", "csigma-finance",
    "liquity", "curve-stablecoin",
  ],
  "Leveraged Yield": [
    "extra-finance", "fluid", "gearbox", "stella",
    "t3tris-finance", "contango", "yield-basis", "origami-finance", "deltaprime",
  ],
  "Fixed Income": [
    "maple", "notional", "pendle", "sense", "spectra",
    "termmax", "term-finance", "boros", "fira", "exactly",
    "inverse-finance",
  ],
};
const RISK_COHORTS = {
  Lending: ["aave", "compound", "morpho", "radiant", "spark"],
  "Leveraged Yield": ["extra-finance", "fluid", "gearbox", "stella"],
  "Fixed Income": ["maple", "notional", "pendle", "sense", "spectra"],
};

const TAGGED = new Set(Object.values(TAG_COHORTS).flat());
if (TAGGED.size !== 32) fail(`expected 32 tagged slugs, found ${TAGGED.size}`);

function primaryTag(slug) {
  for (const [tag, cohort] of Object.entries(TAG_COHORTS)) {
    if (cohort.includes(slug)) return tag;
  }
  return null;
}

const nodes = {};
for (const slug of TAGGED) {
  const fresh = newEntities.find((e) => e.slug === slug);
  nodes[slug] = {
    slug,
    name: resolveName(slug),
    tag: primaryTag(slug),
    entityType: fresh?.entityType === "risk curator" ? "risk-curator" : "protocol",
    ...(fresh?.tagFit === "partial" ? { tagFit: "partial" } : {}),
    ...(fresh?.parentProtocol ? { parentSlug: fresh.parentProtocol } : {}),
    ...(NON_STEADY_STATE.has(slug) ? { nonSteadyState: true } : {}),
    auditStatus:
      slug === "steakhouse-financial"
        ? "not-applicable"
        : UNVERIFIED_AUDITS.has(slug)
          ? "unverified"
          : "audited",
    ...(slug === "steakhouse-financial"
      ? { dataQualityFlags: ["TVL books under Morpho, Euler and Kamino vaults"] }
      : {}),
    ...(slug === "fira"
      ? { dataQualityFlags: ["DefiLlama borrowed figure ($429.7m) vastly exceeds supplied TVL; unverified"] }
      : {}),
  };
}

const edges = [...edgePairs.values()]
  .map(([a, b]) => ({
    a,
    b,
    sharedTag: primaryTag(a) != null && primaryTag(a) === primaryTag(b),
    ...(edgeKey(a, b) === edgeKey("boros", "pendle") ? { sharedParent: true } : {}),
    ...(ALSO_PARTNER_PAIRS.has(edgeKey(a, b)) ? { alsoPartner: true } : {}),
  }))
  .sort((x, y) => (x.a + x.b).localeCompare(y.a + y.b));

const tierB = dataset.tierB.map((r) => ({
  name: r.name,
  type: r.type,
  competesWithTags: r.competesWithTag.split(",").map((t) => t.trim()),
  note: r.note,
}));
for (const r of tierB) {
  for (const t of r.competesWithTags) {
    if (!["Lending", "Leveraged Yield", "Fixed Income"].includes(t)) {
      fail(`tierB row "${r.name}" has unknown tag "${t}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Em-dash gate over every store-bound string (M0 rule)
// ---------------------------------------------------------------------------

const dump = JSON.stringify({ builtEntities, competitorAdditions, migrations, tierB });
if (dump.includes("—")) {
  const i = dump.indexOf("—");
  fail(`em dash found in store-bound prose near: ...${dump.slice(Math.max(0, i - 80), i + 80)}...`);
}

// ---------------------------------------------------------------------------
// Emit sidecar
// ---------------------------------------------------------------------------

const sidecar = {
  compiledAt: dataset._meta.compiledAt,
  source: "scripts/data/credit-competitors-m8.{json,md}",
  decisions: {
    listaDao: "parked to M11 by user decision 2026-07-27 (99.9% BNB Chain)",
    boros: "distinct entity with ParentSlug pendle (user decision 2026-07-27)",
  },
  manifest: {
    newEntities: Object.keys(builtEntities).length,
    migrations: Object.keys(migrations).length,
    competitorAdditionRecords: Object.keys(competitorAdditions).length,
    edges: edges.length,
    tierB: tierB.length,
  },
  newEntities: builtEntities,
  migrations,
  mapleTagUnion: ["Lending", "Fixed Income"],
  competitorAdditions,
  tagCohorts: TAG_COHORTS,
  riskCohorts: RISK_COHORTS,
  nodes,
  edges,
  tierB,
};

const outPath = path.join(here, "data", "credit-m8-store-patch.json");
writeFileSync(outPath, `${JSON.stringify(sidecar, null, 2)}\n`);
console.log(
  `Wrote ${path.relative(frontendRoot, outPath)}: ${sidecar.manifest.newEntities} new entities, ` +
    `${sidecar.manifest.migrations} migrations, ${sidecar.manifest.competitorAdditionRecords} records ` +
    `gaining competitor rows, ${sidecar.manifest.edges} edges, ${sidecar.manifest.tierB} tier-B rows.`,
);
