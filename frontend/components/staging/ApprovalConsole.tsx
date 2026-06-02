"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

export interface ApprovalItem {
  category: "Stablecoin" | "RWA";
  slug: string;
  name: string;
  status: "PENDING_APPROVAL" | "APPROVED";
}

const TOKEN_KEY = "canhav_approval_token";

type RowState = "idle" | "working" | "error";

export function ApprovalConsole({ items }: { items: ApprovalItem[] }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function persistToken(value: string) {
    setToken(value);
    try {
      window.localStorage.setItem(TOKEN_KEY, value);
    } catch {
      /* ignore */
    }
  }

  async function flip(item: ApprovalItem, action: "approve" | "revert") {
    if (!token.trim()) {
      setMessage("Enter the approval token first.");
      return;
    }
    const key = `${item.category}#${item.slug}`;
    setMessage(null);
    setRowState((s) => ({ ...s, [key]: "working" }));
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({ category: item.category, slug: item.slug, action }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setRowState((s) => ({ ...s, [key]: "error" }));
        setMessage(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      setRowState((s) => ({ ...s, [key]: "idle" }));
      setMessage(
        `${item.name} ${action === "approve" ? "approved" : "reverted to pending"}.`,
      );
      router.refresh();
    } catch (err) {
      setRowState((s) => ({ ...s, [key]: "error" }));
      setMessage(err instanceof Error ? err.message : "Network error.");
    }
  }

  const pending = items.filter((i) => i.status === "PENDING_APPROVAL");
  const approved = items.filter((i) => i.status === "APPROVED");

  return (
    <div className="glass space-y-5 rounded-2xl p-5">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-300">
          <KeyRound className="h-3.5 w-3.5" />
          Approval token
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => persistToken(e.target.value)}
          placeholder="Paste APPROVAL_TOKEN (stored locally in your browser)"
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 font-mono text-sm text-ink-50 outline-none transition-colors focus:border-electric-500"
        />
        <p className="text-xs text-ink-400">
          Must match <span className="font-mono">APPROVAL_TOKEN</span> in{" "}
          <span className="font-mono">backend/.env</span>. Never leaves your browser except as the
          request&apos;s bearer token.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-electric-500/30 bg-electric-500/[0.06] px-3 py-2 text-xs text-electric-200">
          {message}
        </div>
      )}

      <ConsoleGroup
        title="Pending review"
        tone="warning"
        items={pending}
        rowState={rowState}
        action="approve"
        onFlip={flip}
        emptyHint="Nothing pending."
      />
      <ConsoleGroup
        title="Approved"
        tone="positive"
        items={approved}
        rowState={rowState}
        action="revert"
        onFlip={flip}
        emptyHint="Nothing approved yet."
      />
    </div>
  );
}

function ConsoleGroup({
  title,
  tone,
  items,
  rowState,
  action,
  onFlip,
  emptyHint,
}: {
  title: string;
  tone: "warning" | "positive";
  items: ApprovalItem[];
  rowState: Record<string, RowState>;
  action: "approve" | "revert";
  onFlip: (item: ApprovalItem, action: "approve" | "revert") => void;
  emptyHint: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
        {title}
        <Badge tone={tone}>{items.length}</Badge>
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-ink-400">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-ink-800/70 overflow-hidden rounded-xl border border-ink-800/70">
          {items.map((item) => {
            const key = `${item.category}#${item.slug}`;
            const state = rowState[key] ?? "idle";
            const working = state === "working";
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 bg-ink-900/40 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <span className="text-sm text-ink-50">{item.name}</span>
                  <span className="ml-2 font-mono text-xs text-ink-400">
                    {item.category} · {item.slug}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => onFlip(item, action)}
                  className={
                    action === "approve"
                      ? "inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
                      : "inline-flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-700/60 disabled:opacity-50"
                  }
                >
                  {working ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : action === "approve" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  {action === "approve" ? "Approve" : "Revert"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
