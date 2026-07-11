"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCcw, Send } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

import type { TradeHitlMethod } from "@/lib/agent/agentConfig";
import { resolveActiveWallet } from "@/lib/agent/privy-signer";
import { fheEnabled } from "@/lib/fhe-flag";
import { cn } from "@/lib/utils";

interface ProposeResult {
  ok: boolean;
  blocked?: boolean;
  mode?: string;
  summary?: string;
  hint?: string;
  proposalId?: string;
  autoExecute?: boolean;
  /**
   * "deferred" when the size is encrypted with no on-chain caps — caps run at
   * signing instead; "onchain" when the encrypted cap check was verified.
   */
  capCheck?: "checked" | "deferred" | "onchain";
  suggestion?: Record<string, unknown>;
  error?: string;
}

/**
 * Files a GMX trade proposal through POST /api/agent/[agentId]/trade-proposals
 * — the same research-gated path as the `trade_propose` chat tool. On
 * approval-mode success the page refreshes so the proposed-trade card (with
 * Approve & trade / Reject) appears in the feed alongside this form.
 */
export function TradeProposalForm({
  agentId,
  coins,
  maxSizeUsd,
  maxLeverage,
  hitlMethod,
  defaultAsset,
}: {
  agentId: string;
  coins: { symbol: string; gateOpen: boolean }[];
  maxSizeUsd: number;
  maxLeverage: number;
  hitlMethod: TradeHitlMethod;
  /** Preselects this coin when it is in `coins` (blocked gates still preselect; the server re-enforces). */
  defaultAsset?: string;
}) {
  const router = useRouter();
  const { wallets } = useWallets();
  const [asset, setAsset] = useState(
    () =>
      coins.find((c) => c.symbol.toLowerCase() === defaultAsset?.toLowerCase())?.symbol ??
      coins.find((c) => c.gateOpen)?.symbol ??
      coins[0]?.symbol ??
      "",
  );
  const [side, setSide] = useState<"long" | "short">("long");
  const [sizeUsd, setSizeUsd] = useState(10);
  const [leverage, setLeverage] = useState(1);
  const [busy, setBusy] = useState(false);
  // FHE progress phase (encrypt → register tx [→ encrypted cap check] → POST).
  const [fhePhase, setFhePhase] = useState<
    "encrypting" | "registering" | "checking" | "filing" | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<ProposeResult | null>(null);
  const [spot, setSpot] = useState<{ symbol: string; priceUsd: number } | null>(null);

  const base = `/api/agent/${encodeURIComponent(agentId)}`;

  // Live reference price for sizing (matches the endpoint's ~60s cache).
  // GMX's on-chain oracle still prices the actual fill.
  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/agent/trade/price?symbol=${encodeURIComponent(asset)}`);
        const data = (await res.json()) as { ok: boolean; symbol?: string; priceUsd?: number };
        if (!cancelled) {
          setSpot(
            data.ok && typeof data.priceUsd === "number" && data.symbol
              ? { symbol: data.symbol, priceUsd: data.priceUsd }
              : null,
          );
        }
      } catch {
        if (!cancelled) setSpot(null);
      }
    }
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [asset]);

  const spotForAsset = spot && spot.symbol.toLowerCase() === asset.toLowerCase() ? spot : null;
  const positionUnits =
    spotForAsset && spotForAsset.priceUsd > 0 ? (sizeUsd * leverage) / spotForAsset.priceUsd : null;

  async function propose() {
    setBusy(true);
    setResult(null);
    try {
      // FHE Phase 1: encrypt the size client-side before it leaves the
      // browser. Manual mode is exempt — nothing is persisted there, so
      // there is no "at rest" to protect (and no register gas to spend).
      // If the research gate turns out to be closed, the registration tx is
      // wasted testnet gas — accepted for flow simplicity.
      let body: Record<string, unknown> = { asset, side, sizeUsdHuman: sizeUsd, leverage };
      if (fheEnabled() && hitlMethod !== "manual") {
        const wallet = resolveActiveWallet(wallets);
        if (!wallet) throw new Error("Connect a wallet to file an encrypted proposal.");
        // Dynamic import keeps the CoFHE SDK (WASM) out of every other chunk.
        const { encryptSizeUsd, registerIntent, registerAndCheckIntent, attestCapCheck } =
          await import("@/lib/agent/fhe/client");
        setFhePhase("encrypting");
        const cipher = await encryptSizeUsd(wallet, BigInt(Math.floor(sizeUsd)) * 10n ** 30n);

        // Phase 2: with on-chain encrypted caps, register+compare in one tx,
        // then have the threshold network attest the boolean — the server
        // verifies the attestation and can auto-approve without seeing sizes.
        let useOnchainCaps = false;
        if (hitlMethod === "spending_cap") {
          const { readOnchainCaps } = await import("@/lib/agent/fhe/reads");
          const caps = await readOnchainCaps(wallet.address, agentId);
          useOnchainCaps = caps.configured && caps.hasCaps;
        }

        if (useOnchainCaps) {
          setFhePhase("registering");
          const { envelope, okHandle } = await registerAndCheckIntent(wallet, agentId, cipher);
          setFhePhase("checking");
          const attested = await attestCapCheck(wallet, okHandle);
          setFhePhase("filing");
          body = {
            asset,
            side,
            leverage,
            sizeUsdEnc: envelope,
            capClaim: {
              okHandle: okHandle.toString(),
              within: attested.within,
              signature: attested.signature,
            },
          };
        } else {
          setFhePhase("registering");
          const registered = await registerIntent(wallet, cipher);
          setFhePhase("filing");
          body = { asset, side, leverage, sizeUsdEnc: registered };
        }
      }
      const res = await fetch(`${base}/trade-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ProposeResult;
      setResult(data);
      if (data.ok && data.proposalId) {
        // Surface the new proposal card (ProposedTradesPanel is an RSC).
        router.refresh();
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Request failed." });
    } finally {
      setBusy(false);
      setFhePhase(null);
    }
  }

  async function refreshResearch() {
    setRefreshing(true);
    try {
      const res = await fetch(`${base}/trade-readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset }),
      });
      const data = (await res.json()) as { ok: boolean; summary?: string };
      if (data.ok) {
        // Gate rows above are server-rendered — refresh them, then retry.
        router.refresh();
        await propose();
      } else {
        setResult({ ok: false, error: data.summary ?? "Research refresh failed." });
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Refresh failed." });
    } finally {
      setRefreshing(false);
    }
  }

  const blockedNeedsRefresh =
    result &&
    !result.ok &&
    result.blocked &&
    /stale|No research verdict/i.test(result.summary ?? "");

  return (
    <div className="space-y-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        Propose a trade
      </p>

      <div className="flex flex-wrap gap-2">
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          aria-label="Asset"
        >
          {coins.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.symbol}
              {c.gateOpen ? "" : " (blocked)"}
            </option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg border border-ink-700">
          <button
            type="button"
            onClick={() => setSide("long")}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
              side === "long"
                ? "bg-neon-500/20 text-neon-400"
                : "bg-ink-900/60 text-ink-300 hover:text-ink-100",
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Long
          </button>
          <button
            type="button"
            onClick={() => setSide("short")}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
              side === "short"
                ? "bg-rose-500/20 text-rose-400"
                : "bg-ink-900/60 text-ink-300 hover:text-ink-100",
            )}
          >
            <ArrowDownRight className="h-3.5 w-3.5" /> Short
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-400">
            Size (USD, max {maxSizeUsd})
          </span>
          <input
            type="number"
            min={1}
            max={maxSizeUsd}
            value={sizeUsd}
            onChange={(e) =>
              setSizeUsd(Math.max(1, Math.min(maxSizeUsd, Number(e.target.value) || 1)))
            }
            className="w-28 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-400">
            Leverage (max {maxLeverage}x)
          </span>
          <input
            type="number"
            min={1}
            max={maxLeverage}
            value={leverage}
            onChange={(e) =>
              setLeverage(Math.max(1, Math.min(maxLeverage, Number(e.target.value) || 1)))
            }
            className="w-24 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          />
        </label>
        <button
          type="button"
          onClick={propose}
          disabled={busy || refreshing || !asset}
          className="btn-gradient btn-glow inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {fhePhase === "encrypting"
            ? "Encrypting…"
            : fhePhase === "registering"
              ? "Confirm registration in wallet…"
              : fhePhase === "checking"
                ? "Checking caps (encrypted)…"
                : fhePhase === "filing"
                  ? "Filing proposal…"
                  : "Propose"}
        </button>
      </div>

      {spotForAsset && (
        <p className="font-mono text-[11px] text-ink-400">
          {spotForAsset.symbol} ref ·{" "}
          <span className="text-ink-200">
            $
            {spotForAsset.priceUsd.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          {positionUnits != null && (
            <>
              {" "}
              · ≈{positionUnits.toLocaleString("en-US", { maximumSignificantDigits: 4 })}{" "}
              {spotForAsset.symbol} position
            </>
          )}{" "}
          <span className="text-ink-500">(GMX oracle prices the fill)</span>
        </p>
      )}

      <p className="text-[11px] text-ink-500">
        {hitlMethod === "manual"
          ? "Research only: you'll get a suggestion to place yourself on GMX; nothing is filed."
          : hitlMethod === "spending_cap"
            ? fheEnabled()
              ? "Auto within limits: with encrypted caps set on-chain, the cap check runs on ciphertext (nobody sees the numbers); otherwise caps are checked when you sign. Every trade still needs your wallet signature."
              : "Auto within limits: proposals inside your caps skip the approval click, but you still sign every trade in your wallet."
            : "The proposal appears in the feed on the left; nothing trades until you approve it and sign."}
        {fheEnabled() && hitlMethod !== "manual" && (
          <>
            {" "}
            Encrypted filing: your size is encrypted in this browser and registered on-chain
            (one wallet signature + gas) before it&apos;s stored; the server only
            ever sees ciphertext until you sign the trade.
          </>
        )}
      </p>

      {result && (
        <div
          className={cn(
            "space-y-2 rounded-lg border px-3 py-2.5 text-sm",
            result.ok
              ? "border-neon-500/30 bg-neon-500/5 text-neon-400"
              : "border-rose-500/30 bg-rose-500/5 text-rose-400",
          )}
        >
          <p>{result.summary ?? result.error ?? (result.ok ? "Proposed." : "Failed.")}</p>
          {result.ok && result.mode === "spending_cap" && result.proposalId && (
            <p className="text-xs text-ink-400">
              {result.capCheck === "onchain"
                ? result.autoExecute
                  ? "Within your encrypted caps: verified on ciphertext, auto-approved. Open it in the feed and sign to execute; no unattended signer exists."
                  : "Over your encrypted caps: verified on ciphertext without revealing the size. It needs your explicit approval in the feed."
                : result.capCheck === "deferred"
                  ? "Size encrypted: caps are checked when you reveal and sign in the feed."
                  : result.autoExecute
                    ? "Within caps: auto-approved. Open it in the feed and sign to execute; no unattended signer exists."
                    : "Over your caps: it needs your explicit approval in the feed."}
            </p>
          )}
          {result.ok && result.suggestion && (
            <pre className="overflow-x-auto rounded bg-ink-950/60 p-2 font-mono text-[10px] text-ink-300">
              {JSON.stringify(result.suggestion, null, 2)}
            </pre>
          )}
          {blockedNeedsRefresh && (
            <button
              type="button"
              onClick={refreshResearch}
              disabled={refreshing || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Refresh research &amp; retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
