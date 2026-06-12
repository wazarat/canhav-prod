import { NextResponse } from "next/server";

import { appendMemory } from "@/lib/agent/memory";
import { requireOwnedAgent } from "@/lib/agent/ownership";
import { OWNER_CORRECTION_SOURCE } from "@/lib/agent/prompt";

/**
 * Owner feedback on agent answers — the refinement loop. A thumbs-down with a
 * correction is written to durable memory tagged "owner-correction"; the system
 * prompt surfaces recent corrections in their own emphatic block so the agent
 * stops repeating the mistake. Thumbs-up is acknowledged (no storage) — it's a
 * UI affordance, not training signal.
 *
 * POST { verdict: "up" | "down", correction?, question? }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORRECTION_MAX_CHARS = 400;
const QUESTION_MAX_CHARS = 160;

export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: { verdict?: unknown; correction?: unknown; question?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const verdict = body.verdict === "up" ? "up" : body.verdict === "down" ? "down" : null;
  if (!verdict) {
    return NextResponse.json(
      { ok: false, error: 'verdict must be "up" or "down".' },
      { status: 400 },
    );
  }

  const correction =
    typeof body.correction === "string"
      ? body.correction.trim().slice(0, CORRECTION_MAX_CHARS)
      : "";

  if (verdict === "up" || !correction) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const question =
    typeof body.question === "string" ? body.question.trim().slice(0, QUESTION_MAX_CHARS) : "";
  const text = question ? `Re: "${question}" — ${correction}` : correction;
  const fact = await appendMemory(agentId, { text, source: OWNER_CORRECTION_SOURCE });

  return NextResponse.json({ ok: true, stored: Boolean(fact) });
}
