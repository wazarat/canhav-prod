import { NextResponse } from "next/server";

import {
  getAgentProfile,
  isAgentCategory,
  setAgentIdentity,
  type AgentCategory,
} from "@/lib/agent/memory";
import { requireOwnedAgent } from "@/lib/agent/ownership";

/**
 * Owner-only agent identity:
 *
 * GET   -> the agent's profile (name, category, binding, on-chain identity)
 * PATCH -> rename the agent and/or set its research category
 *
 * Renaming is off-chain only: the minted ERC-8004 token is untouched and the
 * hosted agent card reads the live profile, so it stays current.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME_LENGTH = 60;

export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: { name?: unknown; category?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const updates: { name?: string; category?: AgentCategory | null } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Agent name must be a non-empty string." },
        { status: 400 },
      );
    }
    updates.name = body.name.trim().slice(0, MAX_NAME_LENGTH);
  }

  if (body.category !== undefined) {
    if (body.category === null) {
      updates.category = null;
    } else if (isAgentCategory(body.category)) {
      updates.category = body.category;
    } else {
      return NextResponse.json(
        { ok: false, error: "Unknown agent category." },
        { status: 400 },
      );
    }
  }

  if (updates.name === undefined && updates.category === undefined) {
    return NextResponse.json(
      { ok: false, error: "Provide a name and/or category to update." },
      { status: 400 },
    );
  }

  const updated = await setAgentIdentity(agentId, updates);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    profile: { agentId: updated.agentId, name: updated.name, category: updated.category },
  });
}
