"use client";

import { useMemo, useState } from "react";

import type { PickerNetwork } from "@/components/admin/AdminPanel";

/** Searchable network picker (by name / slug / sector). Drives both admin tabs. */
export function NetworkPicker({
  networks,
  selected,
  onSelect,
}: {
  networks: PickerNetwork[];
  selected: PickerNetwork | null;
  onSelect: (n: PickerNetwork) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return networks.slice(0, 50);
    return networks
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.slug.toLowerCase().includes(q) ||
          (n.sector ?? "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [networks, query]);

  return (
    <div className="relative">
      <input
        value={open ? query : (selected?.name ?? query)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search networks by name, slug, or sector…"
        className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none focus:border-electric-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-ink-700 bg-ink-950 shadow-lg">
          {results.map((n) => (
            <li key={n.slug}>
              <button
                onClick={() => {
                  onSelect(n);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800"
              >
                <span>
                  {n.name} <span className="text-ink-500">· {n.slug}</span>
                </span>
                {n.sector && <span className="text-xs text-ink-500">{n.sector}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
