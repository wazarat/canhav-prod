#!/usr/bin/env python3
"""
Validate entity specs and store items against taxonomy enums in app/db/schema.py.

Usage:
    python3 backend/scripts/validate_taxonomy.py              # validate ENTITY_SPECS
    python3 backend/scripts/validate_taxonomy.py --store      # validate local store.json
    python3 backend/scripts/validate_taxonomy.py --report-gaps
    python3 backend/scripts/validate_taxonomy.py --store --report-member-coins
    python3 backend/scripts/validate_taxonomy.py --store --report-missing-tvl

Stdlib only.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from app.db import schema  # noqa: E402

STORE_PATH = BACKEND_ROOT / "data" / "store.json"

FIRST_CLASS_COIN_CATEGORIES = frozenset({"Stablecoin", "Token", "RWA"})

# Umbrella issuers that intentionally share slug with Stablecoin partition row.
STABLECOIN_UMBRELLA_SLUGS = frozenset({"ethena", "sky", "monerium", "stably", "trueusd"})

SUGGESTED_ACTIONS = (
    "ok",
    "missing_back_link",
    "duplicate_partition",
    "orphan_coin",
    "review_multi_coin",
)


def _entity_member_coin_keys(item: Dict[str, Any]) -> Set[Tuple[str, str]]:
    keys: Set[Tuple[str, str]] = set()
    for ref in item.get("MemberCoins") or []:
        ref_slug = ref.get("slug")
        ref_cat = ref.get("category")
        if ref_slug and ref_cat:
            keys.add((ref_cat, ref_slug))
    return keys


def _is_lending_entity(item: Dict[str, Any]) -> bool:
    sector = item.get("Sector")
    secondary = item.get("SecondarySectors") or []
    return sector == "Credit" or "Credit" in secondary


def _is_audited_entity(item: Dict[str, Any], audit_slugs: Set[str]) -> bool:
    slug = item.get("Slug", "")
    if slug not in audit_slugs:
        return False
    sector = item.get("Sector")
    secondary = item.get("SecondarySectors") or []
    if sector in ("Credit", "Stablecoin", "RWA"):
        return True
    if any(s in ("Credit", "Stablecoin", "RWA") for s in secondary):
        return True
    return slug in audit_slugs


def _find_store_item(items: Dict[str, Any], category: str, slug: str) -> Optional[Dict[str, Any]]:
    for i in items.values():
        if i.get("Category") == category and i.get("Slug") == slug:
            return i
    return None


def _sector_subsector_sets(sector: Optional[str]) -> Tuple[Optional[Tuple[str, ...]], Optional[Tuple[str, ...]]]:
    if sector == "Credit":
        return schema.CREDIT_TAGS, schema.CREDIT_TAGS
    if sector == "Stablecoin":
        return schema.STABLECOIN_SUBSECTORS, schema.STABLECOIN_SECONDARY_TAGS
    if sector == "DEX":
        return schema.DEX_SUBSECTORS, schema.DEX_SECONDARY_TAGS
    if sector == "RWA":
        return schema.RWA_SUBSECTORS, schema.RWA_SECONDARY_TAGS
    if sector == "Staking":
        return schema.STAKING_SUBSECTORS, schema.STAKING_SECONDARY_TAGS
    if sector == "Liquidity":
        return schema.LIQUIDITY_SUBSECTORS, schema.LIQUIDITY_SECONDARY_TAGS
    if sector == "Derivatives":
        return schema.DERIVATIVES_SUBSECTORS, schema.DERIVATIVES_SECONDARY_TAGS
    if sector == "Other":
        return schema.OTHER_SUBSECTORS, schema.OTHER_SECONDARY_TAGS
    return None, None


def validate_entity_spec(slug: str, spec: Dict[str, Any], errors: List[str]) -> None:
    sector = spec.get("sector")
    if sector and sector not in schema.NETWORK_SECTORS:
        errors.append(f"{slug}: invalid sector {sector!r}")

    sub = spec.get("sub_sector")
    allowed_sub, _ = _sector_subsector_sets(sector)
    if sub and allowed_sub and sub not in allowed_sub:
        errors.append(f"{slug}: sub_sector {sub!r} not valid for sector {sector!r}")

    secondary = spec.get("secondary_sectors") or []
    if sector and sector in secondary:
        errors.append(f"{slug}: secondary_sectors duplicates primary sector {sector!r}")
    for s in secondary:
        if s not in schema.NETWORK_SECTORS:
            errors.append(f"{slug}: invalid secondary sector {s!r}")

    for tag in spec.get("tags") or []:
        if tag not in schema.CREDIT_TAGS:
            errors.append(f"{slug}: invalid credit tag {tag!r}")

    for field, allowed in (
        ("stablecoin_sub_sector", schema.STABLECOIN_SUBSECTORS),
        ("dex_sub_sector", schema.DEX_SUBSECTORS),
        ("rwa_sub_sector", schema.RWA_SUBSECTORS),
        ("staking_sub_sector", schema.STAKING_SUBSECTORS),
        ("liquidity_sub_sector", schema.LIQUIDITY_SUBSECTORS),
        ("derivatives_sub_sector", schema.DERIVATIVES_SUBSECTORS),
        ("other_sub_sector", schema.OTHER_SUBSECTORS),
    ):
        val = spec.get(field)
        if val and val not in allowed:
            errors.append(f"{slug}: invalid {field} {val!r}")

    for field, allowed in (
        ("stablecoin_secondary_tags", schema.STABLECOIN_SECONDARY_TAGS),
        ("dex_secondary_tags", schema.DEX_SECONDARY_TAGS),
        ("rwa_secondary_tags", schema.RWA_SECONDARY_TAGS),
        ("staking_secondary_tags", schema.STAKING_SECONDARY_TAGS),
        ("liquidity_secondary_tags", schema.LIQUIDITY_SECONDARY_TAGS),
        ("derivatives_secondary_tags", schema.DERIVATIVES_SECONDARY_TAGS),
        ("other_secondary_tags", schema.OTHER_SECONDARY_TAGS),
    ):
        for tag in spec.get(field) or []:
            if tag not in allowed:
                errors.append(f"{slug}: invalid {field} tag {tag!r}")

    expected = schema.CROSS_SECTOR_MATRIX.get(slug)
    if expected is not None:
        have = set(secondary)
        missing = set(expected) - have
        extra = have - set(expected)
        if missing:
            errors.append(f"{slug}: missing cross-sector tags {sorted(missing)} (have {sorted(have)})")
        if extra:
            errors.append(f"{slug}: unexpected cross-sector tags {sorted(extra)} (expected {sorted(expected)})")


def validate_entity_specs(specs: Dict[str, Dict[str, Any]]) -> List[str]:
    errors: List[str] = []
    for slug, spec in specs.items():
        validate_entity_spec(slug, spec, errors)
    return errors


def validate_store_items(items: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """Validate store items; return (errors, gap_warnings)."""
    errors: List[str] = []
    gaps: List[str] = []
    entity_slugs: Set[str] = set()
    entity_member_keys: Dict[str, Set[Tuple[str, str]]] = {}

    for key, item in items.items():
        if item.get("Category") in ("Entity", "Network"):
            slug = item.get("Slug", "")
            entity_slugs.add(slug)
            entity_member_keys[slug] = _entity_member_coin_keys(item)

    for key, item in items.items():
        cat = item.get("Category")
        slug = item.get("Slug", key)

        if cat in ("Entity", "Network"):
            spec_like = {
                "sector": item.get("Sector"),
                "sub_sector": item.get("SubSector"),
                "secondary_sectors": item.get("SecondarySectors"),
                "tags": item.get("Tags"),
                "stablecoin_sub_sector": item.get("StablecoinSubSector"),
                "stablecoin_secondary_tags": item.get("StablecoinSecondaryTags"),
                "dex_sub_sector": item.get("DexSubSector"),
                "dex_secondary_tags": item.get("DexSecondaryTags"),
                "rwa_sub_sector": item.get("RwaSubSector"),
                "rwa_secondary_tags": item.get("RwaSecondaryTags"),
                "staking_sub_sector": item.get("StakingSubSector"),
                "staking_secondary_tags": item.get("StakingSecondaryTags"),
                "liquidity_sub_sector": item.get("LiquiditySubSector"),
                "liquidity_secondary_tags": item.get("LiquiditySecondaryTags"),
                "derivatives_sub_sector": item.get("DerivativesSubSector"),
                "derivatives_secondary_tags": item.get("DerivativesSecondaryTags"),
                "other_sub_sector": item.get("OtherSubSector"),
                "other_secondary_tags": item.get("OtherSecondaryTags"),
            }
            validate_entity_spec(slug, spec_like, errors)

            for ref in item.get("MemberCoins") or []:
                ref_slug = ref.get("slug")
                ref_cat = ref.get("category")
                found = any(
                    i.get("Slug") == ref_slug and i.get("Category") == ref_cat
                    for i in items.values()
                )
                if not found:
                    errors.append(f"{slug}: MemberCoin {ref_cat}/{ref_slug} not in store")

        if cat == "RWA":
            if slug in entity_slugs:
                entity_keys = entity_member_keys.get(slug, set())
                if ("RWA", slug) not in entity_keys:
                    errors.append(
                        f"{slug}: legacy RWA row duplicates Entity slug "
                        "(remove from ingest_rwas TARGETS or add to MemberCoins)"
                    )

        if cat in FIRST_CLASS_COIN_CATEGORIES:
            subtype = item.get("AssetSubtype")
            if subtype and subtype not in schema.ASSET_SUBTYPES:
                errors.append(f"{slug}: invalid AssetSubtype {subtype!r}")
            if subtype == "stablecoin":
                errors.append(f"{slug}: bare AssetSubtype 'stablecoin' is forbidden")
            if not subtype:
                gaps.append(f"{cat}/{slug}: missing AssetSubtype")

            peg = item.get("PegMechanism")
            if peg and peg not in schema.PEG_MECHANISMS:
                errors.append(f"{slug}: invalid PegMechanism {peg!r}")

            entity_slug = item.get("EntitySlug")
            if entity_slug and entity_slug not in entity_slugs:
                errors.append(f"{slug}: EntitySlug {entity_slug!r} not found")

    return errors, gaps


def report_member_coins(items: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Audit MemberCoin associations for lending, stablecoin, and RWA entities."""
    from lending_specs import ALL_MEMBER_COIN_AUDIT  # noqa: E402

    audit_slugs = set(ALL_MEMBER_COIN_AUDIT.keys())
    entity_slugs: Set[str] = set()
    entity_items: Dict[str, Dict[str, Any]] = {}
    entity_member_keys: Dict[str, Set[Tuple[str, str]]] = {}

    for item in items.values():
        if item.get("Category") in ("Entity", "Network"):
            slug = item.get("Slug", "")
            entity_slugs.add(slug)
            entity_items[slug] = item
            entity_member_keys[slug] = _entity_member_coin_keys(item)

    # Coins indexed by EntitySlug for back-link checks (Stablecoin, Token, RWA).
    coins_by_entity: Dict[str, List[Tuple[str, str, Dict[str, Any]]]] = {}
    for item in items.values():
        cat = item.get("Category")
        if cat not in FIRST_CLASS_COIN_CATEGORIES:
            continue
        entity_slug = item.get("EntitySlug")
        if entity_slug:
            coins_by_entity.setdefault(entity_slug, []).append(
                (cat, item.get("Slug", ""), item)
            )

    reports: List[Dict[str, Any]] = []

    for slug in sorted(ALL_MEMBER_COIN_AUDIT):
        item = entity_items.get(slug)
        if item is None:
            continue
        if not _is_audited_entity(item, audit_slugs):
            continue

        audit = ALL_MEMBER_COIN_AUDIT[slug]
        member_coins = item.get("MemberCoins") or []
        member_keys = entity_member_keys.get(slug, set())
        issues: List[Dict[str, str]] = []

        # duplicate_partition: RWA row with same slug not listed as MemberCoin.
        rwa_dup = _find_store_item(items, "RWA", slug)
        if rwa_dup is not None and ("RWA", slug) not in member_keys:
            issues.append(
                {
                    "suggested_action": "duplicate_partition",
                    "detail": f"RWA/{slug} duplicates Entity slug but is not a MemberCoin",
                }
            )

        # duplicate_partition: Stablecoin row for full issuer entity (not umbrella dual-partition).
        stable_dup = _find_store_item(items, "Stablecoin", slug)
        if (
            stable_dup is not None
            and slug not in STABLECOIN_UMBRELLA_SLUGS
            and ("Stablecoin", slug) not in member_keys
        ):
            issues.append(
                {
                    "suggested_action": "duplicate_partition",
                    "detail": (
                        f"Stablecoin/{slug} duplicates Entity slug but is not a MemberCoin "
                        "(umbrella dual-partition excluded)"
                    ),
                }
            )

        # orphan_coin: MemberCoin ref missing from store.
        for ref in member_coins:
            ref_cat = ref.get("category", "")
            ref_slug = ref.get("slug", "")
            if not _find_store_item(items, ref_cat, ref_slug):
                issues.append(
                    {
                        "suggested_action": "orphan_coin",
                        "detail": f"MemberCoin {ref_cat}/{ref_slug} not in store",
                    }
                )

        # missing_back_link: coin with EntitySlug=this entity not in MemberCoins.
        for coin_cat, coin_slug, coin in coins_by_entity.get(slug, []):
            if (coin_cat, coin_slug) not in member_keys:
                issues.append(
                    {
                        "suggested_action": "missing_back_link",
                        "detail": (
                            f"{coin_cat}/{coin_slug} has EntitySlug={slug!r} "
                            f"but is not in {slug}.MemberCoins"
                        ),
                    }
                )

        # review_multi_coin: informational count vs audit expectations (not a hard cap).
        count = len(member_coins)
        expected = audit.get("expected")
        action_hint = audit.get("action_hint")
        has_data_issues = any(
            i["suggested_action"] in ("duplicate_partition", "orphan_coin", "missing_back_link")
            for i in issues
        )
        if not has_data_issues and (action_hint == "review_multi_coin" or expected == "multi"):
            issues.append(
                {
                    "suggested_action": "review_multi_coin",
                    "detail": audit.get("rationale", "intentional multi-coin"),
                }
            )
        elif expected == 1 and count != 1:
            issues.append(
                {
                    "suggested_action": "review_multi_coin",
                    "detail": f"audit notes 1 coin; have {count} ({audit.get('rationale', '')})",
                }
            )
        elif expected == 0 and count > 0:
            issues.append(
                {
                    "suggested_action": "review_multi_coin",
                    "detail": f"audit notes 0 MemberCoins; have {count}",
                }
            )
        elif isinstance(expected, int) and expected not in (0, 1) and count != expected:
            issues.append(
                {
                    "suggested_action": "review_multi_coin",
                    "detail": f"audit notes {expected} MemberCoins; have {count}",
                }
            )

        if not issues:
            issues.append({"suggested_action": "ok", "detail": audit.get("rationale", "")})

        severity_order = (
            "missing_back_link",
            "duplicate_partition",
            "orphan_coin",
            "review_multi_coin",
            "ok",
        )
        severity = {a: i for i, a in enumerate(severity_order)}
        primary = min(issues, key=lambda i: severity.get(i["suggested_action"], 99))

        coin_list = [
            f"{ref.get('category')}/{ref.get('slug')} ({ref.get('symbol')})"
            for ref in member_coins
        ]

        reports.append(
            {
                "slug": slug,
                "sector": item.get("Sector"),
                "secondary_sectors": item.get("SecondarySectors") or [],
                "member_coin_count": count,
                "member_coins": coin_list,
                "suggested_action": primary["suggested_action"],
                "issues": issues,
                "audit_rationale": audit.get("rationale", ""),
                "audit_notes": audit.get("notes", ""),
            }
        )

    return reports


def _member_supply_sum(
    item: Dict[str, Any],
    items: Dict[str, Any],
) -> Optional[float]:
    """Sum member-coin metrics for headline TVL derivation."""
    total = 0.0
    found = False
    for ref in item.get("MemberCoins") or []:
        cat = ref.get("category")
        ref_slug = ref.get("slug")
        member = _find_store_item(items, cat, ref_slug)
        if member is None:
            continue
        value: Optional[float] = None
        if cat == "Stablecoin":
            ts = member.get("TotalSupply") or {}
            value = ts.get("value")
        elif cat == "RWA":
            hist = member.get("HistoricalTvlData") or {}
            points = hist.get("points") or []
            if points:
                value = points[-1].get("value")
            if value is None:
                tvl = member.get("TotalValueLocked") or {}
                value = tvl.get("value")
        elif cat == "Token":
            market = member.get("Market") or {}
            mcap = market.get("marketCapUsd") or {}
            value = mcap.get("value")
        if value is not None and value > 0:
            total += float(value)
            found = True
    return total if found else None


def _tvl_source_hint(item: Dict[str, Any], items: Dict[str, Any]) -> str:
    sector = item.get("Sector")
    slug = item.get("Slug", "")
    scale = item.get("CurrentScale") or {}
    if scale.get("tvlUsd") is not None:
        return "CurrentScale.tvlUsd"
    if sector == "Credit":
        lending = item.get("Lending") or {}
        tvl = lending.get("tvlUsd") or {}
        if tvl.get("value") is not None:
            return "Lending.tvlUsd"
    if sector == "RWA":
        rwa = item.get("Rwa") or {}
        aum = rwa.get("aumUsd") or {}
        if aum.get("value") is not None:
            return "Rwa.aumUsd"
    if sector == "Stablecoin":
        stable = item.get("Stablecoin") or {}
        supply = stable.get("currentSupplyUsd") or {}
        if supply.get("value") is not None:
            return "Stablecoin.currentSupplyUsd"
    member_sum = _member_supply_sum(item, items)
    if member_sum is not None:
        return "member_sum"
    try:
        from app.live import defillama  # noqa: E402

        if defillama.llama_lending_project_for_slug(slug):
            return "llama_lending_mapped"
        if defillama.llama_protocol_for_slug(slug):
            return "llama_protocol_mapped"
    except ImportError:
        pass
    return "none"


def report_missing_tvl(items: Dict[str, Any]) -> List[Dict[str, Any]]:
    """List entities with no resolvable headline TVL after refresh paths."""
    from lending_specs import ALL_MEMBER_COIN_AUDIT  # noqa: E402

    reports: List[Dict[str, Any]] = []
    for item in items.values():
        if item.get("Category") not in ("Entity", "Network"):
            continue
        slug = item.get("Slug", "")
        sector = item.get("Sector")
        if sector not in ("Credit", "Stablecoin", "RWA", "DEX") and slug not in ALL_MEMBER_COIN_AUDIT:
            continue

        scale = item.get("CurrentScale") or {}
        headline = scale.get("tvlUsd")
        source = _tvl_source_hint(item, items)
        member_sum = _member_supply_sum(item, items)

        if headline is not None or source not in ("none", "member_sum") or member_sum is not None:
            if headline is not None:
                continue
            if member_sum is not None:
                continue
            if source != "none":
                continue

        reports.append(
            {
                "slug": slug,
                "sector": sector,
                "member_coin_count": len(item.get("MemberCoins") or []),
                "tvl_source": source,
                "llama_hint": source if source.startswith("llama_") else None,
            }
        )

    return reports


def print_missing_tvl_report(reports: List[Dict[str, Any]]) -> None:
    if not reports:
        print("\nMissing TVL: none in audited sectors.")
        return
    print(f"\nMissing TVL ({len(reports)} entities):\n")
    header = f"{'slug':<22} {'sector':<12} {'members':>7}  {'hint'}"
    print(header)
    print("-" * len(header))
    for row in reports:
        hint = row.get("llama_hint") or row.get("tvl_source") or "none"
        print(
            f"{row['slug']:<22} "
            f"{(row['sector'] or ''):<12} "
            f"{row['member_coin_count']:>7}  "
            f"{hint}"
        )


def print_member_coin_report(reports: List[Dict[str, Any]]) -> None:
    if not reports:
        print("No audited entities found in MemberCoin cohort.")
        return

    print(f"\nMemberCoin audit ({len(reports)} entities):\n")
    header = f"{'slug':<14} {'sector':<10} {'count':>5}  {'action':<22}  coins"
    print(header)
    print("-" * len(header))

    for row in reports:
        coins = ", ".join(row["member_coins"]) if row["member_coins"] else "(none)"
        notes = row.get("audit_notes") or row.get("audit_rationale") or ""
        if row["suggested_action"] == "ok" and notes:
            coins = f"{coins}  [{notes}]" if coins != "(none)" else f"[{notes}]"
        print(
            f"{row['slug']:<14} "
            f"{(row['sector'] or ''):<10} "
            f"{row['member_coin_count']:>5}  "
            f"{row['suggested_action']:<22}  "
            f"{coins}"
        )

    print("\nDetails:")
    for row in reports:
        non_ok = [i for i in row["issues"] if i["suggested_action"] != "ok"]
        if non_ok:
            print(f"  {row['slug']}:")
            for issue in non_ok:
                print(f"    - {issue['suggested_action']}: {issue['detail']}")


def _matches_sector_cohort(item: Dict[str, Any], sector: str) -> bool:
    primary = item.get("Sector")
    secondary = item.get("SecondarySectors") or []
    return primary == sector or sector in secondary


def _is_lending_cohort_entity(item: Dict[str, Any]) -> bool:
    return _matches_sector_cohort(item, "Credit")


def _is_stablecoin_cohort_entity(item: Dict[str, Any]) -> bool:
    return _matches_sector_cohort(item, "Stablecoin")


def _is_rwa_cohort_entity(item: Dict[str, Any]) -> bool:
    return _matches_sector_cohort(item, "RWA")


def _is_dex_cohort_entity(item: Dict[str, Any]) -> bool:
    return _matches_sector_cohort(item, "DEX")


# Slugs with no public listing — validation passes; UI shows honest empty state.
PRE_LAUNCH_EXCEPTIONS: Dict[str, str] = {
    "chip": "USD.AI governance — not listed on CoinGecko",
    "schip": "USD.AI staked governance — not listed",
    "iusde": "Ethena institutional USDe — KYC-gated",
    "stusr": "Only illiquid wstUSR on CoinGecko",
    "sgho": "sGHO pre-launch",
    "stkgho": "stkGHO pre-launch",
    "jljupusd": "Jupiter pre-launch JLP-USD",
    "bgusd": "Bitget exchange-native — no public listing",
    "ondo-gm": "Ondo Global Markets — Reg S / 506(c) gated",
    "monerium-usde": "Monerium regulated e-money — no Arbitrum CG deployment",
    "iske": "Monerium ISK e-money — no Arbitrum CG deployment",
    "true": "Monerium TRUE governance — unlisted",
    "stably": "Stably wound down",
    "usdsc": "Stably USDSC wound down",
    "stably-gold": "Stably gold product wound down",
    "tgbp": "TrueUSD regional FX — no liquid CG feed",
    "taud": "TrueUSD regional FX — no liquid CG feed",
    "tcad": "TrueUSD regional FX — no liquid CG feed",
    "thkd": "TrueUSD regional FX — no liquid CG feed",
}


def _coin_has_live_data_path(slug: str, coin: Dict[str, Any]) -> bool:
    """True when a member coin has at least one live-data path (CG, contract, market, yield)."""
    from app.live.coingecko import COINGECKO_IDS  # noqa: E402

    if slug in PRE_LAUNCH_EXCEPTIONS:
        return True

    if COINGECKO_IDS.get(slug):
        return True
    if coin.get("LendingMarket"):
        return True
    if coin.get("YieldMechanics"):
        return True

    market = coin.get("Market") or {}
    if (market.get("priceUsd") or {}).get("value") is not None:
        return True
    if (market.get("marketCapUsd") or {}).get("value") is not None:
        return True

    ts = coin.get("TotalSupply") or {}
    if (ts.get("value") or 0) > 0:
        return True

    tvl = coin.get("TotalValueLocked") or {}
    if (tvl.get("value") or 0) > 0:
        return True

    peg = coin.get("HistoricalPegData") or {}
    if peg.get("points"):
        return True

    if coin.get("ChainDistribution"):
        return True

    if coin.get("ContractAddress"):
        # Contract without market yet — cron/Llama may still fill on next run
        return True

    return False


def _gaps_for_cohort(
    items: Dict[str, Any],
    cohort_name: str,
    predicate: Any,
) -> List[Dict[str, Any]]:
    gaps: List[Dict[str, Any]] = []
    for item in items.values():
        if item.get("Category") not in ("Entity", "Network"):
            continue
        if not predicate(item):
            continue
        entity_slug = item.get("Slug", "")
        for ref in item.get("MemberCoins") or []:
            ref_slug = ref.get("slug", "")
            ref_cat = ref.get("category", "")
            coin = _find_store_item(items, ref_cat, ref_slug)
            if coin is None:
                gaps.append(
                    {
                        "cohort": cohort_name,
                        "entity": entity_slug,
                        "coin_slug": ref_slug,
                        "category": ref_cat,
                        "issue": "missing store item",
                    }
                )
                continue
            if not _coin_has_live_data_path(ref_slug, coin):
                gaps.append(
                    {
                        "cohort": cohort_name,
                        "entity": entity_slug,
                        "coin_slug": ref_slug,
                        "category": ref_cat,
                        "issue": "no CoinGecko map, contract, market, or yield overlay",
                    }
                )
    return gaps


def report_member_coin_data_gaps(items: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Flag member coins missing any live-data path across Credit/Stablecoin/RWA/DEX."""
    gaps: List[Dict[str, Any]] = []
    for cohort_name, predicate in [
        ("Credit", _is_lending_cohort_entity),
        ("Stablecoin", _is_stablecoin_cohort_entity),
        ("RWA", _is_rwa_cohort_entity),
        ("DEX", _is_dex_cohort_entity),
    ]:
        gaps.extend(_gaps_for_cohort(items, cohort_name, predicate))
    return gaps


def print_member_coin_data_gap_report(gaps: List[Dict[str, Any]]) -> None:
    if not gaps:
        print("\nMember-coin data gaps: none across Credit/Stablecoin/RWA/DEX cohorts.")
        return

    by_cohort: Dict[str, List[Dict[str, Any]]] = {}
    for row in gaps:
        by_cohort.setdefault(row["cohort"], []).append(row)

    print(f"\nMember-coin data gaps ({len(gaps)} total):\n")
    for cohort_name in ("Credit", "Stablecoin", "RWA", "DEX"):
        cohort_gaps = by_cohort.get(cohort_name, [])
        if not cohort_gaps:
            print(f"  {cohort_name}: none")
            continue
        print(f"  {cohort_name} ({len(cohort_gaps)}):")
        for row in cohort_gaps:
            print(
                f"    {row['entity']:<14} "
                f"{row['category']}/{row['coin_slug']:<20} "
                f"{row['issue']}"
            )


def load_entity_specs() -> Dict[str, Dict[str, Any]]:
    from ingest_entities import ENTITY_SPECS  # noqa: E402

    return ENTITY_SPECS


def main(argv: List[str]) -> int:
    report_gaps = "--report-gaps" in argv
    report_member_coins_flag = "--report-member-coins" in argv
    report_missing_tvl_flag = "--report-missing-tvl" in argv
    report_member_coin_data_flag = "--report-member-coin-data" in argv
    use_store = "--store" in argv

    if use_store:
        if not STORE_PATH.exists():
            print(f"ERROR: {STORE_PATH} not found — run ingest scripts first.", file=sys.stderr)
            return 1
        store = json.loads(STORE_PATH.read_text(encoding="utf-8"))
        items = store.get("items", {})
        errors, gaps = validate_store_items(items)
        print(f"Validated {len(items)} store items")
    else:
        specs = load_entity_specs()
        errors = validate_entity_specs(specs)
        gaps = []
        items = {}
        print(f"Validated {len(specs)} entity specs")

    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("OK: no taxonomy errors")

    if report_gaps and gaps:
        print("GAPS:")
        for g in gaps:
            print(f"  - {g}")

    if report_member_coins_flag:
        if not items:
            print(
                "ERROR: --report-member-coins requires --store (reads store.json).",
                file=sys.stderr,
            )
            return 1
        reports = report_member_coins(items)
        print_member_coin_report(reports)

    if report_missing_tvl_flag:
        if not items:
            print(
                "ERROR: --report-missing-tvl requires --store (reads store.json).",
                file=sys.stderr,
            )
            return 1
        tvl_reports = report_missing_tvl(items)
        print_missing_tvl_report(tvl_reports)

    if report_member_coin_data_flag:
        if not items:
            print(
                "ERROR: --report-member-coin-data requires --store (reads store.json).",
                file=sys.stderr,
            )
            return 1
        data_gaps = report_member_coin_data_gaps(items)
        print_member_coin_data_gap_report(data_gaps)

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
