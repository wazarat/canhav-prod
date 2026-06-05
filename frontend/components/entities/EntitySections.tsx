import { ArrowUpRight, CircleHelp, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type {
  EntityComponent,
  EntityEvent,
  EntityRisk,
  FaqItem,
  InvestmentRound,
  OrgUnit,
  Partnership,
  TradFiRow,
} from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

/* Section heading shared across the editorial blocks. */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">{title}</h2>
      {subtitle && <p className="text-sm text-ink-300">{subtitle}</p>}
    </div>
  );
}

export function ComponentsSection({ components }: { components: EntityComponent[] }) {
  if (!components.length) return null;
  const title =
    components.length === 1
      ? "Main component"
      : `Main components (${components.length})`;
  return (
    <section className="space-y-4">
      <SectionHeading title={title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {components.map((c, i) => (
          <Card key={c.name} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-electric-500/30 bg-electric-500/10 font-mono text-xs text-electric-400">
                {i + 1}
              </span>
              <CardTitle className="text-base">{c.name}</CardTitle>
            </div>
            <p className="text-sm text-ink-300">{c.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function DifferentiatorSection({ differentiator }: { differentiator: string }) {
  if (!differentiator) return null;
  return (
    <section className="space-y-4">
      <SectionHeading title="Differentiator" />
      <Card className="border-l-2 border-l-electric-500/60">
        <p className="text-sm leading-relaxed text-ink-200">{differentiator}</p>
      </Card>
    </section>
  );
}

export function FaqSection({ faq }: { faq: FaqItem[] }) {
  if (!faq.length) return null;
  // Pinned questions first, preserving order otherwise.
  const ordered = [...faq].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  return (
    <section className="space-y-4">
      <SectionHeading title="Commonly asked questions" />
      <div className="space-y-3">
        {ordered.map((f) => (
          <Card key={f.question} className="space-y-2">
            <div className="flex items-center gap-2">
              <CircleHelp className="h-4 w-4 shrink-0 text-signal-400" />
              <CardTitle className="text-base">{f.question}</CardTitle>
              {f.pinned && <Badge tone="signal">Key</Badge>}
            </div>
            <p className="pl-6 text-sm leading-relaxed text-ink-300">{f.answer}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function OrgStructureSection({ org }: { org: OrgUnit[] }) {
  if (!org.length) return null;
  return (
    <section className="space-y-4">
      <SectionHeading title="Organizational structure" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {org.map((o) => (
          <Card key={o.name} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{o.name}</CardTitle>
              <Badge tone="neon">{o.role}</Badge>
            </div>
            <p className="text-sm leading-relaxed text-ink-300">{o.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function RisksSection({ risks }: { risks: EntityRisk[] }) {
  if (!risks.length) return null;
  return (
    <section className="space-y-4">
      <SectionHeading title="Risks identified" />
      <Card className="space-y-3">
        <ul className="space-y-3">
          {risks.map((r, i) => (
            <li key={i} className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div className="space-y-1">
                <Badge tone="warning" className="w-fit">
                  {r.category}
                </Badge>
                <p className="text-sm leading-relaxed text-ink-300">{r.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

export function EventsSection({ events }: { events: EntityEvent[] }) {
  if (!events.length) return null;
  return (
    <section className="space-y-4">
      <SectionHeading title="Timeline & news" subtitle="Key milestones in the entity's history." />
      <div className="space-y-3">
        {events.map((e) => (
          <Card key={`${e.date}-${e.title}`} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{e.title}</CardTitle>
              <Badge tone="neutral">{e.date}</Badge>
            </div>
            <p className="text-sm leading-relaxed text-ink-300">{e.description}</p>
            {e.link && (
              <a
                href={e.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
              >
                source
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

export function InvestmentRoundsSection({ rounds }: { rounds: InvestmentRound[] }) {
  if (!rounds.length) return null;
  return (
    <section className="space-y-4">
      <SectionHeading title="Investment rounds" />
      <TableShell>
        <Table className="min-w-[640px]">
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Round</TH>
              <TH className="text-right">Amount</TH>
              <TH>Investors</TH>
              <TH className="text-right">Link</TH>
            </tr>
          </THead>
          <TBody>
            {rounds.map((r, i) => (
              <TR key={i}>
                <TD className="whitespace-nowrap text-ink-200">{r.date}</TD>
                <TD className="font-medium text-ink-50">{r.round}</TD>
                <TD className="text-right font-mono text-ink-100">
                  {r.amountLabel ?? (r.amountUsd != null ? formatUsdCompact(r.amountUsd) : "—")}
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {r.investors.length ? (
                      r.investors.map((inv) => (
                        <Badge key={inv} tone="neutral">
                          {inv}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </div>
                </TD>
                <TD className="text-right">
                  {r.link ? (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
                    >
                      source
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </section>
  );
}

export function PartnershipsSection({ partnerships }: { partnerships: Partnership[] }) {
  if (!partnerships.length) return null;
  return (
    <section className="space-y-4">
      <SectionHeading title="Partnerships" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {partnerships.map((p) => (
          <Card key={p.name} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{p.name}</CardTitle>
              {p.amountLabel && <Badge tone="positive">{p.amountLabel}</Badge>}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{p.date}</p>
            <p className="text-sm leading-relaxed text-ink-300">{p.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function TradFiComparisonSection({
  rows,
  entityName,
}: {
  rows: TradFiRow[];
  entityName?: string;
}) {
  if (!rows.length) return null;
  const subtitle = entityName
    ? `How ${entityName} maps onto established TradFi structures, and where it diverges.`
    : "How this entity maps onto established TradFi structures, and where it diverges.";
  return (
    <section className="space-y-4">
      <SectionHeading title="Similarity to traditional finance products" subtitle={subtitle} />
      <TableShell>
        <Table className="min-w-[720px]">
          <THead>
            <tr>
              <TH>TradFi product</TH>
              <TH>Similarity to USD.AI</TH>
              <TH>Key differences</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.product}>
                <TD className="font-medium text-ink-50">{r.product}</TD>
                <TD className="text-ink-300">{r.similarity}</TD>
                <TD className="text-ink-300">{r.differences}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </section>
  );
}
