import "server-only";

import {
  appendVerdict,
  getLastSnapshot,
  getCombinedVerdict,
  setCombinedVerdict,
  setSnapshot,
} from "@/lib/agent/memory";
import { canPublishVerdict } from "@/lib/agent/dunePublish";
import { insertVerdict, ensureVerdictTable } from "@/lib/server/dune";
// Deep imports (not the package barrel): the index re-exports the kernel spawn
// path whose deps only exist under agent-service/ — with webpack symlink
// resolution off (see next.config.mjs) those bare imports would not resolve,
// and even type-only barrel imports pull spawn.ts into the TS program.
import { combineVerdicts } from "canhav-agent-service/src/agent/combine";
import { runOnceBySymbol } from "canhav-agent-service/src/agent/schedule";
import type { AgentType, ResearchVerdict } from "canhav-agent-service/src/types";

/**
 * Alpha demo agents seeded by yield-agents-demo.mjs, plus the majors market
 * agents (roadmap B1). Yield-bearing stables run a stablecoin+yield pair whose
 * verdicts are combined; majors run a single market agent whose verdict is
 * stored as the combined verdict directly (no fake second leg).
 */
export const YIELD_DEMO_AGENTS = [
  { agentId: "900101", type: "stablecoin" as AgentType, asset: "sUSDe", entitySlug: "ethena" },
  { agentId: "900102", type: "yield" as AgentType, asset: "sUSDe", entitySlug: "ethena" },
  { agentId: "900103", type: "stablecoin" as AgentType, asset: "sUSDai", entitySlug: "usd-ai" },
  { agentId: "900104", type: "yield" as AgentType, asset: "sUSDai", entitySlug: "usd-ai" },
  { agentId: "900105", type: "market" as AgentType, asset: "ETH", entitySlug: "ethereum" },
  { agentId: "900106", type: "market" as AgentType, asset: "BTC", entitySlug: "bitcoin" },
] as const;

export function demoAgentConfig(agentId: string) {
  return YIELD_DEMO_AGENTS.find((a) => a.agentId === agentId) ?? null;
}

/** Assets with a research loop capable of opening the trade gate. */
export function gatedResearchAssets(): string[] {
  return [...new Set(YIELD_DEMO_AGENTS.map((a) => a.asset))];
}

function demoAgentsForAsset(asset: string) {
  return {
    stable: YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "stablecoin"),
    yieldAgent: YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "yield"),
    market: YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "market"),
  };
}

export interface RunAgentVerdictResult {
  verdict: ResearchVerdict;
  publishedToDune: boolean;
}

/** Run one research pass, persist verdict + snapshot. Optional Dune publish. */
export async function runAndStoreVerdict(
  agentId: string,
  type: AgentType,
  assetSymbol: string,
  ownerUserId?: string | null,
): Promise<RunAgentVerdictResult | null> {
  const prior = await getLastSnapshot(agentId, assetSymbol);
  const result = await runOnceBySymbol(type, assetSymbol, agentId, prior);
  if (!result) return null;

  const { verdict, snapshot } = result;
  await Promise.all([appendVerdict(agentId, verdict), setSnapshot(agentId, assetSymbol, snapshot)]);

  let publishedToDune = false;
  if (ownerUserId) {
    const gate = await canPublishVerdict(agentId, ownerUserId);
    if (gate.ok) {
      await ensureVerdictTable();
      publishedToDune = await insertVerdict({
        ts: verdict.ts,
        agent_id: verdict.agentId,
        asset: verdict.asset,
        signal: verdict.signal,
        severity: verdict.severity,
        rationale: verdict.rationale,
        confidence: verdict.confidence,
        source_refs: `${type}_agent;${assetSymbol}`,
      });
    }
  }

  return { verdict, publishedToDune };
}

/**
 * Refresh the gate-facing combined verdict for an asset and persist it.
 * Stablecoin+yield pairs are merged via combineVerdicts; a majors asset has a
 * single market agent whose latest verdict is stored directly.
 */
export async function refreshCombinedVerdict(asset: string): Promise<ResearchVerdict | null> {
  const { stable, yieldAgent, market } = demoAgentsForAsset(asset);
  const { listVerdicts } = await import("@/lib/agent/memory");

  if (stable && yieldAgent) {
    const [stableVerdicts, yieldVerdicts] = await Promise.all([
      listVerdicts(stable.agentId, 1),
      listVerdicts(yieldAgent.agentId, 1),
    ]);
    const a = stableVerdicts[0];
    const b = yieldVerdicts[0];
    if (!a || !b) return null;

    const combined = combineVerdicts(a, b);
    await setCombinedVerdict(asset, combined);
    return combined;
  }

  if (market) {
    const verdicts = await listVerdicts(market.agentId, 1);
    const latest = verdicts[0];
    if (!latest) return null;
    await setCombinedVerdict(asset, latest);
    return latest;
  }

  return null;
}

/** Run the asset's research passes and refresh the combined verdict (trade gate input). */
export async function refreshAssetCombinedVerdict(
  asset: string,
  ownerUserId?: string | null,
): Promise<{ ok: boolean; combined: ResearchVerdict | null; summary: string }> {
  const normalized = asset.trim();
  const { stable, yieldAgent, market } = demoAgentsForAsset(normalized);

  if (stable && yieldAgent) {
    const stableRun = await runAndStoreVerdict(stable.agentId, stable.type, normalized, ownerUserId);
    const yieldRun = await runAndStoreVerdict(yieldAgent.agentId, yieldAgent.type, normalized, ownerUserId);
    if (!stableRun || !yieldRun) {
      return {
        ok: false,
        combined: null,
        summary: "Research run failed for stablecoin or yield demo agent.",
      };
    }
  } else if (market) {
    const marketRun = await runAndStoreVerdict(market.agentId, market.type, normalized, ownerUserId);
    if (!marketRun) {
      return {
        ok: false,
        combined: null,
        summary: `Market research run failed for ${normalized}.`,
      };
    }
  } else {
    return {
      ok: false,
      combined: null,
      summary: `Cannot refresh: ${normalized} is not trade-gated (use ${gatedResearchAssets().join(", ")}).`,
    };
  }

  const combined = await refreshCombinedVerdict(normalized);
  if (!combined) {
    return { ok: false, combined: null, summary: "Failed to refresh the combined verdict." };
  }

  return {
    ok: true,
    combined,
    summary: `Refreshed combined verdict for ${normalized} (${combined.signal}, ${combined.severity}, ts=${combined.ts}). Re-run trade_propose to open the gate.`,
  };
}

/** Cron entry: run all demo agents + refresh combined reads. */
export async function runAllDemoAgentVerdicts(): Promise<{
  ran: number;
  combined: string[];
}> {
  let ran = 0;
  for (const cfg of YIELD_DEMO_AGENTS) {
    const out = await runAndStoreVerdict(cfg.agentId, cfg.type, cfg.asset);
    if (out) ran++;
  }
  const combined: string[] = [];
  for (const asset of gatedResearchAssets()) {
    const c = await refreshCombinedVerdict(asset);
    if (c) combined.push(asset);
  }
  return { ran, combined };
}
