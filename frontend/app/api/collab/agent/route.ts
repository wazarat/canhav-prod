import { NextResponse } from "next/server";

import { getAgentProfile, setAgentCollabSettings } from "@/lib/agent/memory";
import { parseUsdcToBaseUnits } from "@/lib/agent/collab-config";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";

/**
 * Owner-only collaboration settings for an agent: opt into discovery + set the
 * per-StrategyPacket price. Opt-in is enforced server-side (only the owner can
 * flip their own agent's flag).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

  const ownedIds = new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))]);
  if (!ownedIds.has(agentId)) {
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

  const updated = await setAgentCollabSettings(agentId, {
    discoverable,
    collabPriceUsdc: price,
    description,
    collabMaxUnits,
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
  });
}
