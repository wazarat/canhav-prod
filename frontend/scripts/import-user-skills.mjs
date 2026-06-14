#!/usr/bin/env node
/**
 * Import user-authored skills from JSON files into Upstash (or local fallback).
 *
 * Usage:
 *   AUTHOR_USER_ID="did:privy:..." \
 *   ATTACH_AGENT_IDS="2,1" \
 *   node scripts/import-user-skills.mjs path/to/skill.json [...]
 *
 * Env: KV_REST_API_URL + KV_REST_API_TOKEN (loads frontend/.env.local if unset).
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

import { Redis } from "@upstash/redis";
import { keccak256, toBytes } from "viem";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_VERSION = "1.0.0";

const STABLE_IDS = {
  "stablecoin regulations": process.env.SKILL_ID_REGULATIONS ?? "uskill_1e2f9e63c119d827",
  "stablecoin yield generation": process.env.SKILL_ID_YIELD ?? "uskill_c9e55cc638bdee9f",
  "stablecoin research": process.env.SKILL_ID_RESEARCH ?? "uskill_stablecoin_research",
};

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
const AUTHOR_USER_ID = process.env.AUTHOR_USER_ID?.trim();
const ATTACH_AGENT_IDS = (process.env.ATTACH_AGENT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!AUTHOR_USER_ID) {
  console.error("AUTHOR_USER_ID is required (Privy did:…).");
  process.exit(1);
}

const files = process.argv.slice(2).filter((f) => f && !f.startsWith("-"));
if (!files.length) {
  console.error("Pass one or more skill JSON file paths.");
  process.exit(1);
}

if (!KV_URL || !KV_TOKEN) {
  console.error("KV_REST_API_URL and KV_REST_API_TOKEN are required.");
  process.exit(1);
}

const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
const nowIso = () => new Date().toISOString();

function skillIdForTitle(title) {
  const key = title.trim().toLowerCase();
  return STABLE_IDS[key] ?? `uskill_${randomBytes(8).toString("hex")}`;
}

function validateSkill(draft) {
  const errors = [];
  if (!draft?.title?.trim()) errors.push("Title is required.");
  if (!draft?.summary?.trim()) errors.push("Summary is required.");
  const sources = (draft.sources ?? []).filter((s) => s?.label?.trim() && s?.url?.trim());
  if (!sources.length) errors.push("At least one source is required.");
  for (const [i, action] of (draft.actions ?? []).entries()) {
    if (action?.readOnly !== true) {
      errors.push(`Action "${action?.name ?? i + 1}" must have readOnly: true.`);
    }
  }
  return errors;
}

function skillToMarkdown(skill) {
  const lines = [
    `# ${skill.title}`,
    "",
    `> ${skill.summary}`,
    "",
    `- **ID:** ${skill.id}`,
    `- **Version:** ${skill.version}`,
    `- **Updated:** ${skill.updatedAt}`,
    "",
    "## Facts",
    "",
    ...(skill.facts ?? []).map((f) => `- **${f.key}:** ${f.value}`),
    "",
    "## Sections",
    "",
    ...(skill.sections ?? []).flatMap((s) => [`### ${s.heading}`, "", s.body, ""]),
    "## Actions",
    "",
    ...(skill.actions ?? []).map(
      (a) =>
        `- **${a.name}** (${a.readOnly ? "read-only" : "write"}): ${a.description}\n  \`${a.signature}\``,
    ),
  ];
  if (skill.glossary?.length) {
    lines.push("", "## Glossary", "");
    skill.glossary.forEach((g) => lines.push(`- **${g.term}:** ${g.definition}`));
  }
  if (skill.sources?.length) {
    lines.push("", "## Sources", "");
    skill.sources.forEach((s) => lines.push(`- [${s.label}](${s.url})`));
  }
  return lines.join("\n");
}

function skillMarkdownHash(skill) {
  return keccak256(toBytes(skillToMarkdown(skill)));
}

function dedupeSources(sources) {
  const seen = new Set();
  const out = [];
  for (const s of sources) {
    const k = s.url.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function dedupeFacts(facts) {
  const seen = new Set();
  const out = [];
  for (const f of facts) {
    const k = f.key.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

function buildAgentOfferSkill(profile, skills) {
  const facts = [];
  const sections = [];
  const sources = [];
  const glossary = skills.flatMap((s) => s.glossary ?? []);
  for (const skill of skills) {
    facts.push(...skill.facts);
    for (const section of skill.sections) {
      sections.push({ heading: `${skill.title}: ${section.heading}`, body: section.body });
    }
    sources.push(...skill.sources);
  }
  const entityLabel = profile.entitySlug ? ` (${profile.entitySlug})` : "";
  const summary =
    skills.length === 1
      ? skills[0].summary
      : `Bundled expertise from ${skills.length} attached skills${entityLabel}.`;
  return {
    id: `offer:${profile.agentId}`,
    title: `${profile.name} — bundled expertise`,
    summary,
    facts: dedupeFacts(facts),
    sections,
    actions: [],
    glossary: glossary.length ? glossary : undefined,
    sources: dedupeSources(sources),
    version: SKILL_VERSION,
    updatedAt: profile.updatedAt ?? nowIso(),
  };
}

async function getJson(key) {
  const raw = await redis.get(key);
  if (raw == null) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function saveUserSkill(skill) {
  await redis.set(`userskill:${skill.id}`, JSON.stringify(skill));
  await redis.sadd("userskill:index", skill.id);
  await redis.sadd(`user:${skill.authorUserId}:authored-skills`, skill.id);
}

async function attachSkillToAgent(agentId, skill) {
  const hash = skillMarkdownHash(skill);
  await redis.sadd(`agent:${agentId}:attached-skills`, skill.id);
  await redis.set(`agent:${agentId}:skillhash:${skill.id}`, hash);
  await redis.sadd(`skill:${skill.id}:agents`, agentId);
  await redis.sadd(`agent:${agentId}:skills`, skill.id);

  const markdown = skillToMarkdown(skill);
  const entry = {
    id: `fact_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    ts: nowIso(),
    text: markdown,
    source: `skill:${skill.id}`,
  };
  await redis.rpush(`agent:${agentId}:memory`, JSON.stringify(entry));
}

async function refreshOfferHash(agentId, profile, attachedSkills) {
  if (!attachedSkills.length) {
    await redis.del(`agent:${agentId}:offerHash`);
    return null;
  }
  const offer = buildAgentOfferSkill(profile, attachedSkills);
  const hash = keccak256(toBytes(skillToMarkdown(offer)));
  await redis.set(`agent:${agentId}:offerHash`, hash);
  return hash;
}

async function main() {
  const imported = [];

  for (const file of files) {
    const abs = path.resolve(file);
    const draft = JSON.parse(readFileSync(abs, "utf-8"));
    const errors = validateSkill(draft);
    if (errors.length) {
      console.error(`Invalid ${path.basename(file)}:`, errors.join("; "));
      process.exit(1);
    }

    const id = skillIdForTitle(draft.title);
    const existing = await getJson(`userskill:${id}`);
    const skill = {
      id,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      facts: (draft.facts ?? []).map((f) => ({ key: f.key.trim(), value: (f.value ?? "").trim() })),
      sections: (draft.sections ?? []).map((s) => ({
        heading: s.heading.trim(),
        body: (s.body ?? "").trim(),
      })),
      actions: (draft.actions ?? []).map((a) => ({
        name: a.name.trim(),
        description: (a.description ?? "").trim(),
        signature: (a.signature ?? "").trim(),
        readOnly: true,
      })),
      sources: (draft.sources ?? []).map((s) => ({
        label: (s.label ?? s.url).trim(),
        url: s.url.trim(),
      })),
      glossary: Array.isArray(draft.glossary)
        ? draft.glossary.map((g) => ({ term: g.term.trim(), definition: (g.definition ?? "").trim() }))
        : undefined,
      origin: "user-authored",
      authorUserId: AUTHOR_USER_ID,
      visibility: existing?.visibility ?? "private",
      version: existing?.version ?? SKILL_VERSION,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    await saveUserSkill(skill);
    imported.push(skill);
    console.log(`Saved skill: ${skill.title} (${skill.id})`);
  }

  for (const agentId of ATTACH_AGENT_IDS) {
    const profileKey = `agent:${agentId}:profile`;
    let profile = await getJson(profileKey);
    if (!profile) {
      console.warn(`Agent ${agentId} profile not found — skipping attach.`);
      continue;
    }

    if (!profile.ownerUserId) {
      profile = { ...profile, ownerUserId: AUTHOR_USER_ID, updatedAt: nowIso() };
      await redis.set(profileKey, JSON.stringify(profile));
      await redis.sadd(`user:${AUTHOR_USER_ID}:agents`, String(agentId));
      console.log(`Fixed ownerUserId on agent ${agentId}`);
    }

    for (const skill of imported) {
      await attachSkillToAgent(agentId, skill);
    }

    const attachedIds = await redis.smembers(`agent:${agentId}:attached-skills`);
    const attachedSkills = [];
    for (const sid of attachedIds ?? []) {
      const s = await getJson(`userskill:${sid}`);
      if (s) attachedSkills.push(s);
    }
    attachedSkills.sort((a, b) => a.id.localeCompare(b.id));
    profile = await getJson(profileKey);
    const hash = await refreshOfferHash(agentId, profile, attachedSkills);
    console.log(
      `Attached ${imported.length} skill(s) to agent ${agentId} (${profile.name}); offerHash=${hash?.slice(0, 12)}…`,
    );
  }

  const authored = await redis.smembers(`user:${AUTHOR_USER_ID}:authored-skills`);
  console.log(`\nDone. User ${AUTHOR_USER_ID} now has ${(authored ?? []).length} authored skill(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
