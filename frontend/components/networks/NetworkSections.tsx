import { ArrowUpRight, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { DataPanel } from "@/components/ui/DataPanel";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type {
  Competitor,
  LendingMetrics,
  NetworkComponent,
  NetworkEvent,
  NetworkRisk,
  FaqItem,
  InvestmentRound,
  OrgUnit,
  Partnership,
  Sourced,
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

export function ComponentsSection({
  components,
  embedded = false,
}: {
  components: NetworkComponent[];
  embedded?: boolean;
}) {
  if (!components.length) return null;
  const title =
    components.length === 1 ? "Main component" : `Main components (${components.length})`;
  const inner = (
    <>
      {!embedded && <SectionHeading title={title} />}
      {embedded && (
        <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
      )}
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
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{inner}</div>;
  }

  return (
    <section id="overview" className="scroll-mt-24 space-y-4">
      {inner}
    </section>
  );
}

export function DifferentiatorSection({
  differentiator,
  embedded = false,
}: {
  differentiator: string;
  embedded?: boolean;
}) {
  if (!differentiator) return null;
  const inner = (
    <>
      {!embedded && <SectionHeading title="Differentiator" />}
      {embedded && <h3 className="text-sm font-semibold text-ink-100">Differentiator</h3>}
      <Card className="glass-strong border-l-2 border-l-electric-500/60 p-5">
        <p className="text-sm leading-relaxed text-ink-200">{differentiator}</p>
      </Card>
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{inner}</div>;
  }

  return <section className="space-y-4">{inner}</section>;
}

export function FaqSection({ faq, embedded = false }: { faq: FaqItem[]; embedded?: boolean }) {
  if (!faq.length) return null;
  const ordered = [...faq].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  const inner = (
    <>
      {!embedded && <SectionHeading title="Commonly asked questions" />}
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
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{inner}</div>;
  }

  return (
    <section id="faq" className="scroll-mt-24 space-y-4">
      {inner}
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

function riskBorderTone(category: NetworkRisk["category"]): string {
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

export function RisksSection({ risks }: { risks: NetworkRisk[] }) {
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

export function EventsSection({
  events,
  embedded = false,
}: {
  events: TimelineEntry[];
  embedded?: boolean;
}) {
  if (!events.length) return null;
  const showLegend = events.some((e) => e.status === "theoretical" || e.status === "canhav-inferred");
  const inner = (
    <>
      {!embedded && (
        <SectionHeading
          title="Timeline & news"
          subtitle="Key milestones in the network's history."
        />
      )}
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
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{inner}</div>;
  }

  return (
    <section id="timeline" className="scroll-mt-24 space-y-4">
      {inner}
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
  networkName,
}: {
  rows: TradFiRow[];
  networkName?: string;
}) {
  if (!rows.length) return null;
  const similarityHeader = networkName
    ? `Similarity to ${networkName}`
    : "Similarity to network";
  const subtitle = networkName
    ? `How ${networkName} maps onto established TradFi structures, and where it diverges.`
    : "How this network maps onto established TradFi structures, and where it diverges.";
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

/* -------------------------------------------------------------------------- */
/* Lending sector — metrics + competitors                                     */
/* -------------------------------------------------------------------------- */

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(2)}%`;
}

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return "—";
  return formatUsdCompact(v);
}

/** A live (Sourced) metric tile: value + provenance label. */
function MetricTile({
  label,
  sourced,
  kind,
}: {
  label: string;
  sourced?: Sourced<number | null>;
  kind: "usd" | "pct";
}) {
  const value = sourced?.value ?? null;
  const text = kind === "usd" ? fmtUsd(value) : fmtPct(value);
  return (
    <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-mono text-lg text-ink-50">{text}</p>
      <p className="mt-1 text-[10px] text-ink-500">
        {sourced?.sourceLabel ?? "Pending live refresh"}
      </p>
    </div>
  );
}

/** A curated (static research) row: label + free text or chips. */
function CuratedRow({
  label,
  text,
  chips,
}: {
  label: string;
  text?: string | null;
  chips?: string[];
}) {
  if (!text && !(chips && chips.length)) return null;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      {chips && chips.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chips.map((c) => (
            <Badge key={c} tone="neutral">
              {c}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm leading-relaxed text-ink-300">{text}</p>
      )}
    </div>
  );
}

export function LendingMetricsSection({ lending }: { lending?: LendingMetrics | null }) {
  if (!lending) return null;
  const dep = lending.deployment;
  const hasLive =
    lending.tvlUsd ||
    lending.totalBorrowsUsd ||
    lending.utilizationPct ||
    lending.supplyApyPct ||
    lending.borrowApyPct;
  return (
    <section id="lending" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Lending metrics"
        subtitle="Live supply/borrow data (DeFi Llama) plus curated risk and deployment facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="TVL / deposits" sourced={lending.tvlUsd} kind="usd" />
        <MetricTile label="Total borrows" sourced={lending.totalBorrowsUsd} kind="usd" />
        <MetricTile label="Utilization" sourced={lending.utilizationPct} kind="pct" />
        <MetricTile label="Supply APY" sourced={lending.supplyApyPct} kind="pct" />
        <MetricTile label="Borrow APY" sourced={lending.borrowApyPct} kind="pct" />
        <MetricTile label="Net interest margin" sourced={lending.netInterestMarginPct} kind="pct" />
        <MetricTile label="Revenue (30d)" sourced={lending.revenue30dUsd} kind="usd" />
        <MetricTile label="Fees (30d)" sourced={lending.fees30dUsd} kind="usd" />
      </div>
      {!hasLive && (
        <p className="text-xs text-ink-500">
          Live supply/borrow metrics populate on the next DeFi Llama refresh.
        </p>
      )}

      <DataPanel title="Asset coverage & risk">
        <div className="divide-y divide-ink-800/60">
          <CuratedRow label="Collateral assets" chips={lending.collateralAssets} />
          <CuratedRow label="Loan assets" chips={lending.loanAssets} />
          <CuratedRow label="Stablecoin exposure" chips={lending.stablecoinExposure} />
          <CuratedRow label="Oracles" chips={lending.oracles} />
          <CuratedRow label="Risk parameters" text={lending.riskParameters} />
          <CuratedRow label="Liquidations" text={lending.liquidations} />
          <CuratedRow label="Bad debt" text={lending.badDebt} />
          <CuratedRow label="Governance activity" text={lending.governanceActivity} />
          <CuratedRow label="Audit / exploit history" text={lending.auditHistory} />
          {dep && (
            <CuratedRow
              label={`Chains${
                dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""
              }`}
              chips={dep.chains}
            />
          )}
          {dep?.notes && <CuratedRow label="Deployment notes" text={dep.notes} />}
        </div>
      </DataPanel>
    </section>
  );
}

export function CompetitorsSection({
  competitors,
  networkName,
}: {
  competitors?: Competitor[];
  networkName?: string;
}) {
  if (!competitors || competitors.length === 0) return null;
  const ranked = [...competitors].sort((a, b) => a.rank - b.rank);
  return (
    <section id="competitors" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Competitors"
        subtitle={
          networkName
            ? `Ranked top→bottom — who competes with ${networkName} and how they differ.`
            : "Ranked top→bottom by how directly they compete."
        }
      />
      <TableShell>
        <Table className="min-w-[760px]">
          <THead>
            <tr>
              <TH className="w-10">#</TH>
              <TH>Competitor</TH>
              <TH>Positioning</TH>
              <TH>Similarities</TH>
              <TH>Differentiator</TH>
            </tr>
          </THead>
          <TBody>
            {ranked.map((c) => (
              <TR key={`${c.rank}-${c.name}`}>
                <TD className="font-mono text-ink-400">{c.rank}</TD>
                <TD className="font-medium text-ink-50">
                  {c.slug ? (
                    <a
                      href={`/networks/${c.slug}`}
                      className="inline-flex items-center gap-0.5 text-ink-50 transition-colors hover:text-electric-400"
                    >
                      {c.name}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  ) : (
                    c.name
                  )}
                </TD>
                <TD className="text-ink-300">{c.positioning}</TD>
                <TD className="text-ink-300">{c.similarities}</TD>
                <TD className="text-ink-300">{c.differences}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </section>
  );
}

/** Build section nav items based on which sections have content. */
export function buildNetworkSectionNav(profile: {
  components: NetworkComponent[];
  faq: FaqItem[];
  events: NetworkEvent[];
  orgStructure: OrgUnit[];
  risks: NetworkRisk[];
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
  lending?: unknown;
  competitors?: unknown[];
}) {
  const items: { id: string; label: string; researchTab?: string }[] = [];

  const hasResearch =
    profile.components.length > 0 ||
    profile.offchainFacts?.length ||
    profile.faq.length ||
    profile.timeline?.length ||
    profile.events.length ||
    profile.tokenomics;

  if (profile.memberCoins.length) items.push({ id: "member-coins", label: "Dashboard" });
  if (profile.lending) items.push({ id: "lending", label: "Lending" });
  if (profile.competitors?.length) items.push({ id: "competitors", label: "Competitors" });
  if (hasResearch) items.push({ id: "research-hub", label: "Research" });
  if (profile.market) items.push({ id: "market", label: "Market" });
  if (profile.orgStructure.length) items.push({ id: "org", label: "Org structure" });
  if (profile.typedRisks?.length) items.push({ id: "typed-risks", label: "Risks" });
  else if (profile.risks.length) items.push({ id: "risks", label: "Risks" });
  if (profile.investmentRounds.length) items.push({ id: "funding", label: "Funding" });
  if (profile.partnerships.length) items.push({ id: "partnerships", label: "Partnerships" });
  if (profile.tradFiComparison.length) items.push({ id: "tradfi", label: "TradFi" });
  if (profile.agentSkill) items.push({ id: "agent-skill", label: "Agent skill" });

  return items;
}
