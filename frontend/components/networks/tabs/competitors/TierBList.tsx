import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { TierBRow } from "@/lib/networks/creditCompetitorModel";

/**
 * Tier B (CAN-84): off-platform competitors — CeFi lenders, tokenised
 * treasuries, market benchmarks, non-EVM protocols. Named and described for
 * completeness but DELIBERATELY not clickable: no anchor elements exist in
 * this component, and the muted styling plus the "Not covered" badge make the
 * dead-end explicit so a user never clicks a dead name.
 */

const GROUP_ORDER: { match: (t: TierBRow) => boolean; title: string }[] = [
  { match: (r) => r.type.toLowerCase().includes("cefi"), title: "Centralised lenders" },
  { match: (r) => r.type.toLowerCase().includes("tokenised"), title: "Tokenised treasuries" },
  { match: (r) => r.type.toLowerCase().includes("benchmark"), title: "Market benchmarks" },
  { match: () => true, title: "Non-EVM protocols" },
];

export function TierBList({ rows, tagLabel }: { rows: TierBRow[]; tagLabel: string | null }) {
  if (rows.length === 0) return null;
  const grouped: { title: string; rows: TierBRow[] }[] = [];
  const used = new Set<TierBRow>();
  for (const g of GROUP_ORDER) {
    const members = rows.filter((r) => !used.has(r) && g.match(r));
    members.forEach((m) => used.add(m));
    if (members.length) grouped.push({ title: g.title, rows: members });
  }

  return (
    <Card className="space-y-3 border-dashed border-ink-700/70 bg-ink-950/40">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-ink-200">
            Off-platform competitors{tagLabel ? ` (${tagLabel})` : ""}
          </h3>
          <Badge className="text-[10px] uppercase">Tier B · not covered on CanHav</Badge>
        </div>
        <p className="text-xs leading-relaxed text-ink-400">
          Context-setting competitors outside the EVM DeFi scope: named for completeness,
          not tracked, not clickable.
        </p>
      </div>
      {grouped.map((g) => (
        <div key={g.title} className="space-y-1">
          <h4 className="font-mono text-[10px] uppercase tracking-wide text-ink-400">{g.title}</h4>
          <ul className="divide-y divide-ink-800/50">
            {g.rows.map((row) => (
              <li key={row.name} className="cursor-default select-text py-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm text-ink-200">{row.name}</span>
                  <span className="font-mono text-[10px] uppercase text-ink-400">{row.type}</span>
                </div>
                <p className="text-xs leading-relaxed text-ink-300">{row.note}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}
