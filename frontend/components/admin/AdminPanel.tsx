"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AdminCoinEditor } from "@/components/admin/AdminCoinEditor";
import { AdminContentEditor } from "@/components/admin/AdminContentEditor";
import { AdminDiagnosticsView } from "@/components/admin/AdminDiagnosticsView";
import { CoinPicker } from "@/components/admin/CoinPicker";
import { NetworkPicker } from "@/components/admin/NetworkPicker";

export interface PickerNetwork {
  slug: string;
  name: string;
  sector: string | null;
}

export interface PickerCoin {
  slug: string;
  name: string;
  symbol: string;
  category: "Token" | "Stablecoin" | "RWA";
  coinType: string | null;
  entitySlug: string | null;
  sector: string | null;
}

export interface PickerReceipt {
  slug: string;
  name: string;
  symbol: string;
  receiptType: string;
  entitySlug: string;
  baseAsset: string | null;
  sector: string | null;
}

export interface OrgOption {
  slug: string;
  name: string;
  category: "Network" | "Token" | "Stablecoin" | "RWA" | "Receipt";
}

type Tab = "diagnostics" | "editor";
type EntityClass = "networks" | "coins" | "receipts";

/** The current selection, normalized across entity classes. */
interface Selected {
  slug: string;
  name: string;
  /** Store category (Network / Token / Stablecoin / RWA / Receipt). */
  category: string;
  kind: EntityClass;
}

const CLASS_LABEL: Record<EntityClass, string> = {
  networks: "Networks",
  coins: "Coins",
  receipts: "Receipt tokens",
};

export function AdminPanel({
  adminEmail,
  networks,
  coins,
  receipts,
  orgOptions,
}: {
  adminEmail: string;
  networks: PickerNetwork[];
  coins: PickerCoin[];
  receipts: PickerReceipt[];
  orgOptions: OrgOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlTab: Tab = searchParams.get("tab") === "editor" ? "editor" : "diagnostics";
  const urlClass = ((): EntityClass => {
    const c = searchParams.get("cls");
    return c === "coins" || c === "receipts" ? c : "networks";
  })();
  const urlSlug = searchParams.get("slug");

  const [tab, setTab] = useState<Tab>(urlTab);
  const [cls, setCls] = useState<EntityClass>(urlClass);
  const [selected, setSelected] = useState<Selected | null>(() => {
    if (!urlSlug) return null;
    if (urlClass === "coins") {
      const c = coins.find((x) => x.slug === urlSlug);
      return c ? { slug: c.slug, name: c.name, category: c.category, kind: "coins" } : null;
    }
    if (urlClass === "receipts") {
      const r = receipts.find((x) => x.slug === urlSlug);
      return r ? { slug: r.slug, name: r.name, category: "Receipt", kind: "receipts" } : null;
    }
    const n = networks.find((x) => x.slug === urlSlug);
    return n ? { slug: n.slug, name: n.name, category: "Network", kind: "networks" } : null;
  });

  const dirtyRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    params.set("cls", cls);
    if (selected) params.set("slug", selected.slug);
    const next = `${pathname}?${params.toString()}`;
    if (`${pathname}?${searchParams.toString()}` !== next) {
      router.replace(next, { scroll: false });
    }
  }, [tab, cls, selected, pathname, router, searchParams]);

  const confirmIfDirty = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm("You have unsaved changes. Discard them?");
  }, []);

  const handleClass = useCallback(
    (c: EntityClass) => {
      if (c === cls) return;
      if (!confirmIfDirty()) return;
      dirtyRef.current = false;
      setCls(c);
      setSelected(null);
    },
    [cls, confirmIfDirty],
  );

  const handleTab = useCallback(
    (t: Tab) => {
      if (t === tab) return;
      if (tab === "editor" && !confirmIfDirty()) return;
      dirtyRef.current = false;
      setTab(t);
    },
    [tab, confirmIfDirty],
  );

  const selectNetwork = useCallback(
    (n: PickerNetwork) => {
      if (n.slug === selected?.slug) return;
      if (!confirmIfDirty()) return;
      dirtyRef.current = false;
      setSelected({ slug: n.slug, name: n.name, category: "Network", kind: "networks" });
    },
    [selected, confirmIfDirty],
  );

  const selectCoin = useCallback(
    (c: PickerCoin) => {
      if (c.slug === selected?.slug) return;
      if (!confirmIfDirty()) return;
      dirtyRef.current = false;
      setSelected({ slug: c.slug, name: c.name, category: c.category, kind: "coins" });
    },
    [selected, confirmIfDirty],
  );

  const selectReceipt = useCallback(
    (r: PickerReceipt) => {
      if (r.slug === selected?.slug) return;
      if (!confirmIfDirty()) return;
      dirtyRef.current = false;
      setSelected({ slug: r.slug, name: r.name, category: "Receipt", kind: "receipts" });
    },
    [selected, confirmIfDirty],
  );

  const diagnosticsCategory = cls; // "networks" | "coins" | "receipts"

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-50">CanHav Admin</h1>
        <span className="text-xs text-ink-300">{adminEmail}</span>
      </header>

      {/* Entity-class pill switcher */}
      <div className="mb-4 inline-flex rounded-full border border-ink-800 bg-ink-900/60 p-1">
        {(["networks", "coins", "receipts"] as EntityClass[]).map((c) => (
          <button
            key={c}
            onClick={() => handleClass(c)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              cls === c
                ? "bg-electric-600 text-white"
                : "text-ink-300 hover:text-ink-100"
            }`}
          >
            {CLASS_LABEL[c]}
          </button>
        ))}
      </div>

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
        {cls === "networks" ? (
          <NetworkPicker networks={networks} selected={pickerNetwork(selected, networks)} onSelect={selectNetwork} />
        ) : cls === "coins" ? (
          <CoinPicker kind="coins" coins={coins} selectedSlug={selected?.slug ?? null} onSelectCoin={selectCoin} />
        ) : (
          <CoinPicker kind="receipts" receipts={receipts} selectedSlug={selected?.slug ?? null} onSelectReceipt={selectReceipt} />
        )}
      </div>

      {!selected ? (
        <p className="text-sm text-ink-300">Select a {cls === "networks" ? "network" : cls === "coins" ? "coin" : "receipt token"} to begin.</p>
      ) : tab === "diagnostics" ? (
        <AdminDiagnosticsView slug={selected.slug} name={selected.name} category={diagnosticsCategory} />
      ) : selected.kind === "networks" ? (
        <AdminContentEditor
          slug={selected.slug}
          name={selected.name}
          orgOptions={orgOptions}
          onDirtyChange={(d) => {
            dirtyRef.current = d;
          }}
        />
      ) : (
        <AdminCoinEditor
          slug={selected.slug}
          name={selected.name}
          category={selected.category}
          kind={selected.kind === "receipts" ? "receipt" : "coin"}
          networks={networks}
          onDirtyChange={(d) => {
            dirtyRef.current = d;
          }}
        />
      )}
    </main>
  );
}

/** Adapt the normalized selection back to a PickerNetwork for NetworkPicker. */
function pickerNetwork(selected: Selected | null, networks: PickerNetwork[]): PickerNetwork | null {
  if (!selected || selected.kind !== "networks") return null;
  return networks.find((n) => n.slug === selected.slug) ?? null;
}
