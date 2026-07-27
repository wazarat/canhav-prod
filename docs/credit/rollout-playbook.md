# Sector rollout playbook (CAN-82 deliverable, M10 — 2026-07-27)

Credit was the proving ground (M0–M10). This is what generalises to the other
five sectors (Staking, Liquidity, Derivatives, RWA, Other), what stays
Credit-specific, the recommended order, and effort estimates now that the
shared components exist.

## What generalises (build once, reuse per sector)

**Shared UI primitives (already sector-agnostic):**
- `components/ui/SectionHeading` (canonical tab heading, CAN-53), `SegmentedControl`
  (M6 extraction from TradeModeSelector), `Card`/`DataPanel`, `Table` family,
  `Tooltip`, `useModalBehavior` (M2.5 hook — consume for every new dialog),
  `components/shared/riskTone.ts` (SEVERITY_TONE/DOT/BAR + CATEGORY_COLOR),
  `components/shared/RiskCard.tsx`.
- The `?tab=` architecture: `lib/networks/tabs.ts` gate functions + `NetworkTabBar`
  + server-resolved `resolveNetworkTab`. Adding a sector tab = one gate function
  + one label + one tab component; deep links and fallback come free.
- The generic relationship explorer (`lib/explorer/*` + `components/explorer/*`):
  ZERO relation-specific vocabulary (grep-enforced). Any sector's
  entity-relationship dataset plugs in via an adapter (two shapes already
  proven: partnerships + competitors; consumer mapping sketches for asset-risk
  and dependency maps in `docs/credit/relationship-explorer.md`).
- Charts: @visx minimal (server-rendered, zero client bundle) + `LazyCharts`
  client-wrapper pattern for anything interactive (the M4 lesson: next/dynamic
  in a server component does not code-split).
- `react-force-graph-2d` graph canvas: lazy, async-only chunk; reuse GraphView →
  GraphCanvas split (next/dynamic drops refs).

**The data pipeline (the real accelerant):**
1. Sourced research dataset (external doc) → committed canonical JSON under
   `frontend/scripts/data/`.
2. Parser script with HARD GATES (row counts, closed vocab, zero unsourced,
   zero em dashes, join-key resolution) → committed sidecar JSON.
3. Generator → committed TS model under `lib/networks/` (dev/prod identity; no
   store dependency for tab gating).
4. Push scripts under the house contract: dry-run first (`PATCH_DRY_RUN=1`),
   REPLACE-per-field for dataset entities (M5 precedent) or append-if-missing
   against LIVE state (M8 competitors precedent), `--local` patches bootstrap.
   Live writes are user-run (classifier).
5. Verify scripts (`verify-m7-risk-derivations` / `verify-m8-reciprocity`
   pattern): recomputed derivations must equal the dataset; `--live` mode
   gates prod.
- View models in `lib/networks/*Tab.ts` with jest suites (index-based
  serialization for RSC payload discipline) — the risk/competitors/partnerships
  models are direct templates.

**QA harness (M10):** `scripts/qa-m10-acceptance.mjs` (rendered-surface matrix
+ em-dash/false-zero/freshness sweeps) and `qa-m10-store-duplicates.mjs`
(read-only store integrity) are sector-parameterisable: swap the entity filter.

**House rules that carry over verbatim:** no fabricated numbers (null renders
placeholder glyph, never 0); every number carries source + asOf; Tier 2 /
pending visibly labelled; em dashes forbidden in rendered prose (standalone
"—" placeholder exempt); reciprocity closure for competitor sets; axe
wcag2a/aa target 0 on new views; focus-trap + Escape-restore on every dialog;
prefers-reduced-motion = no animation.

## What is Credit-specific (redo per sector)

- Tag vocabulary + cohorts (Credit: Lending / Leveraged Yield / Fixed Income,
  TAG_COHORTS): each sector needs its own vocabulary decision (M0-style) and
  metric spec (the C0/L/LY/FI-row equivalent).
- The metrics rollup rows and per-tag panels (CreditTagPanels) — the shell
  generalises, the row definitions do not.
- Partnership taxonomy (10 categories + risk_curator role flag) — revisit per
  sector; the model/generator machinery is reusable as-is.
- Asset-coverage segment shapes (lending vs fixed-income column sets) —
  sector-shaped datasets will need their own segment definitions.
- Dataset research itself: the M5/M6-M7/M8/M9 source documents were
  Credit-scoped; each sector needs the equivalent research pass (the
  network-general-data skill covers the M1-class pass).

## Recommended sector order

1. **Staking** — largest overlap with Credit mechanics (yield, validators as
   "assets", slashing as typed risk), lido-class entities already have strong
   M1 data, and the Staking rollup heading already exists in MetricsTabView.
2. **Liquidity** — AMM pool data is the closest analogue to asset coverage;
   DefiLlama coverage is good and free.
3. **Derivatives** — perps/options metrics already partially wired
   (optionsVolume/openInterest fields exist).
4. **RWA** — smaller entity count; RwaCharacteristicSections already exists;
   private-credit overlap entities (centrifuge/clearpool/goldfinch) are
   already half-covered from the Credit side.
5. **Other** — heterogeneous by definition; do last, with a reduced tab set
   (skip sector-specific tabs where no honest dataset exists).

## Effort estimate per sector (context windows, Credit took ~11)

| Phase | Credit actual | Next-sector estimate | Why cheaper |
|---|---|---|---|
| M0-M1 class (audit, tags, general data) | 2 | 1 | network-general-data skill + settled house rules |
| M2-M3 class (page plumbing, rollup, charts) | 2 | 0.5 | tabs/primitives/charts all exist; only row definitions |
| M4-M5 class (tag metrics + research content) | 2 | 1–1.5 | pipeline templates exist; research is the bottleneck |
| M6-M7 class (asset coverage + risks) | 2 | 1 | drawer/scorecard/matrix components are shared now |
| M8-M9 class (competitors + partnerships) | 2 | 1 | parser/generator/explorer reusable; dataset research dominates |
| M10 class (QA acceptance) | 1 | 0.5 | QA scripts parameterised |
| **Total** | **~11** | **~5–6** | |

Dataset research (external sourcing) is the dominant cost going forward, not
engineering. Budget accordingly: engineering windows halve; research does not.

## Standing cross-sector cautions

- `npm run build` seed-merges missing bootstrap keys + fills empty live fields
  into LIVE prod KV — treat bootstrap creates as live-adjacent, always.
- Live KV writes and anything touching CRON_SECRET are user-run steps.
- Keep heavyweight per-protocol sources out of LLAMA_PROTOCOL_SLUGS when the
  payload exceeds the 2MB fetch cache (the euler lesson) — snapshot fallback.
- The `canhav-store-items` cache entry is near the 2MB Vercel cap; the
  per-Category split (store.ts comment) should land before two more sectors'
  worth of content goes in.
- yields.llama.fi/poolsBorrow is paid (402): borrow-side APY rows stay Tier 2
  everywhere until a licensed source lands.
