import { NextResponse } from "next/server";

import { listReviews } from "@/lib/agent/reviews";
import { getSession } from "@/lib/auth/session";
import { collabEnabled } from "@/lib/collab-flag";

/**
 * Public-to-signed-in list of an agent's exchange-verified reviews (newest
 * first). Powers the seller marketplace view's review list.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!collabEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to read reviews." }, { status: 401 });
  }

  const agentId = new URL(req.url).searchParams.get("agentId")?.trim() ?? "";
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required." }, { status: 400 });
  }

  const reviews = await listReviews(agentId, 50);
  return NextResponse.json({ reviews });
}
