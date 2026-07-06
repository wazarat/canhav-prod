import type { ReactNode } from "react";

import { MetricCard } from "@/components/networks/tabs/MetricCard";
import { RwaTagMetricsSection } from "@/components/networks/NetworkSections";
import { Badge } from "@/components/ui/Badge";
import { DataPanel } from "@/components/ui/DataPanel";
import type {
  NetworkProfile,
  RwaCharacteristicMetrics,
  RwaGeneralMetrics,
  RwaSecondaryTag,
} from "@/lib/types";

/** RwaSecondaryTag -> key in RwaCharacteristicMetrics. */
export const RWA_CHARACTERISTIC_KEY: Record<
  RwaSecondaryTag,
  keyof RwaCharacteristicMetrics
> = {
  "Institutional-Gated": "institutionalGated",
  "Yield-Bearing": "yieldBearing",
  "Real-World-Custody": "realWorldCustody",
  "DAO-Governed": "daoGoverned",
  "Multi-Chain": "multiChain",
};

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

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

/** The "General RWA" sub-tab: rollup KPIs + the asset-class sub-sector panels. */
export function RwaGeneralPanel({ profile }: { profile: NetworkProfile }) {
  const g: RwaGeneralMetrics | null | undefined = profile.rwaGeneral;
  const tags = profile.rwaSubSector ? [profile.rwaSubSector] : [];
  const hasGeneral = Boolean(g);
  const hasTagMetrics = Boolean(profile.rwaTagMetrics);
  if (!hasGeneral && !hasTagMetrics) {
    return (
      <DataPanel title="General RWA">
        <p className="py-2 text-sm text-ink-300">
          General RWA metrics for this network are not yet collected.
        </p>
      </DataPanel>
    );
  }
  return (
    <div className="space-y-4">
      {g ? (
        <DataPanel title="General RWA">
          <Grid>
            <MetricCard label="AUM" sourced={g.aumUsd} kind="usd" />
            <MetricCard label="Holders" sourced={g.holders} kind="count" />
          </Grid>
          <div className="mt-3 divide-y divide-ink-800/60">
            <CuratedRow label="Asset classes" chips={g.assetClasses} />
            <CuratedRow label="Issuer" text={g.issuer} />
            <CuratedRow label="Jurisdiction" text={g.jurisdiction} />
            <CuratedRow label="Regulatory status" text={g.regulatoryStatus} />
            <CuratedRow label="Redemption model" text={g.redemptionModel} />
            <CuratedRow label="Audit history" text={g.auditHistory} />
          </div>
        </DataPanel>
      ) : null}
      {hasTagMetrics ? (
        <RwaTagMetricsSection tags={tags} metrics={profile.rwaTagMetrics} />
      ) : null}
    </div>
  );
}

/** One RWA characteristic sub-tab (Institutional-Gated / Yield-Bearing / …). */
export function RwaCharacteristicPanel({
  tag,
  characteristics,
}: {
  tag: RwaSecondaryTag;
  characteristics?: RwaCharacteristicMetrics | null;
}) {
  const key = RWA_CHARACTERISTIC_KEY[tag];
  const block = characteristics?.[key];

  if (!block) {
    return (
      <DataPanel title={tag}>
        <p className="py-2 text-sm text-ink-300">
          {tag} metrics for this network are not yet collected.
        </p>
      </DataPanel>
    );
  }

  if (key === "institutionalGated") {
    const m = block as NonNullable<RwaCharacteristicMetrics["institutionalGated"]>;
    return (
      <DataPanel title={tag}>
        <Grid>
          <MetricCard
            label="Min investment"
            value={m.minInvestmentUsd ?? null}
            kind="usd"
            source="Curated"
          />
          <MetricCard label="Whitelisted addresses" sourced={m.whitelistedAddresses} kind="count" />
        </Grid>
        <div className="mt-3 divide-y divide-ink-800/60">
          <CuratedRow label="KYC / AML" text={m.kycModel} />
          <CuratedRow label="Access model" text={m.accessModel} />
          <CuratedRow label="Transfer restrictions" text={m.transferRestrictions} />
          <CuratedRow label="Eligible jurisdictions" chips={m.eligibleJurisdictions} />
        </div>
      </DataPanel>
    );
  }

  if (key === "yieldBearing") {
    const m = block as NonNullable<RwaCharacteristicMetrics["yieldBearing"]>;
    return (
      <DataPanel title={tag}>
        <Grid>
          <MetricCard label="Current yield" sourced={m.currentYieldPct} kind="pct" />
          <MetricCard label="Benchmark spread" sourced={m.benchmarkSpreadPct} kind="pct" />
          <MetricCard label="SOFR benchmark" sourced={m.benchmarkSofrPct} kind="pct" />
        </Grid>
        <div className="mt-3 divide-y divide-ink-800/60">
          <CuratedRow label="Yield source" text={m.yieldSource} />
          <CuratedRow label="Distribution model" text={m.distributionModel} />
          <CuratedRow label="Underlying instrument" text={m.underlyingInstrument} />
        </div>
      </DataPanel>
    );
  }

  if (key === "realWorldCustody") {
    const m = block as NonNullable<RwaCharacteristicMetrics["realWorldCustody"]>;
    return (
      <DataPanel title={tag}>
        <div className="divide-y divide-ink-800/60">
          <CuratedRow label="Custodians" chips={m.custodians} />
          <CuratedRow label="Custody model" text={m.custodyModel} />
          <CuratedRow label="Reserve composition" text={m.reserveComposition} />
          <CuratedRow label="Attestation firms" chips={m.auditFirms} />
          <CuratedRow label="Attestation page" text={m.attestationUrl} />
          <CuratedRow label="Proof-of-reserves" text={m.proofOfReservesUrl} />
        </div>
      </DataPanel>
    );
  }

  if (key === "daoGoverned") {
    const m = block as NonNullable<RwaCharacteristicMetrics["daoGoverned"]>;
    return (
      <DataPanel title={tag}>
        <Grid>
          <MetricCard label="Proposals" sourced={m.proposalCount} kind="count" />
          <MetricCard label="Voter turnout" sourced={m.voterTurnoutPct} kind="pct" />
          <MetricCard label="Treasury" sourced={m.treasuryUsd} kind="usd" />
        </Grid>
        <div className="mt-3 divide-y divide-ink-800/60">
          <CuratedRow label="Governance token" text={m.governanceToken} />
          <CuratedRow label="Governance forum" text={m.governanceForum} />
        </div>
      </DataPanel>
    );
  }

  // multiChain
  const m = block as NonNullable<RwaCharacteristicMetrics["multiChain"]>;
  return (
    <DataPanel title={tag}>
      <Grid>
        <MetricCard label="Chain count" value={m.chainCount ?? null} kind="count" source="Curated" />
      </Grid>
      <div className="mt-3 divide-y divide-ink-800/60">
        <CuratedRow label="Chains" chips={m.chains} />
        <CuratedRow label="Primary chain" text={m.primaryChain} />
        <CuratedRow label="Cross-chain standard" text={m.crossChainStandard} />
        <CuratedRow label="Bridge model" text={m.bridgeModel} />
      </div>
    </DataPanel>
  );
}
