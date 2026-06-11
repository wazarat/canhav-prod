import { NextResponse } from "next/server";

import { getConversation } from "@/lib/agent/conversations";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to access chats." }, { status: 401 });
  }

  const conversationId = decodeURIComponent(params.id);
  const data = await getConversation(session.userId, conversationId);
  if (!data) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}
