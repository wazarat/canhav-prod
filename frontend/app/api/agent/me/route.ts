import { NextResponse } from "next/server";

import { agentConfigStatus } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { userAgentId } from "@/lib/agent/user-agent";
import { getSession } from "@/lib/auth/session";

/**
 * Resolve the signed-in user's default research agent. Powers the floating
 * research chatbot on data pages that aren't bound to a minted entity agent.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = agentConfigStatus();
  const session = getSession();
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      agentId: null,
      agentName: null,
      llmConfigured: status.llm,
    });
  }

  const agentId = userAgentId(session.userId);
  const profile = await getAgentProfile(agentId);

  return NextResponse.json({
    authenticated: true,
    agentId,
    agentName: profile?.name ?? "My Research Agent",
    llmConfigured: status.llm,
  });
}
