import {
  AlertTriangle,
  ExternalLink,
  FileJson,
  Fingerprint,
  Hash,
  ScanLine,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { scan8004AgentUrl } from "@/lib/agent/8004scan";
import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { Badge } from "@/components/ui/Badge";
import type { SecurityInfo } from "@/lib/types";

export interface AgentIdentity {
  agentId: string;
  agentAddress: string;
  agentURI?: string | null;
  /** Arbiscan link to the agent's smart-account address. */
  arbiscanUrl?: string | null;
  /** Arbiscan link to the minted ERC-721 token on the IdentityRegistry. */
  tokenUrl?: string | null;
  skillTitle?: string | null;
  onChain?: boolean;
}

/** Result of the on-chain read (lib/agent/onchain.ts) for the live badge. */
export interface AgentVerification {
  verified: boolean;
  configured: boolean;
  owner?: string | null;
  tokenURI?: string | null;
  arbiscanUrl?: string | null;
  error?: string;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function AgentIdentityCard({
  identity,
  verification,
  agentCardUrl,
  cardPageUrl,
  verifyUrl,
}: {
  identity: AgentIdentity;
  verification?: AgentVerification;
  /** Raw JSON agent-card API (developers / indexers). */
  agentCardUrl?: string | null;
  /** Human-readable identity card page. */
  cardPageUrl?: string | null;
  /** The platform's own on-chain verification endpoint ("scan it on the platform"). */
  verifyUrl?: string | null;
}) {
  const security: SecurityInfo = identity.onChain
    ? {
        status: "verified",
        auditUrl: null,
        source: "On-chain ERC-8004 identity (Arbitrum)",
      }
    : {
        status: "unverified",
        auditUrl: null,
        source: "Not yet minted on-chain",
      };

  // Live verification (ownerOf matches the agent's smart account) takes priority
  // over the stored `onChain` flag when available.
  const ownershipMismatch =
    verification?.configured === true &&
    Boolean(verification?.owner) &&
    verification?.verified === false;

  const scanUrl = identity.onChain ? scan8004AgentUrl(identity.agentId) : null;

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
          <Badge tone="signal">Arbitrum</Badge>
          {verification?.verified ? (
            <Badge tone="positive">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : ownershipMismatch ? (
            <Badge tone="warning">
              <AlertTriangle className="h-3 w-3" /> Owner mismatch
            </Badge>
          ) : (
            <SecurityBadge info={security} />
          )}
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

      {verification?.verified && (
        <p className="text-xs text-emerald-300/90">
          This identity is verified and controlled by your account.
        </p>
      )}
      {verification && !verification.verified && verification.configured && verification.error && (
        <p className="text-xs text-ink-500">Verification check unavailable: {verification.error}</p>
      )}

      {/* Arbiscan-first: scan the token + smart account on Arbitrum Sepolia, plus
          the platform's own on-chain verification. 8004scan is demoted to an
          optional secondary link (it only indexes the canonical registry). */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {identity.tokenUrl && (
          <a
            href={identity.tokenUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
          >
            <ScanLine className="h-3.5 w-3.5" /> Scan token #{identity.agentId} on Arbiscan
          </a>
        )}
        {identity.arbiscanUrl && (
          <a
            href={identity.arbiscanUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
          >
            Smart account on Arbiscan <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {verifyUrl && (
          <a
            href={verifyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Verify on CanHav
          </a>
        )}
        {cardPageUrl && (
          <a
            href={cardPageUrl}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
          >
            <FileJson className="h-3.5 w-3.5" /> View identity card
          </a>
        )}
        {agentCardUrl && (
          <a
            href={agentCardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-300"
          >
            JSON API <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {scanUrl && (
          <a
            href={scanUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-300"
          >
            8004scan <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
