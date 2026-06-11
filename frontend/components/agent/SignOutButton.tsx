"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2, LogOut } from "lucide-react";

/**
 * Sign out of both layers: clear the CanHav session cookie and the Privy
 * session. Only rendered inside the authenticated UI (the Privy provider is
 * mounted whenever a session exists), so `usePrivy` is safe here.
 */
export function SignOutButton({ onSignedOut }: { onSignedOut: () => void }) {
  const { logout } = usePrivy();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
          try {
            await logout();
          } catch {
            // Privy may already be logged out — clearing the cookie is enough.
          }
        } finally {
          setLoading(false);
          onSignedOut();
        }
      }}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
      Sign out
    </button>
  );
}
