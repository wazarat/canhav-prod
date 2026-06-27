import { PartnershipsSection } from "@/components/networks/NetworkSections";
import type { NetworkProfile } from "@/lib/types";

export function NetworkPartnershipsTab({ profile }: { profile: NetworkProfile }) {
  return (
    <div className="pt-6">
      <PartnershipsSection partnerships={profile.partnerships} />
    </div>
  );
}
