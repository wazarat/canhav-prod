"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, X } from "lucide-react";

import type { TradeHitlMethod } from "@/lib/agent/agentConfig";

const POLL_MS = 25_000;
const TOAST_MS = 12_000;
const MAX_SEEN_IDS = 100;

/**
 * Owner-only proposal watcher for the agent detail page. Polls the owner-gated
 * trade-proposals endpoint, toasts once per new pending proposal (seen ids are
 * remembered per agent in localStorage so reloads never re-toast), and calls
 * router.refresh() whenever the pending set changes so the server-rendered
 * tab badge and ProposedTradesPanel stay current, including after approvals
 * or rejections made in another browser tab.
 */
export function ProposalNotifier({
  agentId,
  hitlMethod,
  basePath,
}: {
  agentId: string;
  hitlMethod?: TradeHitlMethod;
  basePath: string;
}) {
  const router = useRouter();
  const storageKey = `canhav:seenProposals:${agentId}`;
  const [toast, setToast] = useState<{ count: number } | null>(null);

  // Refs persist across StrictMode's setup/cleanup/setup, so the doubled
  // initial tick dedupes via inFlightRef instead of racing itself.
  const seenRef = useRef<Set<string> | null>(null);
  const inFlightRef = useRef(false);
  const stoppedRef = useRef(false);
  const signatureRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function loadSeen(): Set<string> {
      if (seenRef.current) return seenRef.current;
      let seen = new Set<string>();
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) seen = new Set(JSON.parse(raw) as string[]);
      } catch {
        // blocked or corrupt localStorage: fall back to in-memory only
      }
      seenRef.current = seen;
      return seen;
    }

    function persistSeen(seen: Set<string>) {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...seen].slice(-MAX_SEEN_IDS)));
      } catch {
        // ignore: worst case is one repeat toast after a reload
      }
    }

    async function tick() {
      if (cancelled || stoppedRef.current || inFlightRef.current) return;
      if (document.hidden) return;
      inFlightRef.current = true;
      try {
        const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}/trade-proposals`, {
          cache: "no-store",
        });
        if (res.status === 401 || res.status === 403) {
          // Session expired or ownership revoked: stop polling for good.
          stoppedRef.current = true;
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          proposals?: { id: string; status: string }[];
        };
        if (cancelled) return;

        const pendingIds = (data.proposals ?? [])
          .filter((p) => p.status === "proposed")
          .map((p) => p.id)
          .sort();
        const signature = pendingIds.join(",");

        const seen = loadSeen();
        const unseen = pendingIds.filter((id) => !seen.has(id));
        if (unseen.length > 0) {
          for (const id of unseen) seen.add(id);
          // Persist before toasting so a reload mid-toast never re-toasts.
          persistSeen(seen);
          setToast((prev) => ({ count: (prev?.count ?? 0) + unseen.length }));
        }

        // Refresh on any change to the pending set (grew or shrank), so the
        // tab badge and ProposedTradesPanel follow actions from other tabs.
        // The first tick only records the baseline the RSC already rendered.
        if (signatureRef.current !== null && signatureRef.current !== signature) {
          router.refresh();
        }
        signatureRef.current = signature;
      } catch {
        // network hiccup: try again on the next interval
      } finally {
        inFlightRef.current = false;
      }
    }

    function onVisibilityChange() {
      if (!document.hidden) void tick();
    }

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [agentId, router, storageKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const many = toast.count > 1;
  const message =
    hitlMethod === "spending_cap"
      ? many
        ? `Your agent proposed ${toast.count} trades within its caps. They execute when you sign.`
        : "Your agent proposed a trade within its caps. It executes when you sign."
      : many
        ? `Your agent proposed ${toast.count} trades. Review them before anything executes.`
        : "Your agent proposed a trade. Review it before anything executes.";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:max-w-sm"
    >
      <div className="glass-strong flex items-start gap-3 rounded-xl border border-electric-500/40 px-4 py-3 shadow-lg">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-electric-400" />
        <div className="space-y-1.5 text-sm text-ink-200">
          <p>{message}</p>
          <Link
            href={basePath}
            scroll={false}
            onClick={() => setToast(null)}
            className="inline-block font-medium text-electric-400 transition-colors hover:text-electric-300"
          >
            Review {many ? "proposals" : "proposal"}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Dismiss notification"
          className="ml-auto shrink-0 text-ink-400 transition-colors hover:text-ink-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
