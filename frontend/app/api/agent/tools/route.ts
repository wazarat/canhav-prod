import { NextResponse } from "next/server";

import { runTool, TOOL_CATALOG } from "@/lib/agent/tools";
import { getSession } from "@/lib/auth/session";

/**
 * Tool playground (no LLM).
 *
 * GET  -> the catalog of available tools + sample args.
 * POST { tool, args, agentId? } -> executes a single tool and returns its
 *      `{ ok, summary, result }`, so you can see the exact live CanHav data the
 *      agent loop will reason over before any model is wired up.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_AGENT_ID = "sandbox";

export async function GET() {
  return NextResponse.json({ tools: TOOL_CATALOG });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // empty body
  }

  const name = typeof body.tool === "string" ? body.tool : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: "Missing 'tool' name." }, { status: 400 });
  }
  const agentId = typeof body.agentId === "string" && body.agentId ? body.agentId : DEMO_AGENT_ID;

  // Owner context lets the gated write tool (dune_publishVerdict) verify
  // ownership; read-only tools ignore it.
  const ownerUserId = getSession()?.userId ?? null;
  const out = await runTool(agentId, name, body.args ?? {}, ownerUserId);
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}
