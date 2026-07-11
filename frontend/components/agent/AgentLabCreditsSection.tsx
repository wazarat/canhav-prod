"use client";

import { WalletCreditsPanel } from "@/components/agent/WalletCreditsPanel";
import { Badge } from "@/components/ui/Badge";

/**
 * Agent Lab credits block — mint starting tCNHV, fund agents, claim faucet.
 */
export function AgentLabCreditsSection({
  buyerAgents,
}: {
  buyerAgents: { agentId: string; name: string }[];
}) {
  return (
    <section id="agents-credits" className="scroll-mt-32 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            tCNHV test credits
          </h2>
          <p className="max-w-2xl text-sm text-ink-400">
            Mint starting credits to your treasury smart account, then fund an on-chain agent so it
            can pay sellers on the collaboration marketplace.
          </p>
        </div>
        <Badge tone="signal">tCNHV</Badge>
      </div>
      <WalletCreditsPanel buyerAgents={buyerAgents} showMintActions />
    </section>
  );
}
