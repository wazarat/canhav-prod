import { NextResponse } from "next/server";

import { getCombinedVerdict } from "@/lib/agent/memory";
import { YIELD_DEMO_AGENTS } from "@/lib/agent/verdictRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public combined verdict for a researched asset: a yield-bearing stablecoin
 * pair (sUSDe, sUSDai) or a majors market agent (ETH, BTC).
 * Query: ?asset=sUSDe | ETH | …  OR  ?entity=ethena | ethereum | …
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let asset = searchParams.get("asset");
  const entity = searchParams.get("entity");

  if (!asset && entity) {
    const match = YIELD_DEMO_AGENTS.find((a) => a.entitySlug === entity);
    asset = match?.asset ?? null;
  }

  const entityMatch = asset ? YIELD_DEMO_AGENTS.find((a) => a.asset === asset) : null;
  if (!asset || !entityMatch) {
    const assets = [...new Set(YIELD_DEMO_AGENTS.map((a) => a.asset))].join("|");
    const entities = [...new Set(YIELD_DEMO_AGENTS.map((a) => a.entitySlug))].join("|");
    return NextResponse.json(
      { ok: false, error: `Provide ?asset=${assets} or ?entity=${entities}` },
      { status: 400 },
    );
  }

  const combined = await getCombinedVerdict(asset);
  const stableAgent = YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "stablecoin");
  const yieldAgent = YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "yield");
  const marketAgent = YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "market");

  return NextResponse.json({
    ok: true,
    asset,
    entitySlug: entityMatch.entitySlug,
    combined,
    agents: {
      stablecoin: stableAgent?.agentId ?? null,
      yield: yieldAgent?.agentId ?? null,
      market: marketAgent?.agentId ?? null,
    },
  });
}
