"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, Plus } from "lucide-react";

import { SkillPicker, type SkillPickerOption } from "./SkillPicker";

export function SkillShelf({
  agentId,
  allSkills,
  studied,
}: {
  agentId: string;
  allSkills: SkillPickerOption[];
  studied: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);

  const studiedSet = useMemo(() => new Set(studied), [studied]);
  const unstudied = useMemo(
    () => allSkills.filter((s) => !studiedSet.has(s.id)),
    [allSkills, studiedSet],
  );

  const titleFor = (id: string) => {
    const title = allSkills.find((s) => s.id === id)?.title ?? id;
    return title.replace(/\s+—\s+(Research|Stablecoin|RWA|Token) Skill$/, "");
  };

  function togglePick(id: string) {
    setPicks((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function assign() {
    if (picks.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const skillId of picks) {
        const res = await fetch("/api/agent/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, action: "studySkill", skillId }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
      }
      setPicks([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to assign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
        <BookOpen className="h-4 w-4 text-signal-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          Skill shelf
        </h3>
        <span className="ml-auto font-mono text-[10px] text-ink-500">{studied.length} studied</span>
      </div>

      {studied.length === 0 ? (
        <p className="text-sm text-ink-500">No skills studied yet — pick some below.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {studied.map((id) => (
            <Link
              key={id}
              href={`/agents/skills/${encodeURIComponent(id)}`}
              className="rounded-full border border-signal-400/40 bg-signal-400/10 px-3 py-1 text-xs font-medium text-signal-400 transition-colors hover:bg-signal-400/20"
            >
              {titleFor(id)}
            </Link>
          ))}
        </div>
      )}

      {unstudied.length > 0 && (
        <div className="space-y-3 border-t border-ink-800/60 pt-3">
          <SkillPicker
            options={unstudied}
            selected={picks}
            onToggle={togglePick}
            disabled={busy}
            maxHeightClass="max-h-60"
          />
          <button
            type="button"
            onClick={assign}
            disabled={busy || picks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-signal-400/40 bg-signal-400/10 px-3 py-2 text-sm font-medium text-signal-400 transition-colors hover:bg-signal-400/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Study {picks.length > 0 ? `${picks.length} skill${picks.length > 1 ? "s" : ""}` : "skills"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
