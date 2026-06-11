#!/usr/bin/env node
/**
 * Two-user agent-collaboration demo seeder (Arbitrum Sepolia, testnet only).
 *
 * Populates the discovery + observer-feed surfaces with a self-contained,
 * idempotent example so you can see the whole lifecycle without minting real
 * agents:
 *
 *   1. Two users (Alice, Bob) each author one discoverable, read-only skill.
 *   2. Each user's single-entity agent is seeded as discoverable and advertises
 *      its skill (skill -> agent reverse index, on-chain flag, price).
 *   3. A strategy exchange is run BOTH ways (Alice's agent buys Bob's skill and
 *      vice-versa): an off-chain collab-log entry + a buyer rating each.
 *   4. OPTIONAL on-chain attestation: if PRIVATE_KEY + COLLAB_REGISTRY_ADDRESS
 *      (+ an RPC) are set, each exchange is also written to CollabRegistry so the
 *      observer feed shows real `CollabRecorded` events.
 *
 * Storage mirrors the app exactly: Upstash Redis when KV creds are present,
 * else the gitignored local JSON files under `backend/data/`.
 *
 * Usage (offline / local JSON):
 *   node scripts/collab-demo.mjs
 *
 * Usage (production Upstash — same creds Vercel injects):
 *   KV_REST_API_URL="https://...upstash.io" KV_REST_API_TOKEN="..." \
 *     node scripts/collab-demo.mjs
 *
 * Usage (also attest on-chain):
 *   PRIVATE_KEY=0x... COLLAB_REGISTRY_ADDRESS=0x... \
 *   ARBITRUM_SEPOLIA_RPC_URL="https://..." node scripts/collab-demo.mjs
 *
 * The script never deploys contracts and never touches git.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Redis } from "@upstash/redis";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
  parseAbi,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const DATA_DIR = path.join(REPO_ROOT, "backend", "data");
const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN = "arbitrum-sepolia";

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

/* ------------------------------ demo data -------------------------------- */

const PRICE = process.env.COLLAB_PRICE_DEFAULT_USDC || "0.10";

function makeSkill(id, authorUserId, title, summary, facts, sections, sources) {
  return {
    id,
    title,
    summary,
    facts,
    sections,
    actions: [
      {
        name: "summarize_research",
        description: "Return a read-only research summary for the requested objective.",
        signature: "summarize_research(objective: string): string",
        readOnly: true,
      },
    ],
    sources,
    glossary: [],
    origin: "user-authored",
    authorUserId,
    visibility: "discoverable",
    version: "1.0.0",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

const ALICE = "did:demo:alice";
const BOB = "did:demo:bob";

const skillA = makeSkill(
  "uskill_demo_rwa",
  ALICE,
  "Tokenized treasury RWA research",
  "How tokenized US-treasury RWAs are structured, custodied, and redeemed on testnets.",
  [
    { key: "Network", value: "Arbitrum Sepolia (testnet)" },
    { key: "Scope", value: "Read-only research; no trading or DeFi actions" },
  ],
  [
    {
      heading: "Structure",
      body: "RWA tokens wrap a custodied treasury position; redemption is gated by an off-chain attestation.",
    },
    {
      heading: "Risks",
      body: "Custody transparency, redemption latency, and oracle freshness are the main research dimensions.",
    },
  ],
  [{ label: "Research note", url: "https://example.org/rwa-research" }],
);

const skillB = makeSkill(
  "uskill_demo_stables",
  BOB,
  "Stablecoin peg-stability research",
  "How fiat-backed stablecoins maintain peg, what reserves back them, and how to read attestations.",
  [
    { key: "Network", value: "Arbitrum Sepolia (testnet)" },
    { key: "Scope", value: "Read-only research; no trading or DeFi actions" },
  ],
  [
    {
      heading: "Peg mechanics",
      body: "Fiat-backed stablecoins hold cash + short-duration treasuries; peg holds via mint/redeem arbitrage.",
    },
    {
      heading: "What to verify",
      body: "Reserve composition, attestation cadence, and redemption access are the key research checks.",
    },
  ],
  [{ label: "Reserve attestation", url: "https://example.org/stablecoin-reserves" }],
);

const agentA = {
  agentId: "900001",
  name: "Alice RWA Agent",
  skillId: skillA.id,
  entitySlug: "demo-rwa",
  associatedProducts: [],
  accountIndex: 9001,
  agentAddress: null,
  agentURI: null,
  agentWallet: "0x000000000000000000000000000000000000A11C",
  onChain: true,
  discoverable: true,
  collabPriceUsdc: PRICE,
  chain: CHAIN,
  createdAt: nowIso(),
  updatedAt: nowIso(),
};

const agentB = {
  agentId: "900002",
  name: "Bob Stablecoin Agent",
  skillId: skillB.id,
  entitySlug: "demo-stables",
  associatedProducts: [],
  accountIndex: 9002,
  agentAddress: null,
  agentURI: null,
  agentWallet: "0x000000000000000000000000000000000000B0B0",
  onChain: true,
  discoverable: true,
  collabPriceUsdc: PRICE,
  chain: CHAIN,
  createdAt: nowIso(),
  updatedAt: nowIso(),
};

const hashA = keccak256(toBytes(JSON.stringify(skillA)));
const hashB = keccak256(toBytes(JSON.stringify(skillB)));

/** Deterministic stand-in payment refs so re-runs dedupe in the feed. */
const refAtoB = keccak256(toBytes(`demo:${agentA.agentId}->${agentB.agentId}`));
const refBtoA = keccak256(toBytes(`demo:${agentB.agentId}->${agentA.agentId}`));

const exchanges = [
  {
    fromAgentId: agentA.agentId,
    toAgentId: agentB.agentId,
    skillId: skillB.id,
    skillHash: hashB,
    paymentRef: refAtoB,
    amount: PRICE,
    at: nowIso(),
    buyerRating: 5,
  },
  {
    fromAgentId: agentB.agentId,
    toAgentId: agentA.agentId,
    skillId: skillA.id,
    skillHash: hashA,
    paymentRef: refBtoA,
    amount: PRICE,
    at: nowIso(),
    buyerRating: 4,
  },
];

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
  for (const skill of [skillA, skillB]) {
    await r.set(`userskill:${skill.id}`, JSON.stringify(skill));
    await r.sadd("userskill:index", skill.id);
    await r.sadd(`user:${skill.authorUserId}:authored-skills`, skill.id);
    await r.sadd("skill:discoverable", skill.id);
  }

  for (const { profile, skill, hash } of [
    { profile: agentA, skill: skillA, hash: hashA },
    { profile: agentB, skill: skillB, hash: hashB },
  ]) {
    await r.set(`agent:${profile.agentId}:profile`, JSON.stringify(profile));
    await r.sadd("agent:index", profile.agentId);
    await r.sadd(`agent:${profile.agentId}:attached-skills`, skill.id);
    await r.sadd(`agent:${profile.agentId}:skills`, skill.id);
    await r.set(`agent:${profile.agentId}:skillhash:${skill.id}`, hash);
    await r.sadd(`skill:${skill.id}:agents`, profile.agentId);
  }

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
    await r.ltrim("collab:log", 0, 199);
    const repKey = `agent:${ex.toAgentId}:reputation`;
    const cur = (await r.get(repKey)) ?? { sum: 0, count: 0 };
    const rec = typeof cur === "string" ? JSON.parse(cur) : cur;
    await r.set(
      repKey,
      JSON.stringify({ sum: rec.sum + ex.buyerRating, count: rec.count + 1 }),
    );
  }
}

function seedFiles() {
  const skills = readJsonFile("user-skills.json", { skills: {} });
  skills.skills ||= {};
  skills.skills[skillA.id] = skillA;
  skills.skills[skillB.id] = skillB;
  writeJsonFile("user-skills.json", skills);

  const store = readJsonFile("agent-store.json", {});
  store.profiles ||= {};
  store.skills ||= {};
  store.attachedSkills ||= {};
  store.skillHashes ||= {};
  store.skillAgents ||= {};
  for (const { profile, skill, hash } of [
    { profile: agentA, skill: skillA, hash: hashA },
    { profile: agentB, skill: skillB, hash: hashB },
  ]) {
    store.profiles[profile.agentId] = profile;
    store.attachedSkills[profile.agentId] = [skill.id];
    store.skills[profile.agentId] = [skill.id];
    store.skillHashes[`${profile.agentId}|${skill.id}`] = hash;
    store.skillAgents[skill.id] = [profile.agentId];
  }
  writeJsonFile("agent-store.json", store);

  const existingLog = readJsonFile("collab-log.json", []);
  const byRef = new Map((Array.isArray(existingLog) ? existingLog : []).map((e) => [e.paymentRef, e]));
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

/* ---------------------------- on-chain (opt) ----------------------------- */

const collabRegistryAbi = parseAbi([
  "function recordCollab(uint256 fromAgentId, uint256 toAgentId, bytes32 skillHash, bytes32 paymentRef) returns (uint256)",
  "function collabCount() view returns (uint256)",
]);

async function attestOnChain() {
  const pk = process.env.PRIVATE_KEY;
  const registry = process.env.COLLAB_REGISTRY_ADDRESS;
  if (!pk || !registry) {
    console.log("• On-chain attestation skipped (set PRIVATE_KEY + COLLAB_REGISTRY_ADDRESS to enable).");
    return;
  }
  const rpc = process.env.ARBITRUM_SEPOLIA_RPC_URL || DEFAULT_RPC;
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  const address = getAddress(registry);
  const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpc) });
  const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(rpc) });

  for (const ex of exchanges) {
    try {
      const hash = await wallet.writeContract({
        address,
        abi: collabRegistryAbi,
        functionName: "recordCollab",
        args: [BigInt(ex.fromAgentId), BigInt(ex.toAgentId), ex.skillHash, ex.paymentRef],
      });
      const receipt = await pub.waitForTransactionReceipt({ hash });
      console.log(`  ✓ recordCollab ${ex.fromAgentId}->${ex.toAgentId} tx=${hash} (${receipt.status})`);
    } catch (err) {
      console.log(`  ! recordCollab ${ex.fromAgentId}->${ex.toAgentId} failed: ${err?.shortMessage ?? err?.message ?? err}`);
    }
  }
  try {
    const count = await pub.readContract({ address, abi: collabRegistryAbi, functionName: "collabCount" });
    console.log(`  on-chain collabCount = ${count}`);
  } catch {
    /* ignore */
  }
}

/* --------------------------------- run ----------------------------------- */

async function main() {
  console.log(`CanHav agent-collaboration demo seeder`);
  console.log(`  storage: ${USE_REDIS ? "Upstash Redis" : `local JSON (${DATA_DIR})`}`);
  console.log("");

  if (USE_REDIS) await seedRedis();
  else seedFiles();

  console.log("Seeded:");
  console.log(`  • skill ${skillA.id} (${skillA.title}) — discoverable, author ${ALICE}`);
  console.log(`  • skill ${skillB.id} (${skillB.title}) — discoverable, author ${BOB}`);
  console.log(`  • agent ${agentA.agentId} "${agentA.name}" advertises ${skillA.id} @ ${PRICE} USDC`);
  console.log(`  • agent ${agentB.agentId} "${agentB.name}" advertises ${skillB.id} @ ${PRICE} USDC`);
  console.log("");
  console.log("Exchanges (off-chain log + reputation):");
  for (const ex of exchanges) {
    console.log(
      `  • agent ${ex.fromAgentId} → agent ${ex.toAgentId} bought ${ex.skillId} (${ex.amount} USDC, rated ${ex.buyerRating}★) ref=${ex.paymentRef.slice(0, 12)}…`,
    );
  }
  console.log("");

  await attestOnChain();

  console.log("");
  console.log("Done. Open /collab (discovery) and /collab/feed (observer feed).");
  console.log(
    "Note: seeded agents use placeholder wallets, so the Request button stays disabled —" +
      " real exchanges require minted agents with verified agentWallets.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
