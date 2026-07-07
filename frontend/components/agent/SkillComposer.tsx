"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileUp, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { normalizeDraft, parseSkillFile, validateUserSkill } from "@/lib/agent/userSkill";
import type { SkillDraft } from "@/lib/agent/userSkill";

type Pair = { a: string; b: string };

const emptyDraft: SkillDraft = {
  title: "",
  summary: "",
  facts: [],
  sections: [],
  actions: [],
  sources: [{ label: "", url: "" }],
};

export function SkillComposer({ returnAgentId }: { returnAgentId?: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [facts, setFacts] = useState<Pair[]>([{ a: "", b: "" }]);
  const [sections, setSections] = useState<Pair[]>([{ a: "", b: "" }]);
  const [sources, setSources] = useState<Pair[]>([{ a: "", b: "" }]);

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function applyDraft(draft: SkillDraft) {
    setTitle(draft.title);
    setSummary(draft.summary);
    setFacts(draft.facts.length ? draft.facts.map((f) => ({ a: f.key, b: f.value })) : [{ a: "", b: "" }]);
    setSections(
      draft.sections.length ? draft.sections.map((s) => ({ a: s.heading, b: s.body })) : [{ a: "", b: "" }],
    );
    setSources(
      draft.sources.length ? draft.sources.map((s) => ({ a: s.label, b: s.url })) : [{ a: "", b: "" }],
    );
  }

  async function onImportFile(file: File) {
    setErrors([]);
    setNotice(null);
    const text = await file.text();
    const parsed = parseSkillFile(text);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    applyDraft(parsed.draft);
    setNotice(`Imported "${file.name}". Review the fields, then save.`);
  }

  function buildDraft(): SkillDraft {
    return normalizeDraft({
      title,
      summary,
      facts: facts.map((p) => ({ key: p.a, value: p.b })),
      sections: sections.map((p) => ({ heading: p.a, body: p.b })),
      sources: sources.map((p) => ({ label: p.a, url: p.b })),
      actions: [],
    });
  }

  async function save() {
    setErrors([]);
    setNotice(null);
    const draft = buildDraft();
    const check = validateUserSkill(draft);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/collab/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, visibility: "private" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        skill?: { id: string };
        error?: string;
        errors?: string[];
      };
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? [data.error ?? `Save failed (status ${res.status}).`]);
        return;
      }
      // When the user came from an agent's "Attach a skill" panel, send them back
      // with the freshly-created skill preselected so they can attach in one click.
      if (returnAgentId && data.skill?.id) {
        router.push(
          `/agents/${encodeURIComponent(returnAgentId)}?tab=train&skill=${encodeURIComponent(
            data.skill.id,
          )}#panel-attach-skill`,
        );
      } else {
        router.push("/agents/skills");
      }
      router.refresh();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Save failed."]);
    } finally {
      setBusy(false);
    }
  }

  const fieldCls =
    "w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50";

  return (
    <div className="glass space-y-6 rounded-2xl p-6">
      {/* Import */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/60 pb-4">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Skill details
          </h2>
          <p className="mt-1 text-sm text-ink-400">
            Write a skill or import one (JSON or Markdown). Skills are read-only research knowledge.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-electric-500/40 disabled:opacity-50"
        >
          <FileUp className="h-4 w-4" /> Import file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          placeholder="e.g. Arbitrum RWA landscape"
          className={fieldCls}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">Summary</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={busy}
          rows={2}
          placeholder="One or two sentences on what this skill teaches the agent."
          className={fieldCls}
        />
      </label>

      <PairEditor
        label="Facts"
        aLabel="key"
        bLabel="value"
        rows={facts}
        setRows={setFacts}
        disabled={busy}
      />
      <PairEditor
        label="Sections"
        aLabel="heading"
        bLabel="body (markdown)"
        rows={sections}
        setRows={setSections}
        disabled={busy}
        multilineB
      />
      <PairEditor
        label="Sources (at least one required)"
        aLabel="label"
        bLabel="https://…"
        rows={sources}
        setRows={setSources}
        disabled={busy}
      />

      {errors.length > 0 && (
        <div className="space-y-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
          {errors.map((e, i) => (
            <p key={i} className="flex items-start gap-2 text-xs leading-relaxed text-rose-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}
            </p>
          ))}
        </div>
      )}
      {notice && <p className="text-xs text-signal-300">{notice}</p>}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save skill
      </button>
    </div>
  );
}

function PairEditor({
  label,
  aLabel,
  bLabel,
  rows,
  setRows,
  disabled,
  multilineB,
}: {
  label: string;
  aLabel: string;
  bLabel: string;
  rows: Pair[];
  setRows: (rows: Pair[]) => void;
  disabled: boolean;
  multilineB?: boolean;
}) {
  const fieldCls =
    "w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50";
  const update = (i: number, patch: Partial<Pair>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</span>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              value={row.a}
              onChange={(e) => update(i, { a: e.target.value })}
              disabled={disabled}
              placeholder={aLabel}
              className={`${fieldCls} max-w-[40%]`}
            />
            {multilineB ? (
              <textarea
                value={row.b}
                onChange={(e) => update(i, { b: e.target.value })}
                disabled={disabled}
                placeholder={bLabel}
                rows={2}
                className={fieldCls}
              />
            ) : (
              <input
                value={row.b}
                onChange={(e) => update(i, { b: e.target.value })}
                disabled={disabled}
                placeholder={bLabel}
                className={fieldCls}
              />
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              className="mt-1 shrink-0 text-ink-500 transition-colors hover:text-rose-300"
              aria-label="Remove row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows([...rows, { a: "", b: "" }])}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" /> Add {label.toLowerCase()}
      </button>
    </div>
  );
}
