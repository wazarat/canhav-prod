#!/usr/bin/env node
/**
 * parse-credit-m5-research.mjs — M5 (CAN-67): parse the compiled Research
 * dataset (~/Downloads/credit-research-m5.md, also attached to CAN-67) into
 * frontend/scripts/data/credit-m5-research.json, keyed by slug with KV
 * PascalCase fields ready for push-credit-m5-research.mjs.
 *
 * Sections 1-9 map onto entity fields; section 10 (cross-links) is join keys
 * only and lands in a separate `crossLinks` block (M7/M8/M9 datasets resolve
 * them later; the UI renders unresolved names as plain text).
 *
 * Hard-fails on: em dashes in any emitted string, unsourced bull/bear bullets,
 * unknown entity headings, or a missing required section (outside the gaps the
 * dataset preamble documents). Prints a per-entity coverage matrix.
 *
 * Usage: node scripts/parse-credit-m5-research.mjs [path-to-md]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC =
  process.argv[2] ??
  join(process.env.HOME ?? "", "Downloads", "credit-research-m5.md");
const OUT = join(__dirname, "data", "credit-m5-research.json");
const CAPTURED_AT = "2026-07-26";

/** Part 1 headings carry no `(slug: x)`; Part 3 mostly not either. */
const NAME_TO_SLUG = {
  aave: "aave",
  compound: "compound",
  morpho: "morpho",
  "radiant capital": "radiant",
  spark: "spark",
  pendle: "pendle",
  "notional finance": "notional",
  spectra: "spectra",
  "sense finance": "sense",
  "maple finance": "maple",
};

const EXPECTED_SLUGS = [
  "aave", "compound", "morpho", "radiant", "spark",
  "gearbox", "stella", "extra-finance", "fluid",
  "pendle", "notional", "spectra", "sense", "maple",
];

const PUBLICATION_TYPES = new Set([
  "risk assessment", "analyst report", "academic paper", "audit",
  "governance analysis", "incident post mortem", "data dashboard",
]);

/* ----------------------------- md helpers ------------------------------ */

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** First markdown link in a string -> { label, url } or null. */
function firstLink(text) {
  LINK_RE.lastIndex = 0;
  const m = LINK_RE.exec(text ?? "");
  return m ? { label: m[1].trim(), url: m[2].trim() } : null;
}

/** Replace [text](url) with text. */
function stripLinks(text) {
  return (text ?? "").replace(LINK_RE, "$1").trim();
}

/** Strip **bold** markers, keep content. */
function stripBold(text) {
  return (text ?? "").replace(/\*\*([^*]+)\*\*/g, "$1").trim();
}

function isNa(cell) {
  const t = stripLinks(cell ?? "").trim().toLowerCase();
  return t === "" || t === "n.a." || t === "n.a" || t.startsWith("n.a.,") || t.startsWith("n.a., ");
}

/** "Launch date" -> "launchDate" (matches existing OffchainFact key style). */
function camelKey(label) {
  const words = stripLinks(label)
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/);
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
}

/** Parse a markdown table (array of lines) -> array of row-cell arrays. */
function parseTable(lines) {
  const rows = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    if (/^\|[\s:|-]+\|$/.test(t)) continue; // separator row
    const cells = t
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    rows.push(cells);
  }
  return rows.length > 1 ? rows.slice(1) : []; // drop header row
}

/** "$2,300,000" / "$16.2M" / "$4.5m" -> number, else null. */
function parseAmountUsd(cell) {
  const text = stripLinks(cell);
  if (isNa(text)) return null;
  if (/\bto\b|–|-\s*\$/.test(text) && (text.match(/\$/g) ?? []).length > 1) return null; // range
  const m = text.match(/\$\s?([\d,]+(?:\.\d+)?)\s*([mbk])?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const suffix = (m[2] ?? "").toLowerCase();
  if (suffix === "k") n *= 1e3;
  if (suffix === "m") n *= 1e6;
  if (suffix === "b") n *= 1e9;
  return Math.round(n);
}

const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Extract an ISO date from prose like "12 Mar 2024" / "page dated 29 Jun 2026". */
function parseIsoDate(cell) {
  const text = stripLinks(cell ?? "");
  if (isNa(text) || /not dated|undated|accessed/i.test(text)) {
    // "accessed <date>" is an access date, not a publication date.
    if (/accessed/i.test(text) && !/dated/i.test(text)) return null;
    if (/not dated|undated/i.test(text)) return null;
  }
  const dmy = text.match(/(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})/);
  if (dmy) {
    const mm = MONTHS[dmy[2].slice(0, 3).toLowerCase()];
    if (mm) return `${dmy[3]}-${mm}-${dmy[1].padStart(2, "0")}`;
  }
  const my = text.match(/([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})/);
  if (my) {
    const mm = MONTHS[my[1].slice(0, 3).toLowerCase()];
    if (mm) return `${my[2]}-${mm}`;
  }
  const y = text.match(/\b(20\d\d)\b/);
  return y ? y[1] : null;
}

/* ----------------------------- section split --------------------------- */

const raw = readFileSync(SRC, "utf8");
const allLines = raw.split("\n");

/** Split the file into entity blocks: { heading, lines } for every H2 that is an entity. */
const SKIP_H2 = new Set(["what this is", "read this before writing code", "known gaps to log in m11", "coverage notes", "sources note"]);

const entities = [];
let current = null;
for (const line of allLines) {
  const h2 = line.match(/^## (.+)$/);
  if (h2) {
    const title = h2[1].trim();
    if (SKIP_H2.has(title.toLowerCase())) {
      current = null;
      continue;
    }
    current = { heading: title, lines: [] };
    entities.push(current);
    continue;
  }
  if (/^# /.test(line)) {
    current = null; // part boundary / preamble
    continue;
  }
  if (current) current.lines.push(line);
}

function slugFor(heading) {
  const m = heading.match(/\(slug:\s*([a-z0-9-]+)\)/i);
  if (m) return m[1];
  const name = heading.split(",")[0].trim().toLowerCase();
  return NAME_TO_SLUG[name] ?? null;
}

/** Split an entity's lines into named sections keyed by normalized heading. */
function splitSections(lines) {
  const sections = {};
  let name = null;
  for (const line of lines) {
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      name = h3[1].trim().replace(/^\d+\.\s*/, "").toLowerCase();
      sections[name] = [];
      continue;
    }
    if (name) sections[name].push(line);
  }
  return sections;
}

function sectionByPrefix(sections, prefix) {
  const key = Object.keys(sections).find((k) => k.startsWith(prefix));
  return key ? sections[key] : null;
}

function paragraphsOf(lines) {
  return lines
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("|") && p !== "---");
}

/* ----------------------------- per-section parsers --------------------- */

/** Prose emission: links kept for InlineLinkText, bold markers stripped. */
function prose(paras) {
  return paras.map((p) => p.replace(/\*\*([^*]+)\*\*/g, "$1")).join("\n\n");
}

function parseThesis(lines) {
  return prose(paragraphsOf(lines));
}

function parseKeyFacts(lines) {
  return parseTable(lines).map((cells) => {
    const [fact, value, source] = cells;
    const link = firstLink(source ?? "");
    return {
      key: camelKey(fact ?? ""),
      value: stripLinks(value ?? ""),
      freshness: "static",
      capturedAt: CAPTURED_AT,
      source: link ?? { label: stripLinks(source ?? ""), url: "" },
    };
  }).filter((f) => f.key && f.value && !isNa(f.value));
}

function parseTradFi(lines) {
  const paras = paragraphsOf(lines);
  const headline = paras.length ? stripBold(paras[0]).replace(/^Closest (analogue|instrument):\s*/i, "") : null;
  const rows = parseTable(lines).map((cells) => {
    const [dimension, protocolSide, tradFiSide, source] = cells;
    const link = firstLink(source ?? "");
    return {
      // Legacy required fields mirror the card fields so old consumers keep working.
      product: stripLinks(dimension ?? ""),
      similarity: stripLinks(protocolSide ?? ""),
      differences: stripLinks(tradFiSide ?? ""),
      dimension: stripLinks(dimension ?? ""),
      protocolSide: stripLinks(protocolSide ?? ""),
      tradFiSide: stripLinks(tradFiSide ?? ""),
      sourceLabel: link?.label ?? null,
      sourceUrl: link?.url ?? null,
    };
  });
  return { headline, rows };
}

function parseOrg(lines, extraLines, extraHeading) {
  const paras = paragraphsOf(lines);
  const intro = paras.length ? prose(paras) : null;
  // Bullet lists survive paragraphsOf as single blocks; keep them as prose lines.
  let extra = extraLines ? prose(paragraphsOf(extraLines)) : "";
  if (extra && extraHeading) extra = `${extraHeading}. ${extra}`;
  const rows = parseTable(lines).map((cells) => {
    const [name, role, source] = cells;
    const link = firstLink(source ?? "");
    return {
      name: stripLinks(name ?? ""),
      role: stripLinks(role ?? ""),
      description: "",
      link: link?.url ?? null,
    };
  });
  return {
    intro: [intro, extra].filter(Boolean).join("\n\n") || null,
    rows,
  };
}

function parseFunding(lines) {
  const rows = [];
  for (const cells of parseTable(lines)) {
    const [date, round, amount, lead, others, source] = cells;
    if (stripLinks(date ?? "").trim().toLowerCase() === "total") continue;
    const link = firstLink(source ?? "");
    const splitNames = (cell) =>
      isNa(cell) || /disclosed|no single lead/i.test(stripLinks(cell))
        ? []
        : stripLinks(cell)
            .split(/,\s*/)
            .map((s) => s.replace(/\s+are listed as investors\.?$/i, "").trim())
            .filter(Boolean);
    const leadInvestors = splitNames(lead);
    const investors = splitNames(others);
    rows.push({
      date: stripLinks(date ?? ""),
      round: stripLinks(round ?? ""),
      amountUsd: parseAmountUsd(amount ?? ""),
      amountLabel: isNa(amount) ? null : stripLinks(amount ?? ""),
      leadInvestors,
      investors,
      link: link?.url ?? null,
    });
  }
  const note = prose(paragraphsOf(lines)) || null;
  return { rows, note };
}

function parseTimeline(lines) {
  return parseTable(lines).map((cells) => {
    const [date, event, why, source] = cells;
    const link = firstLink(source ?? "");
    return {
      date: stripLinks(date ?? ""),
      title: stripLinks(event ?? ""),
      description: stripLinks(why ?? ""),
      link: link?.url ?? null,
    };
  });
}

function parseFaq(lines) {
  const items = [];
  let question = null;
  let answer = [];
  const flush = () => {
    if (question && answer.length) {
      items.push({ question, answer: prose(answer).trim() });
    }
    question = null;
    answer = [];
  };
  for (const para of paragraphsOf(lines)) {
    const q = para.match(/^\*\*(.+?)\*\*\s*\n?([\s\S]*)$/);
    if (q) {
      flush();
      question = stripLinks(q[1]).replace(/^Q:\s*/i, "").trim();
      const rest = q[2].trim();
      if (rest) answer.push(rest);
    } else if (question) {
      answer.push(para);
    }
  }
  flush();
  return items;
}

function parseBullBear(lines) {
  const bull = [];
  const bear = [];
  let side = null;
  for (const line of lines) {
    const t = line.trim();
    const head = t.match(/^\*\*(Bull|Bear)[^*]*\*\*$/i);
    if (head) {
      side = head[1].toLowerCase() === "bull" ? bull : bear;
      continue;
    }
    const bullet = t.match(/^[-*]\s+(.+)$/);
    if (bullet && side) {
      const text = bullet[1];
      const link = firstLink(text);
      if (!link) throw new Error(`Unsourced bull/bear bullet: ${text.slice(0, 80)}`);
      side.push({
        claim: stripLinks(text),
        sourceLabel: link.label,
        sourceUrl: link.url,
      });
    }
  }
  return bull.length || bear.length ? { bull, bear } : null;
}

function parsePublications(lines, slug) {
  return parseTable(lines).map((cells) => {
    const [publisher, title, date, type, url, takeaway] = cells;
    const t = stripLinks(type ?? "").toLowerCase();
    if (!PUBLICATION_TYPES.has(t)) {
      throw new Error(`${slug}: unknown publication type "${t}"`);
    }
    return {
      publisher: stripLinks(publisher ?? ""),
      title: stripLinks(title ?? ""),
      date: parseIsoDate(date ?? ""),
      type: t,
      url: stripLinks(url ?? "").trim(),
      takeaway: stripLinks(takeaway ?? ""),
    };
  });
}

function parseCrossLinks(lines) {
  const out = {};
  for (const line of lines) {
    const m = line.trim().match(/^(?:[-*]\s*)?(partners|competitors|risks):\s*(.+)$/i);
    if (m) {
      out[m[1].toLowerCase()] = m[2].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return out;
}

/* ----------------------------- drive ----------------------------------- */

const content = {};
const crossLinks = {};
const coverage = [];

for (const entity of entities) {
  const slug = slugFor(entity.heading);
  if (!slug) throw new Error(`Unknown entity heading: "${entity.heading}"`);
  const sections = splitSections(entity.lines);

  const thesis = sectionByPrefix(sections, "thesis");
  const keyFacts = sectionByPrefix(sections, "key facts");
  const tradfi = sectionByPrefix(sections, "tradfi analogy");
  const org = sectionByPrefix(sections, "organisation");
  const orgExtra = sectionByPrefix(sections, "where spark"); // Spark's mandate section
  const funding = sectionByPrefix(sections, "funding history");
  const timeline = sectionByPrefix(sections, "timeline");
  const faq = sectionByPrefix(sections, "faq");
  const bullBear = sectionByPrefix(sections, "bull case");
  const research = sectionByPrefix(sections, "external research");
  const cross = sectionByPrefix(sections, "cross-links");

  const tradfiParsed = tradfi ? parseTradFi(tradfi) : { headline: null, rows: [] };
  const orgParsed = org
    ? parseOrg(org, orgExtra, orgExtra ? "Where Spark's mandate ends and Sky's begins" : null)
    : { intro: null, rows: [] };
  const fundingParsed = funding ? parseFunding(funding) : { rows: [], note: null };

  const item = {
    LongDescription: thesis ? parseThesis(thesis) : null,
    OffchainFacts: keyFacts ? parseKeyFacts(keyFacts) : [],
    TradFiAnalogue: tradfiParsed.headline,
    TradFiComparison: tradfiParsed.rows,
    OrgIntro: orgParsed.intro,
    OrgStructure: orgParsed.rows,
    InvestmentRounds: fundingParsed.rows,
    FundingNote: fundingParsed.note,
    Timeline: timeline ? parseTimeline(timeline) : [],
    Faq: faq ? parseFaq(faq) : [],
    BullBearCase: bullBear ? parseBullBear(bullBear) : null,
    ResearchPublications: research ? parsePublications(research, slug) : [],
  };
  content[slug] = item;
  if (cross) crossLinks[slug] = parseCrossLinks(cross);

  coverage.push({
    slug,
    thesisParas: item.LongDescription ? item.LongDescription.split("\n\n").length : 0,
    facts: item.OffchainFacts.length,
    tradfi: item.TradFiComparison.length,
    org: item.OrgStructure.length,
    rounds: item.InvestmentRounds.length,
    timeline: item.Timeline.length,
    faq: item.Faq.length,
    bull: item.BullBearCase?.bull.length ?? 0,
    bear: item.BullBearCase?.bear.length ?? 0,
    pubs: item.ResearchPublications.length,
  });
}

/* ----------------------------- assertions ------------------------------ */

const gotSlugs = Object.keys(content).sort();
const wantSlugs = [...EXPECTED_SLUGS].sort();
if (JSON.stringify(gotSlugs) !== JSON.stringify(wantSlugs)) {
  throw new Error(
    `Slug mismatch.\n got: ${gotSlugs.join(", ")}\nwant: ${wantSlugs.join(", ")}`,
  );
}

// Em-dash sweep over every emitted string (the "—" placeholder glyph is a
// component-code concern, not dataset prose — none may enter the store).
const EM_DASH = "\u2014";
function sweep(value, path) {
  if (typeof value === "string" && value.includes(EM_DASH)) {
    throw new Error(`Em dash at ${path}: ${value.slice(0, 100)}`);
  }
  if (Array.isArray(value)) value.forEach((v, i) => sweep(v, `${path}[${i}]`));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) sweep(v, `${path}.${k}`);
  }
}
sweep(content, "content");
sweep(crossLinks, "crossLinks");

// Documented-gap-aware section presence: every entity needs the core sections.
for (const row of coverage) {
  const missing = [];
  if (!row.thesisParas) missing.push("thesis");
  if (!row.facts) missing.push("key facts");
  if (!row.tradfi) missing.push("tradfi");
  if (!row.org) missing.push("organisation");
  if (!row.timeline) missing.push("timeline");
  if (!row.faq) missing.push("faq");
  if (!row.bull && !row.bear) missing.push("bull/bear");
  if (!row.pubs) missing.push("publications");
  // Funding rows may legitimately be zero (stella, extra-finance) — FundingNote
  // then carries the stated absence.
  if (missing.length) {
    throw new Error(`${row.slug}: missing sections: ${missing.join(", ")}`);
  }
  if (!content[row.slug].InvestmentRounds.length && !content[row.slug].FundingNote) {
    throw new Error(`${row.slug}: no funding rows AND no funding note`);
  }
}

/* ----------------------------- write ----------------------------------- */

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ capturedAt: CAPTURED_AT, source: "credit-research-m5.md", content, crossLinks }, null, 2) + "\n",
);

console.log(`Parsed ${gotSlugs.length} entities -> ${OUT}\n`);
console.log(
  "slug".padEnd(14),
  ["thesis¶", "facts", "tradfi", "org", "rounds", "tl", "faq", "bull", "bear", "pubs"].map((h) => h.padStart(7)).join(""),
);
for (const r of coverage) {
  console.log(
    r.slug.padEnd(14),
    [r.thesisParas, r.facts, r.tradfi, r.org, r.rounds, r.timeline, r.faq, r.bull, r.bear, r.pubs]
      .map((n) => String(n).padStart(7))
      .join(""),
  );
}
