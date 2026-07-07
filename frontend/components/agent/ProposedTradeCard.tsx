"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

import { Badge } from "@/components/ui/Badge";
import { executeTrade } from "@/lib/agent/trade/execute";
import { tradeProposalFromJson, type TradeProposalJson } from "@/lib/agent/trade/types";
import { resolveActiveWallet } from "@/lib/agent/privy-signer";
import { arbiscanSepoliaTx } from "@/lib/utils";

interface ProposedTradeCardProps {
  agentId: string;
  proposal: TradeProposalJson;
}

export function ProposedTradeCard({ agentId, proposal: initial }: ProposedTradeCardProps) {
  const router = useRouter();
  const { wallets } = useWallets();
  const [proposal, setProposal] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = tradeProposalFromJson(proposal);
  const sizeHuman = (Number(parsed.sizeUsd) / 10 ** 30).toFixed(2);

  const patchProposal = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/agent/${encodeURIComponent(agentId)}/trade-proposals/${encodeURIComponent(proposal.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json()) as { ok?: boolean; proposal?: TradeProposalJson; error?: string };
      if (!res.ok || !data.ok || !data.proposal) {
        throw new Error(data.error ?? "Update failed.");
      }
      setProposal(data.proposal);
      return data.proposal;
    },
    [agentId, proposal.id],
  );

  async function onReject() {
    setBusy(true);
    setError(null);
    try {
      await patchProposal({ action: "reject", reason: "Rejected by owner." });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove() {
    setBusy(true);
    setError(null);
    try {
      const preflight = await fetch("/api/agent/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          asset: parsed.asset,
          side: parsed.side,
          sizeUsd: parsed.sizeUsd.toString(),
          leverage: parsed.leverage,
          humanApproved: true,
        }),
      });
      const pre = (await preflight.json()) as {
        ok?: boolean;
        error?: string;
        market?: string;
        collateralAmount?: string;
        rpcUrl?: string;
        verdictRef?: string;
      };
      if (!preflight.ok || !pre.ok || !pre.market) {
        throw new Error(pre.error ?? "Preflight failed.");
      }

      const wallet = resolveActiveWallet(wallets);
      if (!wallet) throw new Error("Connect a wallet to approve trades.");

      const { txHash } = await executeTrade({
        wallet,
        intent: parsed,
        market: pre.market as `0x${string}`,
        collateralAmount: BigInt(pre.collateralAmount ?? "1000000"),
        rpcUrl: pre.rpcUrl,
      });

      await fetch("/api/agent/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          asset: parsed.asset,
          side: parsed.side,
          sizeUsd: parsed.sizeUsd.toString(),
          leverage: parsed.leverage,
          market: pre.market,
          txHash,
          verdictRef: pre.verdictRef ?? parsed.verdictRef,
          humanApproved: true,
        }),
      });

      await patchProposal({ action: "executed", txHash });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setBusy(false);
    }
  }

  const done = proposal.status === "executed" || proposal.status === "rejected";

  return (
    <div className="glass rounded-2xl border border-electric-500/25 bg-electric-500/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {parsed.side === "long" ? (
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        ) : (
          <TrendingDown className="h-4 w-4 text-rose-400" />
        )}
        <h3 className="font-display text-sm font-semibold text-ink-50">
          Proposed GMX {parsed.side} · {parsed.asset}
        </h3>
        <Badge tone={proposal.status === "executed" ? "positive" : "warning"}>
          {proposal.status}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-ink-300">
        ~${sizeHuman} USD · {parsed.leverage}x leverage · Arbitrum Sepolia
      </p>
      <p className="mt-1 font-mono text-[10px] text-ink-500">verdict: {parsed.verdictRef}</p>

      {proposal.txHash ? (
        <p className="mt-2 text-xs">
          <a
            href={arbiscanSepoliaTx(proposal.txHash) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-electric-400 hover:text-electric-300"
          >
            View tx {proposal.txHash.slice(0, 10)}…
          </a>
        </p>
      ) : null}

      {proposal.reason && (
        <p className="mt-2 text-xs text-ink-400">{proposal.reason}</p>
      )}

      {!done && proposal.status === "proposed" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.45)] transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve &amp; trade
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
