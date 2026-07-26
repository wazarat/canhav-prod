"use client";

import dynamic from "next/dynamic";

/**
 * Client-side lazy wrappers for the two INTERACTIVE M4 charts. next/dynamic
 * only code-splits client chunks when called from a CLIENT component (the
 * MetricCardGrid/MetricDetailPanel precedent from M3); calling it in the
 * server panels inlined both charts into the route bundle (+27 kB First
 * Load, measured). These wrappers keep the visx + handler code in chunks
 * that load when the sub-tab first renders.
 */

export const LazyYieldCurveChart = dynamic(
  () => import("@/components/ui/charts/YieldCurveChart").then((m) => m.YieldCurveChart),
  { loading: () => <div className="h-64 animate-pulse rounded-xl bg-ink-900/40" /> },
);

export const LazyLeverageCurve = dynamic(
  () => import("@/components/networks/credit/LeverageCurve").then((m) => m.LeverageCurve),
  { loading: () => <div className="h-64 animate-pulse rounded-xl bg-ink-900/40" /> },
);
