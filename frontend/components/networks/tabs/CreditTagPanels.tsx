import { CreditMetricBands } from "@/components/networks/credit/CreditMetricBands";
import {
  LazyLeverageCurve as LeverageCurve,
  LazyYieldCurveChart as YieldCurveChart,
} from "@/components/networks/credit/LazyCharts";
import { ProtocolChipChain } from "@/components/networks/credit/ProtocolChipChain";
import { DataPanel } from "@/components/ui/DataPanel";
import { DonutChart } from "@/components/ui/DonutChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BarColumnChart } from "@/components/ui/charts/BarColumnChart";
import { DualLineChart } from "@/components/ui/charts/DualLineChart";
import { RateCurveChart } from "@/components/ui/charts/RateCurveChart";
import { buildFixedIncomeBands } from "@/lib/networks/creditFixedIncome";
import { buildLendingBands } from "@/lib/networks/creditLending";
import { buildLeveragedYieldBands } from "@/lib/networks/creditLeveragedYield";
import type { TimeRange } from "@/lib/networks/timeRange";
import type { NetworkProfile } from "@/lib/types";

/**
 * M4 per-tag Credit panels (CAN-69 / CAN-68 / CAN-64): async server
 * components that assemble MetricCardModel bands in lib/networks/* and render
 * them through the shared CreditMetricBands shell plus the tag-specific
 * charts. Interactive charts (YieldCurveChart, LeverageCurve) are client
 * components that only load when their sub-tab is activated (MetricsTabView
 * renders the active panel only).
 */

export async function CreditLendingPanel({
  profile,
  range,
}: {
  profile: NetworkProfile;
  range: TimeRange;
}) {
  const data = await buildLendingBands(profile, range);
  return (
    <CreditMetricBands bands={data.bands}>
      <section className="space-y-4">
        <SectionHeading
          title="Lending charts"
          subtitle="Rate model, collateral composition, and history slots."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <DataPanel title="Supply and borrow APY vs utilization">
            {data.rateCurve ? (
              <RateCurveChart
                id={`rate-${profile.slug}`}
                model={data.rateCurve.model}
                currentUtilizationPct={data.rateCurve.currentUtilizationPct}
                ariaLabel={`${profile.name} supply and borrow APY as a function of utilization with the rate-model kink marked`}
              />
            ) : (
              <EmptyState
                title="Rate model not curated yet"
                note="The kink chart needs the protocol's interest-rate-model params (base rate, slopes, optimal utilization)."
                chip="Pending"
              />
            )}
          </DataPanel>
          <DataPanel title="Collateral composition">
            {data.donut ? (
              <div className="flex items-center gap-6">
                <DonutChart
                  segments={data.donut}
                  ariaLabel={`${profile.name} pool TVL by asset`}
                  size={120}
                />
                <ul className="space-y-1 text-xs text-ink-300">
                  {data.donut.map((s) => (
                    <li key={s.label}>{s.label}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                title="No per-pool breakdown"
                note="The free DeFi Llama pools endpoint has no pools for this protocol."
                chip="Pending"
              />
            )}
          </DataPanel>
          <DataPanel title="Utilization over time">
            <EmptyState
              title="History accumulation deferred"
              note="No free source provides utilization history; a cron-side daily series is on the deferred register (decision 2026-07-26)."
              chip="Pending"
            />
          </DataPanel>
          <DataPanel title="Liquidations">
            <EmptyState
              title="Liquidation history deferred"
              note="Needs an on-chain event scan or Dune; on the deferred register (decision 2026-07-26)."
              chip="Tier 2"
            />
          </DataPanel>
        </div>
      </section>
    </CreditMetricBands>
  );
}

export async function CreditLeveragedYieldPanel({
  profile,
  range,
}: {
  profile: NetworkProfile;
  range: TimeRange;
}) {
  const data = await buildLeveragedYieldBands(profile, range);
  return (
    <CreditMetricBands bands={data.bands}>
      <section className="space-y-4">
        <SectionHeading
          title="Leverage charts"
          subtitle="Where leverage stops paying, and what this venue depends on."
        />
        <div className="space-y-4">
          <DataPanel title="Net looping APY vs leverage multiple">
            {data.leverageCurve ? (
              <LeverageCurve inputs={data.leverageCurve} id={profile.slug} />
            ) : (
              <EmptyState
                title="Leverage curve unavailable"
                note="Needs a live base strategy APY, a curated borrow APY, and the max leverage multiple."
                chip="Pending"
              />
            )}
          </DataPanel>
          <div className="grid gap-4 lg:grid-cols-2">
            <DataPanel title="Position distribution by leverage band">
              <EmptyState
                title="Position data not wired"
                note="Per-position leverage needs a subgraph or Dune query."
                chip="Tier 2"
              />
            </DataPanel>
            <DataPanel title="Protocol dependency chain">
              {data.chipChain ? (
                <ProtocolChipChain
                  protocols={data.chipChain.protocols}
                  trackedSlugsByName={data.chipChain.trackedSlugsByName}
                />
              ) : (
                <EmptyState
                  title="No integrated protocols curated"
                  note="The dependency chain renders from the curated integrated-protocols list."
                  chip="Pending"
                />
              )}
            </DataPanel>
          </div>
        </div>
      </section>
    </CreditMetricBands>
  );
}

export async function CreditFixedIncomePanel({
  profile,
  range,
}: {
  profile: NetworkProfile;
  range: TimeRange;
}) {
  const data = await buildFixedIncomeBands(profile, range);
  return (
    <CreditMetricBands bands={data.bands}>
      <section className="space-y-4">
        <SectionHeading
          title="Fixed income charts"
          subtitle="The curve, the carry, and the maturity ladder."
        />
        <div className="space-y-4">
          <DataPanel title="Yield curve by maturity">
            {data.yieldCurve && data.yieldCurve.length >= 2 ? (
              <YieldCurveChart
                markets={data.yieldCurve}
                id={profile.slug}
                ariaLabel={`${profile.name} implied fixed APY by days to maturity across active markets`}
              />
            ) : (
              <EmptyState
                title="No live per-market source"
                note="The interactive curve needs live per-market implied APYs; only Pendle exposes them keylessly today."
                chip="Pending"
              />
            )}
          </DataPanel>
          <div className="grid gap-4 lg:grid-cols-2">
            <DataPanel title="Implied vs underlying APY">
              {data.spread ? (
                <DualLineChart
                  id={`spread-${profile.slug}`}
                  a={{ label: `Implied (${data.spread.marketName})`, color: "#5C92FF", points: data.spread.implied }}
                  b={{ label: "Underlying", color: "#F59E0B", points: data.spread.underlying }}
                  unit="pct"
                  ariaLabel={`${profile.name} implied versus underlying APY over time for the deepest market`}
                />
              ) : (
                <EmptyState
                  title="No APY history"
                  note="Needs the per-market historical-data endpoint (Pendle only today)."
                  chip="Pending"
                />
              )}
            </DataPanel>
            <DataPanel title="PT / YT convergence to maturity">
              {data.convergence ? (
                <div>
                  <DualLineChart
                    id={`conv-${profile.slug}`}
                    a={{ label: `PT (${data.convergence.marketName})`, color: "#5C92FF", points: data.convergence.pt }}
                    b={{ label: "YT", color: "#F59E0B", points: data.convergence.yt }}
                    unit="ratio"
                    ariaLabel={`${profile.name} principal and yield token prices in underlying units converging to maturity`}
                  />
                  <p className="mt-2 text-xs text-ink-400">
                    Derived from the implied-APY history: PT = 1 / (1 + APY)^(days / 365), YT = 1
                    − PT. Price history itself is not exposed by the API.
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="No convergence series"
                  note="Derived from implied-APY history; unavailable without a live market source."
                  chip="Pending"
                />
              )}
            </DataPanel>
          </div>
          <DataPanel title="Notional outstanding by expiry">
            {data.maturityLadder ? (
              <BarColumnChart
                id={`ladder-${profile.slug}`}
                data={data.maturityLadder}
                unit="usd"
                ariaLabel={`${profile.name} notional outstanding by expiry month`}
              />
            ) : (
              <EmptyState
                title="No notional breakdown"
                note="Needs per-market PT supply and prices (Pendle only today)."
                chip="Pending"
              />
            )}
          </DataPanel>
        </div>
      </section>
    </CreditMetricBands>
  );
}
