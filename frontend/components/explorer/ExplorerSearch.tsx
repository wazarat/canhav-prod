"use client";

import { useId, useRef, useState } from "react";

import { matchesSearch } from "@/lib/explorer/model";
import type { ExplorerNode } from "@/lib/explorer/types";
import { cn } from "@/lib/utils";

/**
 * Search within the node set (CAN-83). Doubles as the keyboard path into
 * graph-view selection: picking a result selects the node and syncs the
 * detail panel, no pointer required. Lightweight combobox semantics.
 */
export function ExplorerSearch({
  nodes,
  query,
  onQueryChange,
  onPick,
  placeholder,
}: {
  nodes: ExplorerNode[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (node: ExplorerNode, trigger: HTMLElement | null) => void;
  placeholder?: string;
}) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = query.trim()
    ? nodes.filter((n) => matchesSearch(n, query)).slice(0, 8)
    : [];
  const expanded = open && results.length > 0;

  const pick = (node: ExplorerNode) => {
    onPick(node, inputRef.current);
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-xs">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={expanded ? `${listboxId}-${activeIndex}` : undefined}
        value={query}
        placeholder={placeholder ?? "Search nodes"}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!expanded) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const node = results[activeIndex];
            if (node) pick(node);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-full border border-ink-800/60 bg-ink-950/60 px-3.5 py-1.5 text-xs text-ink-100 placeholder:text-ink-300 focus:border-electric-500/60 focus:outline-none"
      />
      {expanded && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-ink-700/60 bg-ink-900 py-1 shadow-xl"
        >
          {results.map((node, i) => (
            <li
              key={node.id}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(node);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
                  i === activeIndex ? "bg-electric-500/15 text-electric-200" : "text-ink-100",
                )}
              >
                <span className="truncate">{node.label}</span>
                {node.summary && <span className="ml-auto truncate text-[10px] text-ink-300">{node.summary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
