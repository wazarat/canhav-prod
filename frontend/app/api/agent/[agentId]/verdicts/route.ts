import { NextResponse } from "next/server";

import { getAgentProfile, getCombinedVerdict, listVerdicts } from "@/lib/agent/memory";
import { requireOwnedAgent } from "@/lib/agent/ownership";
import {
  demoAgentConfig,
  refreshCombinedVerdict,
  runAndStoreVerdict,
} from "@/lib/agent/verdictRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Research verdict log for stablecoin / yield agents.
 *
 * GET  — public read of verdict history + optional combined verdict for the asset
 * POST — owner refresh (runs one research pass)
 */

export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Agent not found." }, { status: 404 });
  }

  const cfg = demoAgentConfig(agentId);
  const verdicts = await listVerdicts(agentId);
  const combined = cfg ? await getCombinedVerdict(cfg.asset) : null;

  return NextResponse.json({
    ok: true,
    agentId,
    asset: cfg?.asset ?? null,
    kind: cfg?.type ?? null,
    verdicts,
    combined,
    cadence: "hourly",
  });
}

export async function POST(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const cfg = demoAgentConfig(agentId);
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "This agent is not configured for the research verdict loop." },
      { status: 400 },
    );
  }

  const guard = await requireOwnedAgent(agentId);
  const ownerUserId = guard.error ? null : guard.session?.userId;

  const result = await runAndStoreVerdict(agentId, cfg.type, cfg.asset, ownerUserId);
  if (!result) {
    return NextResponse.json({ ok: false, error: "Unknown asset or run failed." }, { status: 400 });
  }

  await refreshCombinedVerdict(cfg.asset);
  const combined = await getCombinedVerdict(cfg.asset);

  return NextResponse.json({
    ok: true,
    verdict: result.verdict,
    publishedToDune: result.publishedToDune,
    combined,
  });
}
