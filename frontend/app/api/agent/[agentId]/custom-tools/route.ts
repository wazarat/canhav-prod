import { NextResponse } from "next/server";

import {
  CUSTOM_TOOL_LIMITS,
  customToolHttpAllowlist,
  deleteCustomTool,
  executeCustomTool,
  listCustomTools,
  saveCustomTool,
  setCustomToolEnabled,
  validateCustomToolTemplate,
} from "@/lib/agent/customTools";
import { requireOwnedAgent } from "@/lib/agent/ownership";
import type { CustomTool } from "@/lib/types";

/**
 * Owner-only custom tools for an agent (typed, read-only catalog — no user code).
 *
 * GET                -> list tools; `?test=<toolId>` also executes one and
 *                       returns its live output (the same thing the LLM sees)
 * POST               -> create a tool from a validated template
 * PATCH              -> `{toolId, enabled}` toggle
 * DELETE ?toolId=    -> remove a tool
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const tools = await listCustomTools(agentId);
  const payload: Record<string, unknown> = {
    ok: true,
    tools,
    max: CUSTOM_TOOL_LIMITS.toolsMax,
    httpAllowlist: customToolHttpAllowlist(),
  };

  const testId = new URL(req.url).searchParams.get("test");
  if (testId) {
    const target = tools.find((t) => t.id === testId);
    if (!target) {
      return NextResponse.json({ ok: false, error: "Tool not found." }, { status: 404 });
    }
    payload.test = await executeCustomTool(target.template);
  }
  return NextResponse.json(payload);
}

export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { template, error } = validateCustomToolTemplate(body);
  if (!template) {
    return NextResponse.json({ ok: false, error: error ?? "Invalid tool." }, { status: 400 });
  }

  const toolDef: CustomTool = {
    id: `ctool${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    agentId,
    ownerUserId: guard.session?.userId ?? "",
    template,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  const saved = await saveCustomTool(agentId, toolDef);
  if (!saved) {
    return NextResponse.json(
      {
        ok: false,
        error: `This agent already has ${CUSTOM_TOOL_LIMITS.toolsMax} custom tools. Delete one first.`,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, tool: saved });
}

export async function PATCH(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: { toolId?: unknown; enabled?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const toolId = typeof body.toolId === "string" ? body.toolId : "";
  if (!toolId || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "toolId and enabled (boolean) are required." },
      { status: 400 },
    );
  }

  const updated = await setCustomToolEnabled(agentId, toolId, body.enabled);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Tool not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, tool: updated });
}

export async function DELETE(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const toolId = new URL(req.url).searchParams.get("toolId") ?? "";
  if (!toolId) {
    return NextResponse.json({ ok: false, error: "toolId is required." }, { status: 400 });
  }
  const removed = await deleteCustomTool(agentId, toolId);
  if (!removed) {
    return NextResponse.json({ ok: false, error: "Tool not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
