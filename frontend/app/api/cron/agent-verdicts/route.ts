import { NextResponse } from "next/server";

import { runAllDemoAgentVerdicts } from "@/lib/agent/verdictRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Hourly cron: run all four alpha demo agents and refresh combined verdicts.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runAllDemoAgentVerdicts();
    return NextResponse.json({
      ok: true,
      ...result,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verdict cron failed.";
    console.error("[cron/agent-verdicts]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
