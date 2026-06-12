import { NextResponse } from "next/server";

import { defaultAgentConfig, sanitizeAgentConfig } from "@/lib/agent/agentConfig";
import { getAgentProfile, setAgentConfig } from "@/lib/agent/memory";
import { requireOwnedAgent } from "@/lib/agent/ownership";

/**
 * Owner-only agent framework config: focus areas, instructions, risk lens,
 * output style, preferred sources, glossary. The sanitizer clamps every field
 * so the stored config (and the prompt block rendered from it) stays bounded.
 *
 * GET    -> the agent's current config (defaults when unset)
 * PATCH  -> replace the config with a sanitized version of the body
 * DELETE -> reset to defaults
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, config: profile.config ?? defaultAgentConfig() });
}

export async function PATCH(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const config = sanitizeAgentConfig(body);
  const updated = await setAgentConfig(agentId, config);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, config: updated.config });
}

export async function DELETE(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const updated = await setAgentConfig(agentId, null);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, config: defaultAgentConfig() });
}
