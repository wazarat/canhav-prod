"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Radio,
  Save,
  Store,
} from "lucide-react";

/**
 * Owner-only "Publish to the agent marketplace" readiness card.
 *
 * The discoverability + pricing controls already existed but were buried at the
 * bottom of the agent page, so owners had no idea how to make an agent
 * requestable. This surfaces a 4-step checklist derived from existing state and
 * owns the discoverable/price mutation (POST /api/collab/agent). The details
 * panel keeps description + max units. An agent becomes live in discovery once
 * it is discoverable AND has at least one attached skill.
 */
export function PublishAgentCard({
  agentId,
  minted,
  hasSkill,
  discoverable,
  collabPriceUsdc,
}: {
  agentId: string;
  minted: boolean;
  hasSkill: boolean;
  discoverable: boolean;
  collabPriceUsdc: string | null;
}) {
  const router = useRouter();
  const [isDiscoverable, setIsDiscoverable] = useState(discoverable);
  const [price, setPrice] = useState(collabPriceUsdc ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasPrice = price.trim() !== "";
  // The real discovery gate (see buildAgentEntry): discoverable + ≥1 skill.
  const isListed = isDiscoverable && hasSkill;

  async function save() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/collab/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          discoverable: isDiscoverable,
          collabPriceUsdc: price.trim() === "" ? null : price.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Save failed (${res.status}).`);
      setNotice(
        isDiscoverable
          ? "Saved. This agent is now offered to other agents."
          : "Saved. This agent is hidden from the marketplace.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const steps: { done: boolean; label: string; help: React.ReactNode }[] = [
    {
      done: hasSkill,
      label: "Trained on at least one skill",
      help: hasSkill ? (
        "Buyers can see the expertise this agent advertises."
      ) : (
        <Link
          href="#panel-attach-skill"
          className="font-medium text-electric-400 hover:text-electric-300"
        >
          Attach a skill below →
        </Link>
      ),
    },
    {
      done: minted,
      label: "Minted on-chain (ERC-8004)",
      help: minted ? (
        "Its identity, skills, and ledger are verifiable on Arbitrum Sepolia."
      ) : (
        <Link
          href="/agents#create"
          className="font-medium text-electric-400 hover:text-electric-300"
        >
          Launch on-chain from the Agents tab →
        </Link>
      ),
    },
    {
      done: hasPrice,
      label: "Price set (USDC per request)",
      help: hasPrice
        ? "Buyers pay this each period via x402; recorded on-chain."
        : "Optional — a default price applies until you set one.",
    },
    {
      done: isDiscoverable,
      label: "Discoverable in the marketplace",
      help: isDiscoverable
        ? "Other users' agents can find and pay this agent."
        : "Toggle on, then Save, to list it.",
    },
  ];

  return (
    <div className="glass space-y-5 rounded-2xl border border-electric-500/20 p-6">
      <div className="flex items-center justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-electric-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Publish to the agent marketplace
          </h3>
        </div>
        {isListed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/40 bg-signal-500/10 px-2.5 py-1 text-xs font-medium text-signal-300">
            <Radio className="h-3 w-3" /> Listed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/60 px-2.5 py-1 text-xs font-medium text-ink-400">
            Not listed
          </span>
        )}
      </div>

      <p className="text-sm text-ink-300">
        Other people&apos;s agents discover this one on the{" "}
        <Link href="/collab" className="font-medium text-electric-400 hover:text-electric-300">
          collaboration marketplace
        </Link>{" "}
        and pay it per request. It goes live once it&apos;s discoverable and has at least one skill.
      </p>

      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-600" />
            )}
            <div className="min-w-0">
              <p
                className={`text-sm font-medium ${step.done ? "text-ink-100" : "text-ink-200"}`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">{step.help}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-4 rounded-xl border border-ink-800/60 bg-ink-900/40 p-4">
        <label className="flex items-start gap-2 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={isDiscoverable}
            onChange={(e) => setIsDiscoverable(e.target.checked)}
            disabled={busy}
            className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-900"
          />
          <span>
            Discoverable to other agents
            <span className="mt-0.5 block text-xs text-ink-500">
              Lets other users&apos; agents find and pay this agent for its attached expertise.
            </span>
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
            Price per request (USDC)
          </span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={busy}
            inputMode="decimal"
            placeholder="default"
            className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          {isListed && (
            <Link
              href="/collab"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-electric-400 hover:text-electric-300"
            >
              View live listing <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {notice && <p className="text-xs text-signal-300">{notice}</p>}
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
