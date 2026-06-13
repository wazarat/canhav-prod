import { NextResponse } from "next/server";

import { listDiscoverableAgents } from "@/lib/server/collabDiscovery";
import { getSession } from "@/lib/auth/session";

/**
 * Agent-indexed discovery for signed-in users.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to discover agents." }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.trim() || null;
  const q = url.searchParams.get("q")?.trim() || null;

  const agents = await listDiscoverableAgents({ category, q });
  return NextResponse.json({ agents });
}
