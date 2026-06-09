"use client";

import { useCallback, useState } from "react";
import { Fingerprint, LogOut } from "lucide-react";

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

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession(null);
    } finally {
      setLoggingOut(false);
    }
  }, []);

  if (!session) {
    return (
      <PasskeyAuthGate passkeyConfigured={passkeyConfigured} onAuthenticated={setSession} />
    );
  }

  const shortId = `${session.userId.slice(0, 6)}…${session.userId.slice(-4)}`;

  return (
    <div>
      <div className="border-b border-ink-800/60 bg-ink-950/80">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <Fingerprint className="h-3.5 w-3.5 text-electric-400" />
            <span>
              Signed in · <span className="font-mono text-ink-300">{shortId}</span>
            </span>
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
