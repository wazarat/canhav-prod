"use client";

import { useState } from "react";

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
  const [tab, setTab] = useState<Tab>("diagnostics");
  const [selected, setSelected] = useState<PickerNetwork | null>(null);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-50">CanHav Admin</h1>
        <span className="text-xs text-ink-400">{adminEmail}</span>
      </header>

      <div className="mb-4 flex gap-2 border-b border-ink-800">
        {(["diagnostics", "editor"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t
                ? "border-electric-500 text-ink-50"
                : "border-transparent text-ink-400 hover:text-ink-200"
            }`}
          >
            {t === "diagnostics" ? "Data diagnostics" : "Content editor"}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <NetworkPicker networks={networks} selected={selected} onSelect={setSelected} />
      </div>

      {!selected ? (
        <p className="text-sm text-ink-400">Select a network to begin.</p>
      ) : tab === "diagnostics" ? (
        <AdminDiagnosticsView slug={selected.slug} name={selected.name} />
      ) : (
        <AdminContentEditor slug={selected.slug} name={selected.name} orgOptions={orgOptions} />
      )}
    </main>
  );
}
