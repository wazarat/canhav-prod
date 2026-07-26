import type { ReactNode } from "react";

import { BullBearCallout } from "@/components/networks/research/BullBearCallout";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import { FaqSection } from "@/components/networks/research/FaqSection";
import { FundingRail } from "@/components/networks/research/FundingRail";
import { OrgSection } from "@/components/networks/research/OrgSection";
import { ResearchPublicationsSection } from "@/components/networks/research/ResearchPublicationsSection";
import { ResearchToc, type ResearchTocItem } from "@/components/networks/research/ResearchToc";
import { ThesisSection } from "@/components/networks/research/ThesisSection";
import { TimelineSection } from "@/components/networks/research/TimelineSection";
import { TradFiComparisonCards } from "@/components/networks/research/TradFiComparisonCards";
import { RiskScoreChip } from "@/components/networks/research/callouts/RiskScoreChip";
import { ThesisBadge } from "@/components/networks/research/callouts/ThesisBadge";
import { OffchainFactsPanel } from "@/components/shared/OffchainFactsPanel";
import { SourcesFooter } from "@/components/shared/SourcesFooter";
import { TokenomicsCard } from "@/components/shared/TokenomicsCard";
import type { NetworkProfile } from "@/lib/types";

interface ResearchSection extends ResearchTocItem {
  node: ReactNode;
}

/**
 * Research tab as a RENDERED SECTION REGISTRY (CAN-66/CAN-65): the page owns
 * the scroll (the old NetworkResearchHub nested scroll region is gone), every
 * populated section is a named, anchored, collapsible block, and the sticky
 * scroll-spy TOC is built from the same hasData-filtered array — so thin
 * entities show a short TOC and no anchor is ever dead.
 */
export function NetworkResearchTab({ profile }: { profile: NetworkProfile }) {
  const timeline = profile.timeline?.length ? profile.timeline : profile.events;
  const sections: ResearchSection[] = [];
  const add = (id: string, label: string, node: ReactNode, count?: number) =>
    sections.push({ id, label, count, node });

  if (profile.longDescription || profile.differentiator || profile.components.length) {
    add("thesis", "Thesis", <ThesisSection key="thesis" profile={profile} />);
  }
  if (profile.offchainFacts?.length) {
    add(
      "key-facts",
      "Key facts",
      <CollapsibleSection
        key="key-facts"
        id="key-facts"
        title="Key facts"
        count={profile.offchainFacts.length}
      >
        <OffchainFactsPanel facts={profile.offchainFacts} title="Curated facts" />
      </CollapsibleSection>,
      profile.offchainFacts.length,
    );
  }
  if (profile.tradFiComparison.length) {
    add(
      "tradfi",
      "TradFi analogy",
      <TradFiComparisonCards key="tradfi" profile={profile} />,
      profile.tradFiComparison.length,
    );
  }
  if (profile.orgStructure.length || profile.orgIntro) {
    add(
      "organisation",
      "Organisation",
      <OrgSection key="organisation" profile={profile} />,
      profile.orgStructure.length,
    );
  }
  if (profile.investmentRounds.length || profile.fundingNote) {
    add(
      "funding",
      "Funding history",
      <FundingRail key="funding" profile={profile} />,
      profile.investmentRounds.length,
    );
  }
  if (timeline.length) {
    add(
      "timeline",
      "Timeline",
      <TimelineSection key="timeline" events={timeline} />,
      timeline.length,
    );
  }
  if (profile.faq.length) {
    add("faq", "FAQ", <FaqSection key="faq" faq={profile.faq} />, profile.faq.length);
  }
  if (profile.bullBearCase?.bull.length || profile.bullBearCase?.bear.length) {
    add(
      "bull-bear",
      "Bull and bear case",
      <BullBearCallout key="bull-bear" bullBearCase={profile.bullBearCase} />,
    );
  }
  if (profile.researchPublications?.length) {
    add(
      "research",
      "Research and coverage",
      <ResearchPublicationsSection key="research" publications={profile.researchPublications} />,
      profile.researchPublications.length,
    );
  }
  if (profile.tokenomics) {
    add(
      "tokenomics",
      "Tokenomics",
      <CollapsibleSection key="tokenomics" id="tokenomics" title="Tokenomics">
        <TokenomicsCard tokenomics={profile.tokenomics} embedded />
      </CollapsibleSection>,
    );
  }
  if (profile.sources?.length) {
    add(
      "sources",
      "Sources",
      <CollapsibleSection
        key="sources"
        id="sources"
        title="Sources"
        count={profile.sources.length}
      >
        <SourcesFooter sources={profile.sources} />
      </CollapsibleSection>,
      profile.sources.length,
    );
  }

  if (!sections.length) return null;

  return (
    <div className="pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start lg:gap-8">
      <div className="space-y-4 lg:order-2">
        <ResearchToc items={sections.map(({ id, label, count }) => ({ id, label, count }))} />
      </div>
      <div className="min-w-0 space-y-8 pt-4 lg:order-1 lg:pt-0">
        <div className="space-y-3">
          <ThesisBadge profile={profile} />
          <RiskScoreChip profile={profile} />
        </div>
        {sections.map((s) => s.node)}
      </div>
    </div>
  );
}
