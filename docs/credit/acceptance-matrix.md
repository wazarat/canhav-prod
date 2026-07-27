# Credit acceptance matrix + data-integrity sweeps (CAN-80, M10 — 2026-07-27)

Rendered-surface acceptance run against PROD (www.canhav.co), post-M9
(all five M6–M9 pushes live). Tooling: `frontend/scripts/qa-m10-acceptance.mjs`
(read-only fetch of every visible tab of every Credit-affiliated entity; 252
pages) + `frontend/scripts/qa-m10-store-duplicates.mjs` (read-only KV scan).
Raw results: session scratchpad `qa-m10/results.json`.

## The 22×8 matrix

Cell = pass / pass* (legacy renderer, real content) / n/a (tab correctly
hidden by its gate) / FAIL. Tabs in order: Overview, Metrics, Research,
Asset coverage, Risks, Competitors, Partnerships, AI agent skills.

| Entity | Ov | Me | Re | AC | Ri | Co | Pa | AI |
|---|---|---|---|---|---|---|---|---|
| Aave | pass | pass | pass | pass | pass | pass | pass | pass |
| Centrifuge | pass | pass | pass | n/a | pass* | pass | pass | pass |
| Clearpool | pass | pass | pass | n/a | pass* | pass | pass | pass |
| Compound | pass | pass | FAIL→fixed | pass | pass | pass | pass | pass |
| Extra Finance | pass | pass | pass | pass | pass | pass | pass | pass |
| Fluid | pass | pass | pass | pass | pass | pass | pass | pass |
| Gearbox | pass | pass | pass | pass | pass | pass | pass | pass |
| Goldfinch | pass | pass | pass | n/a | pass* | pass | pass | pass |
| JustLend | pass | pass | pass | pass | pass* | pass | n/a | pass |
| Kamino | pass | pass | pass | pass | pass* | pass | pass | pass |
| Maple Finance | pass | pass | pass | pass | pass | pass | pass | pass |
| Morpho | pass | pass | pass | pass | pass | pass | pass | pass |
| Notional Finance | pass | pass | pass | pass | pass | pass | pass | pass |
| Pendle Finance | pass | pass | pass | pass | pass | pass | pass | pass |
| Radiant Capital | pass | pass | pass | pass | pass | pass | pass | pass |
| Sense Finance | pass | pass | pass | n/a | pass | pass | pass | pass |
| Sky | pass | pass | pass | n/a | pass* | pass | pass | pass |
| Spark Protocol | pass | pass | pass | pass | pass | pass | pass | pass |
| Spectra | pass | pass | pass | pass | pass | pass | pass | pass |
| Stella | pass | pass | pass | pass | pass | pass | pass | pass |
| USD.AI | pass | pass | pass | n/a | pass* | pass | pass | pass |
| Venus | pass | pass | pass | pass | pass* | pass | n/a | pass |

**Totals: 167 pass / 8 n/a / 1 fail (fixed this window) = 176 cells.**

- `pass*` (7): the M11-parked entities render the LEGACY risks renderer
  ("Risks identified", curated rows) — real content under the pre-M7 contract,
  by design until their datasets land.
- `n/a` (8): six asset-coverage gates (centrifuge, clearpool, goldfinch, sky,
  sense, usd-ai — no genuine coverage data; sense deliberately none, sunset)
  and two partnerships gates (justlend, venus — zero Partnership rows, not in
  the M9 covered 14).
- **FAIL: compound/research 500'd on prod** (reproducible, not the dev
  transient). Root cause: the M5 push wrote `Tokenomics.maxSupply` as the
  prose string "10,000,000 COMP" into a number-typed field (the only such
  record store-wide); `formatNumberCompact` calls `.toFixed` on it and SSR
  crashes. Fixed twice over this window: the formatter now degrades malformed
  input to the placeholder glyph, and `push-credit-m10-qa-fixes.mjs` sets the
  numeric value (dry-run audited; live write user-run). The page renders
  post-deploy even before the store patch.
- Note on the issue text: the matrix issue says store keys are
  `CATEGORY#Network|PROTOCOL#<slug>`; the actual live key format is
  `CATEGORY#Entity|PROTOCOL#<slug>`.

The 18 post-M8 additions (15 new + 3 migrations) are outside the matrix scope
but were swept identically: every visible tab 200s with content; their thin
tab sets (4–6 tabs) match the documented gates (M5-class content is M11's).

## Sweep 1 — em dashes on the rendered surface

Method: element-level classification over all 252 rendered pages (standalone
"—" as an element's entire text = the intentional placeholder; anything inside
a longer text run = prose).

- **Placeholder glyphs: 509 rendered instances — present and unmodified.**
  (Code census: 84 fallback-literal positions plus JSX placeholder spans; the
  project-start "119" was counted by a method not recorded — the rendered
  count is the enforceable one going forward.)
- **Prose em dashes at sweep time: 477 across 69 pages.** All traced to
  exactly four sources, all fixed this window:
  1. `lib/agent/skills.ts` builders (glossary, member-coin/TradFi joins) — the
     agent-skills tab bulk (~40 pages); fixed + jest-guarded (CAN-85).
  2. M6/M7 component JSX prose (RiskScorecard methodology, RiskMatrixView
     footnote, IncidentRail date range, AssetRiskTable/DriverBadge titles,
     `lib/security.ts` unverified-status string) — fixed.
  3. 13 identical live-store `AssetCoverage.curatedNote` sentences (authored
     by the M6 push script, slipped its parser gates) — patch script staged.
  4. 2 M8-migration `Differentiator`s (liquity, inverse-finance) — same patch.
- **Post-deploy + post-patch expected prose count: 0.** (Store-wide, 435
  em-dash string occurrences remain in NON-Credit legacy records — the
  project-start baseline class (94 prose + 98 citation labels was the
  Credit-era count); they belong to future sector rollouts.)
- Citation-label em dashes (Sources[] labels) are a separate class per the
  issue text and were left untouched.

## Sweep 2 — no false zeros

47 flagged contexts reviewed by hand:

- ~35 are honest zero COUNTS ("Member products 0", "Coins under X 0") on
  M8-new entities with genuinely empty tracked-product lists — real values,
  not null-masquerades.
- Spark "LTV 0" rows are dataset prose describing a wind-down configuration —
  stated facts, correct.
- **1 genuine false zero: centrifuge Market cap $0** (the audit's original
  find, still live at sweep time). CoinGecko emits market cap 0 when it lacks
  a circulating-supply estimate; the pipeline stored it and overview/metrics/
  skills rendered "$0" while price ($0.20) and FDV ($1B+) rendered live.
  Fixed at both layers this window: cron ingest treats 0 as null going
  forward, and a read-time normalizer in `lib/server/store.ts` nulls
  already-stored zeros immediately on deploy.
- **Notional TVL $794** (the audit's other find): the HEADLINE TVL is fixed
  ($3.1M from CurrentScale); a metrics row still shows DefiLlama's genuine
  $794 return for the notional adapter, source-labelled. Honest source data,
  not a false zero; the misleading-adapter question stays on the M11 register
  with Notional's listedAt.

## Sweep 3 — source and freshness

Across all 252 pages: 403 as-of labels, 160 visible "Tier 2" chips, 323
"Pending live refresh" labels — pending/Tier-2 fields are visibly labelled,
never silently blank (spot-checked per tab class). Aave metrics baseline:
project start had 8 of 12 cards "Pending live refresh"; now 4 pending with
live CoinGecko/DeFi Llama/Alchemy-sourced values elsewhere. Universal-metrics
syncedAt on records: 2026-07-26 07:4xZ (the user-run refresh; the daily 06:00
UTC cron did NOT fire on 2026-07-27 — surfaced at close-out, CRON_SECRET curl
is user-run).

## Sweep 4 — duplicate entity check

Read-only HKEYS/HGET scan of live `canhav:store` (399 fields):

- Key format: every field parses as `CATEGORY#<Category>|PROTOCOL#<slug>`
  (Entity 137, Stablecoin 70, Token 116, Receipt 64, RWA 5, SectorAggregate 7).
- Near-duplicate entity slugs: **0**. Duplicate entity names: **0**.
- Orphan product records: **1** — `CATEGORY#Token|PROTOCOL#kava` names parent
  `kava-lend`, which has no Entity record. Pre-existing, non-Credit; M11
  register.
- Live-vs-bootstrap drift: live-only keys are the 7 SectorAggregates (cron
  artifacts) + `aave-demo-token` (the demo-day slug, by design);
  bootstrap-only keys: 0.

**Verdict: PASS** (the one orphan recorded and dispositioned).
