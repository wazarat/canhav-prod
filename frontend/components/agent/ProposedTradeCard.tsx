"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

import { fheEnabled } from "@/lib/fhe-flag";

import { Badge } from "@/components/ui/Badge";
import type { TradeHitlMethod } from "@/lib/agent/agentConfig";
import { executeTrade } from "@/lib/agent/trade/execute";
import {
  plainUsdOrNull,
  proposalToIntent,
  requirePlainUsd,
  tradeProposalFromJson,
  type TradeProposalJson,
} from "@/lib/agent/trade/types";
import { resolveActiveWallet } from "@/lib/agent/privy-signer";
import { arbiscanSepoliaTx } from "@/lib/utils";

interface ProposedTradeCardProps {
  agentId: string;
  proposal: TradeProposalJson;
  /** Agent's HITL method — lets cap-mode proposals explain themselves. */
  hitlMethod?: TradeHitlMethod;
  /** Under spending_cap: whether this proposal auto-approves (display-only). */
  withinCaps?: boolean;
}

export function ProposedTradeCard({
  agentId,
  proposal: initial,
  hitlMethod,
  withinCaps,
}: ProposedTradeCardProps) {
  const router = useRouter();
  const { wallets } = useWallets();
  const [proposal, setProposal] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // FHE Phase 1: owner-revealed plaintext for an encrypted proposal (30-dec).
  const [revealedUsd30, setRevealedUsd30] = useState<bigint | null>(null);
  const [revealing, setRevealing] = useState(false);

  const parsed = tradeProposalFromJson(proposal);
  const isEncrypted = parsed.sizeUsd.kind === "encrypted";
  const plainSize = plainUsdOrNull(parsed.sizeUsd) ?? revealedUsd30;
  const sizeHuman = plainSize !== null ? (Number(plainSize) / 10 ** 30).toFixed(2) : null;

  async function onReveal() {
    if (parsed.sizeUsd.kind !== "encrypted") return;
    setRevealing(true);
    setError(null);
    try {
      const wallet = resolveActiveWallet(wallets);
      if (!wallet) throw new Error("Connect a wallet to reveal the size.");
      // Dynamic import keeps the CoFHE SDK (WASM) out of every other chunk.
      const { revealSizeUsd } = await import("@/lib/agent/fhe/client");
      setRevealedUsd30(await revealSizeUsd(wallet, parsed.sizeUsd.ctHash));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reveal failed.");
    } finally {
      setRevealing(false);
    }
  }

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
      // Encrypted proposals must be revealed first (Approve is disabled until
      // then); the plaintext exists only here and at the execute endpoint,
      // which re-runs the research gate, spending caps, and MAX_SIZE_USD clamp.
      const sizeUsd30 =
        parsed.sizeUsd.kind === "plain" ? requirePlainUsd(parsed.sizeUsd) : revealedUsd30;
      if (sizeUsd30 === null) throw new Error("Reveal the size before approving.");
      const preflight = await fetch("/api/agent/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          asset: parsed.asset,
          side: parsed.side,
          sizeUsd: sizeUsd30.toString(),
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
        intent: proposalToIntent(parsed, sizeUsd30),
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
          sizeUsd: sizeUsd30.toString(),
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
  const capMode = hitlMethod === "spending_cap" && proposal.status === "proposed";
  const autoApproved = capMode && withinCaps === true;
  // Encrypted rows have no server-side cap verdict (withinCaps undefined) and
  // need a reveal before Approve; if the FHE flag was later turned off, fail
  // closed: the row renders but cannot be revealed or approved (Reject works).
  const canReveal = isEncrypted && revealedUsd30 === null && fheEnabled();
  const approveBlocked = isEncrypted && revealedUsd30 === null;

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
        {isEncrypted && (
          <Badge tone="neutral" className="font-mono text-[10px]">
            <Lock className="mr-1 inline h-3 w-3" />
            size encrypted
          </Badge>
        )}
        {autoApproved && (
          <Badge tone="electric" className="font-mono text-[10px]">
            within caps · auto-approved
          </Badge>
        )}
        {capMode && withinCaps === false && (
          <Badge tone="warning" className="font-mono text-[10px]">
            over caps · approval required
          </Badge>
        )}
        {capMode && isEncrypted && withinCaps === undefined && (
          <Badge tone="neutral" className="font-mono text-[10px]">
            caps checked at signing
          </Badge>
        )}
      </div>

      <p className="mt-2 text-sm text-ink-300">
        {sizeHuman !== null
          ? `~$${sizeHuman} USD`
          : fheEnabled()
            ? "Size encrypted · reveal to view"
            : "Size encrypted — enable FHE to reveal"}{" "}
        · {parsed.leverage}x leverage · Arbitrum Sepolia
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
          {canReveal && (
            <button
              type="button"
              onClick={onReveal}
              disabled={busy || revealing}
              className="inline-flex items-center gap-1.5 rounded-full border border-electric-500/40 bg-electric-500/10 px-4 py-2 text-sm font-semibold text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
            >
              {revealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {revealing ? "Decrypting…" : "Reveal size"}
            </button>
          )}
          <button
            type="button"
            onClick={onApprove}
            disabled={busy || approveBlocked}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.45)] transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {autoApproved ? "Sign & execute" : "Approve & trade"}
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
          {autoApproved && (
            <p className="w-full text-[11px] text-ink-500">
              No unattended signer — your wallet signature is what executes this trade.
            </p>
          )}
          {revealing && (
            <p className="w-full text-[11px] text-ink-500">
              Decrypting via the CoFHE threshold network — first reveal also asks your
              wallet for a one-time permit signature.
            </p>
          )}
          {isEncrypted && revealedUsd30 === null && !revealing && (
            <p className="w-full text-[11px] text-ink-500">
              {fheEnabled()
                ? "The size is encrypted at rest — reveal it to approve. Caps and the research gate re-run when you sign."
                : "Filed while FHE was enabled; re-enable NEXT_PUBLIC_FHE_ENABLED to reveal or approve. Reject works without revealing."}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
