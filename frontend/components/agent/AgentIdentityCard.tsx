import { ExternalLink, Fingerprint, Hash, Wallet } from "lucide-react";

import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { Badge } from "@/components/ui/Badge";
import type { SecurityInfo } from "@/lib/types";

export interface AgentIdentity {
  agentId: string;
  agentAddress: string;
  agentURI?: string | null;
  arbiscanUrl?: string | null;
  skillTitle?: string | null;
  onChain?: boolean;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function AgentIdentityCard({ identity }: { identity: AgentIdentity }) {
  const security: SecurityInfo = identity.onChain
    ? {
        status: "verified",
        auditUrl: null,
        source: "On-chain ERC-8004 identity (Arbitrum Sepolia)",
      }
    : {
        status: "unverified",
        auditUrl: null,
        source: "Not yet minted on-chain",
      };

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-electric-500/40 bg-electric-500/10 text-electric-400">
            <Fingerprint className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
              {identity.skillTitle ?? "CanHav Agent"}
            </h3>
            <p className="text-xs text-ink-400">ERC-8004 identity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="signal">Arbitrum Sepolia</Badge>
          <SecurityBadge info={security} />
        </div>
      </div>

      <dl className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-2.5">
          <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-400">
            <Hash className="h-3.5 w-3.5" /> Agent ID
          </dt>
          <dd className="font-mono text-sm text-ink-100">#{identity.agentId}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-2.5">
          <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-400">
            <Wallet className="h-3.5 w-3.5" /> Smart account
          </dt>
          <dd className="font-mono text-sm text-ink-100">{shortAddr(identity.agentAddress)}</dd>
        </div>
      </dl>

      {identity.arbiscanUrl && (
        <a
          href={identity.arbiscanUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
        >
          View on Arbiscan <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
