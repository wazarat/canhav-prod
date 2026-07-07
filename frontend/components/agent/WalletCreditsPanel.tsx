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
  Sparkles,
  Wallet,
} from "lucide-react";

import { transferCredits, claimCredits } from "@/lib/agent/collab-client";
import { resolveActiveWallet, resolveWalletForAgent } from "@/lib/agent/privy-signer";

interface WalletCredits {
  configured: boolean;
  address: string | null;
  token?: string;
  assetName?: string;
  decimals?: number;
  balance?: string;
  granted?: boolean;
  rpcUrl?: string | null;
  error?: string;
}

type BootstrapReason =
  | "needs_grant"
  | "already_granted"
  | "no_profile"
  | "mint_unconfigured"
  | "identity_unconfigured";

interface BootstrapStatus {
  needsGrant: boolean;
  granted: boolean;
  reason?: BootstrapReason;
  startingAmount: string;
}

/** Map a bootstrap GET reason to an actionable user-facing message. */
function bootstrapReasonMessage(reason?: BootstrapReason): string {
  switch (reason) {
    case "mint_unconfigured":
      return "Minting isn't enabled on the server — set FACTORY_DEPLOYER_PRIVATE_KEY (and TCNHV_TOKEN_ADDRESS) on Vercel, then redeploy.";
    case "identity_unconfigured":
      return "Wallet login isn't configured — set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET on Vercel.";
    case "no_profile":
      return "Your profile isn't ready yet — sign out and back in, then try again.";
    default:
      return "Starting credits are not available in this environment.";
  }
}

interface AgentCreditsStatus {
  configured: boolean;
  canClaim: boolean;
  nextClaimAt: number;
  account?: string;
  token: string;
  signerAddress?: string | null;
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
  rpcUrl?: string;
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
        Wallet address
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
 * from). All movement is a client-signed ERC-20 transfer from the user's Privy
 * wallet, which pays its own Sepolia gas.
 */
export function WalletCreditsPanel({
  buyerAgents = [],
  onChange,
  /** Mint starting credits + on-chain faucet claim (Agent Lab). */
  showMintActions = false,
}: {
  buyerAgents?: { agentId: string; name: string }[];
  onChange?: () => void;
  showMintActions?: boolean;
}) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [info, setInfo] = useState<WalletCredits | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);
  const [agentCredits, setAgentCredits] = useState<AgentCreditsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [minting, setMinting] = useState(false);
  const [claiming, setClaiming] = useState(false);
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

  const loadBootstrap = useCallback(async (): Promise<BootstrapStatus | null> => {
    try {
      const res = await fetch("/api/wallet/bootstrap");
      if (!res.ok) return null;
      return (await res.json()) as BootstrapStatus;
    } catch {
      return null;
    }
  }, []);

  const resolveTreasuryAddress = useCallback((): string | null => {
    return resolveActiveWallet(wallets)?.address ?? null;
  }, [wallets]);

  const loadAgentCredits = useCallback(async (agentId: string) => {
    if (!agentId) {
      setAgentCredits(null);
      return;
    }
    try {
      const res = await fetch(`/api/agent/credits?agentId=${encodeURIComponent(agentId)}`);
      // Keep the body even on non-2xx (e.g. 400 for off-chain agents) so the UI
      // can explain why the faucet is unavailable instead of silently disabling.
      setAgentCredits((await res.json()) as AgentCreditsStatus);
    } catch {
      setAgentCredits(null);
    }
  }, []);

  useEffect(() => {
    if (!showMintActions) return;
    void loadBootstrap().then((boot) => {
      if (boot) setBootstrap(boot);
    });
  }, [showMintActions, loadBootstrap]);

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
      if (derivedRef.current) return;
      const treasury = resolveTreasuryAddress();
      if (!treasury) return;
      derivedRef.current = true;
      setAddress(treasury);
      const withBalance = await loadBalance(treasury);
      if (active && withBalance) setInfo(withBalance);
    })();
    return () => {
      active = false;
    };
  }, [wallets, loadBalance, resolveTreasuryAddress]);

  useEffect(() => {
    if (!showMintActions || !fundAgentId) return;
    void loadAgentCredits(fundAgentId);
  }, [showMintActions, fundAgentId, loadAgentCredits]);

  const refresh = useCallback(async () => {
    const data = await loadBalance(address);
    if (data) setInfo(data);
    if (showMintActions) {
      const boot = await loadBootstrap();
      if (boot) setBootstrap(boot);
      if (fundAgentId) await loadAgentCredits(fundAgentId);
    }
    onChange?.();
  }, [address, loadBalance, loadBootstrap, loadAgentCredits, showMintActions, fundAgentId, onChange]);

  async function mintStartingCredits() {
    if (!authenticated) {
      login();
      return;
    }
    setMinting(true);
    setError(null);
    setNotice(null);
    try {
      const boot = bootstrap ?? (await loadBootstrap());
      if (!boot) throw new Error("Could not check credit grant status.");
      if (boot.granted && !boot.needsGrant) {
        setNotice("Starting credits were already minted to your treasury.");
        await refresh();
        return;
      }
      if (!boot.needsGrant) {
        throw new Error(bootstrapReasonMessage(boot.reason));
      }

      let treasury = address ?? resolveTreasuryAddress();
      if (!treasury) throw new Error("Wait for your embedded wallet to finish loading, then try again.");
      setAddress(treasury);

      const res = await fetch("/api/wallet/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: treasury, signerAddress: treasury }),
      });
      const result = (await res.json()) as {
        ok?: boolean;
        granted?: boolean;
        reason?: string;
        txHash?: string;
      };
      if (!result.ok) {
        throw new Error(
          result.reason === "not_configured"
            ? "tCNHV mint is not configured on the server."
            : result.reason === "mint_failed"
              ? "On-chain mint failed — check FACTORY_DEPLOYER_PRIVATE_KEY."
              : "Could not mint starting credits.",
        );
      }
      if (result.granted) {
        setNotice(`Minted ${boot.startingAmount} tCNHV to your treasury.`);
      } else if (result.reason === "already_granted") {
        setNotice("Starting credits were already in your treasury.");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mint failed.");
    } finally {
      setMinting(false);
    }
  }

  async function claimAgentFaucet() {
    if (!fundAgentId) return;
    if (!authenticated) {
      login();
      return;
    }
    setClaiming(true);
    setError(null);
    setNotice(null);
    try {
      const credits =
        agentCredits ??
        ((await fetch(`/api/agent/credits?agentId=${encodeURIComponent(fundAgentId)}`).then((r) =>
          r.json(),
        )) as AgentCreditsStatus);
      if (!credits?.configured || !credits.canClaim || !credits.token) {
        throw new Error("Faucet is on cooldown or this agent cannot claim yet.");
      }
      // Claim from the wallet that minted the agent so the credits land in the
      // treasury that pays in settlement.
      const wallet = resolveWalletForAgent(wallets, credits.signerAddress);
      if (!wallet) {
        throw new Error(
          "Connect the wallet that minted this agent (or wait for your embedded wallet to load), then try again.",
        );
      }
      await claimCredits({
        wallet,
        token: credits.token as `0x${string}`,
      });
      setNotice("Claimed 100 tCNHV from the on-chain faucet to your agent.");
      await loadAgentCredits(fundAgentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Faucet claim failed.");
    } finally {
      setClaiming(false);
    }
  }

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
      if (!preRes.ok || !pf.ok || !pf.payTo || !pf.token || !pf.amount) {
        throw new Error(pf.error ?? "Could not prepare the transfer.");
      }

      const wallet = resolveActiveWallet(wallets);
      if (!wallet) throw new Error("No wallet connected yet.");

      const { txHash } = await transferCredits({
        wallet,
        token: pf.token,
        payTo: pf.payTo,
        amount: pf.amount,
        rpcUrl: pf.rpcUrl,
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

      {showMintActions && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neon-500/20 bg-neon-500/5 px-4 py-3">
          {(bootstrap?.needsGrant || (!bootstrap?.granted && !info.granted)) && (
            <button
              type="button"
              onClick={() => void mintStartingCredits()}
              disabled={minting || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/50 bg-neon-500/15 px-3 py-2 text-xs font-medium text-neon-300 transition-colors hover:bg-neon-500/25 disabled:opacity-50"
            >
              {minting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {minting
                ? "Minting…"
                : `Mint ${bootstrap?.startingAmount ?? "10,000"} tCNHV to treasury`}
            </button>
          )}
          {buyerAgents.length > 0 && fundAgentId && (
            <button
              type="button"
              onClick={() => void claimAgentFaucet()}
              disabled={
                claiming ||
                busy ||
                minting ||
                !agentCredits?.canClaim ||
                !agentCredits?.token
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-40"
            >
              {claiming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Coins className="h-3.5 w-3.5" />
              )}
              {claiming ? "Claiming…" : "Claim 100 tCNHV (faucet)"}
            </button>
          )}
          {buyerAgents.length > 0 &&
            fundAgentId &&
            agentCredits &&
            !claiming &&
            (!agentCredits.canClaim || !agentCredits.token) && (
              <span className="text-[11px] text-ink-500">
                {!agentCredits.configured
                  ? (agentCredits.error ??
                    "Mint this agent on-chain to enable the faucet.")
                  : "Faucet is on cooldown — try again later."}
              </span>
            )}
          {!bootstrap?.needsGrant && bootstrap?.granted && (
            <span className="text-[11px] text-ink-500">
              Starting grant received · fund an agent below to spend on collabs
            </span>
          )}
        </div>
      )}

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
