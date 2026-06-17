"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ComponentsSection,
  DifferentiatorSection,
  EventsSection,
  FaqSection,
} from "@/components/networks/NetworkSections";
import { OffchainFactsPanel } from "@/components/shared/OffchainFactsPanel";
import { TokenomicsCard } from "@/components/shared/TokenomicsCard";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type {
  FaqItem,
  NetworkComponent,
  OffchainFact,
  TimelineEntry,
  Tokenomics,
} from "@/lib/types";

export type ResearchHubTab = "overview" | "facts" | "faq" | "timeline" | "tokenomics";

const TABS: { id: ResearchHubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "facts", label: "Key facts" },
  { id: "faq", label: "FAQ" },
  { id: "timeline", label: "Timeline" },
  { id: "tokenomics", label: "Tokenomics" },
];

interface NetworkResearchHubProps {
  components: NetworkComponent[];
  differentiator: string;
  offchainFacts?: OffchainFact[];
  faq: FaqItem[];
  timeline: TimelineEntry[];
  tokenomics?: Tokenomics;
}

function availableTabs(props: NetworkResearchHubProps): typeof TABS {
  return TABS.filter((tab) => {
    switch (tab.id) {
      case "overview":
        return props.components.length > 0 || Boolean(props.differentiator);
      case "facts":
        return (props.offchainFacts?.length ?? 0) > 0;
      case "faq":
        return props.faq.length > 0;
      case "timeline":
        return props.timeline.length > 0;
      case "tokenomics":
        return Boolean(props.tokenomics);
      default:
        return false;
    }
  });
}

export function NetworkResearchHub(props: NetworkResearchHubProps) {
  const tabs = availableTabs(props);
  const [active, setActive] = useState<ResearchHubTab>(tabs[0]?.id ?? "overview");

  const selectTab = useCallback((tab: ResearchHubTab) => {
    setActive(tab);
  }, []);

  useEffect(() => {
    function onHubTab(e: Event) {
      const detail = (e as CustomEvent<ResearchHubTab>).detail;
      if (detail && tabs.some((t) => t.id === detail)) {
        setActive(detail);
      }
    }
    window.addEventListener("network-research-tab", onHubTab);
    return () => window.removeEventListener("network-research-tab", onHubTab);
  }, [tabs]);

  if (tabs.length === 0) return null;

  const current = tabs.some((t) => t.id === active) ? active : tabs[0].id;

  return (
    <section id="research-hub" className="scroll-mt-24 space-y-0">
      <Card className="overflow-hidden">
        <div className="border-b border-ink-800/60 px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            Research
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            Components, facts, FAQ, timeline, and tokenomics in one place
          </p>
        </div>

        <div
          className="flex gap-1 overflow-x-auto border-b border-ink-800/60 px-3 py-2"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={current === tab.id}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                current === tab.id
                  ? "bg-electric-500/10 text-electric-300"
                  : "text-ink-400 hover:bg-ink-800/40 hover:text-ink-100",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[min(70vh,560px)] overflow-y-auto p-5">
          {current === "overview" && (
            <div className="space-y-6">
              <ComponentsSection components={props.components} embedded />
              <DifferentiatorSection differentiator={props.differentiator} embedded />
            </div>
          )}
          {current === "facts" && props.offchainFacts && (
            <OffchainFactsPanel facts={props.offchainFacts} title="Off-chain facts" />
          )}
          {current === "faq" && <FaqSection faq={props.faq} embedded />}
          {current === "timeline" && <EventsSection events={props.timeline} embedded />}
          {current === "tokenomics" && props.tokenomics && (
            <TokenomicsCard tokenomics={props.tokenomics} embedded />
          )}
        </div>
      </Card>
    </section>
  );
}

/** Dispatch from section nav to switch research hub tabs. */
export function openResearchTab(tab: ResearchHubTab) {
  window.dispatchEvent(new CustomEvent("network-research-tab", { detail: tab }));
}
