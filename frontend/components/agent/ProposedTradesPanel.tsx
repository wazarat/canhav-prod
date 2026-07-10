import { sanitizeAgentConfig } from "@/lib/agent/agentConfig";
import { getAgentProfile, listTradeProposals } from "@/lib/agent/memory";
import { isWithinCaps, readCapStatus } from "@/lib/agent/trade/gateStatus";
import { tradeProposalToJson } from "@/lib/agent/trade/types";
import { ProposedTradeCard } from "@/components/agent/ProposedTradeCard";

export async function ProposedTradesPanel({ agentId }: { agentId: string }) {
  const proposals = await listTradeProposals(agentId, 10);
  const open = proposals.filter((p) => p.status === "proposed" || p.status === "executed");

  if (!open.length) return null;

  // Under "Auto within limits", tell the owner which open proposals would
  // auto-approve. Display-only booleans (BigInt never crosses to the client);
  // checkSpendingCap re-enforces at /api/agent/trade.
  const profile = await getAgentProfile(agentId);
  const cfg = sanitizeAgentConfig(profile?.config ?? {});
  const withinCapsById = new Map<string, boolean>();
  if (cfg.tradeHitlMethod === "spending_cap") {
    const caps = await readCapStatus(agentId, cfg);
    for (const p of open) {
      if (p.status !== "proposed") continue;
      withinCapsById.set(p.id, isWithinCaps(p.sizeUsd, caps));
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-ink-50">Proposed trades</h3>
      {open.map((p) => (
        <ProposedTradeCard
          key={p.id}
          agentId={agentId}
          proposal={tradeProposalToJson(p)}
          hitlMethod={cfg.tradeHitlMethod}
          withinCaps={withinCapsById.get(p.id)}
        />
      ))}
    </div>
  );
}
