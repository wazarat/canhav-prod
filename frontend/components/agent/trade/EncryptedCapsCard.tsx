"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

import { Badge } from "@/components/ui/Badge";
import { resolveActiveWallet } from "@/lib/agent/privy-signer";
import { readOnchainCaps, type OnchainCapsStatus } from "@/lib/agent/fhe/reads";
import { fheEnabled } from "@/lib/fhe-flag";

/**
 * FHE Phase 2 (flag ON, owner only): store per-trade + 24h spending caps
 * on-chain as CoFHE ciphertext. Encrypted proposals are then compared to
 * these caps ON the ciphertext (EncryptedIntents.registerAndCheck) and the
 * attested boolean drives auto-approve — the server never sees the numbers.
 * The plaintext caps card above remains the enforcement backstop at signing.
 */
export function EncryptedCapsCard({
  agentId,
  defaultPerTradeUsd,
  defaultCumulativeUsd,
}: {
  agentId: string;
  defaultPerTradeUsd: number | null;
  defaultCumulativeUsd: number | null;
}) {
  const { wallets } = useWallets();
  const wallet = resolveActiveWallet(wallets);

  const [status, setStatus] = useState<OnchainCapsStatus | null>(null);
  const [perTrade, setPerTrade] = useState(defaultPerTradeUsd ?? 15);
  const [cumulative, setCumulative] = useState(defaultCumulativeUsd ?? 25);
  const [phase, setPhase] = useState<"encrypting" | "storing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTx, setSavedTx] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setStatus(await readOnchainCaps(wallet.address, agentId));
  }, [wallet, agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!fheEnabled()) return null;

  async function save() {
    setError(null);
    setSavedTx(null);
    try {
      if (!wallet) throw new Error("Connect a wallet to set encrypted caps.");
      if (perTrade < 1 || cumulative < 1) throw new Error("Caps must be at least $1.");
      // Dynamic import keeps the CoFHE SDK (WASM) out of every other chunk.
      const { setCapsOnchain } = await import("@/lib/agent/fhe/client");
      setPhase("encrypting");
      const txHash = await setCapsOnchain(
        wallet,
        agentId,
        BigInt(Math.floor(perTrade)) * 10n ** 30n,
        BigInt(Math.floor(cumulative)) * 10n ** 30n,
        () => setPhase("storing"),
      );
      setSavedTx(txHash);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setting encrypted caps failed.");
    } finally {
      setPhase(null);
    }
  }

  const busy = phase !== null;

  return (
    <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Lock className="h-3.5 w-3.5" /> Encrypted caps (on-chain)
        </p>
        {status == null ? null : !status.configured ? (
          <Badge tone="warning" className="font-mono text-[10px]">
            contract not deployed
          </Badge>
        ) : status.hasCaps ? (
          <Badge tone="positive" className="font-mono text-[10px]">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            set · window {new Date(status.windowStart * 1000).toLocaleString()}
          </Badge>
        ) : (
          <Badge tone="neutral" className="font-mono text-[10px]">
            not set
          </Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-400">
            Per trade (USD)
          </span>
          <input
            type="number"
            min={1}
            value={perTrade}
            onChange={(e) => setPerTrade(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-400">
            24h total (USD)
          </span>
          <input
            type="number"
            min={1}
            value={cumulative}
            onChange={(e) => setCumulative(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100"
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={busy || !wallet || status == null || !status.configured}
          className="inline-flex items-center gap-1.5 rounded-full border border-electric-500/40 bg-electric-500/10 px-4 py-2 text-sm font-semibold text-electric-300 transition-colors hover:bg-electric-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {phase === "encrypting"
            ? "Encrypting…"
            : phase === "storing"
              ? "Confirm in wallet…"
              : status?.hasCaps
                ? "Re-encrypt caps"
                : "Encrypt caps on-chain"}
        </button>
      </div>

      <p className="mt-1.5 text-xs text-ink-500">
        Caps are stored as ciphertext on Arbitrum. Encrypted proposals are compared
        to them without decrypting, and only you can read the numbers. Setting caps restarts
        the 24h window. The plaintext caps above still apply when you sign.
      </p>

      {savedTx && (
        <p className="mt-1.5 font-mono text-[11px] text-emerald-300">
          Encrypted caps stored · tx {savedTx.slice(0, 10)}…
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
