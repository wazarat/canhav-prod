import { CombinedVerdictCard } from "@/components/agent/CombinedVerdictCard";
import { AgentSkillCard } from "@/components/agent/AgentSkillCard";
import type { AgentSkill, NetworkProfile } from "@/lib/types";

export function NetworkAgentSkillsTab({
  profile,
  skill,
}: {
  profile: NetworkProfile;
  skill: AgentSkill;
}) {
  return (
    <div className="space-y-6 pt-6">
      {(profile.slug === "ethena" || profile.slug === "usd-ai") && (
        <CombinedVerdictCard
          entitySlug={profile.slug}
          asset={profile.slug === "ethena" ? "sUSDe" : "sUSDai"}
        />
      )}
      <AgentSkillCard skill={skill} />
    </div>
  );
}
