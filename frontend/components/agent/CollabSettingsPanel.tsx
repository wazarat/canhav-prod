"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Plus, Radio, Save, Trash2 } from "lucide-react";

interface ServiceDraft {
  title: string;
  description: string;
}

const MAX_SERVICES = 8;

/**
 * Marketplace listing details for a discoverable agent: the public description
 * buyers read, the per-interaction unit ceiling, and the catalog of specific
 * jobs this agent advertises it can do. The discoverable on/off toggle + price
 * live in the PublishAgentCard (one source of truth for that mutation); this
 * panel PATCHes description + max units + services.
 */
export function CollabSettingsPanel({
  agentId,
  description,
  collabMaxUnits,
  services,
}: {
  agentId: string;
  description?: string | null;
  collabMaxUnits?: number | null;
  services?: ServiceDraft[];
}) {
  const router = useRouter();
  const [bio, setBio] = useState(description ?? "");
  const [maxUnits, setMaxUnits] = useState(collabMaxUnits != null ? String(collabMaxUnits) : "");
  const [jobs, setJobs] = useState<ServiceDraft[]>(services ?? []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateJob(i: number, patch: Partial<ServiceDraft>) {
    setJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  }
  function addJob() {
    setJobs((prev) => (prev.length >= MAX_SERVICES ? prev : [...prev, { title: "", description: "" }]));
  }
  function removeJob(i: number) {
    setJobs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const cleanedJobs = jobs
        .map((j) => ({ title: j.title.trim(), description: j.description.trim() }))
        .filter((j) => j.title);
      const res = await fetch("/api/collab/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          description: bio.trim() === "" ? null : bio.trim(),
          collabMaxUnits: maxUnits.trim() === "" ? null : Number(maxUnits.trim()),
          services: cleanedJobs,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; services?: ServiceDraft[] };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Save failed (${res.status}).`);
      if (data.services) setJobs(data.services);
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
          placeholder="Describe what this agent is good at. Shown to buyers browsing the marketplace."
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
        The ceiling on how much knowledge (data slices) a single paid interaction can drip: the
        max a buyer can agree to per exchange. Anything at or below it is allowed.
      </p>

      <div className="space-y-2 border-t border-ink-800/60 pt-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-400">
            <Briefcase className="h-3.5 w-3.5" /> Jobs this agent can do
          </span>
          <button
            type="button"
            onClick={addJob}
            disabled={busy || jobs.length >= MAX_SERVICES}
            className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-2 py-1 text-[11px] text-ink-300 transition-colors hover:bg-ink-800/60 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Add job
          </button>
        </div>
        <p className="text-[10px] text-ink-500">
          Specific services buyers can pick when proposing a collaboration (e.g. “Weekly risk
          digest”). The chosen job is committed into the agreement terms.
        </p>
        {jobs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-800 px-3 py-2 text-[11px] text-ink-500">
            No jobs listed yet. Buyers will collaborate on the general objective only.
          </p>
        ) : (
          jobs.map((job, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-ink-800 bg-ink-900/40 p-2.5">
              <div className="flex items-center gap-2">
                <input
                  value={job.title}
                  onChange={(e) => updateJob(i, { title: e.target.value })}
                  disabled={busy}
                  maxLength={80}
                  placeholder="Job title"
                  className="w-full rounded-md border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => removeJob(i)}
                  disabled={busy}
                  aria-label="Remove job"
                  className="shrink-0 rounded-md border border-ink-700 p-1.5 text-ink-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={job.description}
                onChange={(e) => updateJob(i, { description: e.target.value })}
                disabled={busy}
                rows={2}
                maxLength={300}
                placeholder="What this job delivers (optional)."
                className="w-full rounded-md border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-xs text-ink-200 outline-none focus:border-electric-500/60 disabled:opacity-50"
              />
            </div>
          ))
        )}
      </div>

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
