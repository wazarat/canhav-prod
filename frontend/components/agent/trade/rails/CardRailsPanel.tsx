"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  countCaught,
  eventsForAsset,
  runBacktest,
  type EventResult,
  type RailFire,
} from "./backtest";
import {
  defaultRailState,
  FAMILY_LABELS,
  RAILS,
  type RailAsset,
  type RailDef,
  type RailFamily,
  type RailSeverity,
  type RailState,
} from "./railDefs";

/** Live desk readings the server component passes down; every field fails soft. */
export interface RailLiveInputs {
  utilizationPct: number | null;
  utilizationSymbol: string | null;
  change24hPct: number | null;
  priceUsd: number | null;
}

const SEVERITY_TONE: Record<RailSeverity, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

/** Notional a rail files when it trips; well inside the $50 desk hard cap. */
const RAIL_PROPOSE_SIZE_USD = 8;

/** The trade side a rail's suggested action maps to; null = never proposes. */
function railProposeSide(action: RailDef["suggests"]["action"]): "long" | "short" | null {
  if (action === "SELL" || action === "REDUCE" || action === "TRIM") return "short";
  if (action === "BUY") return "long";
  return null;
}

type RailProposeStatus = { busy?: boolean; ok?: boolean; error?: string };

const SEVERITY_RANK: Record<RailSeverity, number> = { high: 2, medium: 1, low: 0 };

/** A rail currently tripping on live data with a proposable side. */
interface TrippingRail {
  rail: RailDef;
  side: "long" | "short";
  reading: { label: string; value: number };
  threshold: string;
}

/** Enabled rails whose live reading crosses their current threshold. */
function trippingRails(
  state: RailState,
  live: RailLiveInputs | null,
  asset: RailAsset,
): TrippingRail[] {
  const out: TrippingRail[] = [];
  for (const rail of RAILS) {
    const st = state[rail.id];
    if (!st?.enabled || !rail.threshold) continue;
    const side = railProposeSide(rail.suggests.action);
    if (!side) continue;
    const reading = liveReading(rail, live, asset);
    if (!reading) continue;
    const trips =
      rail.threshold.direction === "gte"
        ? reading.value >= st.value
        : reading.value <= st.value;
    if (trips) {
      out.push({
        rail,
        side,
        reading,
        threshold: formatValue(st.value, rail.threshold.unit),
      });
    }
  }
  return out.sort((a, b) => SEVERITY_RANK[b.rail.severity] - SEVERITY_RANK[a.rail.severity]);
}

/** Results at factory defaults, the fixed baseline the delta chips compare against. */
const DEFAULT_RESULTS: Record<RailAsset, EventResult[]> = {
  AAVE: runBacktest(RAILS, defaultRailState(RAILS), eventsForAsset("AAVE")),
  ETH: runBacktest(RAILS, defaultRailState(RAILS), eventsForAsset("ETH")),
};

function formatValue(value: number, unit: string): string {
  return `${value}${unit}`;
}

function tripLabel(rail: RailDef, value: number): string {
  if (!rail.threshold) return "event-driven";
  const cmp = rail.threshold.direction === "gte" ? "≥" : "≤";
  return `trips ${cmp} ${formatValue(value, rail.threshold.unit)}`;
}

/** The live reading that matches a rail's watched metric, if the desk has one. */
function liveReading(
  rail: RailDef,
  live: RailLiveInputs | null,
  asset: RailAsset,
): { label: string; value: number; trips: boolean } | null {
  if (!live || !rail.threshold) return null;
  const { key } = rail.threshold;
  if ((key === "utilizationPct" || key === "sustainedUtilizationPct") &&
      live.utilizationPct != null) {
    const label = live.utilizationSymbol
      ? `now ${live.utilizationPct.toFixed(1)}% (${live.utilizationSymbol})`
      : `now ${live.utilizationPct.toFixed(1)}%`;
    return { label, value: live.utilizationPct, trips: false };
  }
  if (key === "change24hPct" && live.change24hPct != null) {
    return {
      label: `${asset} 24h ${live.change24hPct >= 0 ? "+" : ""}${live.change24hPct.toFixed(1)}%`,
      value: live.change24hPct,
      trips: false,
    };
  }
  return null;
}

function RailCard({
  rail,
  state,
  onToggle,
  onValue,
  live,
  asset,
  onPropose,
  proposeStatus,
}: {
  rail: RailDef;
  state: { enabled: boolean; value: number };
  onToggle: () => void;
  onValue: (value: number) => void;
  live: RailLiveInputs | null;
  asset: RailAsset;
  /** Set when the owner desk can file proposals from tripping rails. */
  onPropose?: (rail: RailDef, side: "long" | "short") => void;
  proposeStatus?: RailProposeStatus;
}) {
  const reading = liveReading(rail, live, asset);
  const readingTrips =
    reading != null &&
    state.enabled &&
    rail.threshold != null &&
    (rail.threshold.direction === "gte"
      ? reading.value >= state.value
      : reading.value <= state.value);
  const changed = rail.threshold != null && state.value !== rail.threshold.defaultValue;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        state.enabled
          ? "border-ink-800/60 bg-ink-950/40"
          : "border-ink-800/40 bg-ink-950/20 opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={state.enabled}
          aria-label={`${rail.name} rail`}
          onClick={onToggle}
          className={cn(
            "relative h-4 w-7 shrink-0 rounded-full border transition-colors",
            state.enabled
              ? "border-electric-500/40 bg-electric-500/30"
              : "border-ink-700 bg-ink-900",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all",
              state.enabled ? "left-3.5 bg-electric-400" : "left-0.5 bg-ink-500",
            )}
          />
        </button>
        <span className="text-sm font-semibold text-ink-100">{rail.name}</span>
        <Badge tone={SEVERITY_TONE[rail.severity]} className="px-1.5 py-0 font-mono text-[9px]">
          {rail.suggests.action.toLowerCase()}
        </Badge>
        {reading && (
          <span
            className={cn(
              "ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px]",
              readingTrips
                ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                : "border-ink-700/80 bg-ink-900/60 text-ink-400",
            )}
          >
            {reading.label}
            {readingTrips && " · tripping"}
          </span>
        )}
      </div>

      <p className="mt-1.5 font-mono text-[10px] text-ink-400">
        watch {rail.watch} <span className="text-ink-600">·</span> {tripLabel(rail, state.value)}
        {rail.note && (
          <>
            {" "}
            <span className="text-ink-600">·</span> {rail.note}
          </>
        )}
        {rail.secondary && (
          <>
            {" "}
            <span className="text-ink-600">·</span> {rail.secondary.label}
          </>
        )}
        {rail.emits && (
          <>
            {" "}
            <span className="text-ink-600">·</span> emits{" "}
            <span className="text-ink-200">{rail.emits}</span>
          </>
        )}
      </p>

      {rail.interactive && rail.threshold && (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={rail.threshold.min}
            max={rail.threshold.max}
            step={rail.threshold.step}
            value={state.value}
            disabled={!state.enabled}
            onChange={(e) => onValue(Number(e.target.value))}
            aria-label={`${rail.name} threshold`}
            className="h-1 flex-1 cursor-pointer accent-electric-500 disabled:cursor-not-allowed"
          />
          <span className="tabular w-14 text-right font-mono text-xs text-ink-100">
            {formatValue(state.value, rail.threshold.unit)}
          </span>
          {changed && (
            <span className="font-mono text-[10px] text-ink-500">
              default {formatValue(rail.threshold.defaultValue, rail.threshold.unit)}
            </span>
          )}
        </div>
      )}

      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
        suggests <span className="text-ink-300">{rail.suggests.detail}</span>
      </p>

      {(() => {
        // A rail that is tripping on the live reading can file a real
        // proposal into the same propose -> approve -> sign pipeline.
        const side = railProposeSide(rail.suggests.action);
        if (!onPropose || !side || !readingTrips) return null;
        return (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPropose(rail, side)}
              disabled={proposeStatus?.busy || proposeStatus?.ok}
              className={cn(
                "rounded-lg border px-2.5 py-1 font-mono text-[10px] transition-colors",
                proposeStatus?.ok
                  ? "cursor-default border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-electric-500/40 bg-electric-500/10 text-electric-400 hover:bg-electric-500/20 disabled:opacity-60",
              )}
            >
              {proposeStatus?.busy
                ? "filing proposal..."
                : proposeStatus?.ok
                  ? "proposal filed"
                  : `rail tripping: file ${side === "short" ? "sell" : "buy"} proposal · $${RAIL_PROPOSE_SIZE_USD} · 1x`}
            </button>
            {proposeStatus?.ok && (
              <span className="text-[10px] text-ink-400">
                review it under Proposed trades; nothing executes until you approve and sign.
              </span>
            )}
            {proposeStatus?.error && (
              <span className="text-[10px] text-rose-400">{proposeStatus.error}</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function fireChip(fire: RailFire): string {
  if (fire.threshold == null) return fire.railName.toLowerCase();
  const cmp = fire.observed >= fire.threshold ? "≥" : "≤";
  return `${fire.railName.toLowerCase()} ${formatValue(fire.observed, fire.unit)} ${cmp} ${formatValue(fire.threshold, fire.unit)}`;
}

function EventRow({
  result,
  defaultResult,
}: {
  result: EventResult;
  defaultResult: EventResult;
}) {
  const fired = result.fired;
  const changedByUser = fired !== defaultResult.fired;
  const firedFires = result.fires.filter((f) => f.fired);
  // Rails that caught this event at defaults but no longer trip at the
  // presenter's current settings: render struck through, not hidden.
  const lostFires = defaultResult.fires.filter(
    (f) => f.fired && !firedFires.some((g) => g.railId === f.railId),
  );
  const maxSeverity: RailSeverity = firedFires.some((f) => f.severity === "high")
    ? "high"
    : firedFires.some((f) => f.severity === "medium")
      ? "medium"
      : "low";

  return (
    <div
      key={`${result.event.id}-${fired}`}
      className={cn(
        "px-4 py-3 transition-colors",
        changedByUser && "animate-[pulse_0.6s_ease-in-out_2]",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-ink-500">{result.event.date}</span>
        <span className="text-sm font-medium text-ink-100">{result.event.title}</span>
        {fired ? (
          <Badge tone={SEVERITY_TONE[maxSeverity]} className="px-1.5 py-0 font-mono text-[9px]">
            fired · {maxSeverity}
          </Badge>
        ) : (
          <Badge tone="neutral" className="px-1.5 py-0 font-mono text-[9px]">
            suppressed
          </Badge>
        )}
        {changedByUser && (
          <Badge tone="warning" className="px-1.5 py-0 font-mono text-[9px]">
            changed by your settings
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">{result.event.summary}</p>
      {(firedFires.length > 0 || lostFires.length > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {firedFires.map((fire) => (
            <span
              key={fire.railId}
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                fire.severity === "high"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-200",
              )}
            >
              {fireChip(fire)}
            </span>
          ))}
          {lostFires.map((fire) => (
            <span
              key={fire.railId}
              className="rounded-full border border-ink-800/60 bg-ink-950/40 px-2 py-0.5 font-mono text-[10px] text-ink-500 line-through"
            >
              {fireChip(fire)}
            </span>
          ))}
        </div>
      )}
      {fired ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-300">
          <span className="font-mono text-[10px] text-ink-500">agent files:</span>{" "}
          {result.event.wouldHaveSaid}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
          No rail trips at these settings; the agent stays silent through this one.
        </p>
      )}
      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{result.event.outcome}</p>
    </div>
  );
}

/**
 * Card rails for the AAVE and ETH desks: toggleable trigger rules the agent
 * watches, with editable thresholds and a live backtest showing how each
 * setting would have fired on real market history. Settings live in this
 * session only (nothing persists); rails only ever propose through the
 * existing research gate and approval pipeline.
 */
export function CardRailsPanel({
  asset,
  live,
  agentId,
}: {
  asset: RailAsset;
  live: RailLiveInputs | null;
  /** Owner's agent id; when set, tripping rails can file real proposals. */
  agentId?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<RailState>(() => defaultRailState(RAILS));
  const [proposeStatus, setProposeStatus] = useState<Record<string, RailProposeStatus>>({});

  const events = useMemo(() => eventsForAsset(asset), [asset]);
  const results = useMemo(() => runBacktest(RAILS, state, events), [state, events]);

  async function fileProposal(statusKey: string, side: "long" | "short", reason: string) {
    if (!agentId) return;
    setProposeStatus((s) => ({ ...s, [statusKey]: { busy: true } }));
    try {
      const res = await fetch(
        `/api/agent/${encodeURIComponent(agentId)}/trade-proposals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset,
            side,
            sizeUsdHuman: RAIL_PROPOSE_SIZE_USD,
            leverage: 1,
            reason,
          }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Filing failed (${res.status}).`);
      setProposeStatus((s) => ({ ...s, [statusKey]: { ok: true } }));
      // Surface the new card in the Proposed trades panel (an RSC).
      router.refresh();
    } catch (e) {
      setProposeStatus((s) => ({
        ...s,
        [statusKey]: { error: e instanceof Error ? e.message : "Filing failed." },
      }));
    }
  }

  function proposeFromRail(rail: RailDef, side: "long" | "short") {
    const trip = trippingRails(state, live, asset).find((t) => t.rail.id === rail.id);
    const reason = trip
      ? `Guardrail "${rail.name}" tripped on live data: ${trip.reading.label} against threshold ${trip.threshold}. ${rail.suggests.detail}.`
      : `Guardrail "${rail.name}" tripped on live data. ${rail.suggests.detail}.`;
    void fileProposal(rail.id, side, reason);
  }

  function finalizeRails(tripping: TrippingRail[], armed: number) {
    const top = tripping[0];
    if (top) {
      const others = tripping.slice(1).map((t) => t.rail.name);
      const reason =
        `Guardrails finalized: "${top.rail.name}" tripping on live data (${top.reading.label} against threshold ${top.threshold}). ${top.rail.suggests.detail}.` +
        (others.length ? ` Also tripping: ${others.join(", ")}.` : "");
      void fileProposal("finalize", top.side, reason);
      return;
    }
    // All rails clear: finalizing still files a trade so the configuration
    // always ends in a proposal — a starter buy, per the momentum-positive
    // add policy. The research gate re-checks server-side either way.
    void fileProposal(
      "finalize",
      "long",
      `Guardrails finalized: all ${armed} armed rails clear on live data with a fresh positive research verdict. Filing a starter buy per the momentum-positive add policy.`,
    );
  }
  const { caught, total } = countCaught(results);
  const isDefault = useMemo(
    () => JSON.stringify(state) === JSON.stringify(defaultRailState(RAILS)),
    [state],
  );

  function clearFinalizeStatus() {
    // Any settings change re-arms the finalize button so a fresh
    // configuration can always be filed as a new proposal.
    setProposeStatus((s) => (s.finalize ? { ...s, finalize: {} } : s));
  }
  function toggle(id: string) {
    setState((s) => ({ ...s, [id]: { ...s[id], enabled: !s[id].enabled } }));
    clearFinalizeStatus();
  }
  function setValue(id: string, value: number) {
    setState((s) => ({ ...s, [id]: { ...s[id], value } }));
    clearFinalizeStatus();
  }

  const families: RailFamily[] = ["dependency", "protocol", "market", "governance"];
  // Families holding the three interactive sliders stay open; the rest fold.
  const openFamilies = new Set<RailFamily>(["dependency", "market"]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Guardrails
        </p>
        <Badge tone="signal" className="px-1.5 py-0 font-mono text-[9px] uppercase">
          propose only
        </Badge>
        {!isDefault && (
          <button
            type="button"
            onClick={() => setState(defaultRailState(RAILS))}
            className="ml-auto font-mono text-[10px] text-electric-400 transition-colors hover:text-electric-300"
          >
            reset defaults
          </button>
        )}
      </div>
      <p className="text-xs leading-relaxed text-ink-500">
        Each rail watches an input, trips a threshold, and suggests an action. Rails only ever
        propose; the research gate stays first and every fire needs your approval. Move a
        threshold to see how the call would have changed on real market history below. Settings
        here are session-only.
      </p>

      {/* Rails left, backtest right: moving a threshold updates the fired /
          suppressed calls next to it instead of below the fold. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {families.map((family) => {
            const familyRails = RAILS.filter((r) => r.family === family);
            const body = (
              <div className="space-y-2">
                {familyRails.map((rail) => (
                  <RailCard
                    key={rail.id}
                    rail={rail}
                    state={state[rail.id]}
                    onToggle={() => toggle(rail.id)}
                    onValue={(v) => setValue(rail.id, v)}
                    live={live}
                    asset={asset}
                    onPropose={agentId ? proposeFromRail : undefined}
                    proposeStatus={proposeStatus[rail.id]}
                  />
                ))}
              </div>
            );
            if (openFamilies.has(family)) {
              return (
                <div key={family} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                    {FAMILY_LABELS[family]}
                  </p>
                  {body}
                </div>
              );
            }
            return (
              <details key={family} className="group space-y-2">
                <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wider text-ink-500 transition-colors hover:text-ink-300">
                  <span className="mr-1 inline-block transition-transform group-open:rotate-90">
                    ›
                  </span>
                  {FAMILY_LABELS[family]}{" "}
                  <span className="font-mono text-[10px] normal-case text-ink-600">
                    {familyRails.length} rails
                  </span>
                </summary>
                <div className="mt-2">{body}</div>
              </details>
            );
          })}
        </div>

        <div className="self-start rounded-xl border border-ink-800/60 bg-ink-950/40 lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-800/60 px-4 py-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
              <History className="h-3.5 w-3.5" /> Backtest
            </p>
            <span className="tabular font-mono text-xs text-ink-200">
              {caught} of {total}{" "}
              <span className="text-ink-400">historical events caught at current settings</span>
            </span>
          </div>
          <div className="divide-y divide-ink-800/60">
            {results.map((result, i) => (
              <EventRow
                key={result.event.id}
                result={result}
                defaultResult={DEFAULT_RESULTS[asset][i]}
              />
            ))}
          </div>
        </div>
      </div>

      {agentId &&
        (() => {
          const tripping = trippingRails(state, live, asset);
          const armed = RAILS.filter((r) => state[r.id]?.enabled).length;
          const status = proposeStatus.finalize;
          const top = tripping[0];
          return (
            <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Finalize guardrails
                </p>
                <span className="tabular font-mono text-[10px] text-ink-400">
                  {armed} armed <span className="text-ink-600">·</span> {tripping.length}{" "}
                  tripping on live data
                </span>
              </div>
              {tripping.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tripping.map((t) => (
                    <span
                      key={t.rail.id}
                      className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-200"
                    >
                      {t.rail.name.toLowerCase()}: {t.reading.label} vs {t.threshold}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => finalizeRails(tripping, armed)}
                  disabled={status?.busy || status?.ok}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-colors",
                    status?.ok
                      ? "cursor-default border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-electric-500/40 bg-electric-500/10 text-electric-400 hover:bg-electric-500/20 disabled:opacity-60",
                  )}
                >
                  {status?.busy
                    ? "filing proposal..."
                    : status?.ok
                      ? "proposal filed"
                      : `finalize guardrails: file ${top && top.side === "short" ? "sell" : "buy"} proposal · $${RAIL_PROPOSE_SIZE_USD} · 1x`}
                </button>
                {status?.ok && (
                  <span className="text-[10px] text-ink-400">
                    review it under Proposed trades; nothing executes until you approve and sign.
                  </span>
                )}
                {status?.error && (
                  <span className="text-[10px] text-rose-400">{status.error}</span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
                {top
                  ? "A tripping guardrail files its de-risk side."
                  : "All armed guardrails are clear on live data, so finalizing files the research-gated starter buy; a tripping guardrail files its de-risk side instead."}
              </p>
            </div>
          );
        })()}

      <p className="text-[11px] leading-relaxed text-ink-500">
        A fired rail only files a proposal through the same propose, then approve path as every
        other call.{" "}
        {asset === "AAVE"
          ? "Nothing executes without your approval, and AAVE stays recommendation-only."
          : "Nothing executes until you approve the proposal and sign it in your wallet; only then does a GMX order go out."}
      </p>
    </div>
  );
}
