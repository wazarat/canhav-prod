import { NextResponse } from "next/server";

import { agentConfigStatus } from "@/lib/agent/config";

/**
 * Agent-layer configuration readout.
 *
 * Reports which capabilities are live in this environment (LLM / memory /
 * on-chain identity) so the UI and external checks can see what is provisioned
 * without leaking any secret values. Always Arbitrum Sepolia.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(agentConfigStatus());
}
