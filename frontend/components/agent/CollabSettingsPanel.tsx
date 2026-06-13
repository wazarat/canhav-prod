"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio, Save } from "lucide-react";

/**
 * Marketplace listing details for a discoverable agent: the public description
 * buyers read and the per-interaction unit ceiling. The discoverable on/off
 * toggle + price live in the PublishAgentCard (one source of truth for that
 * mutation); this panel only PATCHes description + max units.
 */
export function CollabSettingsPanel({
  agentId,
  description,
  collabMaxUnits,
}: {
  agentId: string;
  description?: string | null;
  collabMaxUnits?: number | null;
}) {
  const router = useRouter();
  const [bio, setBio] = useState(description ?? "");
  const [maxUnits, setMaxUnits] = useState(collabMaxUnits != null ? String(collabMaxUnits) : "");
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
          description: bio.trim() === "" ? null : bio.trim(),
          collabMaxUnits: maxUnits.trim() === "" ? null : Number(maxUnits.trim()),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Save failed (${res.status}).`);
      setNotice("Marketplace details saved.");
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
          Marketplace details
        </h3>
      </div>

      <p className="text-xs text-ink-500">
        Discoverability and price live in the “Publish to the agent marketplace” card above.
      </p>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Public description
        </span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={busy}
          rows={3}
          maxLength={600}
          placeholder="Describe what this agent is good at — shown to buyers browsing the marketplace."
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
        />
        <span className="block text-[10px] text-ink-500">
          Buyers with no reviews to read fall back to this description.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Max units / interaction
        </span>
        <input
          value={maxUnits}
          onChange={(e) => setMaxUnits(e.target.value)}
          disabled={busy}
          inputMode="numeric"
          placeholder="default"
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
        />
      </label>
      <p className="text-[10px] text-ink-500">
        The ceiling on how much knowledge (data slices) a single paid interaction can drip — the
        max a buyer can agree to per exchange. Anything at or below it is allowed.
      </p>

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
