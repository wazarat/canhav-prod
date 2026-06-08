import { ArrowUpRight, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { DataPanel } from "@/components/ui/DataPanel";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type {
  EntityComponent,
  EntityEvent,
  EntityRisk,
  FaqItem,
  InvestmentRound,
  OrgUnit,
  Partnership,
  TimelineEntry,
  TimelineStatus,
  TradFiRow,
} from "@/lib/types";
import type { BadgeTone } from "@/components/ui/Badge";
import { cn, formatUsdCompact } from "@/lib/utils";

function SectionHeading({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 space-y-1 border-b border-ink-800/60 pb-2">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">{title}</h2>
      {subtitle && <p className="text-sm text-ink-300">{subtitle}</p>}
    </div>
  );
}

export function ComponentsSection({ components }: { components: EntityComponent[] }) {
  if (!components.length) return null;
  const title =
    components.length === 1 ? "Main component" : `Main components (${components.length})`;
  return (
    <section id="overview" className="scroll-mt-24 space-y-4">
      <SectionHeading title={title} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {components.map((c, i) => (
          <Card key={c.name} className="space-y-2 p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-electric-500/30 bg-electric-500/10 font-mono text-xs text-electric-400">
                {i + 1}
              </span>
              <CardTitle className="text-base">{c.name}</CardTitle>
            </div>
            <p className="text-sm leading-relaxed text-ink-300">{c.description}</p>
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
      <Card className="glass-strong border-l-2 border-l-electric-500/60 p-5">
        <p className="text-sm leading-relaxed text-ink-200">{differentiator}</p>
      </Card>
    </section>
  );
}

export function FaqSection({ faq }: { faq: FaqItem[] }) {
  if (!faq.length) return null;
  const ordered = [...faq].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  return (
    <section id="faq" className="scroll-mt-24 space-y-4">
      <SectionHeading title="Commonly asked questions" />
      <div className="space-y-2">
        {ordered.map((f) => (
          <details
            key={f.question}
            open={f.pinned}
            className="group glass rounded-xl border border-ink-700/60"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-50">{f.question}</span>
                {f.pinned && <Badge tone="signal">Key</Badge>}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-ink-800/60 px-5 pb-4 pt-3">
              <p className="text-sm leading-relaxed text-ink-300">{f.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function OrgStructureSection({ org }: { org: OrgUnit[] }) {
  if (!org.length) return null;
  return (
    <section id="org" className="scroll-mt-24 space-y-4">
      <SectionHeading title="Organizational structure" />
      <DataPanel title="Units & roles">
        <ul className="divide-y divide-ink-800/60">
          {org.map((o) => (
            <li key={o.name} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink-50">{o.name}</p>
                  <p className="text-sm leading-relaxed text-ink-300">{o.description}</p>
                </div>
                <Badge tone="neon" className="shrink-0">
                  {o.role}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </DataPanel>
    </section>
  );
}

function riskBorderTone(category: EntityRisk["category"]): string {
  switch (category) {
    case "Smart Contract":
    case "Systemic":
      return "border-l-rose-500/60";
    case "Regulatory":
    case "Governance":
      return "border-l-amber-400/60";
    default:
      return "border-l-ink-600";
  }
}

export function RisksSection({ risks }: { risks: EntityRisk[] }) {
  if (!risks.length) return null;
  return (
    <section id="risks" className="scroll-mt-24 space-y-4">
      <SectionHeading title="Risks identified" />
      <ul className="space-y-2">
        {risks.map((r, i) => (
          <li
            key={i}
            className={cn(
              "glass rounded-xl border border-ink-700/60 border-l-2 p-4",
              riskBorderTone(r.category),
            )}
          >
            <Badge tone="warning" className="mb-2 w-fit">
              {r.category}
            </Badge>
            <p className="text-sm leading-relaxed text-ink-300">{r.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Visual treatment per timeline status (playbook §5). Executed/stated milestones
 * render solid; theoretical (forward design) and CanHav-inferred steps render
 * muted with a dashed card + an explicit label so they're never mistaken for
 * things that have actually happened.
 */
const TIMELINE_STATUS_META: Record<
  TimelineStatus,
  { label: string; tone: BadgeTone; muted: boolean; node: string }
> = {
  executed: { label: "Executed", tone: "positive", muted: false, node: "border-emerald-500/60" },
  stated: { label: "Stated", tone: "signal", muted: false, node: "border-electric-500/50" },
  theoretical: { label: "Theoretical", tone: "warning", muted: true, node: "border-amber-400/40" },
  "canhav-inferred": {
    label: "CanHav inferred",
    tone: "neutral",
    muted: true,
    node: "border-ink-600",
  },
};

export function EventsSection({ events }: { events: TimelineEntry[] }) {
  if (!events.length) return null;
  const showLegend = events.some((e) => e.status === "theoretical" || e.status === "canhav-inferred");
  return (
    <section id="timeline" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Timeline & news"
        subtitle="Key milestones in the entity's history."
      />
      {showLegend && (
        <p className="text-xs text-ink-400">
          <span className="text-ink-300">Executed</span> and{" "}
          <span className="text-ink-300">Stated</span> are sourced from the protocol.{" "}
          <span className="text-ink-300">Theoretical</span> and{" "}
          <span className="text-ink-300">CanHav inferred</span> items are forward-looking and not
          yet realized.
        </p>
      )}
      <div className="relative space-y-0 pl-6">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-ink-700/80" />
        {events.map((e) => {
          const meta = TIMELINE_STATUS_META[e.status ?? "stated"];
          return (
            <div key={`${e.date}-${e.title}`} className="relative pb-6 last:pb-0">
              <span
                className={cn(
                  "absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-ink-950",
                  meta.node,
                )}
              />
              <div
                className={cn(
                  "space-y-2 rounded-xl border p-4",
                  meta.muted
                    ? "border-dashed border-ink-700/70 bg-ink-900/20 opacity-80"
                    : "border-ink-800/60 bg-ink-900/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        meta.muted ? "text-ink-200" : "text-ink-50",
                      )}
                    >
                      {e.title}
                    </p>
                    <Badge tone={meta.tone} className="text-[10px]">
                      {meta.label}
                    </Badge>
                  </div>
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
                    Source
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function InvestmentRoundsSection({ rounds }: { rounds: InvestmentRound[] }) {
  if (!rounds.length) return null;
  return (
    <section id="funding" className="scroll-mt-24 space-y-4">
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
                      Source
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
    <section id="partnerships" className="scroll-mt-24 space-y-4">
      <SectionHeading title="Partnerships" />
      <DataPanel title="Active partnerships">
        <ul className="divide-y divide-ink-800/60">
          {partnerships.map((p) => (
            <li key={p.name} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink-50">{p.name}</p>
                  <p className="text-xs text-ink-400">{p.date}</p>
                  <p className="text-sm leading-relaxed text-ink-300">{p.description}</p>
                </div>
                {p.amountLabel && (
                  <Badge tone="positive" className="shrink-0">
                    {p.amountLabel}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </DataPanel>
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
  const similarityHeader = entityName
    ? `Similarity to ${entityName}`
    : "Similarity to entity";
  const subtitle = entityName
    ? `How ${entityName} maps onto established TradFi structures, and where it diverges.`
    : "How this entity maps onto established TradFi structures, and where it diverges.";
  return (
    <section id="tradfi" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Similarity to traditional finance products"
        subtitle={subtitle}
      />
      <TableShell>
        <Table className="min-w-[720px]">
          <THead>
            <tr>
              <TH>TradFi product</TH>
              <TH>{similarityHeader}</TH>
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

/** Build section nav items based on which sections have content. */
export function buildEntitySectionNav(profile: {
  components: EntityComponent[];
  faq: FaqItem[];
  events: EntityEvent[];
  orgStructure: OrgUnit[];
  risks: EntityRisk[];
  investmentRounds: InvestmentRound[];
  partnerships: Partnership[];
  tradFiComparison: TradFiRow[];
  memberCoins: unknown[];
  market?: unknown;
  tokenomics?: unknown;
  typedRisks?: unknown[];
  timeline?: unknown[];
  offchainFacts?: unknown[];
  agentSkill?: unknown;
}) {
  const items: { id: string; label: string }[] = [];

  if (profile.memberCoins.length) items.push({ id: "member-coins", label: "Member coins" });
  if (profile.market) items.push({ id: "market", label: "Market" });
  if (profile.components.length) items.push({ id: "overview", label: "Overview" });
  if (profile.offchainFacts?.length) items.push({ id: "facts", label: "Key facts" });
  if (profile.faq.length) items.push({ id: "faq", label: "FAQ" });
  if (profile.timeline?.length || profile.events.length)
    items.push({ id: "timeline", label: "Timeline" });
  if (profile.orgStructure.length) items.push({ id: "org", label: "Org structure" });
  if (profile.tokenomics) items.push({ id: "tokenomics", label: "Tokenomics" });
  if (profile.typedRisks?.length) items.push({ id: "typed-risks", label: "Risks" });
  else if (profile.risks.length) items.push({ id: "risks", label: "Risks" });
  if (profile.investmentRounds.length) items.push({ id: "funding", label: "Funding" });
  if (profile.partnerships.length) items.push({ id: "partnerships", label: "Partnerships" });
  if (profile.tradFiComparison.length) items.push({ id: "tradfi", label: "TradFi" });
  if (profile.agentSkill) items.push({ id: "agent-skill", label: "Agent skill" });

  return items;
}
