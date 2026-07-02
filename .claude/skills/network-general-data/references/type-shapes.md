# Editorial type shapes & the six tabs

Everything a network page renders comes from one object: **`NetworkProfile`**
(`frontend/lib/types.ts`). M1 fills its *editorial* fields; the *metrics* blocks
(`currentScale`, `lending`/sector metrics, `universalMetrics`, `market`, `*TagMetrics`)
are cron-written and out of scope.

**Naming across the pipeline:** specs are snake_case → `build_entity_item` maps to
Pascal/CamelCase store keys → the profile is camelCase. e.g. spec `org_structure` → store
`OrgStructure` → profile `orgStructure`.

## Content-gating (why populating a field makes a tab appear)

Gate logic: `frontend/lib/networks/tabs.ts`. A tab only renders when its backing field is
non-empty:

| Tab | Appears when… |
|---|---|
| Overview | always |
| Research | any of `components / faq / orgStructure / tradFiComparison / timeline / events / offchainFacts / investmentRounds / tokenomics` is non-empty |
| Asset Coverage | `lending` has coverage **OR** `creditTagMetrics.lending` **OR** `memberCoins.length > 0` (the member-coins fallback — already merged, works for all non-lending sectors) |
| Risks | `typedRisks` or `risks` non-empty |
| Competitors | `competitors` non-empty |
| Partnerships | `partnerships` non-empty (renders `partnerships[]` **only**) |

## The editorial sub-types (flat records; the profile holds arrays of them)

- `NetworkComponent {name, description}` — product building blocks. *(Research)*
- `FaqItem {question, answer, pinned?}` — `pinned` floats important Q&A up. *(Research)*
- `OrgUnit {name, role, description}` — labs company / DAO / foundation. *(Research)*
- `TradFiRow {product, similarity, differences}` — TradFi analogue. *(Research)*
- `TimelineEntry {date, title, description, link?, status?}` — `status` ∈
  `executed|stated|theoretical|canhav-inferred` (roadmap; renders solid vs muted). *(Research)*
- `NetworkEvent {date, title, description, link?}` — dated happenings. *(Research)*
- `OffchainFact {key, value, freshness, source:{label,url}, capturedAt, theoretical?}` —
  a self-describing fact carrying its own provenance. `freshness` ∈ `live|semi-live|static`
  (use `static`). This is the no-fabrication workhorse. *(Research)*
- `InvestmentRound {date, round, amountUsd, amountLabel, investors[], link}` — **renders on
  the Research tab, not Partnerships.** *(Research)*
- `NetworkRisk {category, description}` — `category` ∈ the 9-value `RiskCategory` enum:
  `Counterparty, Network, Oracle, Reserve / Depeg, Smart Contract, Governance, Collateral,
  Regulatory, Systemic`. *(Risks)*
- `Competitor {name, slug?, rank, positioning, similarities, differences}` — `rank` 1-based
  (lower = more direct); set `slug` only for on-platform entities. *(Competitors)*
- `Partnership {name, date, amountLabel, description}`. *(Partnerships)*
- `MemberCoinRef {slug, name, symbol, category, role, subCategory?, receiptType?, coinType?}`
  — `category` ∈ `Stablecoin|Token|RWA|Receipt`. Seeded separately; **preserve it.** *(Asset Coverage)*
- `SourceRef {label, url}` — used in `profile.sources[]` and inside every `OffchainFact.source`.
- profile-level `audits: {firm, date, url}[]`. *(Risks)*

## Acceptance bar (per network)

- **Research:** `tradfi_comparison`≥1 + `org_structure`≥1 + `faq` 3–6 + (`events`|`timeline`)≥1
  + `offchain_facts`≥1 + `sources`≥1.
- **Risks:** ≥3 categorized (valid enum), specific — not boilerplate; include a real exploit
  if one exists.
- **Competitors:** 2–5 ranked; `slug` only for on-platform peers.
- **Partnerships:** ≥1 partnership *or* investment round — but leave empty (and note it) when
  none is publicly sourced.
- **Audits:** include where public.

## Where editorial is authored, per sector

`ingest_entities.py` merges one spec container per sector into `ENTITY_SPECS`:

| Sector | File | Container |
|---|---|---|
| Credit | `backend/scripts/lending_specs.py` | `LENDING_ENTITY_SPECS` |
| Staking | `backend/scripts/staking_specs.py` | `STAKING_ENTITY_SPECS` |
| Liquidity | `backend/scripts/liquidity_specs.py` | `LIQUIDITY_ENTITY_SPECS` |
| Derivatives | `backend/scripts/derivatives_specs.py` | `DERIVATIVES_ENTITY_SPECS` |
| RWA | `backend/scripts/rwa_specs.py` | `RWA_ENTITY_SPECS` |
| Other | `backend/scripts/other_specs.py` | `OTHER_ENTITY_SPECS` |
| Stablecoin | `backend/scripts/stablecoin_specs.py` | `STABLECOIN_ENTITY_SPECS` |
| DEX | `backend/scripts/dex_specs.py` | `DEX_ENTITY_SPECS` |

A few entities live in `entity_specs_batch.py` / `entity_specs_batch_2.py` (e.g. Aave) or as
plain dicts in `ingest_entities.py` (e.g. usd-ai). Discovery-by-sector (below) finds them
all because it filters `ENTITY_SPECS` by `spec['sector']`, not by container.

Reference exemplars fully authored: **Pendle** (`lending_specs.py`, `_net(...)` helper style)
and **Aave** (`entity_specs_batch_2.py`, plain-dict style).
