import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ENTITY_STATUS_OVERRIDES } from "@/components/networks/research/entityStatus";
import type { NetworkProfile } from "@/lib/types";

/**
 * One-line positioning statement pinned at the top of the Research tab
 * (CAN-63 callout #2). For the four non-steady-state entities the status chip
 * takes precedence: a dormant protocol is never rendered as a live thesis.
 */
export function ThesisBadge({ profile }: { profile: NetworkProfile }) {
  const override = ENTITY_STATUS_OVERRIDES[profile.slug];
  if (override) {
    return (
      <aside className="glass rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={override.tone}>{override.label}</Badge>
          <p className="text-sm leading-relaxed text-ink-200">{override.detail}</p>
        </div>
        <a
          href={override.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
        >
          {override.sourceLabel}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </aside>
    );
  }
  if (!profile.tagline) return null;
  return (
    <aside className="glass flex flex-wrap items-center gap-2 rounded-xl border border-ink-700/60 p-4">
      <Badge tone="electric">Thesis</Badge>
      <p className="text-sm leading-relaxed text-ink-200">{profile.tagline}</p>
    </aside>
  );
}
