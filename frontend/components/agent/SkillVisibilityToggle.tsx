"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import type { SkillVisibility } from "@/lib/types";

/** Owner toggle to flip a user skill between private and discoverable. */
export function SkillVisibilityToggle({
  skillId,
  visibility,
}: {
  skillId: string;
  visibility: SkillVisibility;
}) {
  const router = useRouter();
  const [value, setValue] = useState<SkillVisibility>(visibility);
  const [busy, setBusy] = useState(false);

  async function flip() {
    const next: SkillVisibility = value === "discoverable" ? "private" : "discoverable";
    setBusy(true);
    try {
      const res = await fetch(`/api/collab/skills/${encodeURIComponent(skillId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) {
        setValue(next);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const discoverable = value === "discoverable";
  return (
    <button
      type="button"
      onClick={flip}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        discoverable
          ? "border-signal-400/40 bg-signal-400/10 text-signal-400 hover:bg-signal-400/20"
          : "border-ink-700 bg-ink-900/60 text-ink-300 hover:border-ink-600"
      }`}
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : discoverable ? (
        <Eye className="h-3 w-3" />
      ) : (
        <EyeOff className="h-3 w-3" />
      )}
      {discoverable ? "Discoverable" : "Private"}
    </button>
  );
}
