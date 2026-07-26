"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface ResearchTocItem {
  id: string;
  label: string;
  count?: number;
}

/**
 * Scroll-spy table of contents for the Research tab (CAN-66). Built from the
 * RENDERED section registry, so thin entities get a short TOC and no anchor is
 * ever dead. Desktop: sticky right rail (top-28 clears the sticky
 * NetworkTabBar at top-16). Mobile: horizontal jump pills at the top.
 *
 * Clicking (or arriving with a #hash) also re-opens the target section's
 * native <details> in case the user collapsed it.
 */
export function ResearchToc({ items }: { items: ResearchTocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const idsKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === "undefined") return;
    const observers: IntersectionObserver[] = [];
    for (const { id } of items) {
      const el = document.getElementById(id);
      if (!el) continue;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActiveId(id);
          }
        },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    }
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !items.some((i) => i.id === hash)) return;
    // Re-anchor after late hydration/layout shifts: the browser's native hash
    // jump fires before content above the target has settled, so a single
    // early scroll can drift thousands of px. Repeat until stable.
    openAndScroll(hash, false);
    const timers = [400, 1200].map((ms) =>
      window.setTimeout(() => openAndScroll(hash, false), ms),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAndScroll(id: string, smooth = true) {
    const el = document.getElementById(id);
    if (!el) return;
    const details = el.querySelector("details");
    if (details && !details.open) details.open = true;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    setActiveId(id);
  }

  function onSelect(id: string) {
    window.history.replaceState(null, "", `#${id}`);
    openAndScroll(id);
  }

  if (!items.length) return null;

  return (
    <>
      {/* Mobile: jump pills */}
      <nav aria-label="On this page" className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activeId === item.id
                ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
                : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Desktop: sticky right rail */}
      <nav
        aria-label="On this page"
        className="hidden space-y-1 lg:sticky lg:top-28 lg:block"
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-400">
          On this page
        </p>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
              activeId === item.id
                ? "bg-electric-500/10 font-medium text-electric-300"
                : "text-ink-300 hover:bg-ink-800/40 hover:text-ink-100",
            )}
          >
            <span className="truncate">{item.label}</span>
            {item.count != null && item.count > 0 && (
              <span className="shrink-0 font-mono text-[10px] text-ink-400">{item.count}</span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}
