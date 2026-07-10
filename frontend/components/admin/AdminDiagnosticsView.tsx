"use client";

import { useEffect, useState } from "react";

interface FieldCoverage {
  field: string;
  source: string;
  status: "live" | "curated" | "missing";
  reason: string;
  value: string | number | null;
  resolvedSlugs?: string[];
  resolvedCoingeckoId?: string | null;
  asOf?: string | null;
  detail?: string;
}

interface Summary {
  total: number;
  live: number;
  missing: number;
  fixable: number;
  noCoverage: number;
  needOnchain?: number;
  curatedEmpty?: number;
}

const STATUS_CHIP: Record<FieldCoverage["status"], string> = {
  live: "🟢",
  curated: "🟡",
  missing: "🔴",
};

function fmtValue(v: string | number | null): string {
  if (v === null || v === "") return "—";
  if (typeof v === "number") {
    if (v === 0) return "0";
    return v >= 1000 ? `$${Math.round(v).toLocaleString()}` : String(v);
  }
  return v;
}

export function AdminDiagnosticsView({
  slug,
  name,
  category = "networks",
}: {
  slug: string;
  name: string;
  category?: "networks" | "coins" | "receipts";
}) {
  const [rows, setRows] = useState<FieldCoverage[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetch(
      `/api/admin/diagnostics?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}`,
      { credentials: "include" },
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error ?? "Failed to load diagnostics.");
          return;
        }
        const item = data.items?.[0];
        setRows(item?.coverage ?? []);
        setSummary(item?.summary ?? null);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [slug, category]);

  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!rows) return <p className="text-sm text-ink-400">Loading diagnostics…</p>;

  const linkageBroken = rows.some(
    (r) =>
      (r.field === "entityLink" && r.reason === "no-entity-link") ||
      (r.field === "memberOf" && r.reason === "dangling-ref"),
  );

  return (
    <div className="space-y-3">
      {summary && (
        <p className="text-sm text-ink-300">
          <span className="font-medium text-ink-100">{name}</span>: {summary.live} of{" "}
          {summary.total} API fields live · {summary.missing} missing ({summary.fixable} fixable via
          CoinGecko id/slug, {summary.noCoverage} no coverage
          {summary.needOnchain ? `, ${summary.needOnchain} need on-chain adapter` : ""})
          {summary.curatedEmpty ? ` · ${summary.curatedEmpty} curated scaffolds empty` : ""}
        </p>
      )}

      {linkageBroken && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          This {category === "receipts" ? "receipt" : "coin"} won&apos;t appear under any network&apos;s
          &ldquo;View all coins&rdquo; — fix the Entity link / MemberCoins in the Content editor tab.
        </p>
      )}
      <div className="overflow-x-auto rounded-md border border-ink-800">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-left text-xs text-ink-400">
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.field} className="border-b border-ink-900/60">
                <td className="px-3 py-2 font-medium text-ink-100">{r.field}</td>
                <td className="px-3 py-2 text-ink-400">{r.source}</td>
                <td className="px-3 py-2">
                  {STATUS_CHIP[r.status]} {r.status}
                </td>
                <td className="px-3 py-2 text-ink-200">{fmtValue(r.value)}</td>
                <td className="px-3 py-2 text-ink-400">
                  {r.reason}
                  {r.detail ? <span className="block text-xs text-ink-500">{r.detail}</span> : null}
                </td>
                <td className="px-3 py-2 text-xs text-ink-500">
                  {r.resolvedSlugs?.length ? r.resolvedSlugs.join(", ") : ""}
                  {r.resolvedCoingeckoId ? r.resolvedCoingeckoId : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
