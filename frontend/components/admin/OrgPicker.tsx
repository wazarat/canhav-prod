"use client";

import type { WidgetProps } from "@rjsf/utils";
import { useMemo, useState } from "react";

import type { OrgOption } from "@/components/admin/AdminPanel";

/**
 * rjsf widget: searchable dropdown over ALL taggable store profiles (networks +
 * coins). Bound to a `slug` string field (competitor / partnership link). Reads
 * the option list from the form's `formContext.orgOptions`. Empty = free-text
 * (no on-platform link).
 */
export function OrgPicker(props: WidgetProps) {
  const { value, onChange, formContext, disabled, readonly } = props;
  const orgOptions = useMemo<OrgOption[]>(
    () => (formContext as { orgOptions?: OrgOption[] })?.orgOptions ?? [],
    [formContext],
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const current = value ? orgOptions.find((o) => o.slug === value) : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgOptions.slice(0, 30);
    return orgOptions
      .filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q))
      .slice(0, 30);
  }, [orgOptions, query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          value={open ? query : (current ? `${current.name} · ${current.slug}` : (value ?? ""))}
          disabled={disabled || readonly}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search on-platform org (optional)…"
          className="w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-ink-50 outline-none focus:border-electric-500"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-ink-400 hover:text-rose-400"
          >
            clear
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-ink-700 bg-ink-950 shadow-lg">
          {results.map((o) => (
            <li key={`${o.category}-${o.slug}`}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.slug);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm text-ink-200 hover:bg-ink-800"
              >
                <span>
                  {o.name} <span className="text-ink-500">· {o.slug}</span>
                </span>
                <span className="text-xs text-ink-500">{o.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
