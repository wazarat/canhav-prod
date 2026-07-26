import { ComponentsSection, DifferentiatorSection } from "@/components/networks/NetworkSections";
import { InlineLinkText } from "@/components/shared/InlineLinkText";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import { KeyMetricCallout } from "@/components/networks/research/callouts/KeyMetricCallout";
import { MetricCard } from "@/components/ui/MetricCard";
import { splitParagraphs } from "@/lib/text";
import type { NetworkProfile } from "@/lib/types";

/**
 * #thesis — the M5 dataset's "Thesis and how it works" prose (longDescription,
 * source-linked, glossary-tooltipped) plus the existing differentiator and
 * component cards. A TVL KeyMetricCallout anchors the narrative to the number
 * behind it when currentScale carries one.
 */
export function ThesisSection({ profile }: { profile: NetworkProfile }) {
  const paragraphs = profile.longDescription ? splitParagraphs(profile.longDescription) : [];
  const hasEditorial = paragraphs.length > 0 || Boolean(profile.differentiator) || profile.components.length > 0;
  if (!hasEditorial) return null;
  const tvl = profile.currentScale?.tvlUsd ?? null;

  return (
    <CollapsibleSection id="thesis" title="Thesis and how it works">
      <div className="space-y-5">
        {paragraphs.length > 0 && (
          <div className="max-w-prose space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-ink-300">
                <InlineLinkText text={p} glossary />
              </p>
            ))}
          </div>
        )}
        {tvl != null && (
          <KeyMetricCallout claim={`Scale check: ${profile.name}'s current total value locked, as tracked on the Overview dashboard.`}>
            <MetricCard label="Total value locked" value={tvl} kind="usd" />
          </KeyMetricCallout>
        )}
        <DifferentiatorSection differentiator={profile.differentiator} embedded />
        <ComponentsSection components={profile.components} embedded />
      </div>
    </CollapsibleSection>
  );
}
