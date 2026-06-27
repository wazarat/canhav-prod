import { RisksSection } from "@/components/networks/NetworkSections";
import { TypedRiskList } from "@/components/shared/TypedRiskList";
import type { NetworkProfile } from "@/lib/types";

export function NetworkRisksTab({ profile }: { profile: NetworkProfile }) {
  return (
    <div className="space-y-6 pt-6">
      {profile.typedRisks ? (
        <TypedRiskList risks={profile.typedRisks} />
      ) : (
        <RisksSection risks={profile.risks} />
      )}
    </div>
  );
}
