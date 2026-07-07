import { listTradeProposals } from "@/lib/agent/memory";
import { tradeProposalToJson } from "@/lib/agent/trade/types";
import { ProposedTradeCard } from "@/components/agent/ProposedTradeCard";

export async function ProposedTradesPanel({ agentId }: { agentId: string }) {
  const proposals = await listTradeProposals(agentId, 10);
  const open = proposals
    .map(tradeProposalToJson)
    .filter((p) => p.status === "proposed" || p.status === "executed");

  if (!open.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-ink-50">Proposed trades</h3>
      {open.map((p) => (
        <ProposedTradeCard key={p.id} agentId={agentId} proposal={p} />
      ))}
    </div>
  );
}
