import { NextResponse } from "next/server";

import { getAgentProfile, setAgentCollabSettings, type AgentService } from "@/lib/agent/memory";
import { parseUsdcToBaseUnits } from "@/lib/agent/collab-config";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { collabEnabled } from "@/lib/collab-flag";

const MAX_SERVICES = 8;
const SERVICE_TITLE_MAX = 80;
const SERVICE_DESC_MAX = 300;

/** Sanitize a raw services array: trim, cap lengths, drop empties, cap count. */
function sanitizeServices(raw: unknown): AgentService[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return [];
  const out: AgentService[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const title = typeof (item as AgentService).title === "string"
      ? (item as AgentService).title.trim().slice(0, SERVICE_TITLE_MAX)
      : "";
    const description = typeof (item as AgentService).description === "string"
      ? (item as AgentService).description.trim().slice(0, SERVICE_DESC_MAX)
      : "";
    if (!title) continue;
    out.push({ title, description });
    if (out.length >= MAX_SERVICES) break;
  }
  return out;
}

/**
 * Owner-only collaboration settings for an agent: opt into discovery + set the
 * per-StrategyPacket price. Opt-in is enforced server-side (only the owner can
 * flip their own agent's flag).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: {
    agentId?: string;
    discoverable?: boolean;
    collabPriceUsdc?: string | null;
    description?: string | null;
    collabMaxUnits?: number | string | null;
    services?: unknown;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const agentId = typeof body.agentId === "string" ? body.agentId : "";
  if (!agentId) {
    return NextResponse.json({ ok: false, error: "agentId is required." }, { status: 400 });
  }

  if (!(await userOwnsAgent(session.userId, agentId))) {
    return NextResponse.json({ ok: false, error: "That agent isn't yours." }, { status: 403 });
  }

  let price: string | null | undefined = body.collabPriceUsdc;
  if (typeof price === "string" && price.trim() !== "") {
    try {
      parseUsdcToBaseUnits(price.trim());
      price = price.trim();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid USDC price." }, { status: 400 });
    }
  } else if (price === "" || price === undefined) {
    price = undefined; // leave unchanged
  }

  // Optional public description.
  let description: string | null | undefined;
  if (typeof body.description === "string") {
    description = body.description.trim().slice(0, 600) || null;
  } else if (body.description === null) {
    description = null;
  }

  // Optional per-interaction unit ceiling (1–100; the seller's advertised max).
  let collabMaxUnits: number | null | undefined;
  if (body.collabMaxUnits === null || body.collabMaxUnits === "") {
    collabMaxUnits = null;
  } else if (body.collabMaxUnits !== undefined) {
    const n = Math.round(Number(body.collabMaxUnits));
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      return NextResponse.json(
        { ok: false, error: "Max units per interaction must be between 1 and 100." },
        { status: 400 },
      );
    }
    collabMaxUnits = n;
  }

  // `discoverable` is only mutated when explicitly provided, so the readiness
  // card (which owns the toggle) and the details panel (description + max units)
  // can each PATCH their own fields without clobbering the other's.
  const discoverable = typeof body.discoverable === "boolean" ? body.discoverable : undefined;

  const services = sanitizeServices(body.services);

  const updated = await setAgentCollabSettings(agentId, {
    discoverable,
    collabPriceUsdc: price,
    description,
    collabMaxUnits,
    services,
  });
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }

  const profile = await getAgentProfile(agentId);
  return NextResponse.json({
    ok: true,
    discoverable: profile?.discoverable ?? false,
    collabPriceUsdc: profile?.collabPriceUsdc ?? null,
    description: profile?.description ?? null,
    collabMaxUnits: profile?.collabMaxUnits ?? null,
    services: profile?.services ?? [],
  });
}
