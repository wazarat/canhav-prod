import {
  InvestmentRoundsSection,
  OrgStructureSection,
  TradFiComparisonSection,
} from "@/components/networks/NetworkSections";
import { NetworkResearchHub } from "@/components/networks/NetworkResearchHub";
import { SourcesFooter } from "@/components/shared/SourcesFooter";
import type { NetworkProfile } from "@/lib/types";

export function NetworkResearchTab({ profile }: { profile: NetworkProfile }) {
  return (
    <div className="space-y-8 pt-6">
      <NetworkResearchHub
        components={profile.components}
        differentiator={profile.differentiator}
        offchainFacts={profile.offchainFacts}
        faq={profile.faq}
        timeline={profile.timeline ?? profile.events}
        tokenomics={profile.tokenomics}
      />
      <OrgStructureSection org={profile.orgStructure} />
      <InvestmentRoundsSection rounds={profile.investmentRounds} />
      <TradFiComparisonSection rows={profile.tradFiComparison} networkName={profile.name} />
      {profile.sources && <SourcesFooter sources={profile.sources} />}
    </div>
  );
}
