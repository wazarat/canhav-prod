"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, ExternalLink, Loader2, Save } from "lucide-react";

import { AGENT_CONFIG_LIMITS, defaultAgentConfig, type AgentConfig } from "@/lib/agent/agentConfig";

/**
 * Owner-only Dune publishing controls.
 *
 * Shows the environment's Dune connection status (shared operator key — no key
 * entry here), a per-agent "Publish insights to Dune" toggle, and an optional
 * dashboard link. Saves through the existing PATCH /api/agent/[id]/config route,
 * which replaces the whole config — so we merge our two fields into the current
 * config before sending to avoid wiping the framework.
 */

interface DuneStatus {
  connected: boolean;
  writeEnabled: boolean;
  namespace: string;
}

export function DunePublishPanel({
  agentId,
  config,
}: {
  agentId: string;
  config: AgentConfig | null;
}) {
  const router = useRouter();
  const base = config ?? defaultAgentConfig();

  const [status, setStatus] = useState<DuneStatus | null>(null);
  const [publishToDune, setPublishToDune] = useState(base.publishToDune);
  const [dashboardUrl, setDashboardUrl] = useState(base.duneDashboardUrl);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/dune/status")
      .then((r) => r.json())
      .then((data: DuneStatus) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active) setStatus({ connected: false, writeEnabled: false, namespace: "canhav" });
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, publishToDune, duneDashboardUrl: dashboardUrl.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; config?: AgentConfig };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Save failed (${res.status}).`);
      // The route may drop a non-https URL; reflect what was actually stored.
      if (data.config) setDashboardUrl(data.config.duneDashboardUrl);
      setNotice("Saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const pill = !status
    ? { label: "checking…", className: "border-ink-700 text-ink-400" }
    : status.writeEnabled
      ? { label: "write enabled", className: "border-signal-500/40 bg-signal-500/10 text-signal-300" }
      : status.connected
        ? { label: "read-only", className: "border-ink-700 bg-ink-900/60 text-ink-300" }
        : { label: "not configured", className: "border-ink-700 bg-ink-900/60 text-ink-400" };

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
        <Database className="h-4 w-4 text-electric-400" />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">Dune</h3>
        <span
          className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] ${pill.className}`}
        >
          {pill.label}
        </span>
      </div>

      <p className="text-sm text-ink-300">
        Let this agent publish its risk verdicts to Dune so a dashboard can overlay them on the
        on-chain chart{status ? ` (namespace ${status.namespace})` : ""}.
      </p>

      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-100">Publish insights to Dune</span>
        <button
          type="button"
          role="switch"
          aria-checked={publishToDune}
          aria-label="Publish insights to Dune"
          onClick={() => setPublishToDune((v) => !v)}
          disabled={busy}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
            publishToDune
              ? "border-electric-500/60 bg-electric-500/30"
              : "border-ink-700 bg-ink-900/60"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-ink-50 transition-transform ${
              publishToDune ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </label>

      {status && !status.writeEnabled && (
        <p className="text-[11px] text-ink-500">
          Writes are off in this environment. Ask the operator to set DUNE_WRITE_ENABLED=1 with a
          Read/Write Dune key; the toggle still saves your preference.
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          Dashboard URL (optional)
        </span>
        <input
          value={dashboardUrl}
          onChange={(e) =>
            setDashboardUrl(e.target.value.slice(0, AGENT_CONFIG_LIMITS.duneDashboardUrlMaxChars))
          }
          disabled={busy}
          placeholder="https://dune.com/…"
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
        {dashboardUrl.trim() && (
          <a
            href={dashboardUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-electric-400 hover:text-electric-300"
          >
            View dashboard <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {notice && <p className="text-xs text-signal-300">{notice}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
