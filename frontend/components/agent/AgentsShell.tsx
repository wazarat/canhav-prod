"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, Pencil, Wallet, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { SocialLoginGate, type SessionInfo } from "./SocialLoginGate";
import { SignOutButton } from "./SignOutButton";

function AuthNotConfigured() {
  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <div className="glass w-full max-w-md space-y-4 rounded-2xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-50">
          Sign in to Agent Lab
        </h1>
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left">
          <Badge tone="warning" className="w-fit">
            <AlertTriangle className="h-3 w-3" /> Social login not configured
          </Badge>
          <p className="text-xs leading-relaxed text-ink-400">
            Set{" "}
            <code className="font-mono text-ink-200">NEXT_PUBLIC_PRIVY_APP_ID</code> and{" "}
            <code className="font-mono text-ink-200">PRIVY_APP_SECRET</code> to enable
            self-custodial wallet sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AgentsShell({
  initialSession,
  privyConfigured,
  children,
}: {
  initialSession: SessionInfo | null;
  privyConfigured: boolean;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<SessionInfo | null>(initialSession);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialSession?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);

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
    if (!privyConfigured) return <AuthNotConfigured />;
    return <SocialLoginGate onAuthenticated={setSession} />;
  }

  const name = session.displayName?.trim();
  const shortId = `${session.userId.slice(0, 10)}…${session.userId.slice(-4)}`;

  return (
    <div>
      <div className="border-b border-ink-800/60 bg-ink-950/80">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <Wallet className="h-3.5 w-3.5 text-electric-400" />
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
          <SignOutButton onSignedOut={() => setSession(null)} />
        </div>
      </div>
      {children}
    </div>
  );
}
