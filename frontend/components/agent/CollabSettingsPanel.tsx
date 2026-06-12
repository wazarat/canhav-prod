"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio, Save } from "lucide-react";

/**
 * Owner opt-in for agent-to-agent collaboration. Flipping "discoverable" is the
 * standing-offer consent model: the owner publishes a price, and any buyer who
 * pays it is consenting — there is no per-request seller approval.
 */
export function CollabSettingsPanel({
  agentId,
  discoverable,
  collabPriceUsdc,
}: {
  agentId: string;
  discoverable: boolean;
  collabPriceUsdc: string | null;
}) {
  const router = useRouter();
  const [isDiscoverable, setIsDiscoverable] = useState(discoverable);
  const [price, setPrice] = useState(collabPriceUsdc ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setNotice("Collaboration settings saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
        <Radio className="h-4 w-4 text-electric-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Collaboration
        </h3>
      </div>

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
          Price per request (testnet USDC)
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

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save
      </button>

      {notice && <p className="text-xs text-signal-300">{notice}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
