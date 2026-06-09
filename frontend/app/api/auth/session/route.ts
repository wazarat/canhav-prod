import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const profile = await getUserProfile(session.userId);
  return NextResponse.json({
    authenticated: true,
    userId: session.userId,
    profile,
    agentId: userAgentId(session.userId),
  });
}
