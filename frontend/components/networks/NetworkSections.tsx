import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { DataPanel } from "@/components/ui/DataPanel";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type {
  Competitor,
  CreditTag,
  CreditTagMetrics,
  DerivativesMetrics,
  DerivativesSubSector,
  DerivativesTagMetrics,
  DexMetrics,
  DexSubSectorMetrics,
  LendingMetrics,
  LiquidityMetrics,
  LiquiditySubSector,
  LiquidityTagMetrics,
  MemberCoinRef,
  NetworkComponent,
  NetworkEvent,
  NetworkRisk,
  OpenInterest,
  OptionsVolume,
  OtherMetrics,
  OtherSubSector,
  OtherTagMetrics,
  FaqItem,
  InvestmentRound,
  OrgUnit,
  Partnership,
  RwaMetrics,
  RwaSubSector,
  RwaSubSectorMetrics,
  RwaTagMetrics,
  Sourced,
  StablecoinMetrics,
  StablecoinSubSectorMetrics,
  StakingMetrics,
  StakingSubSector,
  StakingTagMetrics,
  TimelineEntry,
  TimelineStatus,
  TradFiRow,
  UniversalMetrics,
} from "@/lib/types";
import {
  DERIVATIVES_TAG_METRICS_KEY,
  LIQUIDITY_TAG_METRICS_KEY,
  OTHER_TAG_METRICS_KEY,
  RWA_TAG_METRICS_KEY,
  STAKING_TAG_METRICS_KEY,
} from "@/lib/networkTaxonomy";
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
                  <p className="text-sm font-medium text-ink-50">
                    {p.slug ? (
                      <a
                        href={`/networks/${p.slug}`}
                        className="inline-flex items-center gap-0.5 text-ink-50 transition-colors hover:text-electric-400"
                      >
                        {p.name}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : (
                      p.name
                    )}
                  </p>
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
  kind: "usd" | "pct" | "count";
}) {
  const value = sourced?.value ?? null;
  const text =
    kind === "usd"
      ? fmtUsd(value)
      : kind === "pct"
        ? fmtPct(value)
        : value != null
          ? value.toLocaleString()
          : "—";
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

export function LendingMetricTiles({
  lending,
  syncedAt,
}: {
  lending: LendingMetrics;
  syncedAt?: string | null;
}) {
  const hasLive =
    lending.tvlUsd ||
    lending.totalBorrowsUsd ||
    lending.utilizationPct ||
    lending.supplyApyPct ||
    lending.borrowApyPct ||
    lending.activeUsers;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="TVL / deposits" sourced={lending.tvlUsd} kind="usd" />
        <MetricTile label="Total borrows" sourced={lending.totalBorrowsUsd} kind="usd" />
        <MetricTile label="Utilization" sourced={lending.utilizationPct} kind="pct" />
        <MetricTile label="Available liquidity" sourced={lending.availableLiquidityUsd} kind="usd" />
        <MetricTile label="Supply APY" sourced={lending.supplyApyPct} kind="pct" />
        <MetricTile label="Borrow APY" sourced={lending.borrowApyPct} kind="pct" />
        <MetricTile label="Net interest margin" sourced={lending.netInterestMarginPct} kind="pct" />
        <MetricTile label="Revenue (30d)" sourced={lending.revenue30dUsd} kind="usd" />
        <MetricTile label="Fees (30d)" sourced={lending.fees30dUsd} kind="usd" />
        <MetricTile label="Revenue (annualized)" sourced={lending.revenueAnnualizedUsd} kind="usd" />
        <MetricTile label="Fees (annualized)" sourced={lending.feesAnnualizedUsd} kind="usd" />
        <MetricTile label="Active users (30d)" sourced={lending.activeUsers} kind="count" />
        <MetricTile label="Unique borrowers (30d)" sourced={lending.uniqueBorrowers30d} kind="count" />
      </div>
      {!hasLive && (
        <p className="text-xs text-ink-500">
          Live supply/borrow metrics populate on the next DeFi Llama refresh
          {syncedAt ? ` (last sync ${new Date(syncedAt).toLocaleString()})` : ""}.
        </p>
      )}
    </>
  );
}

export function LendingAssetCoveragePanel({ lending }: { lending: LendingMetrics }) {
  const dep = lending.deployment;

  return (
    <DataPanel title="Asset coverage & risk">
      <div className="divide-y divide-ink-800/60">
        <CuratedRow label="Collateral assets" chips={lending.collateralAssets} />
        <CuratedRow label="Loan assets" chips={lending.loanAssets} />
        <CuratedRow label="Stablecoin exposure" chips={lending.stablecoinExposure} />
        {lending.stablecoinExposurePct != null && (
          <CuratedRow
            label="Stablecoin exposure (% TVL)"
            text={`${lending.stablecoinExposurePct}% of TVL in stables (curated estimate).`}
          />
        )}
        <CuratedRow label="Oracles" chips={lending.oracles} />
        <CuratedRow label="Risk parameters" text={lending.riskParameters} />
        <CuratedRow label="Liquidations" text={lending.liquidations} />
        {lending.liquidations30d && (
          <CuratedRow
            label="Liquidations (30d)"
            text={
              lending.liquidations30d.volumeUsd != null ||
              lending.liquidations30d.count != null
                ? `${lending.liquidations30d.count ?? "—"} events · ${fmtUsd(lending.liquidations30d.volumeUsd)} volume`
                : lending.liquidations30d.notes ?? null
            }
          />
        )}
        <CuratedRow label="Bad debt" text={lending.badDebt} />
        <CuratedRow label="Governance activity" text={lending.governanceActivity} />
        {lending.governanceDetail && (
          <>
            {lending.governanceDetail.proposals != null && (
              <CuratedRow
                label="Governance proposals"
                text={String(lending.governanceDetail.proposals)}
              />
            )}
            {lending.governanceDetail.voterTurnoutPct != null && (
              <CuratedRow
                label="Voter turnout"
                text={`${lending.governanceDetail.voterTurnoutPct}%`}
              />
            )}
            {lending.governanceDetail.treasuryUsd != null && (
              <CuratedRow label="Treasury" text={fmtUsd(lending.governanceDetail.treasuryUsd)} />
            )}
            {lending.governanceDetail.notes && (
              <CuratedRow label="Governance notes" text={lending.governanceDetail.notes} />
            )}
          </>
        )}
        <CuratedRow label="Audit / exploit history" text={lending.auditHistory} />
        {dep && (
          <CuratedRow
            label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
            chips={dep.chains}
          />
        )}
        {dep?.notes && <CuratedRow label="Deployment notes" text={dep.notes} />}
      </div>
    </DataPanel>
  );
}

export function LendingMetricsSection({ lending }: { lending?: LendingMetrics | null }) {
  if (!lending) return null;

  return (
    <section id="lending" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Lending metrics"
        subtitle="Live supply/borrow data (DeFi Llama) plus curated risk and deployment facts."
      />
      <LendingMetricTiles lending={lending} />
      <LendingAssetCoveragePanel lending={lending} />
    </section>
  );
}

const TAG_TO_METRICS_KEY: Record<CreditTag, keyof CreditTagMetrics> = {
  Lending: "lending",
  "Leveraged Yield": "leveragedYield",
  "Fixed Income": "fixedIncome",
};

function TagMetricRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  const text = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-300">{text}</p>
    </div>
  );
}

export function CreditTagMetricsSection({
  tags,
  metrics,
}: {
  tags?: CreditTag[];
  metrics?: CreditTagMetrics | null;
}) {
  if (!metrics || !tags?.length) return null;

  const panels = tags
    .map((tag) => {
      const key = TAG_TO_METRICS_KEY[tag];
      const block = metrics[key];
      if (!block) return null;

      if (key === "lending") {
        const m = block as NonNullable<CreditTagMetrics["lending"]>;
        return (
          <DataPanel key={tag} title={tag}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <MetricTile label="Total supplied" sourced={m.totalSuppliedUsd} kind="usd" />
              <MetricTile label="Total borrows" sourced={m.totalBorrowsUsd} kind="usd" />
              <MetricTile label="Utilization" sourced={m.utilizationPct} kind="pct" />
              <MetricTile label="Available liquidity" sourced={m.availableLiquidityUsd} kind="usd" />
              <MetricTile label="Supply APY" sourced={m.supplyApyPct} kind="pct" />
              <MetricTile label="Borrow APY" sourced={m.borrowApyPct} kind="pct" />
            </div>
            <div className="mt-3 divide-y divide-ink-800/60">
              <TagMetricRow label="Isolated markets" value={m.isolatedMarketCount} />
              <CuratedRow label="Collateral assets" chips={m.collateralAssets} />
              <CuratedRow label="Oracles" chips={m.oracles} />
            </div>
          </DataPanel>
        );
      }

      if (key === "leveragedYield") {
        const m = block as NonNullable<CreditTagMetrics["leveragedYield"]>;
        return (
          <DataPanel key={tag} title={tag}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <MetricTile label="TVL" sourced={m.tvlUsd} kind="usd" />
              <MetricTile label="Borrow APY" sourced={m.borrowApyPct} kind="pct" />
            </div>
            <div className="mt-3 divide-y divide-ink-800/60">
              <TagMetricRow label="Max leverage" value={m.maxLeverageX != null ? `${m.maxLeverageX}x` : null} />
              <TagMetricRow label="Borrow model" value={m.borrowModel} />
              <CuratedRow label="Supported strategies" chips={m.supportedStrategies} />
              <CuratedRow label="Integrated protocols" chips={m.integratedProtocols} />
            </div>
          </DataPanel>
        );
      }

      if (key === "fixedIncome") {
        const m = block as NonNullable<CreditTagMetrics["fixedIncome"]>;
        return (
          <DataPanel key={tag} title={tag}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <MetricTile label="TVL" sourced={m.tvlUsd} kind="usd" />
              <MetricTile label="Fixed APY" sourced={m.fixedApyPct} kind="pct" />
              <MetricTile label="Implied yield" sourced={m.impliedYieldPct} kind="pct" />
            </div>
            <div className="mt-3 divide-y divide-ink-800/60">
              <TagMetricRow label="Active markets" value={m.markets} />
              <TagMetricRow label="Mechanism" value={m.mechanism} />
              <CuratedRow label="Maturities" chips={m.maturities} />
            </div>
          </DataPanel>
        );
      }

      return null;
    })
    .filter(Boolean);

  if (panels.length === 0) return null;

  return (
    <section id="credit-tags" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Tag-specific metrics"
        subtitle="Curated metrics for each credit tag on this network."
      />
      <div className="space-y-4">{panels}</div>
    </section>
  );
}

function TagMetricsSectionShell({
  id,
  sector,
  children,
}: {
  id: string;
  sector: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <SectionHeading
        title={`${sector} tag metrics`}
        subtitle={`Metrics for each ${sector.toLowerCase()} tag on this network.`}
      />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function TvlChangeTile({
  tvlChange,
}: {
  tvlChange?: { d1: number | null; d7: number | null } | null;
}) {
  return (
    <PlainTile
      label="TVL change (1d / 7d)"
      value={
        tvlChange && (tvlChange.d1 != null || tvlChange.d7 != null)
          ? `${fmtPct(tvlChange.d1)} / ${fmtPct(tvlChange.d7)}`
          : "—"
      }
      hint="DeFi Llama"
    />
  );
}

export function StakingTagMetricsSection({
  tags,
  metrics,
}: {
  tags?: string[];
  metrics?: StakingTagMetrics | null;
}) {
  if (!metrics || !tags?.length) return null;

  const panels = tags
    .map((tag) => {
      const key = STAKING_TAG_METRICS_KEY[tag as StakingSubSector];
      if (!key) return null;
      const block = metrics[key];
      if (!block) return null;

      return (
        <DataPanel key={tag} title={tag}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricTile label="Total staked" sourced={block.totalStakedUsd} kind="usd" />
            <MetricTile label="Token price" sourced={block.tokenPriceUsd} kind="usd" />
            <MetricTile label="Market cap" sourced={block.marketCapUsd} kind="usd" />
            <MetricTile label="Staking APR" sourced={block.stakingAprPct} kind="pct" />
            {"baseAssetExchangeRate" in block && (
              <PlainTile
                label="Exchange rate"
                value={
                  block.baseAssetExchangeRate?.value != null
                    ? block.baseAssetExchangeRate.value.toFixed(4)
                    : "—"
                }
                hint={block.baseAssetExchangeRate?.sourceLabel ?? "Pending"}
              />
            )}
            {"pegDeviationPct" in block && (
              <MetricTile label="Peg deviation" sourced={block.pegDeviationPct} kind="pct" />
            )}
            <TvlChangeTile tvlChange={block.tvlChangePct} />
          </div>
          <div className="mt-3 divide-y divide-ink-800/60">
            {"validatorCount" in block && (
              <MetricTile label="Validators" sourced={block.validatorCount} kind="count" />
            )}
            {"avsData" in block && block.avsData && block.avsData.length > 0 && (
              <CuratedRow
                label="AVS exposure"
                chips={block.avsData.map((a) => a.name)}
              />
            )}
            {"collateralBasket" in block && block.collateralBasket && block.collateralBasket.length > 0 && (
              <CuratedRow
                label="Collateral basket"
                chips={block.collateralBasket.map((c) => `${c.asset} ${c.pct}%`)}
              />
            )}
            {"operatorModel" in block && (
              <CuratedRow label="Operator model" text={block.operatorModel ?? null} />
            )}
            {"withdrawalQueue" in block && (
              <CuratedRow label="Withdrawal queue" text={block.withdrawalQueue ?? null} />
            )}
          </div>
        </DataPanel>
      );
    })
    .filter(Boolean);

  if (panels.length === 0) return null;
  return <TagMetricsSectionShell id="staking-tags" sector="Staking">{panels}</TagMetricsSectionShell>;
}

export function LiquidityTagMetricsSection({
  tags,
  metrics,
}: {
  tags?: string[];
  metrics?: LiquidityTagMetrics | null;
}) {
  if (!metrics || !tags?.length) return null;

  const panels = tags
    .map((tag) => {
      const key = LIQUIDITY_TAG_METRICS_KEY[tag as LiquiditySubSector];
      if (!key) return null;
      const block = metrics[key];
      if (!block) return null;
      const fees = block.feesRevenue;

      return (
        <DataPanel key={tag} title={tag}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricTile label="Protocol TVL" sourced={block.tvlUsd} kind="usd" />
            {"volume24hUsd" in block && (
              <MetricTile label="24h volume" sourced={block.volume24hUsd} kind="usd" />
            )}
            {"feeAprPct" in block && (
              <MetricTile label="Fee APR" sourced={block.feeAprPct} kind="pct" />
            )}
            <PlainTile
              label="Fees (24h)"
              value={fees?.fees24hUsd != null ? fmtUsd(fees.fees24hUsd) : "—"}
              hint="DeFi Llama"
            />
            {"poolCount" in block && (
              <MetricTile label="Pool count" sourced={block.poolCount} kind="count" />
            )}
            {"vaultCount" in block && (
              <MetricTile label="Vault count" sourced={block.vaultCount} kind="count" />
            )}
            {"avgVaultApyPct" in block && (
              <MetricTile label="Avg vault APY" sourced={block.avgVaultApyPct} kind="pct" />
            )}
            <TvlChangeTile tvlChange={block.tvlChangePct} />
          </div>
          {"underlyingProtocols" in block && block.underlyingProtocols && block.underlyingProtocols.length > 0 && (
            <div className="mt-3">
              <CuratedRow label="Underlying protocols" chips={block.underlyingProtocols} />
            </div>
          )}
        </DataPanel>
      );
    })
    .filter(Boolean);

  if (panels.length === 0) return null;
  return <TagMetricsSectionShell id="liquidity-tags" sector="Liquidity">{panels}</TagMetricsSectionShell>;
}

export function DerivativesTagMetricsSection({
  tags,
  metrics,
}: {
  tags?: string[];
  metrics?: DerivativesTagMetrics | null;
}) {
  if (!metrics || !tags?.length) return null;

  const panels = tags
    .map((tag) => {
      const key = DERIVATIVES_TAG_METRICS_KEY[tag as DerivativesSubSector];
      if (!key) return null;
      const block = metrics[key];
      if (!block) return null;
      const fees = block.feesRevenue;

      return (
        <DataPanel key={tag} title={tag}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricTile label="Protocol TVL" sourced={block.tvlUsd} kind="usd" />
            {"openInterestUsd" in block && (
              <MetricTile label="Open interest" sourced={block.openInterestUsd} kind="usd" />
            )}
            {"longOpenInterestUsd" in block && (
              <MetricTile label="Long OI" sourced={block.longOpenInterestUsd} kind="usd" />
            )}
            {"shortOpenInterestUsd" in block && (
              <MetricTile label="Short OI" sourced={block.shortOpenInterestUsd} kind="usd" />
            )}
            {"volume24hUsd" in block && (
              <MetricTile label="24h volume" sourced={block.volume24hUsd} kind="usd" />
            )}
            <PlainTile
              label="Fees (24h)"
              value={fees?.fees24hUsd != null ? fmtUsd(fees.fees24hUsd) : "—"}
              hint="DeFi Llama"
            />
            {"maxLeverageX" in block && block.maxLeverageX != null && (
              <PlainTile label="Max leverage" value={`${block.maxLeverageX}x`} hint="Curated" />
            )}
            {"insuranceFundUsd" in block && (
              <MetricTile label="Insurance fund" sourced={block.insuranceFundUsd} kind="usd" />
            )}
            {"vaultApyPct" in block && (
              <MetricTile label="Vault APY" sourced={block.vaultApyPct} kind="pct" />
            )}
            {"fundingRatePct" in block && (
              <MetricTile label="Funding rate" sourced={block.fundingRatePct} kind="pct" />
            )}
            <TvlChangeTile tvlChange={block.tvlChangePct} />
          </div>
          {"supportedMarkets" in block && block.supportedMarkets && block.supportedMarkets.length > 0 && (
            <div className="mt-3">
              <CuratedRow label="Supported markets" chips={block.supportedMarkets} />
            </div>
          )}
          {"vaultStrategies" in block && block.vaultStrategies && block.vaultStrategies.length > 0 && (
            <div className="mt-3">
              <CuratedRow label="Vault strategies" chips={block.vaultStrategies} />
            </div>
          )}
          {"hedgeVenue" in block && block.hedgeVenue && block.hedgeVenue.length > 0 && (
            <div className="mt-3">
              <CuratedRow label="Hedge venues" chips={block.hedgeVenue} />
            </div>
          )}
        </DataPanel>
      );
    })
    .filter(Boolean);

  if (panels.length === 0) return null;
  return <TagMetricsSectionShell id="derivatives-tags" sector="Derivatives">{panels}</TagMetricsSectionShell>;
}

export function OtherTagMetricsSection({
  tags,
  metrics,
}: {
  tags?: string[];
  metrics?: OtherTagMetrics | null;
}) {
  if (!metrics || !tags?.length) return null;

  const panels = tags
    .map((tag) => {
      const key = OTHER_TAG_METRICS_KEY[tag as OtherSubSector];
      if (!key) return null;
      const block = metrics[key];
      if (!block) return null;
      const fees = block.feesRevenue;

      return (
        <DataPanel key={tag} title={tag}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricTile label="Protocol TVL" sourced={block.tvlUsd} kind="usd" />
            {"treasuryUsd" in block && (
              <MetricTile label="Treasury" sourced={block.treasuryUsd} kind="usd" />
            )}
            {"activeCoverUsd" in block && (
              <MetricTile label="Active cover" sourced={block.activeCoverUsd} kind="usd" />
            )}
            {"capitalPoolUsd" in block && (
              <MetricTile label="Capital pool" sourced={block.capitalPoolUsd} kind="usd" />
            )}
            {"claimsPaidUsd" in block && (
              <MetricTile label="Claims paid" sourced={block.claimsPaidUsd} kind="usd" />
            )}
            {"bribeVolumeUsd" in block && (
              <MetricTile label="Bribe volume" sourced={block.bribeVolumeUsd} kind="usd" />
            )}
            {"crvEmissionsWeekly" in block && (
              <MetricTile label="CRV emissions (weekly)" sourced={block.crvEmissionsWeekly} kind="count" />
            )}
            {"activeGaugeCount" in block && (
              <MetricTile label="Active gauges" sourced={block.activeGaugeCount} kind="count" />
            )}
            {"totalProposals" in block && (
              <MetricTile label="Proposals (Snapshot)" sourced={block.totalProposals} kind="count" />
            )}
            {"activeProposals" in block && (
              <MetricTile label="Active proposals" sourced={block.activeProposals} kind="count" />
            )}
            {"uniqueVoters" in block && (
              <MetricTile label="Unique voters" sourced={block.uniqueVoters} kind="count" />
            )}
            {"avgVotesPerProposal" in block && (
              <MetricTile label="Avg votes / proposal" sourced={block.avgVotesPerProposal} kind="count" />
            )}
            {"snapshotFollowers" in block && (
              <MetricTile label="Snapshot followers" sourced={block.snapshotFollowers} kind="count" />
            )}
            <PlainTile
              label="Fees (24h)"
              value={fees?.fees24hUsd != null ? fmtUsd(fees.fees24hUsd) : "—"}
              hint="DeFi Llama"
            />
            <TvlChangeTile tvlChange={block.tvlChangePct} />
          </div>
          <div className="mt-3 divide-y divide-ink-800/60">
            {"coverModel" in block && <CuratedRow label="Cover model" text={block.coverModel ?? null} />}
            {"coveredProtocols" in block && block.coveredProtocols && block.coveredProtocols.length > 0 && (
              <CuratedRow label="Covered protocols" chips={block.coveredProtocols} />
            )}
            {"votingPowerControlled" in block && (
              <CuratedRow label="Voting power" text={block.votingPowerControlled ?? null} />
            )}
            {"targetProtocols" in block && block.targetProtocols && block.targetProtocols.length > 0 && (
              <CuratedRow label="Target protocols" chips={block.targetProtocols} />
            )}
          </div>
        </DataPanel>
      );
    })
    .filter(Boolean);

  if (panels.length === 0) return null;
  return <TagMetricsSectionShell id="other-tags" sector="Other">{panels}</TagMetricsSectionShell>;
}

export function RwaTagMetricsSection({
  tags,
  metrics,
}: {
  tags?: string[];
  metrics?: RwaTagMetrics | null;
}) {
  if (!metrics || !tags?.length) return null;

  const panels = tags
    .map((tag) => {
      const key = RWA_TAG_METRICS_KEY[tag as RwaSubSector];
      if (!key) return null;
      const block = metrics[key];
      if (!block) return null;

      const aumUsd =
        "aumUsd" in block
          ? block.aumUsd
          : "navUsd" in block
            ? block.navUsd
            : "totalAumUsd" in block
              ? block.totalAumUsd
              : undefined;

      return (
        <DataPanel key={tag} title={tag}>
          {aumUsd && <MetricTile label="AUM / TVL" sourced={aumUsd} kind="usd" />}
          {"kind" in block && block.kind ? (
            <div className="mt-3">
              <RwaSubSectorPanel m={block as RwaSubSectorMetrics} />
            </div>
          ) : null}
        </DataPanel>
      );
    })
    .filter(Boolean);

  if (panels.length === 0) return null;
  return <TagMetricsSectionShell id="rwa-tags" sector="RWA">{panels}</TagMetricsSectionShell>;
}

export function EntityOffchainSection({ universal }: { universal?: UniversalMetrics | null }) {
  if (!universal) return null;
  const { identity } = universal;
  const hasRaises = (identity.raises?.value.length ?? 0) > 0;
  const hasGovIds = (identity.governanceIds?.value.length ?? 0) > 0;
  const hasTreasury =
    universal.treasuryUsd?.value != null || universal.treasuryExOwnTokensUsd?.value != null;
  if (!hasRaises && !hasGovIds && !hasTreasury) return null;

  return (
    <section id="offchain" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Off-chain metrics"
        subtitle="Funding, governance, and treasury data (DeFi Llama + curated)."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {hasTreasury && universal.treasuryUsd && (
          <MetricTile label="Treasury" sourced={universal.treasuryUsd} kind="usd" />
        )}
        {universal.treasuryExOwnTokensUsd?.value != null && (
          <MetricTile label="Treasury (ex own tokens)" sourced={universal.treasuryExOwnTokensUsd} kind="usd" />
        )}
      </div>
      {hasRaises && identity.raises && (
        <DataPanel title="Funding rounds">
          <div className="divide-y divide-ink-800/60">
            {identity.raises.value.map((r, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-ink-100">{r.round ?? "Round"}</p>
                <p className="mt-1 text-sm text-ink-300">
                  {r.amountUsd != null ? fmtUsd(r.amountUsd) : "—"}
                  {r.date ? ` · ${r.date}` : ""}
                </p>
                {r.investors.length > 0 && (
                  <CuratedRow label="Investors" chips={r.investors.slice(0, 8)} />
                )}
              </div>
            ))}
          </div>
        </DataPanel>
      )}
      {hasGovIds && identity.governanceIds && (
        <DataPanel title="Governance">
          <CuratedRow label="Governance IDs" chips={identity.governanceIds.value} />
        </DataPanel>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Stablecoin sector — issuer metrics + sub-sector panel                      */
/* -------------------------------------------------------------------------- */

const STABLECOIN_KIND_LABEL: Record<StablecoinSubSectorMetrics["kind"], string> = {
  "fiat-backed": "Reserve composition",
  "decentralized-cdp": "Collateral & CDP parameters",
  synthetic: "Hedge book & yield",
  "rwa-backed": "Underlying RWA",
  "e-money": "Fiat rails",
};

/** Render the sub-sector-specific panel for a stablecoin issuer. */
function StablecoinSubSectorPanel({ m }: { m: StablecoinSubSectorMetrics }) {
  const title = STABLECOIN_KIND_LABEL[m.kind];
  return (
    <DataPanel title={title}>
      <div className="divide-y divide-ink-800/60">
        {m.kind === "fiat-backed" && (
          <>
            <CuratedRow label="Reserve custodian" text={m.reserveCustodian} />
            {m.reserveBreakdown && m.reserveBreakdown.length > 0 && (
              <CuratedRow
                label="Reserve breakdown"
                chips={m.reserveBreakdown.map((r) => `${r.asset} · ${r.pct}%`)}
              />
            )}
            <TagMetricRow label="Attestation cadence" value={m.attestationCadence} />
            <CuratedRow label="Attestor" text={m.attestor} />
            <CuratedRow label="Realtime reserve oracle" text={m.realtimeReserveOracle} />
          </>
        )}
        {m.kind === "decentralized-cdp" && (
          <>
            <CuratedRow label="Collateral assets" chips={m.collateralAssets} />
            <TagMetricRow
              label="Min collateral ratio"
              value={m.minCollateralRatioPct?.value != null ? `${m.minCollateralRatioPct.value}%` : null}
            />
            <TagMetricRow
              label="Stability fee"
              value={m.stabilityFeePct?.value != null ? `${m.stabilityFeePct.value}%` : null}
            />
            <TagMetricRow
              label="Savings rate"
              value={m.savingsRatePct?.value != null ? `${m.savingsRatePct.value}%` : null}
            />
            <CuratedRow label="Liquidation mechanism" text={m.liquidationMechanism} />
            <CuratedRow label="Governance token" text={m.governanceToken} />
          </>
        )}
        {m.kind === "synthetic" && (
          <>
            <CuratedRow label="Hedge venues" chips={m.hedgeVenues} />
            <CuratedRow label="Funding-rate exposure" text={m.fundingRateExposure} />
            <TagMetricRow
              label="Insurance fund"
              value={m.insuranceFundUsd?.value != null ? fmtUsd(m.insuranceFundUsd.value) : null}
            />
            <CuratedRow label="Yield sources" chips={m.yieldSources} />
          </>
        )}
        {m.kind === "rwa-backed" && (
          <>
            <CuratedRow label="Underlying assets" chips={m.underlyingAssets} />
            <CuratedRow label="Custodian" text={m.custodian} />
            <TagMetricRow label="Yield distribution" value={m.yieldDistribution} />
            <TagMetricRow
              label="NAV"
              value={m.nav?.value != null ? fmtUsd(m.nav.value) : null}
            />
          </>
        )}
        {m.kind === "e-money" && (
          <>
            <CuratedRow label="EMI license" text={m.emiLicense} />
            <CuratedRow label="Fiat rails" chips={m.fiatRails} />
            <TagMetricRow label="IBAN support" value={m.ibanSupport == null ? null : m.ibanSupport ? "Yes" : "No"} />
            <CuratedRow label="Redemption cadence" text={m.redemptionCadence} />
          </>
        )}
      </div>
    </DataPanel>
  );
}

export function StablecoinMetricsSection({
  stablecoin,
  memberCoins,
}: {
  stablecoin?: StablecoinMetrics | null;
  memberCoins?: MemberCoinRef[];
}) {
  if (!stablecoin) return null;
  const dep = stablecoin.deployment;
  const chainCount = dep?.chains?.length ?? null;
  const coins = (memberCoins ?? []).filter((c) => c.category === "Stablecoin");
  const events = stablecoin.riskEvents ?? [];

  return (
    <section id="stablecoin" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Stablecoin metrics"
        subtitle="Live circulating supply (DeFi Llama) plus curated reserves, peg mechanism, and risk facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="Circulating supply" sourced={stablecoin.currentSupplyUsd} kind="usd" />
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500"># Chains</p>
          <p className="mt-1 font-mono text-lg text-ink-50">{chainCount ?? "—"}</p>
          <p className="mt-1 text-[10px] text-ink-500">Curated deployment</p>
        </div>
      </div>

      <DataPanel title="Reserves, peg & risk">
        <div className="divide-y divide-ink-800/60">
          <CuratedRow label="Peg mechanism" text={stablecoin.pegMechanism} />
          <CuratedRow label="Reserves / collateral" text={stablecoin.reserves} />
          <CuratedRow label="Audit / attestation history" text={stablecoin.auditHistory} />
          {dep && (
            <CuratedRow
              label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
              chips={dep.chains}
            />
          )}
          {dep?.notes && <CuratedRow label="Deployment notes" text={dep.notes} />}
        </div>
      </DataPanel>

      {stablecoin.subSectorMetrics && (
        <StablecoinSubSectorPanel m={stablecoin.subSectorMetrics} />
      )}

      {coins.length > 0 && (
        <TableShell>
          <Table className="min-w-[560px]">
            <THead>
              <tr>
                <TH>Symbol</TH>
                <TH>Name</TH>
                <TH>Role</TH>
                <TH>Class</TH>
              </tr>
            </THead>
            <TBody>
              {coins.map((c) => (
                <TR key={c.slug}>
                  <TD className="font-mono font-medium text-ink-50">{c.symbol}</TD>
                  <TD className="text-ink-200">
                    <a
                      href={`/stablecoins/${c.slug}`}
                      className="inline-flex items-center gap-0.5 transition-colors hover:text-electric-400"
                    >
                      {c.name}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </TD>
                  <TD className="text-ink-300">{c.role}</TD>
                  <TD className="text-ink-300">{c.subCategory ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableShell>
      )}

      {events.length > 0 && (
        <DataPanel title="Risk timeline">
          <div className="divide-y divide-ink-800/60">
            {events.map((e, i) => (
              <div key={`${e.date}-${i}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-400">{e.date}</span>
                  <Badge tone="warning">{e.type}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-300">
                  {e.impact}
                  {e.link && (
                    <a
                      href={e.link}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 text-electric-400 hover:underline"
                    >
                      source
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </p>
              </div>
            ))}
          </div>
        </DataPanel>
      )}

      {stablecoin.attestationUrl || stablecoin.proofOfReservesUrl ? (
        <DataPanel title="Sources">
          <div className="divide-y divide-ink-800/60">
            {stablecoin.attestationUrl && (
              <CuratedRow label="Attestation page" text={stablecoin.attestationUrl} />
            )}
            {stablecoin.proofOfReservesUrl && (
              <CuratedRow label="Proof of Reserves" text={stablecoin.proofOfReservesUrl} />
            )}
          </div>
        </DataPanel>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* DEX sector — entity metrics + sub-sector panel                             */
/* -------------------------------------------------------------------------- */

const DEX_KIND_LABEL: Record<DexSubSectorMetrics["kind"], string> = {
  amm: "Pools & fee tiers",
  orderbook: "Markets & fees",
  perps: "Perp markets & risk",
  aggregator: "Routing & venues",
  "cross-chain": "Cross-chain swaps",
};

/** Render the sub-sector-specific panel for a DEX entity. */
function DexSubSectorPanel({ m }: { m: DexSubSectorMetrics }) {
  return (
    <DataPanel title={DEX_KIND_LABEL[m.kind]}>
      <div className="divide-y divide-ink-800/60">
        {m.kind === "amm" && (
          <>
            <TagMetricRow label="Pools" value={m.pools?.value} />
            {m.topPools && m.topPools.length > 0 && (
              <CuratedRow
                label="Top pools"
                chips={m.topPools.map((p) =>
                  p.tvlUsd != null ? `${p.name} · ${fmtUsd(p.tvlUsd)}` : p.name,
                )}
              />
            )}
            <CuratedRow label="Fee tier structure" text={m.feeTierStructure} />
          </>
        )}
        {m.kind === "orderbook" && (
          <>
            <TagMetricRow label="Markets" value={m.markets?.value} />
            <TagMetricRow
              label="Open interest"
              value={m.openInterestUsd?.value != null ? fmtUsd(m.openInterestUsd.value) : null}
            />
            <TagMetricRow
              label="Maker rebate"
              value={m.makerRebatePct?.value != null ? `${m.makerRebatePct.value}%` : null}
            />
            <TagMetricRow
              label="Taker fee"
              value={m.takerFeePct?.value != null ? `${m.takerFeePct.value}%` : null}
            />
          </>
        )}
        {m.kind === "perps" && (
          <>
            <TagMetricRow label="Markets" value={m.markets?.value} />
            <TagMetricRow
              label="Open interest"
              value={m.openInterestUsd?.value != null ? fmtUsd(m.openInterestUsd.value) : null}
            />
            <TagMetricRow
              label="Max leverage"
              value={m.maxLeverage?.value != null ? `${m.maxLeverage.value}x` : null}
            />
            <CuratedRow label="Funding-rate model" text={m.fundingRateModel} />
            <TagMetricRow
              label="Liquidations (30d)"
              value={
                m.liquidationsVolume30dUsd?.value != null
                  ? fmtUsd(m.liquidationsVolume30dUsd.value)
                  : null
              }
            />
          </>
        )}
        {m.kind === "aggregator" && (
          <>
            <TagMetricRow label="Integrated DEXs" value={m.integratedDexes?.value} />
            <CuratedRow label="Routing algorithm" text={m.routingAlgo} />
            {m.topRoutedVenues && m.topRoutedVenues.length > 0 && (
              <CuratedRow
                label="Top routed venues"
                chips={m.topRoutedVenues.map((v) =>
                  v.sharePct != null ? `${v.venue} · ${v.sharePct}%` : v.venue,
                )}
              />
            )}
          </>
        )}
        {m.kind === "cross-chain" && (
          <>
            <TagMetricRow label="Integrated chains" value={m.integratedChains?.value} />
            <CuratedRow label="Native assets supported" chips={m.nativeAssetsSupported} />
            <CuratedRow label="Bridge architecture" text={m.bridgeArchitecture} />
          </>
        )}
      </div>
    </DataPanel>
  );
}

export function DexMetricsSection({ dex }: { dex?: DexMetrics | null }) {
  if (!dex) return null;
  const dep = dex.deployment;
  const chainCount = dep?.chains?.length ?? null;
  return (
    <section id="dex" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="DEX metrics"
        subtitle="Live TVL and trading volume (DeFi Llama) plus curated deployment and audit facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="TVL" sourced={dex.tvlUsd} kind="usd" />
        <MetricTile label="Volume (30d)" sourced={dex.volume30dUsd} kind="usd" />
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Governance token</p>
          <p className="mt-1 font-mono text-lg text-ink-50">{dex.governanceToken ?? "—"}</p>
          <p className="mt-1 text-[10px] text-ink-500">Curated</p>
        </div>
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500"># Chains</p>
          <p className="mt-1 font-mono text-lg text-ink-50">{chainCount ?? "—"}</p>
          <p className="mt-1 text-[10px] text-ink-500">Curated deployment</p>
        </div>
      </div>

      {dex.subSectorMetrics && <DexSubSectorPanel m={dex.subSectorMetrics} />}

      {(dex.auditHistory || dep) && (
        <DataPanel title="Security & deployment">
          <div className="divide-y divide-ink-800/60">
            <CuratedRow label="Audit / security history" text={dex.auditHistory} />
            {dep && (
              <CuratedRow
                label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
                chips={dep.chains}
              />
            )}
            {dep?.notes && <CuratedRow label="Deployment notes" text={dep.notes} />}
          </div>
        </DataPanel>
      )}
    </section>
  );
}

export function OptionsVolumeSection({
  optionsVolume,
}: {
  optionsVolume?: OptionsVolume | null;
}) {
  if (!optionsVolume) return null;
  return (
    <section id="options-volume" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Options volume"
        subtitle="Notional and premium volume from DeFi Llama options adapters."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Notional 24h</p>
          <p className="mt-1 font-mono text-lg text-ink-50">
            {optionsVolume.notionalVolume24hUsd != null
              ? fmtUsd(optionsVolume.notionalVolume24hUsd)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Notional 30d</p>
          <p className="mt-1 font-mono text-lg text-ink-50">
            {optionsVolume.notionalVolume30dUsd != null
              ? fmtUsd(optionsVolume.notionalVolume30dUsd)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Premium 24h</p>
          <p className="mt-1 font-mono text-lg text-ink-50">
            {optionsVolume.premiumVolume24hUsd != null
              ? fmtUsd(optionsVolume.premiumVolume24hUsd)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Premium 30d</p>
          <p className="mt-1 font-mono text-lg text-ink-50">
            {optionsVolume.premiumVolume30dUsd != null
              ? fmtUsd(optionsVolume.premiumVolume30dUsd)
              : "—"}
          </p>
        </div>
      </div>
      <p className="text-xs text-ink-500">
        Source: DeFi Llama · updated {optionsVolume.updatedAt ?? "—"}
      </p>
    </section>
  );
}

export function OpenInterestSection({
  openInterest,
}: {
  openInterest?: OpenInterest | null;
}) {
  if (!openInterest || openInterest.openInterestUsd == null) return null;
  return (
    <section id="open-interest" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Open interest"
        subtitle="Perpetuals open interest from DeFi Llama overview."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">Total OI</p>
          <p className="mt-1 font-mono text-lg text-ink-50">
            {fmtUsd(openInterest.openInterestUsd)}
          </p>
        </div>
        {openInterest.longOpenInterestUsd != null && (
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
            <p className="text-xs uppercase tracking-wide text-ink-500">Long OI</p>
            <p className="mt-1 font-mono text-lg text-ink-50">
              {fmtUsd(openInterest.longOpenInterestUsd)}
            </p>
          </div>
        )}
        {openInterest.shortOpenInterestUsd != null && (
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
            <p className="text-xs uppercase tracking-wide text-ink-500">Short OI</p>
            <p className="mt-1 font-mono text-lg text-ink-50">
              {fmtUsd(openInterest.shortOpenInterestUsd)}
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-ink-500">
        Source: DeFi Llama · updated {openInterest.updatedAt ?? "—"}
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* RWA sector — entity metrics + sub-sector panel                             */
/* -------------------------------------------------------------------------- */

const RWA_KIND_LABEL: Record<RwaSubSectorMetrics["kind"], string> = {
  treasuries: "Fund & treasury details",
  "private-credit": "Credit book",
  "real-estate": "Property portfolio",
  commodities: "Commodity & custody",
  carbon: "Carbon credits",
  "tokenization-infra": "Tokenization platform",
};

/** Render the sub-sector-specific panel for an RWA entity. */
function RwaSubSectorPanel({ m }: { m: RwaSubSectorMetrics }) {
  return (
    <DataPanel title={RWA_KIND_LABEL[m.kind]}>
      <div className="divide-y divide-ink-800/60">
        {m.kind === "treasuries" && (
          <>
            <CuratedRow label="Underlying assets" chips={m.underlyingAssets} />
            <CuratedRow label="Duration" text={m.duration} />
            <TagMetricRow label="Yield distribution" value={m.yieldDistribution} />
            <CuratedRow label="Fund structure" text={m.fundStructure} />
            <TagMetricRow
              label="NAV"
              value={m.navUsd?.value != null ? fmtUsd(m.navUsd.value) : null}
            />
            <CuratedRow label="Custodian" text={m.custodian} />
          </>
        )}
        {m.kind === "private-credit" && (
          <>
            <TagMetricRow label="Active borrowers" value={m.activeBorrowers?.value} />
            <TagMetricRow
              label="Cumulative originations"
              value={
                m.cumulativeOriginationsUsd?.value != null
                  ? fmtUsd(m.cumulativeOriginationsUsd.value)
                  : null
              }
            />
            <TagMetricRow
              label="Default rate"
              value={m.defaultRatePct?.value != null ? `${m.defaultRatePct.value}%` : null}
            />
            <TagMetricRow
              label="Avg maturity (days)"
              value={m.averageMaturityDays?.value}
            />
            <CuratedRow label="Tranche structure" text={m.trancheStructure} />
          </>
        )}
        {m.kind === "real-estate" && (
          <>
            <TagMetricRow label="Properties" value={m.propertiesCount?.value} />
            <TagMetricRow
              label="Avg property value"
              value={
                m.averagePropertyValueUsd?.value != null
                  ? fmtUsd(m.averagePropertyValueUsd.value)
                  : null
              }
            />
            <CuratedRow label="Rental yield range" text={m.rentalYieldRangePct} />
            <CuratedRow label="Geographic scope" text={m.geographicScope} />
            <CuratedRow label="Custody structure" text={m.custodyStructure} />
          </>
        )}
        {m.kind === "commodities" && (
          <>
            <CuratedRow label="Underlying commodity" text={m.underlyingCommodity} />
            <CuratedRow label="Custody vault" text={m.custodyVault} />
            <CuratedRow label="Redemption minimum" text={m.redemptionMinimum} />
            <CuratedRow label="Oracle provider" text={m.oracleProvider} />
          </>
        )}
        {m.kind === "carbon" && (
          <>
            <TagMetricRow
              label="Tonnes tokenized"
              value={m.creditsTokenizedTonnes?.value}
            />
            <CuratedRow label="Registry partners" chips={m.registryPartners} />
            <CuratedRow label="Vintage range" text={m.vintageRangeYears} />
          </>
        )}
        {m.kind === "tokenization-infra" && (
          <>
            <TagMetricRow label="Funds hosted" value={m.fundsHosted?.value} />
            <TagMetricRow
              label="Total AUM hosted"
              value={m.totalAumUsd?.value != null ? fmtUsd(m.totalAumUsd.value) : null}
            />
            <CuratedRow label="Registered jurisdictions" chips={m.registeredJurisdictions} />
            <CuratedRow label="Top clients" chips={m.topClients} />
          </>
        )}
      </div>
    </DataPanel>
  );
}

export function RwaMetricsSection({ rwa }: { rwa?: RwaMetrics | null }) {
  if (!rwa) return null;
  const dep = rwa.deployment;
  const chainCount = dep?.chains?.length ?? null;
  return (
    <section id="rwa" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="RWA metrics"
        subtitle="Live assets-under-management (DeFi Llama) plus curated regulatory and custody facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="AUM / TVL" sourced={rwa.aumUsd} kind="usd" />
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-500"># Chains</p>
          <p className="mt-1 font-mono text-lg text-ink-50">{chainCount ?? "—"}</p>
          <p className="mt-1 text-[10px] text-ink-500">Curated deployment</p>
        </div>
      </div>

      {(rwa.regulatoryStatus || rwa.auditHistory || dep) && (
        <DataPanel title="Regulatory, custody & deployment">
          <div className="divide-y divide-ink-800/60">
            <CuratedRow label="Regulatory status" text={rwa.regulatoryStatus} />
            <CuratedRow label="Audit / attestation history" text={rwa.auditHistory} />
            {dep && (
              <CuratedRow
                label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
                chips={dep.chains}
              />
            )}
            {dep?.notes && <CuratedRow label="Deployment notes" text={dep.notes} />}
          </div>
        </DataPanel>
      )}

      {rwa.subSectorMetrics && <RwaSubSectorPanel m={rwa.subSectorMetrics} />}
    </section>
  );
}

/** A plain (non-Sourced) metric tile for derived/curated scalars. */
function PlainTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-mono text-lg text-ink-50">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-ink-500">{hint}</p>}
    </div>
  );
}

export function StakingMetricsSection({ staking }: { staking?: StakingMetrics | null }) {
  if (!staking) return null;
  const dep = staking.deployment;
  const tvlChange = staking.tvlChangePct;
  const exchangeRate = staking.baseAssetExchangeRate?.value ?? null;
  const marketShare = staking.marketSharePct ?? null;
  const gov = staking.governanceDetail;
  const hasLive =
    staking.totalStakedUsd ||
    staking.tokenPriceUsd ||
    staking.marketCapUsd ||
    staking.stakingAprPct ||
    exchangeRate != null ||
    marketShare != null;
  return (
    <section id="staking" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Staking metrics"
        subtitle="Live total-staked, token, and yield data (DeFi Llama + CoinGecko) plus curated operator and restaking facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="Total staked" sourced={staking.totalStakedUsd} kind="usd" />
        <MetricTile label="Token price" sourced={staking.tokenPriceUsd} kind="usd" />
        <MetricTile label="Market cap" sourced={staking.marketCapUsd} kind="usd" />
        <MetricTile label="Staking APR" sourced={staking.stakingAprPct} kind="pct" />
        <PlainTile
          label="Exchange rate"
          value={exchangeRate != null ? `${exchangeRate.toFixed(4)} ${staking.underlyingAsset ?? "ETH"}` : "—"}
          hint={staking.baseAssetExchangeRate?.sourceLabel ?? "Pending live refresh"}
        />
        <PlainTile
          label="Peg deviation"
          value={staking.pegDeviationPct?.value != null ? fmtPct(staking.pegDeviationPct.value) : "—"}
          hint="Curated (needs redemption oracle)"
        />
        <PlainTile
          label="Market share"
          value={marketShare != null ? fmtPct(marketShare) : "—"}
          hint="Derived (within sub-sector)"
        />
        <PlainTile
          label="TVL change (1d / 7d)"
          value={
            tvlChange && (tvlChange.d1 != null || tvlChange.d7 != null)
              ? `${fmtPct(tvlChange.d1)} / ${fmtPct(tvlChange.d7)}`
              : "—"
          }
          hint="DeFi Llama"
        />
      </div>
      {!hasLive && (
        <p className="text-xs text-ink-500">
          Live staking metrics populate on the next DeFi Llama + CoinGecko refresh.
        </p>
      )}

      <DataPanel title="Operators, restaking & deployment">
        <div className="divide-y divide-ink-800/60">
          <CuratedRow label="Underlying asset" text={staking.underlyingAsset} />
          <CuratedRow label="Operator model" text={staking.operatorModel} />
          {staking.validatorCount?.value != null && (
            <CuratedRow label="Validators" text={staking.validatorCount.value.toLocaleString()} />
          )}
          {staking.nodeOperatorCount?.value != null && (
            <CuratedRow
              label="Node operators"
              text={staking.nodeOperatorCount.value.toLocaleString()}
            />
          )}
          <CuratedRow label="Withdrawal queue" text={staking.withdrawalQueue} />
          {staking.collateralBasket && staking.collateralBasket.length > 0 && (
            <CuratedRow
              label="Collateral basket"
              chips={staking.collateralBasket.map((c) => `${c.asset} ${c.pct}%`)}
            />
          )}
          {staking.avsData && staking.avsData.length > 0 && (
            <CuratedRow
              label="AVS exposure"
              chips={staking.avsData.map((a) =>
                a.delegatedStakeUsd != null
                  ? `${a.name} · ${fmtUsd(a.delegatedStakeUsd)}`
                  : a.name,
              )}
            />
          )}
          {staking.slashingEvents && staking.slashingEvents.length > 0 && (
            <CuratedRow
              label="Slashing history"
              text={staking.slashingEvents
                .map((s) => `${s.date}: ${s.description}`)
                .join(" · ")}
            />
          )}
          {gov && (
            <>
              {gov.proposals != null && (
                <CuratedRow label="Governance proposals" text={String(gov.proposals)} />
              )}
              {gov.treasuryUsd != null && (
                <CuratedRow label="Treasury" text={fmtUsd(gov.treasuryUsd)} />
              )}
              {gov.notes && <CuratedRow label="Governance notes" text={gov.notes} />}
            </>
          )}
          <CuratedRow label="Audit / exploit history" text={staking.auditHistory} />
          {dep && (
            <CuratedRow
              label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
              chips={dep.chains}
            />
          )}
          {dep?.notes && <CuratedRow label="Deployment notes" text={dep.notes} />}
        </div>
      </DataPanel>
    </section>
  );
}

export function LiquidityMetricsSection({ liquidity }: { liquidity?: LiquidityMetrics | null }) {
  if (!liquidity) return null;
  const tvlChange = liquidity.tvlChangePct;
  const fees = liquidity.feesRevenue;
  const dep = liquidity.deployment;
  const hasLive =
    liquidity.tvlUsd ||
    liquidity.volume24hUsd ||
    fees?.fees24hUsd != null ||
    liquidity.tokenPriceUsd;
  return (
    <section id="liquidity" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Liquidity metrics"
        subtitle="Live pool/vault TVL, DEX volume, and fees (DeFi Llama) plus curated pool facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="Protocol TVL" sourced={liquidity.tvlUsd} kind="usd" />
        <MetricTile label="24h volume" sourced={liquidity.volume24hUsd} kind="usd" />
        <PlainTile
          label="Fees (24h)"
          value={fees?.fees24hUsd != null ? fmtUsd(fees.fees24hUsd) : "—"}
          hint="DeFi Llama"
        />
        <PlainTile
          label="Revenue (24h)"
          value={fees?.revenue24hUsd != null ? fmtUsd(fees.revenue24hUsd) : "—"}
          hint="DeFi Llama"
        />
        <MetricTile label="Fee APR" sourced={liquidity.feeAprPct} kind="pct" />
        <MetricTile label="Token price" sourced={liquidity.tokenPriceUsd} kind="usd" />
        <MetricTile label="Market cap" sourced={liquidity.marketCapUsd} kind="usd" />
        <PlainTile
          label="Market share"
          value={liquidity.marketSharePct != null ? fmtPct(liquidity.marketSharePct) : "—"}
          hint="Derived (within sub-sector)"
        />
        <PlainTile
          label="TVL change (1d / 7d)"
          value={
            tvlChange && (tvlChange.d1 != null || tvlChange.d7 != null)
              ? `${fmtPct(tvlChange.d1)} / ${fmtPct(tvlChange.d7)}`
              : "—"
          }
          hint="DeFi Llama"
        />
        <MetricTile label="Pool count" sourced={liquidity.poolCount} kind="count" />
        <MetricTile label="Vault count" sourced={liquidity.vaultCount} kind="count" />
        <MetricTile label="Avg vault APY" sourced={liquidity.avgVaultApyPct} kind="pct" />
      </div>
      {!hasLive && (
        <p className="text-xs text-ink-500">
          Live liquidity metrics populate on the next DeFi Llama + CoinGecko refresh.
        </p>
      )}
      <DataPanel title="Pools, deployment & governance">
        <div className="divide-y divide-ink-800/60">
          {liquidity.topPools && liquidity.topPools.length > 0 && (
            <CuratedRow
              label="Top pools"
              chips={liquidity.topPools.map((p) =>
                p.tvlUsd != null ? `${p.name} · ${fmtUsd(p.tvlUsd)}` : p.name,
              )}
            />
          )}
          {liquidity.underlyingProtocols && liquidity.underlyingProtocols.length > 0 && (
            <CuratedRow label="Underlying protocols" chips={liquidity.underlyingProtocols} />
          )}
          <CuratedRow label="Audit / exploit history" text={liquidity.auditHistory} />
          {dep && (
            <CuratedRow
              label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
              chips={dep.chains}
            />
          )}
          {dep?.notes && <CuratedRow label="Deployment notes" text={dep.notes} />}
        </div>
      </DataPanel>
    </section>
  );
}

export function DerivativesMetricsSection({
  derivatives,
}: {
  derivatives?: DerivativesMetrics | null;
}) {
  if (!derivatives) return null;
  const tvlChange = derivatives.tvlChangePct;
  const fees = derivatives.feesRevenue;
  const dep = derivatives.deployment;
  return (
    <section id="derivatives" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Derivatives metrics"
        subtitle="Live open interest, volume, and fees (DeFi Llama) plus curated perp/vault facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="Protocol TVL" sourced={derivatives.tvlUsd} kind="usd" />
        <MetricTile label="Open interest" sourced={derivatives.openInterestUsd} kind="usd" />
        <MetricTile label="24h volume" sourced={derivatives.volume24hUsd} kind="usd" />
        <PlainTile
          label="Fees (24h)"
          value={fees?.fees24hUsd != null ? fmtUsd(fees.fees24hUsd) : "—"}
          hint="DeFi Llama"
        />
        <MetricTile label="Token price" sourced={derivatives.tokenPriceUsd} kind="usd" />
        <MetricTile label="Market cap" sourced={derivatives.marketCapUsd} kind="usd" />
        <PlainTile
          label="TVL change (1d / 7d)"
          value={
            tvlChange && (tvlChange.d1 != null || tvlChange.d7 != null)
              ? `${fmtPct(tvlChange.d1)} / ${fmtPct(tvlChange.d7)}`
              : "—"
          }
          hint="DeFi Llama"
        />
        {derivatives.maxLeverageX != null && (
          <PlainTile label="Max leverage" value={`${derivatives.maxLeverageX}x`} hint="Curated" />
        )}
        <MetricTile label="Vault APY" sourced={derivatives.vaultApyPct} kind="pct" />
        <MetricTile label="Funding rate" sourced={derivatives.fundingRatePct} kind="pct" />
      </div>
      <DataPanel title="Markets & deployment">
        <div className="divide-y divide-ink-800/60">
          {derivatives.supportedMarkets && derivatives.supportedMarkets.length > 0 && (
            <CuratedRow label="Supported markets" chips={derivatives.supportedMarkets} />
          )}
          <CuratedRow label="Pricing model" text={derivatives.pricingModel} />
          {derivatives.vaultStrategies && derivatives.vaultStrategies.length > 0 && (
            <CuratedRow label="Vault strategies" chips={derivatives.vaultStrategies} />
          )}
          {derivatives.hedgeVenue && derivatives.hedgeVenue.length > 0 && (
            <CuratedRow label="Hedge venues" chips={derivatives.hedgeVenue} />
          )}
          <CuratedRow label="Audit / exploit history" text={derivatives.auditHistory} />
          {dep && (
            <CuratedRow
              label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
              chips={dep.chains}
            />
          )}
        </div>
      </DataPanel>
    </section>
  );
}

export function OtherMetricsSection({ other }: { other?: OtherMetrics | null }) {
  if (!other) return null;
  const tvlChange = other.tvlChangePct;
  const fees = other.feesRevenue;
  const dep = other.deployment;
  return (
    <section id="other" className="scroll-mt-24 space-y-4">
      <SectionHeading
        title="Other sector metrics"
        subtitle="Live capital pool / treasury data (DeFi Llama) plus curated underwriting and governance facts."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="Protocol TVL" sourced={other.tvlUsd} kind="usd" />
        <MetricTile label="Treasury" sourced={other.treasuryUsd} kind="usd" />
        <PlainTile
          label="Fees (24h)"
          value={fees?.fees24hUsd != null ? fmtUsd(fees.fees24hUsd) : "—"}
          hint="DeFi Llama"
        />
        <MetricTile label="Token price" sourced={other.tokenPriceUsd} kind="usd" />
        <MetricTile label="Market cap" sourced={other.marketCapUsd} kind="usd" />
        <MetricTile label="Active cover" sourced={other.activeCoverUsd} kind="usd" />
        <MetricTile label="Capital pool" sourced={other.capitalPoolUsd} kind="usd" />
        <MetricTile label="Claims paid" sourced={other.claimsPaidUsd} kind="usd" />
        <MetricTile label="Bribe volume" sourced={other.bribeVolumeUsd} kind="usd" />
        <PlainTile
          label="TVL change (1d / 7d)"
          value={
            tvlChange && (tvlChange.d1 != null || tvlChange.d7 != null)
              ? `${fmtPct(tvlChange.d1)} / ${fmtPct(tvlChange.d7)}`
              : "—"
          }
          hint="DeFi Llama"
        />
      </div>
      <DataPanel title="Underwriting & governance">
        <div className="divide-y divide-ink-800/60">
          <CuratedRow label="Cover model" text={other.coverModel} />
          {other.coveredProtocols && other.coveredProtocols.length > 0 && (
            <CuratedRow label="Covered protocols" chips={other.coveredProtocols} />
          )}
          <CuratedRow label="Voting power controlled" text={other.votingPowerControlled} />
          {other.targetProtocols && other.targetProtocols.length > 0 && (
            <CuratedRow label="Target protocols" chips={other.targetProtocols} />
          )}
          <CuratedRow label="Audit / exploit history" text={other.auditHistory} />
          {dep && (
            <CuratedRow
              label={`Chains${dep.evmCompatible ? ` · EVM: ${dep.evmCompatible}` : ""}`}
              chips={dep.chains}
            />
          )}
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
            ? `Ranked top→bottom: who competes with ${networkName} and how they differ.`
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
  stablecoin?: unknown;
  dex?: unknown;
  rwa?: unknown;
  staking?: unknown;
  optionsVolume?: unknown;
  openInterest?: unknown;
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

  if (profile.memberCoins.length) items.push({ id: "member-coins", label: "Member coins" });
  if (profile.lending) items.push({ id: "lending", label: "Lending" });
  if (profile.stablecoin) items.push({ id: "stablecoin", label: "Stablecoin" });
  if (profile.dex) items.push({ id: "dex", label: "DEX" });
  if (profile.optionsVolume) items.push({ id: "options-volume", label: "Options" });
  if (profile.openInterest) items.push({ id: "open-interest", label: "Open interest" });
  if (profile.rwa) items.push({ id: "rwa", label: "RWA" });
  if (profile.staking) items.push({ id: "staking", label: "Staking" });
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
