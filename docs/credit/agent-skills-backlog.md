# Agent Skills backlog (CAN-85 deliverable, M10 — 2026-07-27)

What a future AI Agent Skills feature project would need, from what the M10
structural parity check observed. Scope guard honoured: M10 changed NO skill
capability; this document records the gaps.

## How skills work today

- `frontend/lib/agent/skills.ts` deterministically derives an `AgentSkill` from
  each approved store profile at render time (entities + stablecoin/RWA/token
  products; no stored skills — `profile.agentSkill` is honoured by the entity
  page but is null for all 392 store records).
- Rendered on `/networks/<slug>?tab=agent-skills` (tab ALWAYS visible, the
  M0.5 contract) via `NetworkAgentSkillsTab` → `AgentSkillCard`, on
  `/agents/skills/<id>` (raw markdown/JSON), and in the `/agents` catalog.
- Consumed by agents through the `skill_study` tool (`lib/agent/tools.ts`),
  which returns `facts` verbatim into LLM context, and by spawn/attach flows
  (existence checks). `skillHash` (keccak256 of the markdown) is persisted only
  for USER skills via `attachUserSkill` — platform skill content can change
  freely without breaking any persisted hash or on-chain registration.

## Skill content coverage today (the 22-entity matrix scope)

All 22 original Credit entities render a meaningful skill: 21 emit all six
section types (Overview, Differentiator, Components, Member coins, Risks,
TradFi analogue); sense emits 5 (no member coins by design — protocol sunset
2023). Facts coverage tracks universal metrics (aave-class entities emit
~18 facts; thin entities ~8). The 15 new M8 entities and 3 migrations render
valid but thin skills (overview + facts; M5-class fields absent until M11).

## Data-model gaps (the parity delta M10 recorded but did not build)

The skill shape is flat strings (`AgentSkillFact {key, value}`,
`AgentSkillSection {heading, body}`) — no numbers, severities, or nesting.
Profile fields NOT consumed by `buildSkillFromEntity` today:

| Field | What a skills project would do with it |
|---|---|
| `typedRisks` (12–16 rows on the 14 dataset entities) | Replace the legacy `risks` section (4–7 curated rows) with severity/likelihood/impact-scored rows + mitigation and monitoring signals. The legacy `Risks` field is the weaker source and is what skills render today. |
| `riskPosture` | One-paragraph posture summary (strip inline md links via `stripInlineLinks`, as `longDescription` already does). |
| `partnerships` | Now LIVE for the 14 with slug refs + amountLabel (M9 push #5): a "Partnerships" section from the curated legacy rows is the cheap path; `lib/networks/creditPartnershipModel.ts` (387 nodes / 622 edges with per-row evidence, chain deployments, self rows) is the rich path for graph-aware skills. |
| `competitors` (Competitor[]: name, slug, rank, positioning, similarities, differences) | Ranked competitive-set section; suggestSkillsForEntity already uses it for launch suggestions only. |
| `assetCoverage` | Per-asset parameter facts (LTV, caps, oracles) — high token cost; probably a dedicated action instead of inline facts. |
| `dependencies`, `incidents`, `auditsNote`, `parentSlug`, `timeline`, `tradFiAnalogue`, `orgIntro`, `fundingNote`, `bullBearCase`, `researchPublications`, `offchainFacts` | Research-tab parity. `offchainFacts` is shape-identical to `AgentSkillFact` (already compacted for agents in tools.ts) — cheapest win. |
| Taxonomy (`sector`, `secondarySectors`, `subSector`, `tags`) | Facts for cohort routing; agents currently cannot tell a Lending entity from Fixed Income from the skill alone. |

## ERC-8004 connection

`agent-service/src/agent/registration.ts` builds on-chain registration files
from STATIC `agent-service/src/skills/*.skill.json` — it does not read
`frontend/lib/agent/skills.ts`, so frontend skill enrichment cannot reach
minted registrations today. The frontend's `agentCard.ts` (hosted tokenURI)
derives from `AgentProfile`, not skills. A future project should make the
platform-derived skill the single source: generate the agent-service skill
JSONs from `buildSkillFromEntity` output (or have agent-service call the
`/api/agent/skills` route), and version skills explicitly (`SKILL_VERSION` is
a constant "1.0.0" today; content-hash versioning would let re-registration be
diffed).

## Constraints a future project must respect

- `AgentSkillCard` React keys: facts keyed by `key`, sections by `heading`,
  actions by `signature` — new content must keep those unique.
- `skill_study` returns ALL facts verbatim to the model: fact-count growth has
  a direct LLM-context cost; sections are NOT returned by that tool today.
- `getAgentSkills()` (catalog) ignores `profile.agentSkill` while the entity
  page honours it — a store-seeded skill would diverge between surfaces; unify
  before ever seeding one.
- Em dashes are forbidden in rendered prose (M10 swept the builders clean and
  `lib/agent/skills.test.ts` now guards it); the standalone "—" placeholder
  glyph is the intentional missing-value marker and must stay.
- Ink-palette drift: the Tailwind ink scale has no 200/400/600 steps, yet
  ~88 `ink-400`-class usages exist under `components/networks` alone (silent
  no-ops inheriting body color) and `text-ink-500` (#3A4255, ~2:1 contrast)
  is still used in ~20 label positions app-wide. M10 fixed the agent-skills
  tab (`AgentSkillCard`); an app-wide token pass is registered for M11.

## Recorded during the M10 check (fixed this window)

- Em-dash prose in skill content builders (glossary, member-coin and TradFi
  joins, stablecoin lending-market body) — rewritten, jest-guarded.
- `AgentSkillCard` used a bespoke header instead of the M3 `SectionHeading`,
  plus no-op/failing ink tokens — swapped to shared primitive + real tokens.
- CAN-85's issue text names `RailCard` as an M3 shared primitive — fourth
  occurrence of the recurring correction: RailCard is the Trade-desk toggle
  card (CAN-65/79/86 precedents); the tab consumes SectionHeading + ui/Table.
