import { NextResponse } from "next/server";

import {
  appendMemory,
  getAgentSnapshot,
  markSkillStudied,
  seedAgentProfile,
} from "@/lib/agent/memory";
import { hasUpstash } from "@/lib/server/redis";

/**
 * Inspect + seed agent memory.
 *
 * GET  ?agentId=  -> profile + learned facts + runs + studied skills.
 * POST            -> seed/refresh a demo profile and append a sample fact, so the
 *                    inspector visibly accumulates knowledge that persists across
 *                    reloads (Upstash in prod, local JSON file in offline dev).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_AGENT_ID = "sandbox";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") || DEMO_AGENT_ID;
  const snapshot = await getAgentSnapshot(agentId);
  return NextResponse.json({ agentId, persistent: hasUpstash(), ...snapshot });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // empty body is fine
  }

  const agentId = (typeof body.agentId === "string" && body.agentId) || DEMO_AGENT_ID;
  const skillId = typeof body.skillId === "string" ? body.skillId : null;

  await seedAgentProfile({
    agentId,
    name: typeof body.name === "string" && body.name ? body.name : "Sandbox Researcher",
    skillId,
  });
  if (skillId) await markSkillStudied(agentId, skillId);

  const text =
    typeof body.fact === "string" && body.fact.trim()
      ? body.fact.trim()
      : `Checkpoint ${new Date().toISOString()} — CanHav agent memory persists across sessions.`;
  const seededFact = await appendMemory(agentId, { text, source: "seed" });

  const snapshot = await getAgentSnapshot(agentId);
  return NextResponse.json({ agentId, persistent: hasUpstash(), seededFact, ...snapshot });
}
