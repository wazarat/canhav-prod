#!/usr/bin/env python3
"""
Minimal research/risks defaults for network entities missing curated content.
Applied at ingest time when components/faq/risks are empty.
Stdlib only.
"""

from __future__ import annotations

from typing import Any, Dict, List

_GENERIC_RISKS: List[Dict[str, str]] = [
    {
        "category": "Smart Contract",
        "description": "On-chain logic upgrades, bugs, or parameter errors can impair user funds.",
    },
    {
        "category": "Market",
        "description": "Token, collateral, or peg volatility affects protocol solvency and user outcomes.",
    },
    {
        "category": "Liquidity",
        "description": "Thin markets make exits, liquidations, or redemptions harder during stress.",
    },
]

_SECTOR_RISK_EXTRA: Dict[str, List[Dict[str, str]]] = {
    "Credit": [
        {
            "category": "Oracle",
            "description": "Price feed failures or manipulation impair lending liquidations.",
        },
    ],
    "DEX": [
        {
            "category": "Impermanent loss",
            "description": "LPs face divergence loss when pool asset prices move apart.",
        },
    ],
    "Stablecoin": [
        {
            "category": "Peg",
            "description": "Stablecoin may de-peg under reserve, liquidity, or confidence stress.",
        },
    ],
    "Staking": [
        {
            "category": "Slashing",
            "description": "Validator or restaking slashing can reduce staked principal.",
        },
    ],
    "Derivatives": [
        {
            "category": "Leverage",
            "description": "High leverage amplifies losses during volatile markets.",
        },
    ],
    "RWA": [
        {
            "category": "Counterparty",
            "description": "Off-chain issuer or custodian risk affects token backing.",
        },
    ],
}

# Curated depositor/user estimates (public docs / Dune / DeFi Llama where available).
CURATED_USERS: Dict[str, int] = {
    "aave": 1_200_000,
    "compound": 450_000,
    "morpho": 180_000,
    "spark": 95_000,
    "radiant": 120_000,
    "uniswap": 4_500_000,
    "curve-finance": 850_000,
    "lido": 640_000,
    "eigenlayer": 280_000,
    "pendle": 75_000,
    "gmx": 220_000,
    "hyperliquid": 310_000,
    "ethena": 117_000,
    "jupiter": 125_500,
    "sky": 64_000,
    "ondo-finance": 52_000,
    "maple": 18_000,
    "venus": 410_000,
    "kamino": 190_000,
    "justlend": 520_000,
    "fluid": 45_000,
    "gearbox": 12_000,
    "balancer": 380_000,
    "aerodrome": 290_000,
    "pancakeswap": 1_800_000,
    "sushiswap": 650_000,
    "raydium": 720_000,
    "thorchain": 95_000,
    "synthetix": 85_000,
    "frax": 140_000,
}


def apply_minimal_research(spec: Dict[str, Any], slug: str) -> Dict[str, Any]:
    """Fill empty research/risks fields with sector-appropriate defaults."""
    out = dict(spec)
    name = out.get("name") or "This protocol"
    desc = (out.get("description") or out.get("tagline") or name).strip()
    sector = out.get("sector") or "Other"

    if not out.get("components"):
        out["components"] = [
            {
                "name": f"{name} core product",
                "description": desc[:240] if desc else f"Primary {sector.lower()} product.",
            },
        ]

    if not out.get("faq"):
        out["faq"] = [
            {
                "question": f"What is {name}?",
                "answer": desc[:400] if desc else f"{name} is a {sector.lower()} protocol on CanHav.",
                "pinned": True,
            },
        ]

    if not out.get("risks"):
        risks = list(_GENERIC_RISKS)
        risks.extend(_SECTOR_RISK_EXTRA.get(sector, []))
        out["risks"] = risks

    scale = dict(out.get("current_scale") or {})
    if scale.get("users") is None and slug in CURATED_USERS:
        scale["users"] = CURATED_USERS[slug]
        out["current_scale"] = scale

    return out
