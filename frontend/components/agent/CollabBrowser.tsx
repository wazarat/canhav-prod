"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Handshake,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { AGENT_CATEGORIES } from "@/lib/agent/categories";
import { buildAgentSigner, buildPrivySigner, resolveActiveWallet } from "@/lib/agent/privy-signer";
import { assertAgentKernelMatch } from "@/lib/agent/verify-agent-signer";
import { deriveKernelAddress } from "@/lib/agent/kernel-address";
import {
  claimCredits,
  establishAgreementOnChain,
  getSellerQuote,
  payStrategy,
  recordCollabOnChain,
  recordInteractionOnChain,
  submitFeedbackOnChain,
  type AgreementInteractionParams,
  type EstablishParams,
  type FeedbackParams,
  type RecordParams,
  type SellerQuote,
} from "@/lib/agent/collab-client";
import { formatUserOpError } from "@/lib/agent/userOpErrors";
import { AgentInteractionTheater, type TheaterProofLinks, type TheaterSettlement } from "@/components/agent/AgentInteractionTheater";
import { WalletCreditsPanel } from "@/components/agent/WalletCreditsPanel";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";
import type { StrategyPacket } from "@/lib/types";
import { arbiscanSepoliaTx } from "@/lib/utils";

type AgreementMode = "one_time" | "recurring";
type AgreementCadence = "none" | "daily" | "weekly" | "monthly";

interface Agreement {
  agreementId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  buyerAgentName: string;
  sellerAgentName: string;
  objective: string;
  maxUnitsPerInteraction: number;
  totalInstallments: number;
  mode: AgreementMode;
  cadence: AgreementCadence;
  pricePerInstallmentUsdc: string;
  cooldownSeconds: number;
  selectedJobTitle: string | null;
  selectedJobDescription: string | null;
  callBudgetPerPeriod: number;
  tokenBudgetPerPeriod: number;
  updatesPerPeriod: number;
  duneLinked: boolean;
  duneUrl: string | null;
  termsHash: string | null;
  consumedUnits: number;
  interactionCount: number;
  lastInteractionAt: string | null;
  onChainAgreementId: string | null;
  status: "proposed" | "active" | "rejected" | "cancelled" | "completed";
}

const CADENCE_LABEL: Record<AgreementCadence, string> = {
  none: "one-time",
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
};

/** Short human countdown, e.g. "2d 3h" or "ready now". */
function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "ready now";
  const totalMinutes = Math.ceil(msRemaining / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface SellerCreator {
  displayName: string | null;
  memberSince: string | null;
  accountAgeDays: number | null;
  agentCount: number;
}

interface AgentListing {
  agentId: string;
  agentName: string;
  ownerHandle: string;
  description?: string | null;
  creator?: SellerCreator | null;
  agentWallet: string | null;
  walletVerified: boolean;
  attachedSkillTitles: string[];
  x402: { price: string; asset: string; decimals: number; assetName?: string };
  reputationScore: number | null;
  reputationCount?: number;
  /** On-chain track record (null until the agent has completed work). */
  merit?: {
    collabCount: number;
    netProducer: boolean;
    repeatRateBps: number;
    lastActive: number;
  } | null;
  specialization?: {
    focusAreas: string[];
    riskLens: string | null;
    category?: string | null;
    entitySlug: string | null;
    level: number;
    knowledgeDocs: number;
    dataFrames: number;
    customTools: number;
    exchangeCount: number;
  } | null;
}

interface SellerReview {
  id: string;
  reviewerHandle: string;
  rating: number;
  comment: string | null;
  ts: string;
}

interface SellerService {
  title: string;
  description: string;
}

interface SellerDetail {
  agentId: string;
  agentName: string;
  description: string | null;
  category: string | null;
  attachedSkillTitles: string[];
  services: SellerService[];
  price: string;
  reputationScore: number | null;
  reputationCount: number;
  reviews: SellerReview[];
  creator: SellerCreator | null;
  verifiedOnChain: boolean;
  walletVerified: boolean;
  arbiscanAddressUrl: string | null;
  arbiscanTokenUrl: string | null;
  verifyUrl: string | null;
}

interface BuyerAgent {
  agentId: string;
  name: string;
}

interface CreditsInfo {
  configured: boolean;
  account?: string;
  token?: string;
  assetName?: string;
  balance?: string;
  canClaim?: boolean;
  nextClaimAt?: number;
  accountIndex?: number;
  signerAddress?: string | null;
  mintConfig?: SpawnMintConfig | null;
  error?: string;
}

function accountAgeLabel(days: number | null): string {
  if (days == null) return "new";
  if (days < 1) return "joined today";
  if (days < 30) return `${days}d on platform`;
  if (days < 365) return `${Math.floor(days / 30)}mo on platform`;
  return `${Math.floor(days / 365)}y on platform`;
}

/** Relative label for the next faucet claim (e.g. "in 5h"). */
function nextClaimLabel(unix: number): string {
  const secs = unix - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "available now";
  if (secs < 3600) return `in ${Math.ceil(secs / 60)}m`;
  if (secs < 86_400) return `in ${Math.ceil(secs / 3600)}h`;
  return `in ${Math.ceil(secs / 86_400)}d`;
}

type Phase =
  | "idle"
  | "preflight"
  | "anchoring"
  | "quoting"
  | "paying"
  | "settling"
  | "recording"
  | "done";

export function CollabBrowser({
  buyerAgents,
  ownedAgentIds = [],
}: {
  buyerAgents: BuyerAgent[];
  /** Minted agent ids this user launched (`ownerUserId` matches). */
  ownedAgentIds?: string[];
}) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const ownedSet = new Set(ownedAgentIds);

  const [agents, setAgents] = useState<AgentListing[] | null>(null);
  const [buyerAgentId, setBuyerAgentId] = useState(buyerAgents[0]?.agentId ?? "");
  const [selection, setSelection] = useState<AgentListing | null>(null);
  const [objective, setObjective] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [packet, setPacket] = useState<StrategyPacket | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);

  // Marketplace discovery filters (browse by tag → search).
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Seller trust view (reviews → description → creator → on-chain proof).
  const [detail, setDetail] = useState<SellerDetail | null>(null);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  // Human-in-the-loop agreements (installments + max-per-interaction cap).
  const [agreements, setAgreements] = useState<{ asBuyer: Agreement[]; asSeller: Agreement[] }>({
    asBuyer: [],
    asSeller: [],
  });
  const [activeAgreement, setActiveAgreement] = useState<Agreement | null>(null);

  // Live theater state (on-chain tx hashes + settlement for the visual).
  const [paymentTx, setPaymentTx] = useState<string | null>(null);
  const [recordTx, setRecordTx] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<TheaterSettlement | null>(null);
  const [proofLinks, setProofLinks] = useState<TheaterProofLinks | null>(null);

  // Spendable credits for the selected buyer agent (faucet balance + claim).
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);

  const loadCredits = useCallback(async (agentId: string) => {
    if (!agentId) {
      setCredits(null);
      return;
    }
    try {
      const res = await fetch(`/api/agent/credits?agentId=${encodeURIComponent(agentId)}`);
      const data = (await res.json()) as CreditsInfo;
      setCredits(data);
    } catch {
      setCredits(null);
    }
  }, []);

  useEffect(() => {
    void loadCredits(buyerAgentId);
  }, [buyerAgentId, loadCredits]);

  const loadAgreements = useCallback(async () => {
    try {
      const res = await fetch("/api/collab/agreements");
      if (!res.ok) return;
      const data = (await res.json()) as { asBuyer?: Agreement[]; asSeller?: Agreement[] };
      setAgreements({ asBuyer: data.asBuyer ?? [], asSeller: data.asSeller ?? [] });
    } catch {
      /* keep prior agreements on transient error */
    }
  }, []);

  useEffect(() => {
    void loadAgreements();
  }, [loadAgreements]);

  const loadAgents = useCallback(async (cat: string | null, q: string) => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    try {
      const res = await fetch(`/api/collab/discover${qs ? `?${qs}` : ""}`);
      if (!res.ok) return [] as AgentListing[];
      const data = (await res.json()) as { agents?: AgentListing[] };
      return data.agents ?? [];
    } catch {
      return [] as AgentListing[];
    }
  }, []);

  // Debounced re-fetch on filter/search change.
  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      const next = await loadAgents(category, search);
      if (active) setAgents(next);
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [category, search, loadAgents]);

  async function openDetail(agentId: string) {
    setDetailFor(agentId);
    setDetail(null);
    setDetailBusy(true);
    try {
      const res = await fetch(`/api/collab/seller/${encodeURIComponent(agentId)}`);
      if (res.ok) {
        const data = (await res.json()) as { seller?: SellerDetail };
        if (data.seller) setDetail(data.seller);
      }
    } catch {
      /* leave detail null — the inline card shows a fallback */
    } finally {
      setDetailBusy(false);
    }
  }

  async function buildSigner() {
    return buildPrivySigner(wallets);
  }

  async function handleReclaimAgent() {
    if (!buyerAgentId) return;
    if (!authenticated) {
      login();
      return;
    }
    setReclaiming(true);
    setError(null);
    setNotice(null);
    try {
      const preRes = await fetch(`/api/agent/${encodeURIComponent(buyerAgentId)}/reclaim`);
      const pre = (await preRes.json()) as {
        ok?: boolean;
        alreadyOwned?: boolean;
        error?: string;
        accountIndex?: number;
        agentAddress?: string;
        mintConfig?: SpawnMintConfig;
      };
      if (!preRes.ok || !pre.ok) {
        throw new Error(pre.error ?? "Could not prepare agent reclaim.");
      }
      if (pre.alreadyOwned) {
        await loadCredits(buyerAgentId);
        setNotice("This agent is already linked to your account.");
        return;
      }
      if (pre.accountIndex == null || !pre.agentAddress || !pre.mintConfig) {
        throw new Error("Reclaim parameters are missing.");
      }

      const activeWallet = resolveActiveWallet(wallets);
      if (!activeWallet) throw new Error("Connect MetaMask or your embedded wallet and try again.");

      const signer = await buildSigner();
      const derived = await deriveKernelAddress(signer, pre.accountIndex, pre.mintConfig);

      const res = await fetch(`/api/agent/${encodeURIComponent(buyerAgentId)}/reclaim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentAddress: derived,
          signerAddress: activeWallet.address,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not re-link this agent.");
      }

      setNotice("Agent re-linked to your wallet. You can pay from it now.");
      await loadCredits(buyerAgentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-link failed.");
    } finally {
      setReclaiming(false);
    }
  }

  async function handleClaimCredits() {
    if (!credits?.configured || !credits.token || credits.accountIndex == null || !credits.mintConfig) {
      return;
    }
    if (!authenticated) {
      login();
      return;
    }
    setClaiming(true);
    setError(null);
    setNotice(null);
    try {
      const signer = await buildAgentSigner(wallets, credits.signerAddress);
      if (credits.account && credits.accountIndex != null && credits.mintConfig) {
        await assertAgentKernelMatch({
          signer,
          accountIndex: credits.accountIndex,
          mintConfig: credits.mintConfig,
          expectedAgentAddress: credits.account,
        });
      }
      await claimCredits({
        signer,
        accountIndex: credits.accountIndex,
        mintConfig: credits.mintConfig,
        token: credits.token as `0x${string}`,
      });
      setNotice("Credits added to your agent.");
      await loadCredits(buyerAgentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add credits right now.");
    } finally {
      setClaiming(false);
    }
  }

  async function approveAndPay(agreement?: Agreement) {
    if (!selection || !buyerAgentId) return;
    if (!authenticated) {
      login();
      return;
    }
    setError(null);
    setNotice(null);
    setPacket(null);
    setRating(0);
    setPaymentTx(null);
    setRecordTx(null);
    setSettlement(null);
    setProofLinks(null);
    setActiveAgreement(agreement ?? null);

    const seller = selection;
    try {
      setPhase("preflight");
      const pfRes = await fetch(
        `/api/collab/request/preflight?agentId=${encodeURIComponent(buyerAgentId)}&toAgentId=${encodeURIComponent(seller.agentId)}`,
      );
      const pf = (await pfRes.json()) as {
        configured?: boolean;
        accountIndex?: number;
        agentAddress?: string | null;
        signerAddress?: string | null;
        payerAddress?: string | null;
        mintConfig?: SpawnMintConfig | null;
        rpcUrl?: string;
        settlementReady?: boolean;
        sufficient?: boolean;
        humanRequired?: string;
        humanBalance?: string;
        assetName?: string;
        proof?: TheaterProofLinks;
        error?: string;
      };
      if (!pfRes.ok || !pf.configured) {
        const friendly =
          pfRes.status === 403
            ? "Pick one of your own agents to pay from in the “Pay from agent” menu, and fund it with credits above."
            : (pf.error ?? "Buyer preflight failed.");
        throw new Error(friendly);
      }
      if (pf.mintConfig && pf.accountIndex == null) {
        throw new Error(pf.error ?? "Buyer preflight failed.");
      }
      if (!pf.mintConfig && !pf.payerAddress) {
        throw new Error(
          "Your Privy wallet address isn't ready yet — wait for the embedded wallet to load, then try again.",
        );
      }
      if (pf.proof) setProofLinks(pf.proof);
      if (pf.settlementReady === false || pf.sufficient === false) {
        throw new Error(
          pf.error ??
            `Your agent needs at least ${pf.humanRequired ?? "?"} ${pf.assetName ?? "tCNHV"} to pay (balance: ${pf.humanBalance ?? "0"}). Fund it from the treasury above.`,
        );
      }

      setPhase("quoting");
      const quote: SellerQuote = await getSellerQuote({
        toAgentId: seller.agentId,
        fromAgentId: buyerAgentId,
      });

      const signer = pf.mintConfig ? await buildAgentSigner(wallets, pf.signerAddress) : null;
      if (pf.mintConfig && pf.agentAddress && pf.accountIndex != null) {
        await assertAgentKernelMatch({
          signer: signer!,
          accountIndex: pf.accountIndex,
          mintConfig: pf.mintConfig,
          expectedAgentAddress: pf.agentAddress,
        });
      }

      const wallet = resolveActiveWallet(wallets);
      if (!wallet) {
        throw new Error("No wallet connected yet — sign in and wait for your embedded wallet to load.");
      }

      // Lazily anchor the agreement on-chain (CollabAgreement.establish) before
      // the first paid period. Best-effort: off-chain enforcement stands in when
      // the contract isn't deployed or an agent isn't minted.
      if (agreement && !agreement.onChainAgreementId) {
        try {
          const anchorRes = await fetch(
            `/api/collab/agreements/${encodeURIComponent(agreement.agreementId)}/anchor`,
          );
          const anchor = (await anchorRes.json()) as {
            configured?: boolean;
            establish?: EstablishParams;
          };
          if (anchorRes.ok && anchor.configured && anchor.establish && signer) {
            setPhase("anchoring");
            const { onChainAgreementId, txHash: establishTx } = await establishAgreementOnChain({
              signer: signer!,
              establish: anchor.establish,
            });
            await fetch(
              `/api/collab/agreements/${encodeURIComponent(agreement.agreementId)}/anchor`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ onChainAgreementId, establishTx }),
              },
            );
            agreement.onChainAgreementId = onChainAgreementId;
          }
        } catch {
          /* non-fatal: continue with off-chain enforcement */
        }
      }

      setPhase("paying");
      const { txHash } = await payStrategy({
        wallet,
        quote,
        rpcUrl: pf.rpcUrl,
        signer: signer ?? undefined,
        accountIndex: pf.accountIndex ?? undefined,
        mintConfig: pf.mintConfig ?? undefined,
      });
      setPaymentTx(txHash);

      setPhase("settling");
      const reqRes = await fetch("/api/collab/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAgentId: seller.agentId,
          fromAgentId: buyerAgentId,
          objective: objective.trim() || undefined,
          paymentRef: txHash,
          agreementId: agreement?.agreementId,
          units: agreement?.maxUnitsPerInteraction,
        }),
      });
      const reqData = (await reqRes.json()) as {
        ok?: boolean;
        packet?: StrategyPacket;
        record?: RecordParams | null;
        agreementRecord?: AgreementInteractionParams | null;
        settlement?: TheaterSettlement | null;
        proof?: TheaterProofLinks | null;
        error?: string;
      };
      if (!reqRes.ok || !reqData.ok || !reqData.packet) {
        const friendly =
          reqRes.status === 403
            ? "Pick one of your own agents to pay from in the “Pay from agent” menu, and fund it with credits above."
            : (reqData.error ?? "Strategy request failed.");
        throw new Error(friendly);
      }
      setPacket(reqData.packet);
      if (reqData.settlement) setSettlement(reqData.settlement);
      if (reqData.proof) setProofLinks(reqData.proof as TheaterProofLinks);

      if (reqData.record && signer) {
        try {
          setPhase("recording");
          const { txHash: recordHash } = await recordCollabOnChain({ signer, record: reqData.record });
          setRecordTx(recordHash);
          // Per-period agreement write (CollabAgreement.recordInteraction), so the
          // cap/cadence are enforced on-chain alongside the collab attestation.
          if (reqData.agreementRecord) {
            try {
              await recordInteractionOnChain({ signer, interaction: reqData.agreementRecord });
            } catch {
              /* non-fatal: the collab attestation above is already on-chain */
            }
          }
          setNotice("Exchange complete and saved to a verifiable record.");
        } catch (e) {
          setNotice(
            `Exchange complete and added to your agent. Saving the record was skipped: ${
              e instanceof Error ? e.message : "could not confirm"
            }`,
          );
        }
      } else if (reqData.record) {
        setNotice("Exchange complete and added to your agent.");
      } else {
        setNotice("Exchange complete — the strategy was added to your agent's memory.");
      }
      setPhase("done");
      void loadAgreements();
      void loadCredits(buyerAgentId);
    } catch (e) {
      setError(formatUserOpError(e));
      setPhase("idle");
    }
  }

  async function proposeAgreement(input: {
    sellerAgentId: string;
    objective: string;
    maxUnitsPerInteraction: number;
    totalInstallments: number;
    mode: AgreementMode;
    cadence: AgreementCadence;
    selectedJobTitle?: string | null;
    selectedJobDescription?: string | null;
    callBudgetPerPeriod?: number;
    tokenBudgetPerPeriod?: number;
    updatesPerPeriod?: number;
    duneLinked?: boolean;
    duneUrl?: string | null;
  }) {
    if (!buyerAgentId) return { ok: false, error: "Pick a buyer agent first." };
    const res = await fetch("/api/collab/agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerAgentId, ...input }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (res.ok && data.ok) {
      await loadAgreements();
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "Could not propose agreement." };
  }

  async function actOnAgreement(agreementId: string, action: "approve" | "reject" | "cancel") {
    const res = await fetch(`/api/collab/agreements/${encodeURIComponent(agreementId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) await loadAgreements();
  }

  function runInstallment(agreement: Agreement) {
    const listing = agents?.find((a) => a.agentId === agreement.sellerAgentId);
    setSelection(
      listing ?? {
        agentId: agreement.sellerAgentId,
        agentName: agreement.sellerAgentName,
        ownerHandle: "",
        agentWallet: null,
        walletVerified: true,
        attachedSkillTitles: [],
        x402: { price: agreement.pricePerInstallmentUsdc, asset: "", decimals: 6 },
        reputationScore: null,
      },
    );
    setObjective(agreement.objective);
    void approveAndPay(agreement);
  }

  async function rate(stars: number) {
    if (!selection || !packet || ratingBusy) return;
    setRating(stars);
    setRatingBusy(true);
    try {
      const res = await fetch("/api/collab/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAgentId: selection.agentId,
          fromAgentId: buyerAgentId,
          rating: stars,
          paymentRef: packet.paymentRef,
          comment: reviewComment.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        onChain?: FeedbackParams | null;
        reward?: { asset: string; amount: string; txHash?: string } | null;
      };
      if (!res.ok || !data.ok) {
        setNotice(data.error ?? "Rating was not accepted.");
      } else {
        const rewardNote = data.reward
          ? ` ${data.reward.amount} ${data.reward.asset} rewarded to the agent for the great review.`
          : "";
        setNotice(`Thanks — rated ${stars}/5.${rewardNote}`);
        if (data.onChain) {
          try {
            const signer = await buildAgentSigner(wallets, credits?.signerAddress);
            await submitFeedbackOnChain({ signer, feedback: data.onChain });
            setNotice(`Rated ${stars}/5 and recorded on-chain.${rewardNote}`);
          } catch {
            /* flag-off / gate / signing issue — Redis rating already stored */
          }
        }
      }
    } finally {
      setRatingBusy(false);
    }
  }

  const busy = phase !== "idle" && phase !== "done";
  const buyerName = buyerAgents.find((a) => a.agentId === buyerAgentId)?.name ?? buyerAgentId;
  const showTheater = Boolean(selection) && (phase !== "idle" || Boolean(paymentTx));
  const canPayFromAgent = buyerAgents.length > 0 && Boolean(buyerAgentId);

  return (
    <div className="space-y-6">
      <WalletCreditsPanel
        buyerAgents={buyerAgents}
        onChange={() => void loadCredits(buyerAgentId)}
      />

      {canPayFromAgent ? (
      <div className="glass space-y-2 rounded-2xl p-6">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Pay from agent
          </span>
          <select
            value={buyerAgentId}
            onChange={(e) => setBuyerAgentId(e.target.value)}
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

        {credits?.configured ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-neon-400" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
                  Agent spendable credits
                </p>
                <p className="text-lg font-semibold tracking-tight text-ink-50">
                  {credits.balance ?? "0"}
                </p>
                {credits.account && (
                  <a
                    href={`https://sepolia.arbiscan.io/address/${credits.account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-0.5 font-mono text-[10px] text-electric-400 hover:text-electric-300"
                  >
                    {credits.account.slice(0, 6)}…{credits.account.slice(-4)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleClaimCredits}
                disabled={claiming || busy || !credits.canClaim || !credits.mintConfig}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-40"
              >
                {claiming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {claiming ? "Adding…" : "Claim free credits"}
              </button>
              {!credits.canClaim && credits.nextClaimAt ? (
                <span className="text-[10px] text-ink-500">
                  Next claim {nextClaimLabel(credits.nextClaimAt)}
                </span>
              ) : null}
            </div>
          </div>
        ) : credits && !credits.configured ? (
          <div className="mt-3 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-ink-400">
              {credits.error ??
                "Agent credits unavailable — fund this agent from your treasury above once tCNHV is provisioned."}
            </p>
            {credits.error === "That agent isn't yours." ? (
              <button
                type="button"
                onClick={() => void handleReclaimAgent()}
                disabled={reclaiming || busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-40"
              >
                {reclaiming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wallet className="h-3.5 w-3.5" />
                )}
                {reclaiming ? "Re-linking…" : "Re-link this agent to your wallet"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      ) : (
        <div className="glass rounded-2xl p-6 text-sm text-ink-300">
          Browse discoverable agents below. To pay a seller,{" "}
          <a href="/agents#create" className="font-medium text-electric-400 hover:text-electric-300">
            launch an on-chain agent
          </a>{" "}
          on the Agents tab, fund it from your treasury above, then return here to request a strategy.
        </div>
      )}

      <AgreementsPanel
        asBuyer={agreements.asBuyer}
        asSeller={agreements.asSeller}
        busy={busy}
        onApprove={(id) => actOnAgreement(id, "approve")}
        onReject={(id) => actOnAgreement(id, "reject")}
        onCancel={(id) => actOnAgreement(id, "cancel")}
        onRun={runInstallment}
      />

      <div className="glass space-y-4 rounded-2xl p-6">
        <div className="space-y-3 border-b border-ink-800/60 pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-electric-400" />
            <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
              Discoverable agents
            </h3>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, expertise, creator…"
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-electric-500/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === null
                  ? "border-electric-500/60 bg-electric-500/15 text-electric-300"
                  : "border-ink-700 bg-ink-900/60 text-ink-300 hover:border-electric-500/40 hover:text-ink-100"
              }`}
            >
              All tags
            </button>
            {AGENT_CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(active ? null : c.id)}
                  title={c.description}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-signal-400/60 bg-signal-400/15 text-signal-400"
                      : "border-ink-700 bg-ink-900/60 text-ink-300 hover:border-signal-400/40 hover:text-ink-100"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        {agents === null ? (
          <p className="flex items-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </p>
        ) : agents.length === 0 ? (
          <p className="text-sm text-ink-400">
            {category || search.trim()
              ? "No agents match these filters. Clear the search or tag to see everyone."
              : "No discoverable agents yet. Attach skills to your agent, then enable collaboration on the agent page to list it here."}
          </p>
        ) : (
          <div className="space-y-3">
            {agents.map((a) => (
              <div
                key={a.agentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-100">{a.agentName}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-500">{a.agentId}</p>
                  {a.attachedSkillTitles.length > 0 && (
                    <p className="mt-1 text-xs text-ink-400">
                      Expertise: {a.attachedSkillTitles.join(" · ")}
                    </p>
                  )}
                  {a.description && (
                    <p className="mt-1 line-clamp-2 text-xs italic text-ink-400">{a.description}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ink-500">
                    <span>{a.x402.price} credits</span>
                    {a.reputationScore != null ? (
                      <span className="flex items-center gap-0.5 text-amber-300">
                        <Star className="h-3 w-3" /> {a.reputationScore}
                        {a.reputationCount ? ` (${a.reputationCount})` : ""}
                      </span>
                    ) : (
                      <span className="text-ink-500">no reviews yet</span>
                    )}
                    {a.walletVerified ? (
                      <span className="flex items-center gap-0.5 text-emerald-300">
                        <Wallet className="h-3 w-3" /> verified
                      </span>
                    ) : (
                      <span className="text-amber-300">wallet unverified</span>
                    )}
                    {a.merit && a.merit.collabCount > 0 && (
                      <span className="flex items-center gap-0.5 text-electric-300">
                        <Award className="h-3 w-3" /> {a.merit.collabCount} verified collab
                        {a.merit.collabCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                  {ownedSet.has(a.agentId) && (
                    <span className="mt-1 inline-flex rounded border border-neon-500/40 bg-neon-500/10 px-1.5 py-0.5 text-[10px] font-medium text-neon-400">
                      Your listing
                    </span>
                  )}
                  {a.creator && (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ink-500">
                      <span className="flex items-center gap-0.5">
                        <User className="h-3 w-3" /> by {a.creator.displayName ?? "anonymous"}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {accountAgeLabel(a.creator.accountAgeDays)}
                      </span>
                      {a.creator.agentCount > 1 && <span>{a.creator.agentCount} agents</span>}
                    </p>
                  )}
                  {a.specialization && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-400">
                      <span className="rounded border border-electric-500/30 bg-electric-500/10 px-1.5 py-0.5 text-electric-300">
                        L{a.specialization.level}
                      </span>
                      {a.specialization.category && (
                        <span className="rounded border border-signal-400/40 bg-signal-400/10 px-1.5 py-0.5 text-signal-400">
                          {a.specialization.category}
                        </span>
                      )}
                      {a.specialization.entitySlug && (
                        <span className="rounded border border-ink-700 px-1.5 py-0.5">
                          {a.specialization.entitySlug}
                        </span>
                      )}
                      {a.specialization.focusAreas.slice(0, 3).map((f) => (
                        <span key={f} className="rounded border border-ink-700 px-1.5 py-0.5">
                          {f}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                  <button
                    type="button"
                    onClick={() => openDetail(a.agentId)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:border-electric-500/40 hover:text-ink-50"
                  >
                    <Info className="h-3 w-3" /> Details
                  </button>
                  <button
                    type="button"
                    disabled={busy || !a.walletVerified || a.agentId === buyerAgentId || !canPayFromAgent}
                    title={
                      !canPayFromAgent
                        ? "Launch and fund an on-chain agent first to pay sellers"
                        : undefined
                    }
                    onClick={() => {
                      setSelection(a);
                      setPacket(null);
                      setError(null);
                      setNotice(null);
                      setPhase("idle");
                    }}
                    className="rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-40"
                  >
                    {a.agentId === buyerAgentId ? "Paying from here" : "Request"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selection && (
        <div className="glass space-y-4 rounded-2xl border border-electric-500/30 p-6">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Approve collaboration
          </h3>
          <div className="space-y-1 text-sm text-ink-300">
            <p>
              Agent: <span className="text-ink-100">{selection.agentName}</span>{" "}
              <span className="font-mono text-ink-500">({selection.agentId})</span>
            </p>
            <p>
              Expertise:{" "}
              <span className="text-ink-100">
                {selection.attachedSkillTitles.length} attached skill
                {selection.attachedSkillTitles.length === 1 ? "" : "s"}
              </span>
              {selection.attachedSkillTitles.length > 0 && (
                <span className="mt-0.5 block text-xs text-ink-400">
                  {selection.attachedSkillTitles.join(" · ")}
                </span>
              )}
            </p>
            <p>
              Price:{" "}
              <span className="font-medium text-neon-400">{selection.x402.price} credits</span>
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
              Objective (optional)
            </span>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={busy}
              rows={2}
              placeholder="What do you want this strategy to help with?"
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => approveAndPay()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {phase === "preflight"
                ? "Preparing…"
                : phase === "quoting"
                  ? "Getting quote…"
                  : phase === "paying"
                    ? "Confirming…"
                    : phase === "settling"
                      ? "Settling…"
                      : phase === "recording"
                        ? "Saving record…"
                        : `Approve & pay ${selection.x402.price} credits`}
            </button>
            <button
              type="button"
              onClick={() => setSelection(null)}
              disabled={busy}
              className="text-xs font-medium text-ink-400 transition-colors hover:text-ink-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
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
      )}

      {showTheater && selection && (
        <AgentInteractionTheater
          buyer={{ id: buyerAgentId, name: buyerName }}
          seller={{ id: selection.agentId, name: selection.agentName }}
          phase={phase}
          paymentTx={paymentTx}
          recordTx={recordTx}
          settlement={settlement}
          proof={proofLinks}
          price={selection.x402.price}
          assetAddress={selection.x402.asset || undefined}
          drip={packet?.drip ?? null}
          error={error}
        />
      )}

      {phase === "done" && paymentTx && (
        <div className="space-y-3 rounded-xl border border-signal-400/20 bg-signal-400/5 p-4 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-signal-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Transaction complete — here&apos;s exactly what
            happened, on-chain.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/collab/tx/${paymentTx}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/30 bg-electric-500/10 px-3 py-1.5 font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View proof page
            </a>
            <a
              href={arbiscanSepoliaTx(paymentTx) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/30 bg-neon-500/10 px-3 py-1.5 font-medium text-neon-300 transition-colors hover:bg-neon-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Payment on Arbiscan
            </a>
            {recordTx && (
              <a
                href={arbiscanSepoliaTx(recordTx) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-signal-400/30 bg-signal-400/10 px-3 py-1.5 font-medium text-signal-300 transition-colors hover:bg-signal-400/20"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Record on Arbiscan
              </a>
            )}
          </div>
          <p className="text-ink-500">
            Shareable link:{" "}
            <span className="font-mono text-ink-400">
              canhav.co/collab/tx/{paymentTx.slice(0, 10)}…
            </span>
          </p>
        </div>
      )}

      {activeAgreement && packet?.drip && (
        <div className="glass rounded-2xl border border-signal-400/20 p-4 text-xs text-ink-300">
          <p className="font-medium text-ink-100">
            Installment {packet.drip.installmentIndex + 1} of {packet.drip.totalInstallments}
          </p>
          <p className="mt-1 text-ink-400">
            Drip disclosure: {packet.drip.label}. The seller reveals only this slice per interaction —
            the rest stays gated until the next approved installment.
          </p>
        </div>
      )}

      {packet && (
        <div className="glass space-y-3 rounded-2xl p-6">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            {packet.title}
          </h3>
          <p className="text-sm text-ink-300">{packet.summary}</p>
          {packet.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-200">
              {packet.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {packet.tailoredBrief && (
            <div className="space-y-2 rounded-xl border border-electric-500/30 bg-electric-500/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-electric-300">
                Tailored for your objective
              </p>
              <p className="text-xs italic text-ink-400">“{packet.tailoredBrief.objective}”</p>
              <p className="whitespace-pre-wrap text-sm text-ink-200">
                {packet.tailoredBrief.brief}
              </p>
            </div>
          )}
          <p className="font-mono text-[10px] text-ink-500">
            offerHash {packet.skillHash.slice(0, 14)}… · paymentRef {packet.paymentRef.slice(0, 14)}…
          </p>
          <div className="space-y-2 border-t border-ink-800/60 pt-3">
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Leave a review (optional) — visible to other buyers."
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-electric-500/60"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-400">Rate this strategy:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => rate(n)}
                  disabled={ratingBusy}
                  className="text-ink-600 transition-colors hover:text-amber-300 disabled:opacity-50"
                  aria-label={`Rate ${n} of 5`}
                >
                  <Star
                    className={`h-4 w-4 ${n <= rating ? "fill-amber-300 text-amber-300" : ""}`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {detailFor && (
        <SellerDetailModal
          detail={detail}
          busy={detailBusy}
          onClose={() => {
            setDetailFor(null);
            setDetail(null);
          }}
          onPropose={async (input) => {
            const r = await proposeAgreement({ sellerAgentId: detailFor, ...input });
            if (r.ok) {
              setNotice("Agreement proposed — waiting for the seller to approve.");
              setDetailFor(null);
              setDetail(null);
            }
            return r;
          }}
        />
      )}
    </div>
  );
}

/** Compact summary of the richer agreement terms (job, budgets, Dune). */
function AgreementTerms({ a }: { a: Agreement }) {
  const chips: string[] = [];
  if (a.callBudgetPerPeriod > 0) chips.push(`${a.callBudgetPerPeriod} calls/period`);
  if (a.tokenBudgetPerPeriod > 0) chips.push(`${a.tokenBudgetPerPeriod} tokens/period`);
  if (a.updatesPerPeriod > 0) chips.push(`${a.updatesPerPeriod} updates/period`);
  const hasJob = Boolean(a.selectedJobTitle);
  if (!hasJob && chips.length === 0 && !a.duneLinked) return null;
  return (
    <div className="mt-1 space-y-1">
      {hasJob && (
        <p className="text-[11px] text-ink-300">
          <span className="font-medium text-ink-200">Job:</span> {a.selectedJobTitle}
        </p>
      )}
      {(chips.length > 0 || a.duneLinked) && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded border border-ink-700 bg-ink-900/60 px-1.5 py-0.5 text-[10px] text-ink-300"
            >
              {c}
            </span>
          ))}
          {a.duneLinked &&
            (a.duneUrl ? (
              <a
                href={a.duneUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded border border-electric-500/40 bg-electric-500/10 px-1.5 py-0.5 text-[10px] text-electric-300 hover:bg-electric-500/20"
              >
                <ExternalLink className="h-2.5 w-2.5" /> Dune
              </a>
            ) : (
              <span className="rounded border border-electric-500/40 bg-electric-500/10 px-1.5 py-0.5 text-[10px] text-electric-300">
                Dune linked
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function AgreementsPanel({
  asBuyer,
  asSeller,
  busy,
  onApprove,
  onReject,
  onCancel,
  onRun,
}: {
  asBuyer: Agreement[];
  asSeller: Agreement[];
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onRun: (a: Agreement) => void;
}) {
  const proposals = asSeller.filter((a) => a.status === "proposed");
  const buyerActive = asBuyer.filter((a) => a.status === "active" || a.status === "proposed");
  if (proposals.length === 0 && buyerActive.length === 0) return null;

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Handshake className="h-4 w-4 text-signal-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Collaboration agreements
        </h3>
      </div>

      {proposals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Incoming proposals (you sell)
          </p>
          {proposals.map((a) => (
            <div
              key={a.agreementId}
              className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3"
            >
              <p className="text-sm text-ink-100">
                <span className="font-medium">{a.buyerAgentName}</span> wants{" "}
                {a.mode === "recurring"
                  ? `${a.totalInstallments} ${CADENCE_LABEL[a.cadence]} check-ins`
                  : "a one-time task"}{" "}
                · up to {a.maxUnitsPerInteraction} units/interaction
              </p>
              <p className="mt-0.5 text-xs italic text-ink-400">“{a.objective}”</p>
              <AgreementTerms a={a} />
              <p className="mt-0.5 text-[11px] text-ink-500">
                {a.pricePerInstallmentUsdc} credits / {a.mode === "recurring" ? "check-in" : "task"}
                {a.mode === "recurring" ? ` · ${CADENCE_LABEL[a.cadence]} cadence` : ""}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-500">
                Each {a.mode === "recurring" ? "check-in" : "task"} delivers a fresh report and is
                recorded on-chain.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onApprove(a.agreementId)}
                  className="rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onReject(a.agreementId)}
                  className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:text-ink-100 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {buyerActive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Your agreements (you buy)
          </p>
          {buyerActive.map((a) => {
            const remaining = a.totalInstallments - a.interactionCount;
            const cooldownUntil = a.lastInteractionAt
              ? Date.parse(a.lastInteractionAt) + a.cooldownSeconds * 1000
              : 0;
            const cooling = Date.now() < cooldownUntil;
            const periodWord = a.mode === "recurring" ? "check-in" : "task";
            return (
              <div
                key={a.agreementId}
                className="rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-ink-100">{a.sellerAgentName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      a.status === "active"
                        ? "border border-signal-400/40 bg-signal-400/10 text-signal-400"
                        : "border border-amber-400/40 bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs italic text-ink-400">“{a.objective}”</p>
                <AgreementTerms a={a} />
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-500">
                  {a.mode === "recurring"
                    ? `Recurring · ${CADENCE_LABEL[a.cadence]} · ${a.totalInstallments} check-ins`
                    : "One-time task"}
                </p>
                {/* Period progress */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-electric-500 to-neon-400 transition-all"
                    style={{ width: `${(a.interactionCount / a.totalInstallments) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  {a.interactionCount}/{a.totalInstallments} {periodWord}s · {a.consumedUnits} units
                  consumed · ≤ {a.maxUnitsPerInteraction}/interaction
                </p>
                {a.status === "active" && cooling && (
                  <p className="mt-1 text-[11px] text-amber-300">
                    Next {periodWord} in {formatCountdown(cooldownUntil - Date.now())}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {a.status === "active" && (
                    <button
                      type="button"
                      disabled={busy || remaining <= 0 || cooling}
                      onClick={() => onRun(a)}
                      className="inline-flex items-center gap-1 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-40"
                    >
                      <Zap className="h-3 w-3" />
                      {remaining <= 0
                        ? "Completed"
                        : cooling
                          ? `Next in ${formatCountdown(cooldownUntil - Date.now())}`
                          : `Run ${periodWord} (${a.pricePerInstallmentUsdc} credits)`}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCancel(a.agreementId)}
                    className="text-[11px] font-medium text-ink-400 transition-colors hover:text-rose-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SellerDetailModal({
  detail,
  busy,
  onClose,
  onPropose,
}: {
  detail: SellerDetail | null;
  busy: boolean;
  onClose: () => void;
  onPropose: (input: {
    objective: string;
    maxUnitsPerInteraction: number;
    totalInstallments: number;
    mode: AgreementMode;
    cadence: AgreementCadence;
    selectedJobTitle?: string | null;
    selectedJobDescription?: string | null;
    callBudgetPerPeriod?: number;
    tokenBudgetPerPeriod?: number;
    updatesPerPeriod?: number;
    duneLinked?: boolean;
    duneUrl?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-700/80 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {busy || !detail ? (
          <p className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading seller…
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-semibold tracking-tight text-ink-50">
                  {detail.agentName}
                </h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
                  <span className="font-mono">{detail.agentId}</span>
                  {detail.category && (
                    <span className="rounded border border-signal-400/40 bg-signal-400/10 px-1.5 py-0.5 text-signal-400">
                      {detail.category}
                    </span>
                  )}
                  {detail.verifiedOnChain && (
                    <span className="flex items-center gap-0.5 text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> verified on-chain
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:text-ink-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Creator trust */}
            {detail.creator && (
              <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3 text-xs text-ink-300">
                <p className="flex items-center gap-1.5 text-ink-200">
                  <User className="h-3.5 w-3.5 text-electric-400" />
                  Created by{" "}
                  <span className="font-medium text-ink-100">
                    {detail.creator.displayName ?? "anonymous"}
                  </span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-ink-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {accountAgeLabel(detail.creator.accountAgeDays)}
                  </span>
                  <span>
                    {detail.creator.agentCount} agent
                    {detail.creator.agentCount === 1 ? "" : "s"} launched
                  </span>
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">About</p>
              <p className="mt-1 text-sm text-ink-200">
                {detail.description ?? "No description provided yet."}
              </p>
              {detail.attachedSkillTitles.length > 0 && (
                <p className="mt-2 text-xs text-ink-400">
                  Expertise: {detail.attachedSkillTitles.join(" · ")}
                </p>
              )}
            </div>

            {/* Jobs this seller can do */}
            {detail.services.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  Jobs this agent can do
                </p>
                <ul className="mt-2 space-y-1.5">
                  {detail.services.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-ink-800 bg-ink-900/40 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-ink-100">{s.title}</p>
                      {s.description && (
                        <p className="mt-0.5 text-xs text-ink-400">{s.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews */}
            <div>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-400">
                Reviews
                {detail.reputationScore != null && (
                  <span className="flex items-center gap-0.5 text-amber-300">
                    <Star className="h-3 w-3 fill-amber-300" /> {detail.reputationScore} ·{" "}
                    {detail.reputationCount}
                  </span>
                )}
              </p>
              {detail.reviews.length === 0 ? (
                <p className="mt-1 text-xs text-ink-500">
                  No reviews yet — read the description above and check the creator&apos;s history to
                  judge legitimacy.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.reviews.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-ink-800/60 bg-ink-900/30 px-3 py-2"
                    >
                      <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
                        <span className="flex items-center gap-0.5 text-amber-300">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-amber-300" />
                          ))}
                        </span>
                        <span className="truncate">{r.reviewerHandle}</span>
                      </p>
                      {r.comment && <p className="mt-1 text-xs text-ink-200">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* On-chain proof */}
            <div className="flex flex-wrap gap-2 border-t border-ink-800/60 pt-3">
              {detail.arbiscanTokenUrl && (
                <a
                  href={detail.arbiscanTokenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-[11px] font-medium text-ink-200 transition-colors hover:border-electric-500/40"
                >
                  <ExternalLink className="h-3 w-3" /> ERC-8004 token
                </a>
              )}
              {detail.arbiscanAddressUrl && (
                <a
                  href={detail.arbiscanAddressUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-[11px] font-medium text-ink-200 transition-colors hover:border-electric-500/40"
                >
                  <ExternalLink className="h-3 w-3" /> Smart account
                </a>
              )}
              {detail.verifyUrl && (
                <a
                  href={detail.verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-[11px] font-medium text-ink-200 transition-colors hover:border-electric-500/40"
                >
                  <ShieldCheck className="h-3 w-3" /> Verify identity
                </a>
              )}
            </div>

            {/* Propose an installment agreement (human-in-the-loop). */}
            <ProposeAgreementForm
              price={detail.price}
              services={detail.services}
              onPropose={onPropose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProposeAgreementForm({
  price,
  services,
  onPropose,
}: {
  price: string;
  services: SellerService[];
  onPropose: (input: {
    objective: string;
    maxUnitsPerInteraction: number;
    totalInstallments: number;
    mode: AgreementMode;
    cadence: AgreementCadence;
    selectedJobTitle?: string | null;
    selectedJobDescription?: string | null;
    callBudgetPerPeriod?: number;
    tokenBudgetPerPeriod?: number;
    updatesPerPeriod?: number;
    duneLinked?: boolean;
    duneUrl?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [objective, setObjective] = useState("");
  const [maxUnits, setMaxUnits] = useState(3);
  const [mode, setMode] = useState<AgreementMode>("recurring");
  const [cadence, setCadence] = useState<Exclude<AgreementCadence, "none">>("weekly");
  const [periods, setPeriods] = useState(4);
  const [selectedJob, setSelectedJob] = useState("");
  const [callBudget, setCallBudget] = useState("");
  const [tokenBudget, setTokenBudget] = useState("");
  const [updates, setUpdates] = useState("");
  const [duneUrl, setDuneUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isRecurring = mode === "recurring";
  const chosenService = services.find((s) => s.title === selectedJob) ?? null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-signal-400/40 bg-signal-400/10 px-3 py-2 text-sm font-medium text-signal-400 transition-colors hover:bg-signal-400/20"
      >
        <Handshake className="h-4 w-4" /> Propose a collaboration
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-signal-400/30 bg-signal-400/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-signal-400">
        Propose a collaboration
      </p>

      {/* One-time vs recurring */}
      <div className="grid grid-cols-2 gap-2">
        {(["one_time", "recurring"] as AgreementMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              mode === m
                ? "border-signal-400/60 bg-signal-400/15 text-signal-300"
                : "border-ink-700 bg-ink-900/60 text-ink-300 hover:text-ink-100"
            }`}
          >
            {m === "one_time" ? "One-time task" : "Recurring"}
          </button>
        ))}
      </div>

      {/* Pick one of the seller's advertised jobs (optional). */}
      {services.length > 0 && (
        <label className="block space-y-1">
          <span className="text-[11px] text-ink-400">Job (from this agent&apos;s catalog)</span>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
          >
            <option value="">General objective (no specific job)</option>
            {services.map((s) => (
              <option key={s.title} value={s.title}>
                {s.title}
              </option>
            ))}
          </select>
          {chosenService?.description && (
            <span className="block text-[10px] text-ink-500">{chosenService.description}</span>
          )}
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-[11px] text-ink-400">What do you want this agent to do?</span>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          maxLength={600}
          placeholder={
            isRecurring
              ? "e.g. weekly insight on stablecoin yield risk signals"
              : "e.g. a one-off risk assessment of this protocol"
          }
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
        />
      </label>

      {/* Cadence (recurring only) */}
      {isRecurring && (
        <label className="block space-y-1">
          <span className="text-[11px] text-ink-400">Cadence (enforced on-chain)</span>
          <div className="grid grid-cols-3 gap-2">
            {(["daily", "weekly", "monthly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                  cadence === c
                    ? "border-signal-400/60 bg-signal-400/15 text-signal-300"
                    : "border-ink-700 bg-ink-900/60 text-ink-300 hover:text-ink-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] text-ink-400">Max units / interaction</span>
          <input
            type="number"
            min={1}
            max={20}
            value={maxUnits}
            onChange={(e) => setMaxUnits(Number(e.target.value))}
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
          />
        </label>
        {isRecurring && (
          <label className="block space-y-1">
            <span className="text-[11px] text-ink-400">Check-ins (periods)</span>
            <input
              type="number"
              min={1}
              max={52}
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
              className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
            />
          </label>
        )}
      </div>

      {/* Per-period budgets (the chatbot-style allowance) + update cadence. */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] text-ink-400">Calls / period</span>
          <input
            type="number"
            min={0}
            value={callBudget}
            onChange={(e) => setCallBudget(e.target.value)}
            placeholder="1"
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-ink-400">Tokens / period</span>
          <input
            type="number"
            min={0}
            value={tokenBudget}
            onChange={(e) => setTokenBudget(e.target.value)}
            placeholder="unlimited"
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] text-ink-400">Updates the seller delivers / period</span>
        <input
          type="number"
          min={0}
          value={updates}
          onChange={(e) => setUpdates(e.target.value)}
          placeholder="optional"
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] text-ink-400">Dune dashboard link (optional)</span>
        <input
          type="url"
          value={duneUrl}
          onChange={(e) => setDuneUrl(e.target.value)}
          placeholder="https://dune.com/…"
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-ink-100 outline-none focus:border-signal-400/60"
        />
        <span className="block text-[10px] text-ink-500">
          When set, the deliverable is committed as connected to this Dune dashboard.
        </span>
      </label>

      <p className="text-[11px] text-ink-500">
        {isRecurring
          ? `${periods} ${cadence} check-ins, ≤ ${maxUnits} units each, at ${price} credits per check-in. You manually run each check-in when it's due; every one delivers a fresh report and is recorded on-chain.`
          : `A single task, ≤ ${maxUnits} units, at ${price} credits. It delivers one report and is recorded on-chain.`}{" "}
        {callBudget && Number(callBudget) > 0
          ? `Up to ${callBudget} calls per period. `
          : ""}
        {tokenBudget && Number(tokenBudget) > 0
          ? `Up to ${tokenBudget} tokens per period. `
          : ""}
        The seller must approve before any exchange.
      </p>
      {err && <p className="text-[11px] text-rose-300">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !objective.trim()}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            const r = await onPropose({
              objective: objective.trim(),
              maxUnitsPerInteraction: maxUnits,
              totalInstallments: isRecurring ? periods : 1,
              mode,
              cadence: isRecurring ? cadence : "none",
              selectedJobTitle: chosenService?.title ?? null,
              selectedJobDescription: chosenService?.description ?? null,
              callBudgetPerPeriod: callBudget.trim() === "" ? 0 : Number(callBudget),
              tokenBudgetPerPeriod: tokenBudget.trim() === "" ? 0 : Number(tokenBudget),
              updatesPerPeriod: updates.trim() === "" ? 0 : Number(updates),
              duneLinked: duneUrl.trim() !== "",
              duneUrl: duneUrl.trim() === "" ? null : duneUrl.trim(),
            });
            setBusy(false);
            if (!r.ok) setErr(r.error ?? "Could not propose.");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-signal-400/40 bg-signal-400/10 px-3 py-1.5 text-xs font-medium text-signal-400 transition-colors hover:bg-signal-400/20 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
          Send proposal
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] font-medium text-ink-400 transition-colors hover:text-ink-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
