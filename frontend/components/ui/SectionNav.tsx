"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface SectionNavItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  items: SectionNavItem[];
  className?: string;
}

export function SectionNav({ items, className }: SectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;

    const observers: IntersectionObserver[] = [];

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveId(id);
          });
        },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  if (items.length === 0) return null;

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }

  const navLink = (item: SectionNavItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => scrollTo(item.id)}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        activeId === item.id
          ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
          : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
      )}
    >
      {item.label}
    </button>
  );

  return (
    <>
      {/* Mobile: horizontal scroll pills */}
      <div className={cn("flex gap-2 overflow-x-auto pb-1 md:hidden", className)}>
        {items.map(navLink)}
      </div>

      {/* Desktop: sticky vertical nav */}
      <nav
        className={cn(
          "hidden space-y-1 md:block md:sticky md:top-24",
          className,
        )}
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-400">
          On this page
        </p>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollTo(item.id)}
            className={cn(
              "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              activeId === item.id
                ? "bg-electric-500/10 font-medium text-electric-300"
                : "text-ink-300 hover:bg-ink-800/40 hover:text-ink-100",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
