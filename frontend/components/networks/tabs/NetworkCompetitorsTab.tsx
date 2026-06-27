import { CompetitorsSection } from "@/components/networks/NetworkSections";
import type { NetworkProfile } from "@/lib/types";

export function NetworkCompetitorsTab({ profile }: { profile: NetworkProfile }) {
  return (
    <div className="pt-6">
      <CompetitorsSection competitors={profile.competitors} networkName={profile.name} />
    </div>
  );
}
