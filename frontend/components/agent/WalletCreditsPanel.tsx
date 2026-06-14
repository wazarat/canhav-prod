"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { AlertTriangle, CheckCircle2, Coins, Loader2, Send, Wallet } from "lucide-react";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";
import { transferCredits } from "@/lib/agent/collab-client";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";
import type { Signer } from "@zerodev/sdk/types";

interface WalletCredits {
  configured: boolean;
  address: string | null;
  token?: string;
  assetName?: string;
  decimals?: number;
  balance?: string;
  mintConfig?: SpawnMintConfig | null;
}

interface TransferPreflight {
  ok: boolean;
  payTo?: `0x${string}`;
  label?: string | null;
  token?: `0x${string}`;
  asset?: string;
  amount?: string;
  humanAmount?: string;
  accountIndex?: number;
  mintConfig?: SpawnMintConfig;
  error?: string;
}

function shorten(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

/**
 * Wallet-as-treasury panel: the user's spendable tCNHV credit balance plus the
 * two ways to move it — "Send credits" to any wallet / agent / user, and "Fund
 * this agent" to top up one of their own agents (the account they pay sellers
 * from). All movement is a gas-sponsored, client-signed ERC-20 transfer from the
 * user's kernel wallet (index 0). Renders nothing when credits aren't
 * provisioned in this environment.
 */
export function WalletCreditsPanel({
  buyerAgents = [],
  onChange,
}: {
  buyerAgents?: { agentId: string; name: string }[];
  onChange?: () => void;
}) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [info, setInfo] = useState<WalletCredits | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [tab, setTab] = useState<"fund" | "send">(buyerAgents.length > 0 ? "fund" : "send");
  const [recipient, setRecipient] = useState("");
  const [fundAgentId, setFundAgentId] = useState(buyerAgents[0]?.agentId ?? "");
  const [amount, setAmount] = useState("");

  const derivedRef = useRef(false);

  const buildSigner = useCallback(async (): Promise<Signer> => {
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded) throw new Error("Your embedded wallet isn't ready yet — try again in a moment.");
    try {
      await embedded.switchChain(ARBITRUM_SEPOLIA_CHAIN_ID);
    } catch {
      /* kernel client pins the chain regardless */
    }
    const provider = await embedded.getEthereumProvider();
    const { createWalletClient, custom } = await import("viem");
    const { arbitrumSepolia } = await import("viem/chains");
    return createWalletClient({
      account: embedded.address as `0x${string}`,
      chain: arbitrumSepolia,
      transport: custom(provider),
    });
  }, [wallets]);

  const loadBalance = useCallback(async (addr?: string | null): Promise<WalletCredits | null> => {
    try {
      const qs = addr ? `?address=${encodeURIComponent(addr)}` : "";
      const res = await fetch(`/api/wallet/credits${qs}`);
      if (!res.ok) return null;
      return (await res.json()) as WalletCredits;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await loadBalance();
      if (!active || !data) return;
      setInfo(data);
      if (!data.configured) return;
      if (data.address) {
        setAddress(data.address);
        return;
      }
      // Wallet address not persisted yet — derive it client-side (silent), then
      // read the balance for it.
      if (!data.mintConfig || derivedRef.current) return;
      const embedded = wallets.find((w) => w.walletClientType === "privy");
      if (!embedded) return;
      derivedRef.current = true;
      try {
        const signer = await buildSigner();
        const svc = await import("canhav-agent-service");
        const cfg = svc.createConfig({
          zerodevRpc: data.mintConfig.zerodevRpc,
          rpcUrl: data.mintConfig.rpcUrl,
          identityRegistry: data.mintConfig.identityRegistry,
          securityRegistry: data.mintConfig.securityRegistry,
        });
        const kernel = await svc.createEcdsaKernelAccount(cfg, signer, 0n);
        if (!active) return;
        setAddress(kernel.address);
        const withBalance = await loadBalance(kernel.address);
        if (active && withBalance) setInfo(withBalance);
      } catch {
        /* leave balance at 0 — transfers still work via preflight */
      }
    })();
    return () => {
      active = false;
    };
  }, [wallets, loadBalance, buildSigner]);

  const refresh = useCallback(async () => {
    const data = await loadBalance(address);
    if (data) setInfo(data);
    onChange?.();
  }, [address, loadBalance, onChange]);

  async function transfer(to: string) {
    if (!info?.configured) return;
    if (!authenticated) {
      login();
      return;
    }
    const target = to.trim();
    if (!target) {
      setError("Pick or enter a recipient.");
      return;
    }
    if (!amount.trim() || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const preRes = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: target, amount: amount.trim() }),
      });
      const pf = (await preRes.json()) as TransferPreflight;
      if (!preRes.ok || !pf.ok || !pf.payTo || !pf.token || !pf.amount || pf.accountIndex == null || !pf.mintConfig) {
        throw new Error(pf.error ?? "Could not prepare the transfer.");
      }

      const signer = await buildSigner();
      const { txHash } = await transferCredits({
        signer,
        accountIndex: pf.accountIndex,
        mintConfig: pf.mintConfig,
        token: pf.token,
        payTo: pf.payTo,
        amount: pf.amount,
      });

      await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: target, amount: amount.trim(), txHash, toLabel: pf.label }),
      });

      setNotice(
        `Sent ${pf.humanAmount} ${pf.asset} to ${pf.label ?? shorten(pf.payTo)}.`,
      );
      setAmount("");
      setRecipient("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }

  // Credits aren't provisioned in this environment — hide entirely.
  if (info && !info.configured) return null;

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-neon-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Your credits wallet
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-neon-400" />
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
              Balance
            </p>
            <p className="text-lg font-semibold tracking-tight text-ink-50">
              {info?.balance ?? "—"}{" "}
              <span className="text-xs font-normal text-ink-400">{info?.assetName ?? "tCNHV"}</span>
            </p>
          </div>
        </div>
      </div>

      {address && (
        <p className="font-mono text-[10px] text-ink-500">treasury {shorten(address)}</p>
      )}

      <div className="flex gap-2">
        {buyerAgents.length > 0 && (
          <button
            type="button"
            onClick={() => setTab("fund")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "fund"
                ? "border-electric-500/60 bg-electric-500/15 text-electric-300"
                : "border-ink-700 bg-ink-900/60 text-ink-300 hover:text-ink-100"
            }`}
          >
            Fund an agent
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab("send")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "send"
              ? "border-electric-500/60 bg-electric-500/15 text-electric-300"
              : "border-ink-700 bg-ink-900/60 text-ink-300 hover:text-ink-100"
          }`}
        >
          Send to address / user
        </button>
      </div>

      {tab === "fund" && buyerAgents.length > 0 ? (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[11px] text-ink-400">Top up one of your agents</span>
            <select
              value={fundAgentId}
              onChange={(e) => setFundAgentId(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            >
              {buyerAgents.map((a) => (
                <option key={a.agentId} value={a.agentId}>
                  {a.name} ({a.agentId})
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block flex-1 space-y-1.5">
              <span className="text-[11px] text-ink-400">Amount</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                disabled={busy}
                className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              onClick={() => transfer(fundAgentId)}
              disabled={busy || !fundAgentId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Fund agent
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[11px] text-ink-400">
              Recipient (wallet address, agent id, or user id)
            </span>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x… / agent id / user id"
              disabled={busy}
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block flex-1 space-y-1.5">
              <span className="text-[11px] text-ink-400">Amount</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                disabled={busy}
                className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              onClick={() => transfer(recipient)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send credits
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 text-xs text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      {notice && (
        <p className="flex items-start gap-2 text-xs text-signal-300">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {notice}
        </p>
      )}
    </div>
  );
}
