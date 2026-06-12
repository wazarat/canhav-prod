import { NextResponse } from "next/server";

import { listDiscoverableAgents } from "@/lib/server/collabDiscovery";
import { getSession } from "@/lib/auth/session";

/**
 * Agent-indexed discovery for signed-in users.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to discover agents." }, { status: 401 });
  }

  const agents = await listDiscoverableAgents();
  return NextResponse.json({ agents });
}
