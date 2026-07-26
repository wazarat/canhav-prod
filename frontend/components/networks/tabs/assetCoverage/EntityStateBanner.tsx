import { ArrowUpRight } from "lucide-react";

import { ENTITY_STATUS_OVERRIDES } from "@/components/networks/research/entityStatus";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

/**
 * Entity-level state banner for the Asset coverage tab (CAN-72): the
 * non-steady-state Credit entities must be announced on the ENTITY, not just
 * on individual rows. Reuses the sourced M5 status overrides; radiant gets the
 * dataset's extra caveat that its parameters are stored values, not live ones.
 */
const PARAMS_CAVEATS: Record<string, string> = {
  radiant:
    "Borrowing is disabled protocol-wide. No live LTV or threshold values are published; the parameters below are stored on-chain values, labelled as stored, not live.",
  stella:
    "No per-asset collateral factor, borrow factor, cap or liquidation discount was ever published, so listed assets render without a parameter grid.",
};

export function EntityStateBanner({ slug }: { slug: string }) {
  const status = ENTITY_STATUS_OVERRIDES[slug];
  if (!status) return null;
  const caveat = PARAMS_CAVEATS[slug];
  return (
    <Card className="space-y-2 border-l-2 border-l-amber-500/60">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        <a
          href={status.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-xs text-ink-400 transition hover:text-electric-300"
        >
          {status.sourceLabel}
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </a>
      </div>
      <p className="text-sm leading-relaxed text-ink-300">{status.detail}</p>
      {caveat && <p className="text-xs leading-relaxed text-ink-400">{caveat}</p>}
    </Card>
  );
}
