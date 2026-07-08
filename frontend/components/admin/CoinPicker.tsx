"use client";

import { useMemo, useState } from "react";

import type { PickerCoin, PickerReceipt } from "@/components/admin/AdminPanel";

type Props =
  | {
      kind: "coins";
      coins: PickerCoin[];
      selectedSlug: string | null;
      onSelectCoin: (c: PickerCoin) => void;
    }
  | {
      kind: "receipts";
      receipts: PickerReceipt[];
      selectedSlug: string | null;
      onSelectReceipt: (r: PickerReceipt) => void;
    };

interface Row {
  slug: string;
  name: string;
  symbol: string;
  entitySlug: string | null;
  /** Right-side chips (type, base asset, category). */
  chips: string[];
}

function toRows(props: Props): Row[] {
  if (props.kind === "coins") {
    return props.coins.map((c) => ({
      slug: c.slug,
      name: c.name,
      symbol: c.symbol,
      entitySlug: c.entitySlug,
      chips: [c.coinType ?? c.category, c.category].filter(Boolean) as string[],
    }));
  }
  return props.receipts.map((r) => ({
    slug: r.slug,
    name: r.name,
    symbol: r.symbol,
    entitySlug: r.entitySlug,
    chips: [r.receiptType, r.baseAsset ? `base: ${r.baseAsset}` : null].filter(Boolean) as string[],
  }));
}

/** Searchable coin / receipt picker (by name / symbol / slug / parent entity). */
export function CoinPicker(props: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => toRows(props), [props]);
  const selectedName = useMemo(
    () => rows.find((r) => r.slug === props.selectedSlug)?.name ?? "",
    [rows, props.selectedSlug],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.slice(0, 50);
    return rows
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          (r.entitySlug ?? "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [rows, query]);

  const noun = props.kind === "coins" ? "coins" : "receipt tokens";

  function choose(slug: string) {
    if (props.kind === "coins") {
      const c = props.coins.find((x) => x.slug === slug);
      if (c) props.onSelectCoin(c);
    } else {
      const r = props.receipts.find((x) => x.slug === slug);
      if (r) props.onSelectReceipt(r);
    }
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <input
        value={open ? query : selectedName || query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${noun} by name, symbol, slug, or parent…`}
        className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none focus:border-electric-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-ink-700 bg-ink-950 shadow-lg">
          {results.map((r) => (
            <li key={r.slug}>
              <button
                onClick={() => choose(r.slug)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800"
              >
                <span className="min-w-0 truncate">
                  {r.symbol ? <span className="font-medium">{r.symbol}</span> : null}{" "}
                  <span className="text-ink-400">{r.name}</span>{" "}
                  <span className="text-ink-600">· {r.slug}</span>
                  {r.entitySlug ? <span className="text-ink-600"> → {r.entitySlug}</span> : null}
                </span>
                <span className="flex shrink-0 gap-1">
                  {r.chips.map((chip) => (
                    <span key={chip} className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-400">
                      {chip}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
