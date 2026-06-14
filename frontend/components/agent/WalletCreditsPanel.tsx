"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Loader2,
  Send,
  Wallet,
} from "lucide-react";

import { transferCredits } from "@/lib/agent/collab-client";
import { buildPrivySigner, resolveActiveWallet } from "@/lib/agent/privy-signer";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

interface WalletCredits {
  configured: boolean;
  address: string | null;
  token?: string;
  assetName?: string;
  decimals?: number;
  balance?: string;
  mintConfig?: SpawnMintConfig | null;
  error?: string;
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

const ARBISCAN_BASE = "https://sepolia.arbiscan.io/address";

function shorten(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function TreasuryAddressRow({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-800/60 bg-ink-900/40 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
        Treasury (kernel index 0)
      </span>
      <code className="flex-1 break-all font-mono text-[11px] text-ink-300">{address}</code>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-2 py-1 text-[10px] text-ink-400 transition-colors hover:text-ink-100"
        aria-label="Copy treasury address"
      >
        {copied ? <Check className="h-3 w-3 text-signal-400" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={`${ARBISCAN_BASE}/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-2 py-1 text-[10px] text-electric-400 transition-colors hover:text-electric-300"
      >
        Arbiscan <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function CreditsNotConfigured() {
  return (
    <div className="glass space-y-3 rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-amber-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Credits wallet not provisioned
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-ink-400">
        tCNHV test credits are not configured in this environment. Set{" "}
        <code className="font-mono text-ink-200">TCNHV_TOKEN_ADDRESS</code> and{" "}
        <code className="font-mono text-ink-200">FACTORY_DEPLOYER_PRIVATE_KEY</code> on Vercel,
        then redeploy. See <code className="font-mono text-ink-200">frontend/.env.example</code>.
      </p>
      <p className="text-xs text-ink-500">
        Diagnostic:{" "}
        <a href="/api/agent/status" className="text-electric-400 hover:text-electric-300">
          /api/agent/status
        </a>{" "}
        — check <code className="font-mono">tcnhv</code> and <code className="font-mono">canMintTcnhv</code>.
      </p>
    </div>
  );
}

/**
 * Wallet-as-treasury panel: the user's spendable tCNHV credit balance plus the
 * two ways to move it — "Send credits" to any wallet / agent / user, and "Fund
 * this agent" to top up one of their own agents (the account they pay sellers
 * from). All movement is a gas-sponsored, client-signed ERC-20 transfer from the
 * user's kernel wallet (index 0).
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

  useEffect(() => {
    setFundAgentId(buyerAgents[0]?.agentId ?? "");
  }, [buyerAgents]);

  const loadBalance = useCallback(async (addr?: string | null): Promise<WalletCredits | null> => {
    try {
      const qs = addr ? `?address=${encodeURIComponent(addr)}` : "";
      const res = await fetch(`/api/wallet/credits${qs}`);
      if (res.status === 401) return { configured: false, address: null, error: "Sign in." };
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
      if (!data.mintConfig || derivedRef.current) return;
      if (!resolveActiveWallet(wallets)) return;
      derivedRef.current = true;
      try {
        const signer = await buildPrivySigner(wallets);
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
  }, [wallets, loadBalance]);

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

      const signer = await buildPrivySigner(wallets);
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

  if (info === null) {
    return (
      <div className="glass flex items-center gap-2 rounded-2xl p-6 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin text-ink-500" />
        Loading credits wallet…
      </div>
    );
  }

  if (!info.configured) {
    if (info.error === "Sign in.") {
      return (
        <div className="glass space-y-2 rounded-2xl p-6 text-sm text-ink-400">
          <p>Sign in to view your treasury credits wallet.</p>
        </div>
      );
    }
    return <CreditsNotConfigured />;
  }

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
              Treasury balance
            </p>
            <p className="text-lg font-semibold tracking-tight text-ink-50">
              {info.balance ?? "0"}{" "}
              <span className="text-xs font-normal text-ink-400">{info.assetName ?? "tCNHV"}</span>
            </p>
          </div>
        </div>
      </div>

      {address && <TreasuryAddressRow address={address} />}

      {buyerAgents.length > 0 && (
        <p className="text-xs leading-relaxed text-ink-500">
          Spendable credits for buying strategies live on your <strong className="text-ink-400">paying agent</strong>{" "}
          smart account below — fund it from this treasury before requesting sellers.
        </p>
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
