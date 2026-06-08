import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { SecurityInfo, SecurityStatus } from "@/lib/types";

const config: Record<
  SecurityStatus,
  { tone: BadgeTone; label: string; Icon: typeof ShieldCheck }
> = {
  verified: { tone: "positive", label: "Verified", Icon: ShieldCheck },
  audited: { tone: "signal", label: "Audited", Icon: ShieldCheck },
  unverified: { tone: "warning", label: "Unverified", Icon: ShieldAlert },
};

/**
 * OZ-derived security badge. Rendered on every protocol page; the human-facing
 * twin of the on-chain `SecurityRegistry` that gates ERC-8004 agents. Links to
 * the public audit when one is on file.
 */
export function SecurityBadge({ info }: { info: SecurityInfo }) {
  const fallback = config.unverified;
  const { tone, label, Icon } = config[info.status] ?? { ...fallback, Icon: ShieldQuestion };

  const badge = (
    <Badge tone={tone} title={info.source}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );

  if (info.auditUrl) {
    return (
      <a href={info.auditUrl} target="_blank" rel="noreferrer" aria-label={`${label} — view audit`}>
        {badge}
      </a>
    );
  }
  return badge;
}
