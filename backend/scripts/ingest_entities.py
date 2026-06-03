#!/usr/bin/env python3
"""
Seed the Entity category — top-tier umbrella protocols that group several coins.

Currently seeds USD.AI, which groups USDai + sUSDai (Stablecoins) and CHIP
(Token). The editorial content (components, FAQ, org structure, TradFi
comparison, risks, investment rounds, partnerships, current scale) is sourced
from the user-provided "USD.AI Initial Research" document — it isn't in the
Portal CSV, so it's curated here the same way RWA asset classes are assigned at
ingest. Shared metadata (website / portal banner) is pulled from the "usd-ai"
Portal row when available.

Run from anywhere:
    python3 backend/scripts/ingest_entities.py
    python3 backend/scripts/ingest_entities.py "/path/to/some.csv"

Stdlib only.
"""

from __future__ import annotations

import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

ENTITY_SLUG = "usd-ai"

DEFAULT_CSV = BACKEND_ROOT / "data" / "Arbitrum Ecosystem - scrape v2.csv"
DOWNLOADS_CSV = Path.home() / "Downloads" / "Arbitrum Ecosystem - scrape v2.csv"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    v = value.strip()
    return v or None


def _as_bool(value: Optional[str]) -> bool:
    return (value or "").strip().upper() == "TRUE"


def _split_chains(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [c.strip() for c in value.split("|") if c.strip()]


def resolve_csv_path(argv: List[str]) -> Path:
    if len(argv) > 1 and argv[1].strip():
        return Path(argv[1]).expanduser()
    if DEFAULT_CSV.exists():
        return DEFAULT_CSV
    if DOWNLOADS_CSV.exists():
        return DOWNLOADS_CSV
    return DEFAULT_CSV


# --- USD.AI editorial content (from the research document) -----------------

COMPONENTS = [
    {
        "name": "USDai",
        "description": "A fully backed synthetic dollar / stablecoin-style asset.",
    },
    {
        "name": "sUSDai",
        "description": (
            "Yield-bearing version of USDai. Users deposit capital and earn yield "
            "from the protocol's lending activity."
        ),
    },
    {
        "name": "AI infrastructure loans",
        "description": (
            "The protocol lends capital to AI infrastructure operators, typically "
            "backed by GPU hardware or related compute assets."
        ),
    },
]

FAQ = [
    {
        "question": "Is it synthetic?",
        "answer": (
            "Yes. Based on its own docs, USDai is a fully backed synthetic dollar, "
            "and sUSDai is the yield-bearing version."
        ),
        "pinned": True,
    },
    {
        "question": "Is it fully collateralized?",
        "answer": (
            "According to USD.AI's MiCA page, the protocol says it is "
            "overcollateralized, primarily by short-dated U.S. Treasury Bills and "
            "tokenized GPU assets."
        ),
        "pinned": True,
    },
]

ORG_STRUCTURE = [
    {
        "name": "USD.AI Foundation",
        "role": "Legal / off-chain steward",
        "description": (
            "A Cayman Islands foundation company that serves as the legal/off-chain "
            "steward of the USD.AI DAO. It handles governance execution, treasury "
            "management, legal/regulatory matters, and ecosystem development on "
            "behalf of CHIP tokenholders — but does not custody assets or run the "
            "core protocol (which is on-chain and permissionless)."
        ),
    },
    {
        "name": "Permian Labs",
        "role": "Core development team",
        "description": (
            "The core development team behind the protocol (smart contracts, risk "
            "engines, collateral systems). They are the technical builders and "
            "service providers to the Foundation."
        ),
    },
]

TRADFI_COMPARISON = [
    {
        "product": "Data Center Asset-Backed Securities (ABS)",
        "similarity": (
            "Pools cash flows from data centers/GPU clusters or hardware leases; "
            "investors get yield from AI infra revenue."
        ),
        "differences": (
            "Usually securitizes stabilized assets with long-term leases; less focus "
            "on individual GPUs."
        ),
    },
    {
        "product": "Equipment Finance / GPU Leasing & Loans",
        "similarity": (
            "Direct financing against servers, GPUs, or compute hardware (operating "
            "leases, sale-leasebacks, equipment loans)."
        ),
        "differences": (
            "Often provided by banks, specialty lenders (e.g., HPE Financial, Wells "
            "Fargo Equipment Finance), or private credit funds."
        ),
    },
    {
        "product": "Object Finance / Specialized Asset Lending",
        "similarity": (
            "Loans against physical income-generating assets (aircraft, ships, "
            "satellites, now GPUs) where repayment depends on the asset's cash flows."
        ),
        "differences": (
            "Highly regulated; banks treat GPUs as high-risk \"weak\" assets with "
            "heavy capital charges."
        ),
    },
    {
        "product": "Private Credit / Infrastructure Debt",
        "similarity": (
            "Non-bank lenders provide debt to AI infra operators secured by hardware "
            "and contracts."
        ),
        "differences": (
            "Less liquid; no tokenized/yield-bearing stablecoin wrapper like sUSDai."
        ),
    },
    {
        "product": "CMBS for Data Centers",
        "similarity": (
            "Commercial mortgage-backed securities backed by data center real estate "
            "+ equipment."
        ),
        "differences": "More real-estate focused than pure hardware.",
    },
]

RISKS = [
    "Rapid Obsolescence & Depreciation — GPUs lose value quickly (new generations "
    "every 18-24 months). If AI demand slows or better chips arrive, collateral "
    "value can crash, leading to under-collateralization.",
    "Double Default Risk — Collateral value and revenue (compute rentals) can drop "
    "simultaneously in a downturn.",
    "Liquidation Challenges — Oversupply during forced sales could tank the "
    "secondary market for used GPUs.",
    "Concentration & Cyclical Risk — Heavily tied to the AI boom; vulnerable to "
    "hype cycles (similar to dot-com vendor financing issues).",
    "Higher Costs — Often more expensive than plain corporate debt due to "
    "complexity and risk premiums.",
    "Regulatory & Structural Risks — In TradFi: heavy capital requirements for "
    "banks. In DeFi: smart contract, governance, or custody risks (though mitigated "
    "in USD.AI).",
    "Systemic Concerns — Some compare aggressive GPU financing to pre-2008 "
    "financial engineering (hidden leverage via SPVs).",
]

INVESTMENT_ROUNDS = [
    {
        "date": "Aug 2025",
        "round": "Series A",
        "amountUsd": 13_000_000,
        "amountLabel": "$13M",
        "investors": [
            "Framework Ventures (lead)",
            "Dragonfly",
            "Arbitrum",
            "Big Brain Holdings",
            "CMT Digital",
            "Hermeneutic Investments",
            "FWL Capital",
            "Flowdesk",
        ],
        "link": "https://usd.ai/insights/usdai-raises-13M-to-scale-ai-infra",
    },
    {
        "date": "Sept 2025",
        "round": "Strategic investment",
        "amountUsd": 4_000_000,
        "amountLabel": "$4M",
        "investors": ["Bullish Capital"],
        "link": "https://www.bullish.com/news-insights/bullish-makes-4-million-investment-into-usd-ai-its-first-since-ipo",
    },
    {
        "date": "Oct/Nov 2025",
        "round": "Strategic investment into Permian Labs",
        "amountUsd": None,
        "amountLabel": "Undisclosed",
        "investors": ["Coinbase Ventures"],
        "link": "https://usd.ai/insights/usdai-secures-coinbase-ventures-investment",
    },
    {
        "date": "Mar/Apr 2026",
        "round": "ICO",
        "amountUsd": None,
        "amountLabel": "ICO",
        "investors": [],
        "link": "https://icoanalytics.org/projects/usd-ai-permian-labs/",
    },
]

PARTNERSHIPS = [
    {
        "name": "Sharon AI",
        "date": "January 22, 2026",
        "amountLabel": "Up to $500M",
        "description": (
            "Up to $500 million debt facility approved for GPU-backed AI "
            "infrastructure expansion across Australia and Asia-Pacific."
        ),
    },
    {
        "name": "QumulusAI",
        "date": "October 9, 2025",
        "amountLabel": "$500M",
        "description": (
            "$500 million non-recourse financing facility to accelerate GPU-powered "
            "cloud infrastructure growth."
        ),
    },
    {
        "name": "Quantum Solutions",
        "date": "December 9, 2025",
        "amountLabel": "$200M",
        "description": (
            "$200 million guidance facility to support AI infrastructure expansion "
            "in Japan."
        ),
    },
    {
        "name": "PayPal & PYUSD",
        "date": "December 18, 2025",
        "amountLabel": "$1B incentive program",
        "description": (
            "Strategic integration where USDai is overcollateralized by PYUSD. "
            "Includes a $1 billion customer incentive program offering 4.5% yield on "
            "deposits."
        ),
    },
    {
        "name": "Coinbase Prime",
        "date": "November 20, 2025",
        "amountLabel": None,
        "description": (
            "Integration to enable institutional access to GPU-backed credit products."
        ),
    },
    {
        "name": "Barker (Barkr AI)",
        "date": "February 6, 2026",
        "amountLabel": None,
        "description": (
            "Partnership for AI-driven GPU valuations and reinsurance-backed "
            "insurance coverage on all new loans."
        ),
    },
    {
        "name": "Wilmington Trust",
        "date": "April 29, 2026",
        "amountLabel": None,
        "description": (
            "Appointed as escrow agent for GPU financings, enabling yield to accrue "
            "from loan signing."
        ),
    },
    {
        "name": "Chainlink",
        "date": "October 9, 2025",
        "amountLabel": None,
        "description": (
            "Adopted as the official oracle provider for price feeds and exchange "
            "rate data."
        ),
    },
]

CURRENT_SCALE = {
    "tvlUsd": 398_000_000,
    "users": 75_000,
    "aprPct": 7.09,
    "targetAprPct": 12.31,
    "loanPipelineUsd": 236_000_000,
    "partnerships": 80,
}

MEMBER_COINS = [
    {
        "slug": "usdai",
        "name": "USDai",
        "symbol": "USDAI",
        "category": "Stablecoin",
        "role": "Fully backed synthetic dollar",
    },
    {
        "slug": "susdai",
        "name": "sUSDai",
        "symbol": "sUSDai",
        "category": "Stablecoin",
        "role": "Yield-bearing synthetic dollar",
    },
    {
        "slug": "chip",
        "name": "CHIP",
        "symbol": "CHIP",
        "category": "Token",
        "role": "Governance token",
    },
]

DESCRIPTION = "USD.AI is a DeFi credit + synthetic dollar protocol for AI infrastructure financing."

TAGLINE = (
    "It lets crypto/stablecoin capital fund real-world AI compute infrastructure, "
    "especially GPUs, and turns that into a stablecoin/yield product."
)

DIFFERENTIATOR = (
    "It is not just \"a stablecoin company.\" It is more like a RWA/private credit "
    "protocol where the RWA is AI compute infrastructure."
)


def build_entity_item(parent_row: Optional[Dict[str, str]], created_at: str) -> dict:
    row = parent_row or {}
    now = _now_iso()
    return {
        schema.PK: schema.category_pk(schema.CATEGORY_ENTITY),
        schema.SK: schema.protocol_sk(ENTITY_SLUG),
        "Category": schema.CATEGORY_ENTITY,
        "Status": schema.STATUS_PENDING,
        "Name": "USD.AI",
        "Slug": ENTITY_SLUG,
        "Symbol": "USD.AI",
        "Tagline": TAGLINE,
        "Description": DESCRIPTION,
        "Differentiator": DIFFERENTIATOR,
        "OfficialDocs": "https://docs.usd.ai/",
        "Website": _clean(row.get("Website")) or "https://usd.ai",
        "Twitter": _clean(row.get("Twitter")) or "https://x.com/USDai_Official",
        "Discord": _clean(row.get("Discord")) or "https://t.me/usdaiofficial",
        "GitHub": _clean(row.get("GitHub")),
        "Components": COMPONENTS,
        "Faq": FAQ,
        "OrgStructure": ORG_STRUCTURE,
        "TradFiComparison": TRADFI_COMPARISON,
        "Risks": RISKS,
        "InvestmentRounds": INVESTMENT_ROUNDS,
        "Partnerships": PARTNERSHIPS,
        "CurrentScale": CURRENT_SCALE,
        "MemberCoins": MEMBER_COINS,
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": _split_chains(row.get("Chains")) or ["Arbitrum One"],
            "subCategory": "Entity",
            "isLive": _as_bool(row.get("Is Live")) or True,
            "isArbitrumNative": _as_bool(row.get("Is Arbitrum Native")),
            "isPubliclyAudited": _as_bool(row.get("Is Publicly Audited")),
            "foundedDate": _clean(row.get("Founded Date")),
        },
        "CreatedAt": created_at,
        "UpdatedAt": now,
    }


def main(argv: List[str]) -> int:
    csv_path = resolve_csv_path(argv)
    parent_row: Optional[Dict[str, str]] = None
    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                if (row.get("Slug") or "").strip() == ENTITY_SLUG:
                    parent_row = row
                    break

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_ENTITY)

    existing = repo.get_item(pk, schema.protocol_sk(ENTITY_SLUG))
    created_at = (existing or {}).get("CreatedAt") or _now_iso()
    repo.put_item(build_entity_item(parent_row, created_at))

    print(f"Source CSV : {csv_path if csv_path.exists() else '(none — usd.ai defaults)'}")
    print(f"Backend    : {type(repo).__name__}")
    print(f"Partition  : {pk}")
    print("-" * 64)
    print(f"{'STATUS':<18}{'SYMBOL':<10}{'NAME'}")
    print("-" * 64)
    print(f"{schema.STATUS_PENDING:<18}{'USD.AI':<10}USD.AI")
    print("-" * 64)
    print(
        f"Staged USD.AI entity ({len(MEMBER_COINS)} member coins) as "
        "PENDING_APPROVAL."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
