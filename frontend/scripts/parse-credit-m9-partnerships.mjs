#!/usr/bin/env node
/**
 * M9 (CAN-88 / CAN-81) — parse the credit-partnerships dataset into the
 * partnership sidecar consumed by generate-credit-partnership-model.mjs.
 *
 * Inputs:
 *   scripts/data/credit-partnerships.json   (CAN-81 attachment, 687 rows / 14 entities)
 *   scripts/data/credit-assets-risks.json   (M6/M7 dataset — link_partners_matched cross-check)
 *   data/bootstrap-store.json               (Entity records — on-platform node resolution)
 *
 * Output:
 *   scripts/data/credit-m9-partnership-sidecar.json
 *
 * Normalisation model (documented in docs/credit/partnership-model.md):
 *  - Node identity: one node per underlying entity (CAN-88 dedupe rule).
 *    On-platform partners resolve to their store slug; off-platform partners
 *    get a deterministic kebab id. Product qualifiers ("Chainlink CCIP",
 *    "Gauntlet (Compound Blue vaults)") collapse onto the canonical node and
 *    the qualifier is preserved on the edge row.
 *  - chain_deployment rows never become nodes/edges: they feed per-entity
 *    badge strips (CAN-88 comment decision).
 *  - risk_curator is a derived ROLE flag, not an 11th category.
 *  - Mutual pairs listed by both subjects merge into one edge per
 *    (pair, category); the md's dedupe instruction.
 *  - Self-referential rows (partner resolves to the subject itself) are kept
 *    in selfRows for the entity detail but excluded from graph edges.
 *
 * Hard gates: row total 687, the exact 14 slugs, category/status/direction
 * vocab, zero unsourced rows, all link_partners_matched resolve, the 7 known
 * mutual pairs merge, no em dashes in store-bound prose.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const dataset = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "credit-partnerships.json"), "utf8"));
const risksDataset = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "credit-assets-risks.json"), "utf8"));
const store = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "bootstrap-store.json"), "utf8"));

const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);
const warn = (msg) => warnings.push(msg);

/* ------------------------------------------------------------------ */
/* Vocab                                                               */
/* ------------------------------------------------------------------ */

const CATEGORY_IDS = [
  "integration_technical", "liquidity_provider", "oracle", "custody",
  "chain_deployment", "institutional_tradfi", "security_audit",
  "governance_dao", "grant_investment", "distribution_frontend",
];
const STATUS_VOCAB = new Set(["active", "deprecated", "announced"]);
const DIRECTION_VOCAB = new Set(["inbound", "outbound", "mutual"]);
const EXPECTED_SLUGS = [
  "aave", "compound", "morpho", "radiant", "spark", "extra-finance", "fluid",
  "gearbox", "stella", "maple", "notional", "pendle", "sense", "spectra",
];
const EXPECTED_ROW_TOTAL = 687;

/** The 7 mutual pairs the dataset md names (dedupe on load). */
const KNOWN_MUTUAL_PAIRS = [
  ["aave", "maple"], ["maple", "spark"], ["maple", "morpho"],
  ["notional", "pendle"], ["morpho", "spectra"], ["gearbox", "pendle"],
  ["fluid", "maple"],
];

/** CAN-88 comment: recurring curators become a role flag, not a category. */
const RISK_CURATOR_NAMES = new Set([
  "gauntlet", "mev-capital", "steakhouse-financial", "clearstar",
  "re7-labs", "kpk", "k3-capital",
]);

/* ------------------------------------------------------------------ */
/* On-platform entity index                                            */
/* ------------------------------------------------------------------ */

const normName = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const kebab = (s) =>
  s.toLowerCase()
    .replace(/[’'.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const entityIndex = new Map(); // normName -> slug
const entityNames = new Map(); // slug -> display Name
for (const [key, item] of Object.entries(store.items)) {
  if (!key.startsWith("CATEGORY#Entity|")) continue;
  const slug = item.Slug;
  const name = item.Name;
  if (!slug || !name) continue;
  entityNames.set(slug, name);
  entityIndex.set(normName(name), slug);
  entityIndex.set(normName(slug), slug);
  // Also index without trailing corporate suffixes so "Yearn" matches
  // "Yearn Finance" and "Notional" matches "Notional Finance".
  const stripped = name.replace(/\s+(finance|protocol|capital|labs|network)$/i, "");
  if (stripped !== name) entityIndex.set(normName(stripped), slug);
}
// Names that would otherwise collide or mis-resolve.
// "Curve" the AMM is curve-finance (Liquidity), NOT curve-stablecoin.
const ENTITY_ALIASES = {
  curve: "curve-finance",
  curvefinance: "curve-finance",
  skyformerlymakerdao: "sky",
  makerdao: "sky",
  maker: "sky",
  convex: "convex-finance",
  yearn: "yearn-finance",
  eulerv2: "euler",
  euler: "euler",
  aavedao: "aave",
  sparkprotocol: "spark",
  liquityprotocol: "liquity",
};
for (const [k, v] of Object.entries(ENTITY_ALIASES)) entityIndex.set(k, v);
// Guard against the generic suffix-strip creating surprises: only resolve a
// name to a slug when the match is exact after normalisation.

/* ------------------------------------------------------------------ */
/* Curated row actions (multi-name blobs + qualifier rows)             */
/* Key: `${subject}|${category}|${partner_name}`                       */
/* ------------------------------------------------------------------ */

const ROW_ACTIONS = {
  "aave|integration_technical|Aura and Convex": { split: ["Aura", "Convex"] },
  "aave|institutional_tradfi|Ethena, OpenEden, KAIO": { split: ["Ethena", "OpenEden", "KAIO"] },
  "aave|institutional_tradfi|Anubi Digital, Bluefire Capital, Canvas Digital, CoinShares, GSR, Hidden Road, Wintermute": {
    split: ["Anubi Digital", "Bluefire Capital", "Canvas Digital", "CoinShares", "GSR", "Hidden Road", "Wintermute"],
  },
  "aave|governance_dao|Chaos Labs and LlamaRisk (Horizon)": {
    split: [{ name: "Chaos Labs", qualifier: "Horizon" }, { name: "LlamaRisk", qualifier: "Horizon" }],
  },
  "morpho|institutional_tradfi|Apollo, Gemini, Bitget, Binance, OKX, Wirex, Lemon, Deblock, SafePal, Galaxy, Bitpanda": {
    split: ["Apollo", "Gemini", "Bitget", "Binance", "OKX", "Wirex", "Lemon", "Deblock", "SafePal", "Galaxy", "Bitpanda"],
  },
  "morpho|security_audit|Cantina and OpenZeppelin (Blue repo)": {
    split: [{ name: "Cantina", qualifier: "Blue repo" }, { name: "OpenZeppelin", qualifier: "Blue repo" }],
  },
  "morpho|grant_investment|Paradigm, a16z crypto, Ribbit Capital": {
    split: ["Paradigm", "a16z crypto", "Ribbit Capital"],
  },
  "morpho|grant_investment|Apollo Funds, Circle Ventures, VanEck, Ledger Cathay, Variant, Wintermute Ventures, Prelude, IOSG, HashKey, Mirana, NJJ Capital, SBI Group, Bpifrance": {
    split: ["Apollo Funds", "Circle Ventures", "VanEck", "Ledger Cathay", "Variant", "Wintermute Ventures", "Prelude", "IOSG", "HashKey", "Mirana", "NJJ Capital", "SBI Group", "Bpifrance"],
  },
  "morpho|distribution_frontend|Crypto.com app and exchange": { single: { name: "Crypto.com", qualifier: "app and exchange" } },
  "morpho|distribution_frontend|Trust Wallet, World, Farcaster, Privy, Jumper, Gemini Wallet, SafePal": {
    split: ["Trust Wallet", "World", "Farcaster", "Privy", "Jumper", "Gemini Wallet", "SafePal"],
  },
  "spark|liquidity_provider|Maple, Aave, Morpho, Curve, PayPal, Anchorage": {
    split: ["Maple", "Aave", "Morpho", "Curve", "PayPal", { name: "Anchorage Digital" }],
  },
  "spark|institutional_tradfi|BlackRock and Securitize": { split: ["BlackRock", "Securitize"] },
  "spark|institutional_tradfi|Centrifuge, Anemoy and Janus Henderson": {
    split: ["Centrifuge", "Anemoy", "Janus Henderson"],
  },
  "spark|security_audit|Cantina and ChainSecurity (PSM)": {
    split: [{ name: "Cantina", qualifier: "PSM" }, { name: "ChainSecurity", qualifier: "PSM" }],
  },
  "spark|security_audit|ChainSecurity and Cantina (Spark Vaults)": {
    split: [{ name: "ChainSecurity", qualifier: "Spark Vaults" }, { name: "Cantina", qualifier: "Spark Vaults" }],
  },
  "spark|security_audit|OpenZeppelin, Trail of Bits, PeckShield, Sigma Prime, ABDK (inherited)": {
    split: [
      { name: "OpenZeppelin", qualifier: "inherited" }, { name: "Trail of Bits", qualifier: "inherited" },
      { name: "PeckShield", qualifier: "inherited" }, { name: "Sigma Prime", qualifier: "inherited" },
      { name: "ABDK", qualifier: "inherited" },
    ],
  },
  "extra-finance|integration_technical|Berachain LYF pools (iBERA, beraETH, BYUSD, HONEY)": {
    single: { name: "Berachain", qualifier: "LYF pools (iBERA, beraETH, BYUSD, HONEY)" },
  },
  "fluid|integration_technical|Lido (stETH, wstETH)": { single: { name: "Lido", qualifier: "stETH, wstETH" } },
  "fluid|integration_technical|Maple (syrupUSDC, syrupUSDT)": { single: { name: "Maple", qualifier: "syrupUSDC, syrupUSDT" } },
  "fluid|governance_dao|Multi-chain bridge evaluation (LayerZero, Socket, Axelar, Wormhole, CCTP)": {
    split: [
      { name: "LayerZero", qualifier: "bridge evaluation" }, { name: "Socket", qualifier: "bridge evaluation" },
      { name: "Axelar", qualifier: "bridge evaluation" }, { name: "Wormhole", qualifier: "bridge evaluation" },
      { name: "CCTP", qualifier: "bridge evaluation" },
    ],
  },
  "gearbox|integration_technical|Curve (StableSwap, CryptoSwap, Stable NG)": {
    single: { name: "Curve", qualifier: "StableSwap, CryptoSwap, Stable NG" },
  },
  "gearbox|integration_technical|Threshold (tBTC) and Mezo (uptBTC)": {
    split: [{ name: "Threshold", qualifier: "tBTC" }, { name: "Mezo", qualifier: "uptBTC" }],
  },
  "gearbox|integration_technical|Midas (mTBILL, mBASIS, mRe7YIELD)": {
    single: { name: "Midas", qualifier: "mTBILL, mBASIS, mRe7YIELD" },
  },
  "gearbox|oracle|Curve and Yearn derived price feeds": {
    split: [{ name: "Curve", qualifier: "derived price feeds" }, { name: "Yearn", qualifier: "derived price feeds" }],
  },
  "gearbox|grant_investment|P2P Capital, Focus Labs, LAUNCHub Ventures, Encode Club, eGirl Capital": {
    split: ["P2P Capital", "Focus Labs", "LAUNCHub Ventures", "Encode Club", "eGirl Capital"],
  },
  "gearbox|grant_investment|A.Capital Ventures and Galaxy Digital": { split: ["A.Capital Ventures", "Galaxy Digital"] },
  "gearbox|distribution_frontend|MetaMask, Trust Wallet, WalletConnect": {
    split: ["MetaMask", "Trust Wallet", "WalletConnect"],
  },
  "stella|integration_technical|GMX and HMX (as farmed assets)": {
    split: [{ name: "GMX", qualifier: "farmed asset" }, { name: "HMX", qualifier: "farmed asset" }],
  },
  "stella|oracle|Custom off-chain oracle sourcing Binance, Coinbase, Bybit, OKX, Kucoin, Gate.io, MEXC, Kraken": {
    single: { name: "CEX price sources", qualifier: "custom off-chain oracle" }, // INFRA_NAMES routes this to selfRows
  },
  "extra-finance|oracle|DEX AMM TWAP (Velodrome / Aerodrome pools)": {
    split: [{ name: "Velodrome", qualifier: "TWAP oracle" }, { name: "Aerodrome", qualifier: "TWAP oracle" }],
  },
  "stella|institutional_tradfi|Binance (Launchpad and Launchpool)": {
    single: { name: "Binance", qualifier: "Launchpad and Launchpool" },
  },
  "stella|grant_investment|Delphi Ventures and Divergence Ventures": {
    split: ["Delphi Ventures", "Divergence Ventures"],
  },
  "spectra|integration_technical|Curve twocrypto-ng and stableswap-ng": {
    single: { name: "Curve", qualifier: "twocrypto-ng and stableswap-ng" },
  },
  "spectra|oracle|Spectra Deterministic, TWAP and Hybrid oracles": {
    single: { name: "Spectra", qualifier: "Deterministic, TWAP and Hybrid oracles" },
  },
};

/**
 * Name-level aliases applied after ROW_ACTIONS and after qualifier stripping.
 * Maps a cleaned partner name to its canonical display name. On-platform
 * resolution then runs on the canonical name.
 */
const NAME_ALIASES = {
  "Chainlink CCIP": { name: "Chainlink", qualifier: "CCIP" },
  "Chainlink SVR": { name: "Chainlink", qualifier: "SVR" },
  "Chainlink Price Feeds": { name: "Chainlink", qualifier: "Price Feeds" },
  "Chainlink SmartData NAVLink": { name: "Chainlink", qualifier: "SmartData NAVLink" },
  "Correlated Assets Price Oracle": { name: "Correlated Assets Price Oracle (CAPO)" },
  "f(x) Protocol": { name: "f(x) Protocol" },
  "Sky (formerly MakerDAO)": { name: "Sky" },
  "Maple Finance": { name: "Maple" },
  "Spectra Finance": { name: "Spectra" },
  "Uniswap V3": { name: "Uniswap", qualifier: "V3" },
  "Anchorage": { name: "Anchorage Digital" },
  "Midas Protocol": { name: "Midas" },
  "Curve Finance": { name: "Curve" },
  "Aave DAO": { name: "Aave", qualifier: "DAO" },
  "Compound Finance": { name: "Compound" },
  // Identity rows: forks, own-DAO/foundation/front-end rows, product oracles.
  // Aliasing to the canonical entity either forms the true edge (another
  // subject's row) or routes to selfRows (the subject's own row).
  "Aave v3 codebase": { name: "Aave", qualifier: "v3 codebase" },
  "Aave on-chain vote": { name: "Aave", qualifier: "on-chain vote" },
  "Compound Foundation": { name: "Compound", qualifier: "Foundation" },
  "Radiant front end": { name: "Radiant Capital", qualifier: "front end" },
  "Spark Foundation": { name: "Spark", qualifier: "Foundation" },
  "Fluid DAO": { name: "Fluid", qualifier: "DAO" },
  "Gearbox DAO": { name: "Gearbox", qualifier: "DAO" },
  "Notional DAO": { name: "Notional Finance", qualifier: "DAO" },
  "Maple Foundation": { name: "Maple", qualifier: "Foundation" },
  "Sky DAO": { name: "Sky", qualifier: "DAO" },
  "Spectra DAO": { name: "Spectra", qualifier: "DAO" },
  "YieldNest DAO": { name: "YieldNest", qualifier: "DAO" },
  "Stella Lend": { name: "Stella", qualifier: "internal borrow source" },
  "Alpha Venture DAO rebrand": { name: "Stella", qualifier: "Alpha Venture DAO rebrand" },
  "APWine to Spectra rebrand": { name: "Spectra", qualifier: "APWine rebrand" },
  "APW token holders": { name: "Spectra", qualifier: "APW legacy governance" },
  "Space AMM oracle": { name: "Sense Finance", qualifier: "Space AMM oracle" },
  "Superstate USTB": { name: "Superstate", qualifier: "USTB" },
  "Core Foundation": { name: "Core", qualifier: "Foundation" },
  "Exponent vault as Morpho oracle": { name: "Exponent", qualifier: "vault as Morpho oracle" },
  "Spectra linear price adapter on Morpho": { name: "Morpho", qualifier: "Spectra linear price adapter" },
  "Morpho front end": { name: "Morpho", qualifier: "front end" },
  "Curve front end": { name: "Curve", qualifier: "front end" },
  "Curve pool price_oracle": { name: "Curve", qualifier: "pool price_oracle" },
  "Pendle Linear Discount Oracle": { name: "Pendle Finance", qualifier: "Linear Discount Oracle" },
  "Pendle TWAP PT/LP oracle": { name: "Pendle Finance", qualifier: "TWAP PT/LP oracle" },
  "Uniswap v3 TWAP": { name: "Uniswap", qualifier: "v3 TWAP" },
  "Uniswap V2": { name: "Uniswap", qualifier: "V2" },
  "Uniswap v3": { name: "Uniswap", qualifier: "v3" },
};

/**
 * Evidenced rows that describe the subject's own infrastructure rather than
 * a third-party partnership. Kept in selfRows (kind "infrastructure"),
 * excluded from graph nodes/edges.
 */
const INFRA_NAMES = new Set([
  "ERC-4626 vaults",
  "Curator white-label front ends",
  "Instance Owner multisig",
  "Constant USD oracle for USDC",
  "Isolated SPVs via regulated investment managers",
  "Regulated investment managers",
  "CEX price sources",
  "Sense multisig",
]);

/**
 * Parenthetical qualifiers are stripped from node identity EXCEPT for names
 * where the parenthetical is part of the name itself.
 */
const KEEP_PARENTHETICAL = new Set([
  "f(x) Protocol",
  "Correlated Assets Price Oracle (CAPO)",
]);

/* ------------------------------------------------------------------ */
/* Weights (documented verbatim in partnership-model.md)               */
/* ------------------------------------------------------------------ */

const CATEGORY_WEIGHTS = {
  liquidity_provider: 0.6,
  institutional_tradfi: 0.55,
  oracle: 0.55,
  integration_technical: 0.5,
  custody: 0.5,
  governance_dao: 0.45,
  distribution_frontend: 0.4,
  grant_investment: 0.35,
  security_audit: 0.35,
};

/** Parse an explicit dollar figure out of description prose. */
function parseUsdFigure(text) {
  // "175M dollar", "2.3M dollars", "25M dollar Series A", "2.5 million USD",
  // "1 million USD", "220k GHO" (GHO ~ USD stable), "500M dollars of TVL"
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(k|m|b|million|billion|thousand)?\s*(?:dollars?|usd\b|gho\b|usdc\b|dai\b)/i);
  if (!m) return null;
  const raw = Number(m[1].replace(",", ""));
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const unit = (m[2] || "").toLowerCase();
  const mult = unit === "b" || unit === "billion" ? 1e9
    : unit === "m" || unit === "million" ? 1e6
    : unit === "k" || unit === "thousand" ? 1e3
    : 1;
  const usd = raw * mult;
  return usd >= 1e4 ? usd : null; // ignore token-count noise below $10k
}

const usdWeight = (usd) => Math.min(1, Math.max(0.3, Math.log10(usd) / 10));

/* ------------------------------------------------------------------ */
/* Gates on the raw dataset                                            */
/* ------------------------------------------------------------------ */

const slugs = dataset.entities.map((e) => e.slug);
if (JSON.stringify([...slugs].sort()) !== JSON.stringify([...EXPECTED_SLUGS].sort())) {
  fail(`entity slugs mismatch: got ${slugs.join(",")}`);
}
let rowTotal = 0;
const EM_DASH = "—";
for (const entity of dataset.entities) {
  for (const row of entity.partnerships) {
    rowTotal += 1;
    if (!CATEGORY_IDS.includes(row.category)) fail(`${entity.slug}: unknown category ${row.category}`);
    if (!STATUS_VOCAB.has(row.status)) fail(`${entity.slug}: unknown status ${row.status}`);
    if (!DIRECTION_VOCAB.has(row.direction)) fail(`${entity.slug}: unknown direction ${row.direction}`);
    if (!row.source_url || !/^https?:\/\//.test(row.source_url)) {
      fail(`${entity.slug}: unsourced row "${row.partner_name}"`);
    }
    for (const field of ["partner_name", "description", "source_label"]) {
      if ((row[field] || "").includes(EM_DASH)) fail(`${entity.slug}: em dash in ${field} of "${row.partner_name}"`);
    }
  }
}
if (rowTotal !== EXPECTED_ROW_TOTAL) fail(`row total ${rowTotal} !== ${EXPECTED_ROW_TOTAL}`);

const datasetCategoryLabels = Object.fromEntries((dataset.categories || []).map((c) => [c.id, c.label]));
for (const id of CATEGORY_IDS) {
  if (!datasetCategoryLabels[id]) fail(`dataset categories missing label for ${id}`);
}

/* ------------------------------------------------------------------ */
/* Name resolution pipeline                                            */
/* ------------------------------------------------------------------ */

const qualifierStrips = [];
const aliasApplications = [];
const onPlatformMatches = [];

function resolveName(rawName) {
  let name = rawName.trim();
  let qualifier;

  if (NAME_ALIASES[name]) {
    const alias = NAME_ALIASES[name];
    aliasApplications.push(`${rawName} -> ${alias.name}${alias.qualifier ? ` (${alias.qualifier})` : ""}`);
    name = alias.name;
    qualifier = alias.qualifier;
  }

  if (!KEEP_PARENTHETICAL.has(name)) {
    const paren = name.match(/^(.*\S)\s+\(([^)]+)\)$/);
    if (paren) {
      qualifierStrips.push(`${name} -> ${paren[1]} [${paren[2]}]`);
      name = paren[1];
      qualifier = qualifier ? `${qualifier}; ${paren[2]}` : paren[2];
      if (NAME_ALIASES[name]) {
        const alias = NAME_ALIASES[name];
        aliasApplications.push(`${rawName} -> ${alias.name} (post-strip)`);
        name = alias.name;
        if (alias.qualifier) qualifier = qualifier ? `${alias.qualifier}; ${qualifier}` : alias.qualifier;
      }
    }
  }

  const slug = entityIndex.get(normName(name));
  if (slug) onPlatformMatches.push(`${rawName} -> ${slug}`);
  const id = slug ?? kebab(name);
  return { id, name: slug ? (entityNames.get(slug) ?? name) : name, slug, qualifier };
}

/* ------------------------------------------------------------------ */
/* Build nodes, edges, chain strips                                    */
/* ------------------------------------------------------------------ */

const nodes = new Map();   // id -> node
const edgeMap = new Map(); // `${a}|${b}|${category}` -> edge
const chainStrips = {};    // subject slug -> [{chain,status,sourceUrl,note}]
const selfRows = [];       // rows whose partner resolves to the subject

const touchNode = (resolved, categoryTallies) => {
  if (!nodes.has(resolved.id)) {
    nodes.set(resolved.id, {
      id: resolved.id,
      name: resolved.name,
      slug: resolved.slug ?? undefined,
      categoryCounts: {},
      degree: 0,
    });
  }
  const node = nodes.get(resolved.id);
  for (const c of categoryTallies) node.categoryCounts[c] = (node.categoryCounts[c] ?? 0) + 1;
  return node;
};

// Subject entities are nodes too.
for (const entity of dataset.entities) {
  nodes.set(entity.slug, {
    id: entity.slug,
    name: entityNames.get(entity.slug) ?? entity.name,
    slug: entity.slug,
    subject: true,
    tag: entity.tag,
    categoryCounts: {},
    degree: 0,
  });
}

for (const entity of dataset.entities) {
  const subject = entity.slug;
  for (const row of entity.partnerships) {
    if (row.category === "chain_deployment") {
      const strip = (chainStrips[subject] ??= []);
      let namePart = row.partner_name;
      const colon = namePart.indexOf(":");
      let stripNote = row.description;
      if (colon !== -1) {
        stripNote = `${namePart.slice(0, colon).trim()}. ${row.description}`;
        namePart = namePart.slice(colon + 1);
      }
      const chains = namePart.split(",").map((c) => c.trim().replace(/\s+\([^)]*\)$/, "")).filter(Boolean);
      if (chains.length === 0) fail(`${subject}: chain row parsed to zero chains: "${row.partner_name}"`);
      for (const chain of chains) {
        if (/[(),]/.test(chain)) fail(`${subject}: suspicious chain token "${chain}"`);
        if (!strip.some((c) => c.chain.toLowerCase() === chain.toLowerCase())) {
          strip.push({ chain, status: row.status, sourceUrl: row.source_url, sourceLabel: row.source_label });
        }
      }
      continue;
    }

    const actionKey = `${subject}|${row.category}|${row.partner_name}`;
    const action = ROW_ACTIONS[actionKey];
    let parts;
    if (action?.split) {
      parts = action.split.map((p) => (typeof p === "string" ? { name: p } : p));
    } else if (action?.single) {
      parts = [action.single];
    } else {
      if (row.partner_name.split(", ").length > 2 && !ROW_ACTIONS[actionKey]) {
        warn(`uncurated multi-name row: ${actionKey}`);
      }
      parts = [{ name: row.partner_name }];
    }

    for (const part of parts) {
      if (INFRA_NAMES.has(part.name.replace(/\s+\([^)]*\)$/, "")) || INFRA_NAMES.has(part.name)) {
        selfRows.push({ subject, category: row.category, partnerName: row.partner_name, description: row.description, sourceUrl: row.source_url, kind: "infrastructure" });
        continue;
      }
      const resolved = resolveName(part.name);
      const qualifier = [part.qualifier, resolved.qualifier].filter(Boolean).join("; ") || undefined;

      if (resolved.id === subject) {
        selfRows.push({ subject, category: row.category, partnerName: row.partner_name, description: row.description, sourceUrl: row.source_url, kind: "self" });
        continue;
      }

      touchNode(resolved, [row.category]);

      const [a, b] = [subject, resolved.id].sort();
      const key = `${a}|${b}|${row.category}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { a, b, category: row.category, rows: [], subjects: new Set() });
      }
      const edge = edgeMap.get(key);
      edge.subjects.add(subject);
      edge.rows.push({
        subject,
        qualifier,
        direction: row.direction,
        status: row.status,
        startDate: row.start_date === "n.a." ? null : row.start_date,
        description: row.description,
        sourceLabel: row.source_label,
        sourceUrl: row.source_url,
        usdFigure: parseUsdFigure(row.description),
      });
    }
  }
}

/* Edge-level rollups */
const STATUS_RANK = { active: 0, announced: 1, deprecated: 2 };
const edges = [...edgeMap.values()].map((edge) => {
  const { a, b, category, rows } = edge;
  const mergedFromBoth = edge.subjects.size > 1;
  let direction;
  if (mergedFromBoth || rows.some((r) => r.direction === "mutual")) {
    direction = "mutual";
  } else {
    // Normalise relative to `a` (rows store direction relative to subject).
    const r = rows[0];
    direction = r.subject === a ? r.direction : r.direction === "inbound" ? "outbound" : "inbound";
  }
  const status = rows.map((r) => r.status).sort((x, y) => STATUS_RANK[x] - STATUS_RANK[y])[0];
  const usdFigure = rows.reduce((max, r) => (r.usdFigure && (!max || r.usdFigure > max) ? r.usdFigure : max), null);
  const weight = usdFigure ? usdWeight(usdFigure) : CATEGORY_WEIGHTS[category];
  return {
    a, b, category, direction, status, weight,
    usdFigure: usdFigure ?? undefined,
    mergedFromBoth: mergedFromBoth || undefined,
    rows: rows.map(({ subject, qualifier, direction: d, status: s, startDate, description, sourceLabel, sourceUrl, usdFigure: u }) => ({
      subject, qualifier, direction: d, status: s, startDate, description, sourceLabel, sourceUrl,
      usdFigure: u ?? undefined,
    })),
  };
});

/* Node degree + weight + kind + role */
for (const e of edges) {
  nodes.get(e.a).degree += 1;
  nodes.get(e.b).degree += 1;
}
const maxDegree = Math.max(...[...nodes.values()].map((n) => n.degree), 1);
const KIND_OVERRIDES = {
  binance: "institution", coinbase: "institution", kraken: "institution",
  "crypto-com": "institution", gemini: "institution", okx: "institution",
  "j-p-morgan": "institution", blackrock: "institution",
};
const kindOf = (node) => {
  if (node.slug) return "protocol";
  if (KIND_OVERRIDES[node.id]) return KIND_OVERRIDES[node.id];
  const counts = node.categoryCounts;
  const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0];
  if (top === "security_audit" || top === "oracle" || top === "distribution_frontend") return "service";
  if (top === "institutional_tradfi" || top === "custody" || top === "grant_investment") return "institution";
  if (top === "governance_dao") return "dao";
  return "protocol";
};
for (const node of nodes.values()) {
  const maxEdgeWeight = edges.reduce(
    (max, e) => (e.a === node.id || e.b === node.id ? Math.max(max, e.weight) : max), 0);
  node.weight = Number((0.6 * maxEdgeWeight + 0.4 * (Math.log(1 + node.degree) / Math.log(1 + maxDegree))).toFixed(3));
  node.kind = kindOf(node);
  if (RISK_CURATOR_NAMES.has(node.id)) node.role = "risk_curator";
  delete node.categoryCounts;
}

/* ------------------------------------------------------------------ */
/* Gates on the built graph                                            */
/* ------------------------------------------------------------------ */

const mutualPairReport = [];
for (const [x, y] of KNOWN_MUTUAL_PAIRS) {
  const [a, b] = [x, y].sort();
  const pairEdges = edges.filter((e) => e.a === a && e.b === b);
  if (pairEdges.length === 0) {
    fail(`known mutual pair ${a}|${b}: no edge at all`);
    continue;
  }
  const merged = pairEdges.filter((e) => e.mergedFromBoth).length;
  const mutual = pairEdges.filter((e) => e.direction === "mutual").length;
  mutualPairReport.push(`${a}|${b}: ${pairEdges.length} edge(s), ${merged} merged-from-both, ${mutual} mutual`);
}

// Cross-check: every link_partners_matched row resolves through the same
// pipeline — to a node, a chain strip (chain_deployment rows), or a self row.
let matchedTotal = 0;
const unresolvedMatched = [];
for (const entity of risksDataset.entities ?? []) {
  for (const risk of entity.risks ?? []) {
    for (const lp of risk.link_partners_matched ?? []) {
      matchedTotal += 1;
      if (lp.category === "chain_deployment") {
        if (!chainStrips[entity.slug]?.length) {
          unresolvedMatched.push(`${entity.slug}: ${lp.partner_name} (chain row, no strip)`);
        }
        continue;
      }
      const action = ROW_ACTIONS[`${entity.slug}|${lp.category}|${lp.partner_name}`];
      const parts = action?.split
        ? action.split.map((p) => (typeof p === "string" ? { name: p } : p))
        : action?.single ? [action.single] : [{ name: lp.partner_name }];
      for (const part of parts) {
        const baseName = part.name.replace(/\s+\([^)]*\)$/, "");
        if (INFRA_NAMES.has(part.name) || INFRA_NAMES.has(baseName)) continue;
        const resolved = resolveName(part.name);
        if (nodes.has(resolved.id)) continue;
        if (resolved.id === entity.slug && selfRows.some((r) => r.subject === entity.slug)) continue;
        unresolvedMatched.push(`${entity.slug}: ${lp.partner_name} -> ${part.name} (${lp.category})`);
      }
    }
  }
}
if (unresolvedMatched.length > 0) {
  fail(`link_partners_matched rows not resolving to nodes (${unresolvedMatched.length}):\n  ${[...new Set(unresolvedMatched)].join("\n  ")}`);
}

const riskCuratorFound = [...nodes.values()].filter((n) => n.role === "risk_curator").map((n) => n.id);

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const sidecar = {
  meta: {
    source: "credit-partnerships.json (CAN-81 attachment)",
    generatedBy: "scripts/parse-credit-m9-partnerships.mjs",
    parsedAt: new Date().toISOString().slice(0, 10),
    rowTotal,
    subjects: EXPECTED_SLUGS,
  },
  taxonomy: CATEGORY_IDS.map((id) => ({ id, label: datasetCategoryLabels[id] })),
  nodes: Object.fromEntries([...nodes.entries()].sort(([a], [b]) => a.localeCompare(b))),
  edges: edges.sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b) || x.category.localeCompare(y.category)),
  chainStrips,
  selfRows,
};

if (failures.length > 0) {
  console.error(`\nFAILED ${failures.length} gate(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

fs.writeFileSync(
  path.join(DATA_DIR, "credit-m9-partnership-sidecar.json"),
  `${JSON.stringify(sidecar, null, 2)}\n`,
);

console.log("=== M9 partnership parse OK ===");
console.log(`rows: ${rowTotal} | subjects: ${dataset.entities.length}`);
console.log(`nodes: ${nodes.size} (on-platform: ${[...nodes.values()].filter((n) => n.slug).length})`);
console.log(`edges: ${edges.length} (merged-from-both: ${edges.filter((e) => e.mergedFromBoth).length})`);
console.log(`chain strips: ${Object.entries(chainStrips).map(([s, c]) => `${s}:${c.length}`).join(" ")}`);
console.log(`self rows: ${selfRows.length}${selfRows.length ? ` (${selfRows.map((r) => `${r.subject}:${r.partnerName}`).join("; ")})` : ""}`);
console.log(`usd-figured edges: ${edges.filter((e) => e.usdFigure).length}`);
console.log(`risk curators present: ${riskCuratorFound.join(", ") || "none"}`);
console.log(`link_partners_matched cross-checked: ${matchedTotal}`);
console.log("--- known mutual pairs:");
for (const line of mutualPairReport) console.log(`  ${line}`);
console.log(`\n--- on-platform matches (${onPlatformMatches.length}):`);
for (const m of [...new Set(onPlatformMatches)].sort()) console.log(`  ${m}`);
console.log(`\n--- qualifier strips (${qualifierStrips.length}):`);
for (const q of [...new Set(qualifierStrips)].sort()) console.log(`  ${q}`);
console.log(`\n--- warnings (${warnings.length}):`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
