import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserEntityAgent } from "@/lib/auth/users";

/**
 * Resolve the logged-in wallet's agent for a given project (Entity slug).
 * Powers the entity-page agent panel and the project-grouped roster: returns
 * the bound `agentId` or null when the wallet has not launched one yet.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, agentId: null });
  }

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug query param is required." }, { status: 400 });
  }

  const agentId = await getUserEntityAgent(session.userId, slug);
  return NextResponse.json({ authenticated: true, entitySlug: slug, agentId: agentId ?? null });
}
