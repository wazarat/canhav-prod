"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Tag, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import {
  AGENT_CATEGORIES,
  agentCategoryLabel,
  type AgentCategory,
} from "@/lib/agent/categories";
import { cn } from "@/lib/utils";

/**
 * Inline owner editor for an agent's display name + research category.
 * Renders read-only (name + category badge) for non-owners. Saving PATCHes
 * /api/agent/{id} — off-chain only, the minted ERC-8004 token is untouched.
 */
export function AgentNameEditor({
  agentId,
  name,
  category,
  isOwner,
}: {
  agentId: string;
  name: string;
  category: AgentCategory | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftCategory, setDraftCategory] = useState<AgentCategory | null>(category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryLabel = agentCategoryLabel(category);

  async function save() {
    if (!draftName.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName.trim(), category: draftCategory }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `status ${res.status}`);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <span className="inline-flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">{name}</h1>
        {categoryLabel && (
          <Badge tone="signal">
            <Tag className="h-3 w-3" /> {categoryLabel}
          </Badge>
        )}
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setDraftName(name);
              setDraftCategory(category);
              setEditing(true);
            }}
            aria-label="Rename agent"
            className="rounded-lg border border-ink-700/80 p-1.5 text-ink-400 transition-colors hover:border-electric-500/40 hover:text-electric-300"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-3 rounded-xl border border-ink-700/80 bg-ink-900/40 p-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Agent name
        </span>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          maxLength={60}
          disabled={busy}
          autoFocus
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
        />
      </label>
      <div className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {AGENT_CATEGORIES.map((c) => {
            const active = draftCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setDraftCategory(active ? null : c.id)}
                disabled={busy}
                title={c.description}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  active
                    ? "border-electric-500/60 bg-electric-500/15 text-electric-300"
                    : "border-ink-700 bg-ink-900/60 text-ink-300 hover:border-electric-500/40 hover:text-ink-100",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !draftName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-sm font-medium text-ink-300 transition-colors hover:text-ink-100 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
