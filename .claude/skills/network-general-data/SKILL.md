---
name: network-general-data
description: >-
  Build out the six "General Data" tabs (Overview, Research, Asset Coverage, Risks,
  Competitors, Partnerships) for a whole network sector in the CanHav crypto-analytics repo
  — Milestone 1 (M1) work. Use this whenever the user wants to populate, source, or complete
  network editorial data for a sector (Credit, Staking, Liquidity, Derivatives, RWA, Other,
  Stablecoin, DEX), mentions "M1 / milestone 1", "network general data", "the six tabs",
  filling network profiles, or doing the "next sector" after Credit. Also trigger when the
  user references entity specs (lending_specs.py / *_specs.py), the bootstrap-store, or
  making network tabs appear. Covers the full loop: discover in-scope entities → parallel
  sourced research → author into Python specs → surgically patch the store → verify. Bundles
  helper scripts so you don't reinvent them.
---

# Network General-Data build-out (Milestone 1)

This skill captures the proven workflow for bringing one **network sector** to the M1 bar in
the CanHav repo. It was validated on the **Credit** sector (18 networks) and is written to
port to any other sector by changing one variable.

**Set `TARGET_SECTOR`** = one of: `Staking`, `Liquidity`, `Derivatives`, `RWA`, `Other`
(`Credit` is done; `Stablecoin`/`DEX` exist but confirm they're in M1 scope before starting).

## Mental model (read `references/type-shapes.md` for the field-level detail)

- **M1 = populate the six General Data tabs, sourced.** It is a **data-only** pass: author
  editorial fields; do not build metrics/charts (M2/M3) and avoid UI changes.
- **Content-gating:** a tab renders only when its backing field is non-empty
  (`frontend/lib/networks/tabs.ts`). Populating the field *is* making the tab appear.
- **Editorial vs. metrics:** you touch editorial fields (prose + sourced facts). You do NOT
  touch metrics blocks (`currentScale`, sector `lending`/metrics, `universalMetrics`,
  `market`, `*TagMetrics`) — cron-written.
- **Sourcing bar (hard rule):** AI drafts prose; every hard fact (dates, raises, audits,
  numbers, names) is real and carries a source URL. Can't source it → omit it. Never
  fabricate. Enums only. No duplicate entities.

## Environment (Windows / this repo)

- Repo root: `C:\Users\alens\OneDrive\Desktop\canhav-prod`.
- Node & Python are **not on the Git-Bash PATH** — prefix every shell command:
  ```bash
  export PATH="/c/Program Files/nodejs:/c/Users/alens/AppData/Local/Programs/Python/Python315:$PATH"
  ```
- Use a scratch dir for packets and generated snippets. Outbound HTTP is blocked at
  page-render time (live TVL fetch fails, page still 200); `WebSearch`/`WebFetch` and
  `tsc`/`npm run typecheck` all work.

## THE PIPELINE IS LOSSY — never full-regen

Editorial is authored in Python specs → `ingest_entities.py:build_entity_item()` →
`backend/data/store.json` → `frontend/data/bootstrap-store.json` (committed, seeds
Upstash/Vercel). A full ingest rebuilds from specs only and **drops seeded MemberCoins** and
live enrichments. Always **surgically patch** with the bundled `scripts/patch_sector.py`
(overlays only non-empty editorial keys). Patch **both** store files (the second,
`backend/data/store.json`, is the untracked disk-fallback for local `npm run dev`).

---

## Step 0 — Discover in-scope entities and their gaps

Run this to get the exact slug list for the sector plus what each entity already has (fill
gaps, don't clobber):

```bash
cd "<repo>/backend/scripts"
python - <<'PY'
import ingest_entities as ie
SECTOR = "Staking"   # <-- TARGET_SECTOR
FIELDS = ["components","faq","org_structure","tradfi_comparison","events","timeline",
          "offchain_facts","risks","competitors","partnerships","investment_rounds",
          "audits","sources","member_coins","github"]
slugs = sorted(s for s,sp in ie.ENTITY_SPECS.items() if sp.get("sector")==SECTOR)
print(f"{len(slugs)} in-scope {SECTOR} entities:\n")
for slug in slugs:
    spec = ie.ENTITY_SPECS[slug]
    print(f"{slug:20} HAVE: {[k for k in FIELDS if spec.get(k)]}")
PY
```

Then inspect the sector's spec file (`<sector>_specs.py`) to learn its authoring pattern
(a `_net(...)`-style helper or plain dicts) and **whether that helper threads `sources` and
`audits`** — if not, add those two params (mirror `lending_specs.py:_net`; `build_entity_item`
already maps `spec["sources"]→Sources` and `spec["audits"]→Audits`). The gap-list tells you,
per entity, whether it's a light touch-up or a full build.

## Step 1 — Research (parallel subagents, read-only)

Spawn **one research subagent per network**, in waves of ~5–6, each writing a JSON packet to
`<scratch>/<sector>-research/<slug>.json`. Give every agent the contract in
`references/research-contract.md` **verbatim**, plus its slug, gap-list, and the
**competitor slug pool** (the sector's own slug list from Step 0; tell them other on-platform
entities exist but to omit uncertain slugs). Collect all packets before editing.

If subagent spawns hit transient `529 Overloaded`, back off or fall back to main-thread
`WebSearch`/`WebFetch` for those networks (reliable, slower).

## Step 2 — Author into specs (main thread, sequential)

Edits to one shared spec file must be **sequential** (parallel edits collide). Per network:

- **Touch-ups:** add only the missing kwargs/keys. **Append** to existing lists (faq, events,
  offchain_facts) rather than replacing — keep existing good content. **Correct** anything
  wrong (off-enum risk categories, wrong dates).
- **Stubs:** add the full editorial set.
- **Never** emit a duplicate keyword arg — skip keys the entity already defines.

Use the bundled generator to convert packets → indented Python `_net(...)` kwargs (avoids
hand-transcription errors):

```bash
python <skill>/scripts/format_packet.py \
  --research-dir "<scratch>/<sector>-research" \
  --exclude-json "<scratch>/exclude.json" \
  slug1 slug2 slug3 ...
```

`exclude.json` maps each entity to keys it already defines, e.g.
`{"fluid": ["competitors","github"], "venus": ["competitors"]}` (derive from Step 0). Each
run writes `<slug>.pytxt`. Splice each snippet into its entity by anchoring on a **unique
line** in that entity (e.g. its `twitter="..."` line) — a tiny splice script that asserts the
anchor matches exactly once is safer than eyeballing line numbers, which shift as you edit.

Smoke-test after edits: `python -c "import sys; sys.path.insert(0,'backend/scripts'); import <sector>_specs"`.

## Step 3 — Patch the store (surgical, non-lossy)

```bash
python <skill>/scripts/patch_sector.py --repo "<repo>" --sector "Staking"
# (or) --slugs aave,compound,morpho,...
```

This rebuilds each item via `build_entity_item` and overlays the editorial whitelist **only
when non-empty**, into both `bootstrap-store.json` and `backend/data/store.json`. The
non-empty guard is what preserves seeded MemberCoins and never blanks live/CurrentScale
blocks. It refuses to create new entities (raises if a key is missing) — so a typo can't
silently add junk.

## Step 4 — Verify (all must pass)

```bash
cd "<repo>/backend/scripts" && python validate_taxonomy.py          # "OK: no taxonomy errors"
python - <<'PY'   # build-loop: every entity builds + meets the bar
import ingest_entities as ie
SECTOR="Staking"
for slug in sorted(s for s,sp in ie.ENTITY_SPECS.items() if sp.get("sector")==SECTOR):
    it=ie.build_entity_item(slug, ie.apply_minimal_research(ie.ENTITY_SPECS[slug],slug), None, "2026-06-01T00:00:00Z")
    f=lambda k: len(it.get(k) or [])
    print(f"{slug:20} Comp={f('Components')} Faq={f('Faq')} Org={f('OrgStructure')} "
          f"TradFi={f('TradFiComparison')} Risks={f('Risks')} Comp*={f('Competitors')} "
          f"Src={f('Sources')} Part={f('Partnerships')} Rounds={f('InvestmentRounds')}")
PY
cd "<repo>/frontend" && npm run typecheck                            # tsc clean
```

Then a **tab-gating spot check** on the patched `bootstrap-store.json` for ~4 networks
(mirror the `tabs.ts` predicates in a small python script): confirm all six tabs surface and
MemberCoins counts are preserved (non-zero where they were before). Finally `git diff --stat`
— changes must be localized to the sector's entities + spec file(s).

## Step 5 — Flags & delivery

- **Do NOT commit or push without an explicit go-ahead** — the PR is outward-facing.
- Surface honestly: defunct/winding-down protocols (reflect in editorial; `isLive` is a
  metrics-level call), networks intentionally empty on Partnerships (no public raise/partner),
  and any copy-paste placeholder numbers you spot (e.g. an identical `users` value across
  entities).
- The **Asset Coverage member-coins UI fallback is already merged** and works for all
  non-lending sectors — you should NOT need a UI change. If you find a tab hard-wired to
  Credit-only fields, flag it for founder sign-off rather than redesigning.
- Ship as **one PR to the `test` branch** for the whole sector; note any intentionally-empty
  networks in the summary.

## Bundled resources

- `scripts/format_packet.py` — packet JSON → indented Python `_net(...)` kwargs (skips keys
  the target already defines via `--exclude-json`).
- `scripts/patch_sector.py` — surgical, non-lossy store overlay (`--sector` or `--slugs`).
- `references/research-contract.md` — the verbatim contract for research subagents.
- `references/type-shapes.md` — `NetworkProfile` editorial shapes, enums, the six-tab gates,
  the acceptance bar, and the per-sector spec-file map.
