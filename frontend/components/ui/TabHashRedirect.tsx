"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface TabHashRedirectProps {
  /** Map of anchor id (without "#") → tab id that renders it. */
  hashToTab: Record<string, string>;
  activeTab: string;
  /** Route the tabs live on, e.g. "/agents" or "/agents/2". */
  basePath: string;
  /** The tab that maps to the bare basePath (no ?tab= param). */
  defaultTab: string;
}

/**
 * Rescues legacy `#panel-*` deep links now that sections live behind `?tab=`
 * search params: the server never sees the hash, so a bookmark like
 * `/agents/2#panel-knowledge` would silently land on the default tab. On mount
 * this checks the hash against the owning tab and either redirects to it
 * (keeping the hash) or scrolls to the anchor on the current tab.
 */
export function TabHashRedirect({ hashToTab, activeTab, basePath, defaultTab }: TabHashRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const targetTab = hashToTab[hash];
    if (!targetTab) return;

    if (targetTab !== activeTab) {
      const query = targetTab === defaultTab ? "" : `?tab=${targetTab}`;
      router.replace(`${basePath}${query}#${hash}`);
      return;
    }

    // Right tab already — make sure the anchor actually scrolls (Next keeps
    // scroll position on replace/scroll:false navigations).
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hashToTab, activeTab, basePath, defaultTab, router]);

  return null;
}
