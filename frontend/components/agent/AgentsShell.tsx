"use client";

import { useCallback, useState } from "react";
import { Check, Fingerprint, LogOut, Pencil, X } from "lucide-react";

import { PasskeyAuthGate, type SessionInfo } from "./PasskeyAuthGate";

export function AgentsShell({
  initialSession,
  passkeyConfigured,
  children,
}: {
  initialSession: SessionInfo | null;
  passkeyConfigured: boolean;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<SessionInfo | null>(initialSession);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialSession?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession(null);
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const saveName = useCallback(async () => {
    const next = nameDraft.trim();
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: next }),
      });
      if (res.ok) {
        setSession((s) => (s ? { ...s, displayName: next || null } : s));
        setEditing(false);
      }
    } finally {
      setSavingName(false);
    }
  }, [nameDraft]);

  if (!session) {
    return (
      <PasskeyAuthGate passkeyConfigured={passkeyConfigured} onAuthenticated={setSession} />
    );
  }

  const name = session.displayName?.trim();
  const shortId = `${session.userId.slice(0, 6)}…${session.userId.slice(-4)}`;

  return (
    <div>
      <div className="border-b border-ink-800/60 bg-ink-950/80">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <Fingerprint className="h-3.5 w-3.5 text-electric-400" />
            {editing ? (
              <span className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                  autoFocus
                  disabled={savingName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveName();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  className="w-40 rounded-md border border-ink-700 bg-ink-900/70 px-2 py-0.5 text-xs text-ink-100 outline-none focus:border-electric-500/60"
                />
                <button
                  type="button"
                  onClick={() => void saveName()}
                  disabled={savingName}
                  className="text-electric-400 transition-colors hover:text-electric-300 disabled:opacity-50"
                  aria-label="Save name"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-ink-500 transition-colors hover:text-ink-300"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                {name ? (
                  <>
                    Signed in as <span className="text-ink-200">{name}</span>
                    <span className="font-mono text-ink-600">{shortId}</span>
                  </>
                ) : (
                  <>
                    Signed in · <span className="font-mono text-ink-300">{shortId}</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(name ?? "");
                    setEditing(true);
                  }}
                  className="text-ink-500 transition-colors hover:text-electric-400"
                  aria-label={name ? "Edit your name" : "Add your name"}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 disabled:opacity-50"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
