import { NextResponse } from "next/server";

import { resolveDataFrame, validateDataFrameInput } from "@/lib/agent/dataframes";
import {
  deleteDataFrame,
  getDataFrame,
  listDataFrames,
  MAX_DATA_FRAMES,
  saveDataFrame,
} from "@/lib/agent/memory";
import { requireOwnedAgent } from "@/lib/agent/ownership";

/**
 * Owner-only pinned data frames for an agent.
 *
 * GET                 -> list frames; `?resolve=<frameId>` also returns a live
 *                        resolved snapshot (the same thing frame_load sees)
 * POST                -> create (or update, when body.id matches) a frame
 * DELETE ?frameId=    -> remove a frame
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const frames = await listDataFrames(agentId);
  const resolveId = new URL(req.url).searchParams.get("resolve");
  if (resolveId) {
    const frame = frames.find((f) => f.id === resolveId);
    if (!frame) {
      return NextResponse.json({ ok: false, error: "Frame not found." }, { status: 404 });
    }
    const resolved = await resolveDataFrame(frame);
    return NextResponse.json({ ok: true, frames, resolved });
  }
  return NextResponse.json({ ok: true, frames, max: MAX_DATA_FRAMES });
}

export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: { id?: unknown } & Record<string, unknown> = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  // Updates must reference a frame this agent actually owns.
  let existingId: string | undefined;
  if (typeof body.id === "string" && body.id) {
    const existing = await getDataFrame(agentId, body.id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Frame not found." }, { status: 404 });
    }
    existingId = existing.id;
  }

  const { frame, error } = await validateDataFrameInput(agentId, body, existingId);
  if (!frame) {
    return NextResponse.json({ ok: false, error: error ?? "Invalid frame." }, { status: 400 });
  }

  const saved = await saveDataFrame(agentId, frame);
  if (!saved) {
    return NextResponse.json(
      { ok: false, error: `This agent already has ${MAX_DATA_FRAMES} frames. Delete one first.` },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, frame: saved });
}

export async function DELETE(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const frameId = new URL(req.url).searchParams.get("frameId") ?? "";
  if (!frameId) {
    return NextResponse.json({ ok: false, error: "frameId is required." }, { status: 400 });
  }
  const removed = await deleteDataFrame(agentId, frameId);
  if (!removed) {
    return NextResponse.json({ ok: false, error: "Frame not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
