"use client";

import Link from "next/link";

import type { NetworkTabDefinition, NetworkTabId } from "@/lib/networks/tabs";
import { cn } from "@/lib/utils";

interface NetworkTabBarProps {
  slug: string;
  activeTab: NetworkTabId;
  tabs: NetworkTabDefinition[];
  className?: string;
}

export function NetworkTabBar({ slug, activeTab, tabs, className }: NetworkTabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className={cn("sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6", className)}>
      <div
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-ink-800/60 bg-ink-950/90 px-2 py-2 backdrop-blur"
        role="tablist"
        aria-label="Network sections"
      >
        {tabs.map((tab) => {
          const href =
            tab.id === "overview"
              ? `/networks/${slug}`
              : `/networks/${slug}?tab=${tab.id}`;
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
                  : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
