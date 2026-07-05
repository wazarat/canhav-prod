"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AdminContentEditor } from "@/components/admin/AdminContentEditor";
import { AdminDiagnosticsView } from "@/components/admin/AdminDiagnosticsView";
import { NetworkPicker } from "@/components/admin/NetworkPicker";

export interface PickerNetwork {
  slug: string;
  name: string;
  sector: string | null;
}

export interface OrgOption {
  slug: string;
  name: string;
  category: "Network" | "Token" | "Stablecoin" | "RWA" | "Receipt";
}

type Tab = "diagnostics" | "editor";

export function AdminPanel({
  adminEmail,
  networks,
  orgOptions,
}: {
  adminEmail: string;
  networks: PickerNetwork[];
  orgOptions: OrgOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlTab: Tab = searchParams.get("tab") === "editor" ? "editor" : "diagnostics";
  const urlSlug = searchParams.get("slug");

  const [tab, setTab] = useState<Tab>(urlTab);
  const [selected, setSelected] = useState<PickerNetwork | null>(
    () => networks.find((n) => n.slug === urlSlug) ?? null,
  );
  // Editor dirty flag, so we can confirm before switching away and losing edits.
  const dirtyRef = useRef(false);

  // Keep the URL in sync so refresh / back / shared links restore the selection.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (selected) params.set("slug", selected.slug);
    const next = `${pathname}?${params.toString()}`;
    if (`${pathname}?${searchParams.toString()}` !== next) {
      router.replace(next, { scroll: false });
    }
  }, [tab, selected, pathname, router, searchParams]);

  const confirmIfDirty = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm("You have unsaved changes. Discard them?");
  }, []);

  const handleSelect = useCallback(
    (n: PickerNetwork) => {
      if (n.slug === selected?.slug) return;
      if (!confirmIfDirty()) return;
      dirtyRef.current = false;
      setSelected(n);
    },
    [selected, confirmIfDirty],
  );

  const handleTab = useCallback(
    (t: Tab) => {
      if (t === tab) return;
      // Only the editor holds unsaved state; leaving it needs a confirm.
      if (tab === "editor" && !confirmIfDirty()) return;
      dirtyRef.current = false;
      setTab(t);
    },
    [tab, confirmIfDirty],
  );

  const orgOptionList = useMemo(() => orgOptions, [orgOptions]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-50">CanHav Admin</h1>
        <span className="text-xs text-ink-300">{adminEmail}</span>
      </header>

      <div className="mb-4 flex gap-2 border-b border-ink-800">
        {(["diagnostics", "editor"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t
                ? "border-electric-500 text-ink-50"
                : "border-transparent text-ink-300 hover:text-ink-100"
            }`}
          >
            {t === "diagnostics" ? "Data diagnostics" : "Content editor"}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <NetworkPicker networks={networks} selected={selected} onSelect={handleSelect} />
      </div>

      {!selected ? (
        <p className="text-sm text-ink-300">Select a network to begin.</p>
      ) : tab === "diagnostics" ? (
        <AdminDiagnosticsView slug={selected.slug} name={selected.name} />
      ) : (
        <AdminContentEditor
          slug={selected.slug}
          name={selected.name}
          orgOptions={orgOptionList}
          onDirtyChange={(d) => {
            dirtyRef.current = d;
          }}
        />
      )}
    </main>
  );
}
