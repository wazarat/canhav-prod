#!/usr/bin/env node
/**
 * Four-user stablecoin/yield agent demo seeder (Arbitrum Sepolia, testnet only).
 *
 * Seeds four discoverable marketplace agents that look like independent community
 * builders — not CanHav team agents. Each agent has:
 *   - A realistic user profile + private user skill
 *   - ERC-8004-style profile (placeholder wallet)
 *   - Initial verdict history + sample research runs
 *   - Cross-agent collab log entries + reputation
 *   - Combined verdicts for sUSDe and sUSDai pairs
 *
 * Usage (production Upstash):
 *   KV_REST_API_URL="..." KV_REST_API_TOKEN="..." node scripts/yield-agents-demo.mjs
 *
 * Usage (local JSON fallback):
 *   node scripts/yield-agents-demo.mjs
 *
 * Never touches git or deploys contracts.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Redis } from "@upstash/redis";
import { keccak256, toBytes } from "viem";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const DATA_DIR = path.join(REPO_ROOT, "backend", "data");
const CHAIN = "arbitrum-sepolia";
const PRICE = process.env.COLLAB_PRICE_DEFAULT_USDC || "0.10";

/* ------------------------------- env load -------------------------------- */

function loadEnvLocal() {
  const envPath = path.resolve(HERE, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvLocal();

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = Boolean(KV_URL && KV_TOKEN);
const redis = USE_REDIS ? new Redis({ url: KV_URL, token: KV_TOKEN }) : null;

const nowIso = () => new Date().toISOString();

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

/* ------------------------------ personas --------------------------------- */

const USERS = [
  {
    userId: "did:community:meridian",
    displayName: "meridian_defi",
    email: "meridian@research.mail",
    createdAt: daysAgo(52),
  },
  {
    userId: "did:community:deltafund",
    displayName: "delta_funding_lab",
    email: "delta@funding.watch",
    createdAt: daysAgo(41),
  },
  {
    userId: "did:community:infrafi",
    displayName: "infrafi_scout",
    email: "scout@infrafi.io",
    createdAt: daysAgo(28),
  },
  {
    userId: "did:community:gpuyield",
    displayName: "gpu_yield_watch",
    email: "yield@gpu-monitor.dev",
    createdAt: daysAgo(19),
  },
];

function makeSkill(id, authorUserId, title, summary, facts, sections, sources) {
  return {
    id,
    title,
    summary,
    facts,
    sections,
    actions: [
      {
        name: "read_onchain_state",
        description: "Read token supply, pool reserves, and core protocol state (read-only).",
        signature: "read_onchain_state(asset: string): object",
        readOnly: true,
      },
      {
        name: "emit_verdict",
        description: "Emit a typed research verdict (off-chain; optional gated on-chain publish).",
        signature: "emit_verdict(signal: string, severity: uint8): void",
        readOnly: true,
      },
    ],
    sources,
    glossary: [],
    origin: "user-authored",
    authorUserId,
    visibility: "private",
    version: "1.0.0",
    createdAt: daysAgo(30),
    updatedAt: nowIso(),
  };
}

const skills = [
  makeSkill(
    "uskill_meridian_susde_peg",
    USERS[0].userId,
    "sUSDe peg & supply monitor",
    "Tracks Ethena sUSDe supply growth, pool liquidity, and peg deviation on Arbitrum. Research-only.",
    [
      { key: "Network", value: "Arbitrum Sepolia (agent identity) · Arbitrum One (reads)" },
      { key: "Asset", value: "sUSDe (Ethena staked USDe)" },
      { key: "Mode", value: "Read-only research — no trading" },
    ],
    [
      {
        heading: "Supply",
        body: "Compare totalSupply snapshots; flag supply_contraction when supply falls >2% between hourly reads.",
      },
      {
        heading: "Peg",
        body: "Compare spot vs $1; flag peg_risk when deviation exceeds 50 bps.",
      },
    ],
    [
      { label: "Ethena docs", url: "https://docs.ethena.fi" },
      { label: "Dune — Ethena", url: "https://dune.com/wazarat/ethena-usdai" },
    ],
  ),
  makeSkill(
    "uskill_delta_susde_yield",
    USERS[1].userId,
    "Ethena funding & sUSDe yield",
    "Monitors perpetual funding contribution to sUSDe APY and flags yield_compression when trailing yield falls.",
    [
      { key: "Network", value: "Arbitrum Sepolia (testnet)" },
      { key: "Yield source", value: "Delta-neutral hedge funding + stablecoin reserve yield" },
    ],
    [
      {
        heading: "APY trend",
        body: "Derive implied APY from 30d price appreciation; compare vs prior snapshot for compression signals.",
      },
      {
        heading: "Funding durability",
        body: "Negative funding regimes compress sUSDe yield — watch for catalyst_negative when 24h drift turns.",
      },
    ],
    [
      { label: "Ethena docs", url: "https://docs.ethena.fi" },
      { label: "OAK Research", url: "https://oakresearch.io/en/analyses/fundamentals/ethena-ena-deep-dive-into-ecosystem" },
    ],
  ),
  makeSkill(
    "uskill_infrafi_susdai",
    USERS[2].userId,
    "sUSDai reserve & backing scout",
    "Reads USD.AI sUSDai supply and collateralization signals for InfraFi synthetic dollar health.",
    [
      { key: "Network", value: "Arbitrum Sepolia (testnet)" },
      { key: "Asset", value: "sUSDai (USD.AI yield dollar)" },
    ],
    [
      {
        heading: "Backing",
        body: "GPU-collateralized lending backs sUSDai; monitor supply trends and peg stability.",
      },
      {
        heading: "Reserve health",
        body: "Flag reserve_diversification when off-chain attestation cadence or supply trend shifts.",
      },
    ],
    [
      { label: "USD.AI docs", url: "https://docs.usd.ai/" },
      { label: "CoinGecko sUSDai", url: "https://www.coingecko.com/en/coins/susdai" },
    ],
  ),
  makeSkill(
    "uskill_gpu_susdai_yield",
    USERS[3].userId,
    "GPU loan yield monitor",
    "Tracks sUSDai implied APY from GPU-collateralized repayment streams; flags compression and catalysts.",
    [
      { key: "Network", value: "Arbitrum Sepolia (testnet)" },
      { key: "Yield source", value: "USD.AI GPU-collateralized lending repayments" },
    ],
    [
      {
        heading: "Repayment stream",
        body: "Yield accrues from originated GPU loans; compression signals when implied APY drops vs trailing.",
      },
      {
        heading: "Pipeline catalysts",
        body: "New facility drawdowns can lift yield_strength; stalled origination triggers catalyst_negative.",
      },
    ],
    [
      { label: "USD.AI insights", url: "https://usd.ai/insights" },
      { label: "USD.AI docs", url: "https://docs.usd.ai/" },
    ],
  ),
];

const agents = [
  {
    agentId: "900101",
    name: "Meridian Peg Watch",
    category: "stablecoins",
    skill: skills[0],
    user: USERS[0],
    entitySlug: "ethena",
    asset: "sUSDe",
    kind: "stablecoin",
    wallet: "0x0000000000000000000000000000000000000101",
    accountIndex: 9101,
    description:
      "Independent sUSDe peg & supply researcher on Arbitrum. Hourly typed verdicts — never trades or moves funds.",
    services: [
      {
        title: "Hourly peg digest",
        description: "Supply trend + peg deviation read for sUSDe with typed severity.",
      },
    ],
    createdAt: daysAgo(48),
  },
  {
    agentId: "900102",
    name: "Delta Funding Lab",
    category: "yield",
    skill: skills[1],
    user: USERS[1],
    entitySlug: "ethena",
    asset: "sUSDe",
    kind: "yield",
    wallet: "0x0000000000000000000000000000000000000102",
    accountIndex: 9102,
    description:
      "Tracks Ethena funding-driven yield behind sUSDe. Publishes APY compression and catalyst verdicts.",
    services: [
      {
        title: "Weekly yield compression scan",
        description: "Trailing APY vs current implied yield with catalyst flags.",
      },
    ],
    createdAt: daysAgo(39),
  },
  {
    agentId: "900103",
    name: "InfraFi Reserve Scout",
    category: "stablecoins",
    skill: skills[2],
    user: USERS[2],
    entitySlug: "usd-ai",
    asset: "sUSDai",
    kind: "stablecoin",
    wallet: "0x0000000000000000000000000000000000000103",
    accountIndex: 9103,
    description:
      "Monitors USD.AI sUSDai backing and supply on Arbitrum. Research-only InfraFi stablecoin scout.",
    services: [
      {
        title: "Reserve health check",
        description: "Supply + backing ratio read with peg risk signals.",
      },
    ],
    createdAt: daysAgo(25),
  },
  {
    agentId: "900104",
    name: "GPU Yield Monitor",
    category: "yield",
    skill: skills[3],
    user: USERS[3],
    entitySlug: "usd-ai",
    asset: "sUSDai",
    kind: "yield",
    wallet: "0x0000000000000000000000000000000000000104",
    accountIndex: 9104,
    description:
      "Watches GPU-loan repayment yield behind sUSDai. Flags yield_strength and compression for collaborators.",
    services: [
      {
        title: "GPU yield durability report",
        description: "Implied APY trend + origination catalyst read.",
      },
    ],
    createdAt: daysAgo(17),
  },
];

function offerSkillId(agentId) {
  return `offer:${agentId}`;
}

function skillToMarkdown(skill) {
  const lines = [
    `# ${skill.title}`,
    "",
    `> ${skill.summary}`,
    "",
    `- **ID:** ${skill.id}`,
    `- **Version:** ${skill.version}`,
    "",
    "## Facts",
    "",
    ...skill.facts.map((f) => `- **${f.key}:** ${f.value}`),
    "",
    "## Sections",
    "",
    ...skill.sections.flatMap((s) => [`### ${s.heading}`, "", s.body, ""]),
  ];
  if (skill.sources.length) {
    lines.push("", "## Sources", "");
    skill.sources.forEach((s) => lines.push(`- [${s.label}](${s.url})`));
  }
  return lines.join("\n");
}

function buildAgentOfferSkill(profile, userSkill) {
  return {
    id: offerSkillId(profile.agentId),
    title: `${profile.name} — bundled expertise`,
    summary: userSkill.summary,
    facts: userSkill.facts,
    sections: userSkill.sections.map((s) => ({
      heading: `${userSkill.title}: ${s.heading}`,
      body: s.body,
    })),
    actions: [],
    sources: userSkill.sources,
    version: "1.0.0",
    updatedAt: profile.updatedAt,
  };
}

function agentOfferHash(profile, userSkill) {
  return keccak256(toBytes(skillToMarkdown(buildAgentOfferSkill(profile, userSkill))));
}

function makeVerdict(agent, signal, severity, rationale, confidence, hoursBack) {
  return {
    agentId: agent.agentId,
    asset: agent.asset,
    kind: agent.kind,
    signal,
    severity,
    confidence,
    rationale,
    ts: hoursAgo(hoursBack),
  };
}

const initialVerdicts = {
  "900101": [
    makeVerdict(agents[0], "supply_growth", "low", "sUSDe supply ticked up ~1.2% over the last 24h — within normal Ethena mint cadence.", 0.68, 72),
    makeVerdict(agents[0], "reserve_diversification", "low", "Pool TVL present; no peg stress at this cadence.", 0.65, 48),
    makeVerdict(agents[0], "peg_risk", "medium", "Spot price $0.9962 deviates -38 bps from $1 — watch funding regime.", 0.74, 12),
    makeVerdict(agents[0], "supply_growth", "low", "Supply flat hour-over-hour; peg deviation narrowed to -12 bps.", 0.7, 2),
  ],
  "900102": [
    makeVerdict(agents[1], "yield_strength", "low", "Implied APY ~8.4% — funding contribution stable vs 7d trailing.", 0.71, 60),
    makeVerdict(agents[1], "yield_compression", "medium", "Implied APY fell ~18% vs prior snapshot (9.1% → 7.4%).", 0.76, 24),
    makeVerdict(agents[1], "catalyst_negative", "medium", "24h price drift negative alongside flat yield — compression risk building.", 0.7, 6),
  ],
  "900103": [
    makeVerdict(agents[2], "reserve_diversification", "low", "sUSDai supply stable; no contraction signal at hourly resolution.", 0.66, 55),
    makeVerdict(agents[2], "supply_growth", "low", "Supply grew ~0.8% since yesterday — consistent with deposit inflows.", 0.69, 30),
    makeVerdict(agents[2], "peg_risk", "low", "Spot $0.9991 — peg within 10 bps.", 0.8, 8),
  ],
  "900104": [
    makeVerdict(agents[3], "yield_strength", "low", "GPU repayment stream holding; implied APY ~6.2%.", 0.67, 50),
    makeVerdict(agents[3], "catalyst_positive", "low", "New facility chatter in USD.AI timeline — yield may strengthen next week.", 0.58, 20),
    makeVerdict(agents[3], "yield_compression", "medium", "Implied APY down ~15% vs prior weekly read.", 0.73, 4),
  ],
};

function combineVerdicts(a, b) {
  const rank = { low: 0, medium: 1, high: 2 };
  const sev = rank[a.severity] >= rank[b.severity] ? a.severity : b.severity;
  return {
    agentId: `${a.agentId}+${b.agentId}`,
    asset: a.asset,
    kind: "stablecoin",
    signal: `${a.signal}+${b.signal}`,
    severity: sev,
    confidence: Math.min(a.confidence, b.confidence),
    rationale: `Combined: ${a.rationale} | ${b.rationale}`,
    ts: nowIso(),
  };
}

const combinedVerdicts = {
  sUSDe: combineVerdicts(initialVerdicts["900101"][0], initialVerdicts["900102"][1]),
  sUSDai: combineVerdicts(initialVerdicts["900103"][1], initialVerdicts["900104"][2]),
};

function makeRun(agent, question, answer, hoursBack) {
  return {
    id: `run_${agent.agentId}_${hoursBack}`,
    ts: hoursAgo(hoursBack),
    question,
    toolCalls: [
      {
        name: "read_onchain_state",
        args: { asset: agent.asset },
        summary: `Read ${agent.asset} token supply and pool state.`,
      },
    ],
    answer,
    learned: [],
  };
}

const sampleRuns = {
  "900101": [
    makeRun(
      agents[0],
      "What's your current read on sUSDe peg health?",
      "Latest verdict: peg_risk (medium). Spot is ~38 bps below $1. Supply growth is muted. No trade recommendation — research only.",
      5,
    ),
  ],
  "900102": [
    makeRun(
      agents[1],
      "Is sUSDe yield compressing?",
      "Yes — yield_compression (medium). Implied APY dropped ~18% vs my prior snapshot. Funding durability is the key watch item.",
      4,
    ),
  ],
  "900103": [
    makeRun(
      agents[2],
      "How healthy is sUSDai backing right now?",
      "reserve_diversification (low). Supply grew modestly; peg within 10 bps. GPU collateral pipeline looks steady at this cadence.",
      6,
    ),
  ],
  "900104": [
    makeRun(
      agents[3],
      "Any catalysts on sUSDai yield?",
      "yield_compression (medium) dominates, but I'm tracking catalyst_positive from new facility origination chatter in USD.AI disclosures.",
      3,
    ),
  ],
};

/* --------------------------- collab exchanges ---------------------------- */

function buildExchanges(offerHashes) {
  const pairs = [
    [agents[0], agents[1], offerHashes[1]],
    [agents[1], agents[0], offerHashes[0]],
    [agents[2], agents[3], offerHashes[3]],
    [agents[3], agents[2], offerHashes[2]],
  ];
  return pairs.map(([from, to, hash], i) => ({
    fromAgentId: from.agentId,
    toAgentId: to.agentId,
    skillId: offerSkillId(to.agentId),
    skillHash: hash,
    paymentRef: keccak256(toBytes(`yield-demo:${from.agentId}->${to.agentId}:${i}`)),
    amount: PRICE,
    at: hoursAgo(24 - i * 6),
    buyerRating: i % 2 === 0 ? 5 : 4,
  }));
}

/* --------------------------- storage adapters ---------------------------- */

function readJsonFile(name, fallback) {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(name, value) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path.join(DATA_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function seedRedis() {
  const r = redis;

  for (const u of USERS) {
    const profile = {
      userId: u.userId,
      email: u.email,
      displayName: u.displayName,
      address: null,
      tcnhvGranted: false,
      createdAt: u.createdAt,
      updatedAt: nowIso(),
      lastLoginAt: hoursAgo(2),
    };
    await r.set(`user:${u.userId}:profile`, JSON.stringify(profile));
    await r.sadd("user:index", u.userId);
  }

  for (const skill of skills) {
    await r.set(`userskill:${skill.id}`, JSON.stringify(skill));
    await r.sadd("userskill:index", skill.id);
    await r.sadd(`user:${skill.authorUserId}:authored-skills`, skill.id);
  }

  const offerHashes = {};

  for (const a of agents) {
    const profile = {
      agentId: a.agentId,
      name: a.name,
      category: a.category,
      skillId: a.skill.id,
      entitySlug: a.entitySlug,
      ownerUserId: a.user.userId,
      description: a.description,
      associatedProducts: [
        { slug: a.entitySlug === "ethena" ? "susde" : "susdai", symbol: a.asset, category: "Stablecoin" },
      ],
      accountIndex: a.accountIndex,
      agentAddress: null,
      agentURI: null,
      agentWallet: a.wallet,
      onChain: true,
      pendingVerification: false,
      discoverable: true,
      collabPriceUsdc: PRICE,
      collabMaxUnits: null,
      services: a.services,
      config: { publishToDune: false },
      chain: CHAIN,
      createdAt: a.createdAt,
      updatedAt: nowIso(),
    };

    const hash = agentOfferHash(profile, a.skill);
    offerHashes[a.agentId] = hash;

    await r.set(`agent:${a.agentId}:profile`, JSON.stringify(profile));
    await r.sadd("agent:index", a.agentId);
    await r.sadd(`user:${a.user.userId}:agents`, a.agentId);
    await r.sadd(`agent:${a.agentId}:attached-skills`, a.skill.id);
    await r.sadd(`agent:${a.agentId}:skills`, a.skill.id);
    await r.set(`agent:${a.agentId}:offerHash`, hash);
    await r.sadd(`skill:${a.skill.id}:agents`, a.agentId);

    const verdicts = initialVerdicts[a.agentId] ?? [];
    await r.del(`agent:${a.agentId}:verdicts`);
    for (const v of [...verdicts].reverse()) {
      await r.lpush(`agent:${a.agentId}:verdicts`, JSON.stringify(v));
    }

    const runs = sampleRuns[a.agentId] ?? [];
    await r.del(`agent:${a.agentId}:runs`);
    for (const run of runs) {
      await r.lpush(`agent:${a.agentId}:runs`, JSON.stringify(run));
    }
  }

  for (const [asset, combined] of Object.entries(combinedVerdicts)) {
    await r.set(`combined:verdict:${asset}`, JSON.stringify(combined));
  }

  const exchanges = buildExchanges(offerHashes);
  for (const ex of exchanges) {
    await r.lpush(
      "collab:log",
      JSON.stringify({
        fromAgentId: ex.fromAgentId,
        toAgentId: ex.toAgentId,
        skillId: ex.skillId,
        skillHash: ex.skillHash,
        paymentRef: ex.paymentRef,
        amount: ex.amount,
        at: ex.at,
      }),
    );
    const repKey = `agent:${ex.toAgentId}:reputation`;
    const cur = (await r.get(repKey)) ?? { sum: 0, count: 0 };
    const rec = typeof cur === "string" ? JSON.parse(cur) : cur;
    await r.set(repKey, JSON.stringify({ sum: rec.sum + ex.buyerRating, count: rec.count + 1 }));
  }
  await r.ltrim("collab:log", 0, 199);
}

function seedFiles() {
  const users = readJsonFile("user-store.json", { profiles: {}, agents: {}, entityAgents: {} });
  users.profiles ||= {};
  users.agents ||= {};
  for (const u of USERS) {
    users.profiles[u.userId] = {
      userId: u.userId,
      email: u.email,
      displayName: u.displayName,
      address: null,
      tcnhvGranted: false,
      createdAt: u.createdAt,
      updatedAt: nowIso(),
      lastLoginAt: hoursAgo(2),
    };
  }

  const skillsStore = readJsonFile("user-skills.json", { skills: {} });
  skillsStore.skills ||= {};
  for (const skill of skills) {
    skillsStore.skills[skill.id] = skill;
  }

  const store = readJsonFile("agent-store.json", {});
  store.profiles ||= {};
  store.skills ||= {};
  store.attachedSkills ||= {};
  store.offerHashes ||= {};
  store.skillAgents ||= {};
  store.verdicts ||= {};
  store.runs ||= {};
  store.combinedVerdicts ||= {};

  const offerHashes = {};

  for (const a of agents) {
    const profile = {
      agentId: a.agentId,
      name: a.name,
      category: a.category,
      skillId: a.skill.id,
      entitySlug: a.entitySlug,
      ownerUserId: a.user.userId,
      description: a.description,
      associatedProducts: [
        { slug: a.entitySlug === "ethena" ? "susde" : "susdai", symbol: a.asset, category: "Stablecoin" },
      ],
      accountIndex: a.accountIndex,
      agentAddress: null,
      agentURI: null,
      agentWallet: a.wallet,
      onChain: true,
      pendingVerification: false,
      discoverable: true,
      collabPriceUsdc: PRICE,
      collabMaxUnits: null,
      services: a.services,
      config: { publishToDune: false },
      chain: CHAIN,
      createdAt: a.createdAt,
      updatedAt: nowIso(),
    };

    const hash = agentOfferHash(profile, a.skill);
    offerHashes[a.agentId] = hash;

    store.profiles[a.agentId] = profile;
    store.attachedSkills[a.agentId] = [a.skill.id];
    store.skills[a.agentId] = [a.skill.id];
    store.offerHashes[a.agentId] = hash;
    store.skillAgents[a.skill.id] = [a.agentId];
    store.verdicts[a.agentId] = initialVerdicts[a.agentId] ?? [];
    store.runs[a.agentId] = sampleRuns[a.agentId] ?? [];

    users.agents[a.user.userId] = [...new Set([...(users.agents[a.user.userId] ?? []), a.agentId])];
  }

  for (const [asset, combined] of Object.entries(combinedVerdicts)) {
    store.combinedVerdicts[asset] = combined;
  }

  writeJsonFile("user-store.json", users);
  writeJsonFile("user-skills.json", skillsStore);
  writeJsonFile("agent-store.json", store);

  const existingLog = readJsonFile("collab-log.json", []);
  const byRef = new Map((Array.isArray(existingLog) ? existingLog : []).map((e) => [e.paymentRef, e]));
  const exchanges = buildExchanges(offerHashes);
  for (const ex of exchanges) {
    byRef.set(ex.paymentRef, {
      fromAgentId: ex.fromAgentId,
      toAgentId: ex.toAgentId,
      skillId: ex.skillId,
      skillHash: ex.skillHash,
      paymentRef: ex.paymentRef,
      amount: ex.amount,
      at: ex.at,
    });
  }
  writeJsonFile("collab-log.json", [...byRef.values()].slice(0, 200));

  const rep = readJsonFile("reputation.json", {});
  for (const ex of exchanges) {
    const cur = rep[ex.toAgentId] ?? { sum: 0, count: 0 };
    rep[ex.toAgentId] = { sum: cur.sum + ex.buyerRating, count: cur.count + 1 };
  }
  writeJsonFile("reputation.json", rep);
}

/* --------------------------------- run ----------------------------------- */

async function main() {
  console.log("CanHav yield/stablecoin agent demo seeder");
  console.log(`  storage: ${USE_REDIS ? "Upstash Redis" : `local JSON (${DATA_DIR})`}`);
  console.log("");

  if (USE_REDIS) await seedRedis();
  else seedFiles();

  console.log("Seeded 4 community agents:");
  for (const a of agents) {
    console.log(`  • ${a.agentId} "${a.name}" (${a.kind} · ${a.asset}) by ${a.user.displayName}`);
  }
  console.log("");
  console.log("Combined verdicts: sUSDe, sUSDai");
  console.log("");
  console.log("Open:");
  console.log("  /collab — marketplace discovery");
  console.log("  /agents/900101 — Meridian Peg Watch");
  console.log("  /entities/ethena — combined sUSDe read");
  console.log("  /entities/usd-ai — combined sUSDai read");
  console.log("");
  console.log(
    "Note: placeholder wallets — Request button stays disabled until real ERC-8004 mints.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
