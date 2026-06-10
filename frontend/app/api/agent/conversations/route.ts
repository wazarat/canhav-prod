import { NextResponse } from "next/server";

import {
  createConversation,
  listConversations,
  listConversationsForAgent,
} from "@/lib/agent/conversations";
import { getSession } from "@/lib/auth/session";
import { userAgentId } from "@/lib/agent/user-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Sign in with your passkey to access chats." }, { status: 401 });
}

export async function GET(req: Request) {
  const session = getSession();
  if (!session) return unauthorized();

  const agentId = new URL(req.url).searchParams.get("agentId");
  const conversations = agentId
    ? await listConversationsForAgent(session.userId, agentId)
    : await listConversations(session.userId);

  return NextResponse.json({
    conversations,
    agentId: agentId ?? userAgentId(session.userId),
  });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) return unauthorized();

  let body: { agentId?: string; title?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body ok
  }

  const agentId =
    typeof body.agentId === "string" && body.agentId
      ? body.agentId
      : userAgentId(session.userId);
  const meta = await createConversation(session.userId, agentId, body.title);
  return NextResponse.json({ conversation: meta });
}
