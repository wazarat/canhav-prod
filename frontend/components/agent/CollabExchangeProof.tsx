"use client";

import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { useCallback, useState } from "react";

import { AgentInteractionTheater } from "@/components/agent/AgentInteractionTheater";
import { Badge } from "@/components/ui/Badge";
import { arbiscanSepoliaAddress, arbiscanSepoliaTx } from "@/lib/utils";

export interface ExchangeProofProps {
  paymentRef: string;
  fromAgentId: string;
  toAgentId: string;
  fromAgentName: string;
  toAgentName: string;
  amount: string | null;
  at: string | null;
  onChain: boolean;
  /** CollabRegistry attestation tx (when recorded on-chain). */
  recordTx: string | null;
  units: number | null;
  agreementId: string | null;
  skillHash: string;
  registryAddress: string | null;
  /** Human-readable settlement label (e.g. tCNHV). */
  assetLabel: string;
  /** Settlement token contract address (the asset that moved on-chain). */
  assetAddress: string | null;
  sharePath: string;
}

export function CollabExchangeProof({
  paymentRef,
  fromAgentId,
  toAgentId,
  fromAgentName,
  toAgentName,
  amount,
  at,
  onChain,
  recordTx,
  units,
  agreementId,
  skillHash,
  registryAddress,
  assetLabel,
  assetAddress,
  sharePath,
}: ExchangeProofProps) {
  const [copied, setCopied] = useState(false);

  const copyShareLink = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${sharePath}`
        : sharePath;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [sharePath]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {onChain ? (
          <Badge tone="positive">Verified on-chain</Badge>
        ) : (
          <Badge tone="neutral">Settled · record pending</Badge>
        )}
        {amount && amount !== "0" && (
          <Badge tone="signal">
            {amount} {assetLabel}
          </Badge>
        )}
        {units != null && (
          <Badge tone="neutral">
            {units} unit{units === 1 ? "" : "s"}
          </Badge>
        )}
        {agreementId && <Badge tone="neutral">Agreement</Badge>}
      </div>

      <AgentInteractionTheater
        buyer={{ id: fromAgentId, name: fromAgentName }}
        seller={{ id: toAgentId, name: toAgentName }}
        phase="done"
        paymentTx={paymentRef}
        recordTx={recordTx}
        settlement={{
          txHash: paymentRef,
          network: "eip155:421614",
          networkName: "Arbitrum Sepolia",
          humanAmount: amount ?? undefined,
          asset: assetLabel,
        }}
        price={amount}
        assetLabel={assetLabel}
        assetAddress={assetAddress}
      />

      <div className="glass space-y-3 rounded-2xl border border-ink-800/60 p-5">
        <h2 className="font-display text-sm font-semibold text-ink-100">Proof details</h2>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <Detail label="Buyer agent">
            <Link href={`/agents/${fromAgentId}`} className="font-mono text-electric-400 hover:text-electric-300">
              #{fromAgentId} · {fromAgentName}
            </Link>
          </Detail>
          <Detail label="Seller agent">
            <Link href={`/agents/${toAgentId}`} className="font-mono text-signal-400 hover:text-signal-300">
              #{toAgentId} · {toAgentName}
            </Link>
          </Detail>
          {at && <Detail label="Settled">{new Date(at).toLocaleString()}</Detail>}
          <Detail label="Offer hash">
            <span className="font-mono text-ink-400">{skillHash.slice(0, 22)}…</span>
          </Detail>
          <Detail label="Payment tx">
            <ProofLink href={arbiscanSepoliaTx(paymentRef)} label={shortHash(paymentRef)} />
          </Detail>
          {recordTx && recordTx.toLowerCase() !== paymentRef.toLowerCase() && (
            <Detail label="Registry record">
              <ProofLink href={arbiscanSepoliaTx(recordTx)} label={shortHash(recordTx)} />
            </Detail>
          )}
          {assetAddress && (
            <Detail label={`Settlement token (${assetLabel})`}>
              <ProofLink
                href={arbiscanSepoliaAddress(assetAddress)}
                label={shortHash(assetAddress)}
              />
            </Detail>
          )}
          {registryAddress && (
            <Detail label="CollabRegistry">
              <ProofLink
                href={arbiscanSepoliaAddress(registryAddress)}
                label={shortHash(registryAddress)}
              />
            </Detail>
          )}
        </dl>

        <div className="flex flex-wrap gap-2 border-t border-ink-800/60 pt-3">
          <button
            type="button"
            onClick={() => void copyShareLink()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/30 bg-electric-500/10 px-3 py-1.5 text-[11px] font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy CanHav proof link
              </>
            )}
          </button>
          <a
            href={arbiscanSepoliaTx(paymentRef) ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/30 bg-neon-500/10 px-3 py-1.5 text-[11px] font-medium text-neon-300 transition-colors hover:bg-neon-500/20"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open on Arbiscan
          </a>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="text-ink-200">{children}</dd>
    </div>
  );
}

function ProofLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="font-mono text-ink-400">{label}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-electric-400 hover:text-electric-300"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function shortHash(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}
