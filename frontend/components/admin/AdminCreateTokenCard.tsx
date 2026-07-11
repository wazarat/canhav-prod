"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PickerNetwork } from "@/components/admin/AdminPanel";
import { isValidSlug, slugify } from "@/lib/slug";

const INPUT_CLASS =
  "w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none focus:border-electric-500";

/**
 * Lean create-only card: mints a minimal Token record via the createCoin op and
 * links it to a parent network. Editing existing coins stays in AdminCoinEditor.
 */
export function AdminCreateTokenCard({
  networks,
  defaultEntitySlug,
  onClose,
}: {
  networks: PickerNetwork[];
  defaultEntitySlug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [entitySlug, setEntitySlug] = useState(
    networks.some((n) => n.slug === defaultEntitySlug) ? defaultEntitySlug : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string; entitySlug: string } | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const slugInvalid = effectiveSlug.length > 0 && !isValidSlug(effectiveSlug);
  const canSubmit =
    !busy && name.trim().length > 0 && symbol.trim().length > 0 && entitySlug.length > 0 && isValidSlug(effectiveSlug);

  function reset() {
    setName("");
    setSymbol("");
    setSlug("");
    setSlugTouched(false);
    setError(null);
    setCreated(null);
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "createCoin",
          slug: effectiveSlug,
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          coinType: "Token",
          entitySlug,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setCreated({ slug: effectiveSlug, entitySlug });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-ink-800 bg-ink-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-50">Create token</h2>
        <button onClick={onClose} className="text-xs text-ink-500 hover:text-ink-200">
          Close
        </button>
      </div>

      {created ? (
        <div className="space-y-3 text-sm text-ink-200">
          <p>
            Created <span className="font-medium text-ink-50">{created.slug}</span>.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/tokens/${created.slug}`} className="text-electric-400 hover:text-electric-300">
              View token page
            </Link>
            <Link href={`/networks/${created.entitySlug}`} className="text-electric-400 hover:text-electric-300">
              View network
            </Link>
          </div>
          <button
            onClick={reset}
            className="rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:text-ink-50"
          >
            Create another
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-500">
            Mints a minimal token record and links it under the parent network. Fill in details later via the coin
            editor.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-ink-400">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aave Demo Token"
                className={`mt-1 ${INPUT_CLASS}`}
              />
            </label>
            <label className="block text-xs text-ink-400">
              Symbol
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="ADT"
                className={`mt-1 ${INPUT_CLASS}`}
              />
            </label>
            <label className="block text-xs text-ink-400">
              Slug
              <input
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="aave-demo-token"
                className={`mt-1 ${INPUT_CLASS}`}
              />
            </label>
            <label className="block text-xs text-ink-400">
              Parent network
              <select
                value={entitySlug}
                onChange={(e) => setEntitySlug(e.target.value)}
                className={`mt-1 ${INPUT_CLASS}`}
              >
                <option value="">Select a network</option>
                {networks.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {slugInvalid && (
            <p className="text-xs text-amber-400">
              Slug must be lowercase letters, digits, and single hyphens (2-64 chars).
            </p>
          )}
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="rounded-md bg-electric-600 px-3 py-2 text-sm font-medium text-white hover:bg-electric-500 disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create token"}
          </button>
        </div>
      )}
    </section>
  );
}
