import { NextResponse } from "next/server";

import { getAgentProfile } from "@/lib/agent/memory";
import { getSession } from "@/lib/auth/session";
import { getUserEntityAgent } from "@/lib/auth/users";

/**
 * Resolve the logged-in wallet's agent for a given project (Entity slug).
 * Powers the entity-page agent panel + chatbot dock and the project-grouped
 * roster: returns the bound `agentId` (or null) plus whether it is minted
 * on-chain — the chatbot is mint-gated, so the dock only renders when
 * `onChain` is true.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, agentId: null, onChain: false });
  }

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug query param is required." }, { status: 400 });
  }

  const agentId = await getUserEntityAgent(session.userId, slug);
  const profile = agentId ? await getAgentProfile(agentId) : null;

  return NextResponse.json({
    authenticated: true,
    entitySlug: slug,
    agentId: agentId ?? null,
    onChain: Boolean(profile?.onChain),
    agentName: profile?.name ?? null,
  });
}
