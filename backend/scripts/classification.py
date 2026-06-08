#!/usr/bin/env python3
"""
Shared, additive economic classification for CanHav coins (playbook §1.3 / §3).

This is the single source of truth that maps a coin `Slug` to its fine-grained
`AssetSubtype` + `PegMechanism`, layered ON TOP of the coarse TokenType /
StablecoinSubCategory / AssetClass (which are left untouched). It also carries a
small set of curated, sourced off-chain facts (`OffchainFacts`) with explicit
freshness so the agent never presents a static fact as if it were live.

Everything here is OPTIONAL and additive: a slug missing from the maps simply
gets no extra fields, and old store records keep deserializing unchanged. The
fields mirror the frontend contract in `frontend/lib/types.ts`
(`AssetSubtype`, `PegMechanism`, `OffchainFact`); inner keys are camelCase
because the frontend loader passes `OffchainFacts` through verbatim.

Applied by the coin ingest scripts only (stablecoins / tokens / rwas) — never to
Entity items, so the (slug-only) keys never collide with same-named entities
(e.g. the `ethena` stablecoin vs the `ethena` entity).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

# Capture date for the curated static/semi-live facts below.
_CAPTURED_AT = "2026-06-08"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


# slug -> { AssetSubtype, PegMechanism }. Coin slugs only (see module docstring).
# Source: DATA-EXPANSION-PLAYBOOK §1.3 (extended for coins present in the store
# but absent from the table, classified by the same rubric). RWA protocols whose
# economics don't map cleanly to the AssetSubtype union (private credit, real
# estate, structured products, event finance) are intentionally omitted so their
# assetSubtype stays null rather than being forced into a wrong bucket.
CLASSIFICATION: Dict[str, Dict[str, str]] = {
    # --- Stablecoins ---
    "ethena": {"AssetSubtype": "synthetic-dollar", "PegMechanism": "delta-neutral-hedge"},
    "susde": {"AssetSubtype": "yield-bearing-stable", "PegMechanism": "delta-neutral-hedge"},
    "usdtb": {"AssetSubtype": "rwa-backed-stable", "PegMechanism": "rwa-collateral"},
    "inverse-finance": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "overcollateralized"},
    "monerium": {"AssetSubtype": "e-money", "PegMechanism": "fiat-reserve"},
    "gbpe": {"AssetSubtype": "e-money", "PegMechanism": "fiat-reserve"},
    "sky": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "overcollateralized"},
    "susds": {"AssetSubtype": "yield-bearing-stable", "PegMechanism": "overcollateralized"},
    "stusds": {"AssetSubtype": "yield-bearing-stable", "PegMechanism": "overcollateralized"},
    "dai": {"AssetSubtype": "legacy", "PegMechanism": "overcollateralized"},
    "stably": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "fiat-reserve"},
    "veusd": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "fiat-reserve"},
    "tether": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "fiat-reserve"},
    "trueusd": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "fiat-reserve"},
    "usdc": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "fiat-reserve"},
    "usdt0": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "fiat-reserve"},
    "usdpm": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "fiat-reserve"},
    "gho": {"AssetSubtype": "fiat-stablecoin", "PegMechanism": "overcollateralized"},
    "sgho": {"AssetSubtype": "yield-bearing-stable", "PegMechanism": "overcollateralized"},
    "jupusd": {"AssetSubtype": "rwa-backed-stable", "PegMechanism": "rwa-collateral"},
    "jljupusd": {"AssetSubtype": "yield-bearing-stable", "PegMechanism": "rwa-collateral"},
    "usdai": {"AssetSubtype": "synthetic-dollar", "PegMechanism": "rwa-collateral"},
    "susdai": {"AssetSubtype": "yield-bearing-stable", "PegMechanism": "rwa-collateral"},
    # --- Tokens ---
    "chip": {"AssetSubtype": "governance", "PegMechanism": "none"},
    "jup": {"AssetSubtype": "governance", "PegMechanism": "none"},
    "jlp": {"AssetSubtype": "lp-receipt", "PegMechanism": "none"},
    "jupsol": {"AssetSubtype": "lst", "PegMechanism": "none"},
    "ena": {"AssetSubtype": "governance", "PegMechanism": "none"},
    "sky-gov": {"AssetSubtype": "governance", "PegMechanism": "none"},
    "ondo-gov": {"AssetSubtype": "governance", "PegMechanism": "none"},
    "aave-gov": {"AssetSubtype": "governance", "PegMechanism": "none"},
    "stkaave": {"AssetSubtype": "staked-governance", "PegMechanism": "none"},
    "usdy": {"AssetSubtype": "tokenized-treasury", "PegMechanism": "rwa-collateral"},
    # --- RWAs (only the ones that map cleanly to the AssetSubtype union) ---
    "pgold": {"AssetSubtype": "tokenized-commodity", "PegMechanism": "rwa-collateral"},
    "ousg": {"AssetSubtype": "institutional-gated", "PegMechanism": "rwa-collateral"},
    "franklin-templeton": {"AssetSubtype": "tokenized-treasury", "PegMechanism": "rwa-collateral"},
    "dinari": {"AssetSubtype": "tokenized-equity", "PegMechanism": "rwa-collateral"},
    "arcton": {"AssetSubtype": "tokenized-equity", "PegMechanism": "rwa-collateral"},
    "aryze": {"AssetSubtype": "rwa-backed-stable", "PegMechanism": "rwa-collateral"},
}


def _fact(
    key: str,
    value: str,
    freshness: str,
    source_label: str,
    source_url: str,
    theoretical: bool = False,
) -> Dict[str, Any]:
    fact: Dict[str, Any] = {
        "key": key,
        "value": value,
        "freshness": freshness,
        "source": {"label": source_label, "url": source_url},
        "capturedAt": _CAPTURED_AT,
    }
    if theoretical:
        fact["theoretical"] = True
    return fact


# slug -> [OffchainFact]. Curated, sourced, freshness-tagged. Kept conservative:
# only facts with a defensible official source. Entity-level facts (USD.AI, etc.)
# live in the entity specs, not here.
COIN_OFFCHAIN_FACTS: Dict[str, List[Dict[str, Any]]] = {
    "monerium": [
        _fact(
            "regulatoryStatus",
            "Regulated e-money issuer (EMI) authorized in the EEA; EURe is legal "
            "e-money redeemable at par.",
            "static",
            "Monerium",
            "https://monerium.com",
        ),
    ],
    "gbpe": [
        _fact(
            "regulatoryStatus",
            "GBP e-money issued by Monerium hf under its EEA EMI authorization.",
            "static",
            "Monerium",
            "https://monerium.com",
        ),
    ],
    "sky": [
        _fact(
            "rating",
            "S&P Global assigned USDS a 'B-' stablecoin stability assessment.",
            "static",
            "Sky",
            "https://sky.money",
        ),
    ],
    "trueusd": [
        _fact(
            "attestation",
            "Daily third-party reserve attestations plus Chainlink Proof of Reserve.",
            "semi-live",
            "TrueUSD",
            "https://tusd.io",
        ),
    ],
    "ethena": [
        _fact(
            "reserveComposition",
            "Backing is a delta-neutral mix of crypto collateral hedged with perp "
            "shorts plus liquid stablecoins; depegs if perp funding stays negative.",
            "semi-live",
            "OAK Research — Ethena deep dive",
            "https://oakresearch.io/en/analyses/fundamentals/ethena-ena-deep-dive-into-ecosystem",
        ),
    ],
    "usdai": [
        _fact(
            "reserveComposition",
            "Backed by tokenized AI-compute hardware loans (UCC-7 / CALIBER warehouse "
            "receipts) and short-term Treasuries via the M^0 stablecoin platform.",
            "semi-live",
            "USD.AI docs",
            "https://docs.usd.ai/",
        ),
    ],
    "susdai": [
        _fact(
            "yieldSource",
            "Yield accrues from USD.AI's GPU-collateralized lending activity; "
            "principal protected by CHIP/sCHIP first-loss capital.",
            "semi-live",
            "USD.AI docs",
            "https://docs.usd.ai/",
        ),
    ],
}


def apply_coin_classification(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mutate a coin item in place, adding `AssetSubtype`, `PegMechanism`, and
    `OffchainFacts` when the slug is mapped. No-op for unmapped slugs (additive,
    soft). Returns the same item for convenient inline use:

        repo.put_item(apply_coin_classification(item))
    """
    slug = str(item.get("Slug") or "").strip()
    if not slug:
        return item

    cls = CLASSIFICATION.get(slug)
    if cls:
        item["AssetSubtype"] = cls["AssetSubtype"]
        item["PegMechanism"] = cls["PegMechanism"]

    facts = COIN_OFFCHAIN_FACTS.get(slug)
    if facts:
        item["OffchainFacts"] = facts

    return item
