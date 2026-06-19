#!/usr/bin/env python3
"""
Seed the Entity category — top-tier umbrella protocols that group several coins.

Seeds USD.AI, Jupiter, batch-1 issuers (Ethena, Sky, Monerium, Stably,
TrueUSD), and batch-2 issuers (Pleasing Market, Ondo Finance, Aave). Editorial
content (components, FAQ, org structure,
TradFi comparison, risks, events, partnerships, current scale) is curated here.
Shared metadata (website / portal banner) is pulled from a Portal CSV row when
available; Jupiter has no CSV row and uses hardcoded defaults.

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
from typing import Any, Dict, List, Optional

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

SCRIPTS_ROOT = Path(__file__).resolve().parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))
from entity_specs_batch import BATCH_ENTITY_SPECS  # noqa: E402
from entity_specs_batch_2 import BATCH_2_ENTITY_SPECS  # noqa: E402
from lending_specs import LENDING_ENTITY_SPECS  # noqa: E402
from stablecoin_specs import STABLECOIN_ENTITY_SPECS  # noqa: E402
from dex_specs import DEX_ENTITY_SPECS  # noqa: E402
from rwa_specs import RWA_ENTITY_SPECS  # noqa: E402

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


# --- Entity specifications -------------------------------------------------

ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    "usd-ai": {
        "name": "USD.AI",
        "symbol": "USD.AI",
        "csv_slug": "usd-ai",
        "tagline": (
            "It lets crypto/stablecoin capital fund real-world AI compute infrastructure, "
            "especially GPUs, and turns that into a stablecoin/yield product."
        ),
        "description": (
            "USD.AI is a DeFi credit + synthetic dollar protocol for AI infrastructure financing."
        ),
        "differentiator": (
            'It is not just "a stablecoin company." It is more like a RWA/private credit '
            "protocol where the RWA is AI compute infrastructure."
        ),
        "official_docs": "https://docs.usd.ai/",
        "website": "https://usd.ai",
        "twitter": "https://x.com/USDai_Official",
        "discord": "https://t.me/usdaiofficial",
        "github": None,
        "components": [
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
        ],
        "faq": [
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
        ],
        "org_structure": [
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
        ],
        "tradfi_comparison": [
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
        ],
        "risks": [
            {
                "category": "Collateral",
                "description": (
                    "Rapid Obsolescence & Depreciation — GPUs lose value quickly (new generations "
                    "every 18-24 months). If AI demand slows or better chips arrive, collateral "
                    "value can crash, leading to under-collateralization."
                ),
            },
            {
                "category": "Collateral",
                "description": (
                    "Double Default Risk — Collateral value and revenue (compute rentals) can drop "
                    "simultaneously in a downturn."
                ),
            },
            {
                "category": "Collateral",
                "description": (
                    "Liquidation Challenges — Oversupply during forced sales could tank the "
                    "secondary market for used GPUs."
                ),
            },
            {
                "category": "Systemic",
                "description": (
                    "Concentration & Cyclical Risk — Heavily tied to the AI boom; vulnerable to "
                    "hype cycles (similar to dot-com vendor financing issues)."
                ),
            },
            {
                "category": "Counterparty",
                "description": (
                    "Higher Costs — Often more expensive than plain corporate debt due to "
                    "complexity and risk premiums."
                ),
            },
            {
                "category": "Regulatory",
                "description": (
                    "Regulatory & Structural Risks — In TradFi: heavy capital requirements for "
                    "banks. In DeFi: smart contract, governance, or custody risks (though mitigated "
                    "in USD.AI)."
                ),
            },
            {
                "category": "Systemic",
                "description": (
                    "Systemic Concerns — Some compare aggressive GPU financing to pre-2008 "
                    "financial engineering (hidden leverage via SPVs)."
                ),
            },
        ],
        "events": [],
        # Sourced milestone timeline (playbook §5). `status` separates what the
        # protocol has executed/stated from forward design (theoretical) and our
        # own inferred steps (canhav-inferred) — the UI renders these distinctly.
        "timeline": [
            {
                "date": "2025-05-06",
                "title": "Delphi Digital research report",
                "description": (
                    "Delphi publishes the 3-phase backing roadmap (T-bills -> mixed -> "
                    "~100% hardware) framing USD.AI as AI-infra credit."
                ),
                "link": "https://members.delphidigital.io/reports/usd-ai-financing-the-future-of-ai-infra",
                "status": "stated",
            },
            {
                "date": "2025-08",
                "title": "Permian Labs builds USD.AI",
                "description": "GPU-collateralized lending model goes live, built by Permian Labs (Delaware).",
                "link": "https://crypto-fundraising.info/projects/usd-ai-permian-labs/",
                "status": "executed",
            },
            {
                "date": "2025-10-15",
                "title": "USDai launches on M^0",
                "description": (
                    "USDai launches on the M^0 stablecoin platform; CALIBER (UCC-7 warehouse "
                    "receipts) + QEV redemption framework introduced."
                ),
                "link": "https://research.m0.org/research/usdai-uses-m0s-stablecoin-platform-to-launch-composable-synthetic-dollar",
                "status": "executed",
            },
            {
                "date": "2025-10/11",
                "title": "Coinbase Ventures investment",
                "description": "Coinbase Ventures invests in Permian Labs.",
                "link": "https://usd.ai/insights/usdai-secures-coinbase-ventures-investment",
                "status": "executed",
            },
            {
                "date": "2025-12-18",
                "title": "PayPal PYUSD partnership",
                "description": (
                    "4.5% incentive on up to $1B PYUSD deposits (~1yr program from Jan 2026); "
                    ">$650M on-chain compute-backed at the time."
                ),
                "link": "https://usd.ai/insights/pyusd-paypal-usdai-integration",
                "status": "executed",
            },
            {
                "date": "2026-01-27",
                "title": "USD.AI Foundation + $CHIP announced",
                "description": (
                    "USD.AI Foundation (Cayman) launches; $CHIP announced; $1.5B+ pipeline, "
                    "first $100M GPU loans targeted Q1 2026."
                ),
                "link": "https://usd.ai/insights/usdai-foundation-chip",
                "status": "executed",
            },
            {
                "date": "2026-02-09",
                "title": "CHIP ICO terms",
                "description": (
                    "$0.03/token, $300M FDV, 700M CHIP (7% supply), 100% unlock at TGE, on CoinList."
                ),
                "link": "https://usd.ai/insights/chip-ico-airdrop",
                "status": "stated",
            },
            {
                "date": "2026-02-18 → 02-27",
                "title": "Allo Game S1 → CoinList ICO",
                "description": "Allo Game S1 ends -> Level Up window -> CoinList ICO (Feb 22-27).",
                "link": "https://usd.ai/insights/allo-game-to-flatiron-level-up-guide",
                "status": "executed",
            },
            {
                "date": "2026-04-22",
                "title": "$CHIP live",
                "description": (
                    "$225M loans executed, >$1.2B approved facilities; sCHIP live; "
                    "claim deadline May 30, 2026."
                ),
                "link": "https://usd.ai/insights/chip-is-live",
                "status": "executed",
            },
            {
                "date": "2026-06-17",
                "title": "Protected $CHIP unlock (scheduled)",
                "description": "Protected $CHIP unlock at YT maturity (settle $270M FDV).",
                "link": "https://usd.ai/insights/chip-is-live",
                "status": "stated",
            },
            {
                "date": "2026-10-14",
                "title": "Second YT maturity + Flatiron S2 end (scheduled)",
                "description": "Second YT maturity ($190M FDV settle); Flatiron (Allo S2) season ends.",
                "link": "https://usd.ai/insights/chip-is-live",
                "status": "stated",
            },
            {
                "date": "Phase 3 (design-stage)",
                "title": "~100% hardware backing, ~20% APY",
                "description": (
                    "Delphi's terminal backing phase; depends on loan demand scaling — "
                    "not reached (backing is still mixed T-bills + early loans)."
                ),
                "link": "https://members.delphidigital.io/reports/usd-ai-financing-the-future-of-ai-infra",
                "status": "theoretical",
            },
            {
                "date": "design-stage",
                "title": "QEV as primary redemption path",
                "description": (
                    "Designed mechanism that 'becomes more relevant as USDai becomes more "
                    "hardware-backed in stage 3' — not the live primary path yet."
                ),
                "link": "https://research.m0.org/research/usdai-uses-m0s-stablecoin-platform-to-launch-composable-synthetic-dollar",
                "status": "theoretical",
            },
            {
                "date": "target",
                "title": "$2B+ pipeline -> realized loans",
                "description": "Pipeline is not originated; only $225M actually executed as of Apr 2026.",
                "link": "https://usd.ai/insights/chip-is-live",
                "status": "theoretical",
            },
            {
                "date": "2026-Q3 (estimate)",
                "title": "[CanHav-inferred] Pipeline -> origination ramp",
                "description": (
                    "Inferred step closing the gap between >$1.2B approved facilities and "
                    "$225M originated. USD.AI does not publish a per-facility drawdown "
                    "schedule — this is CanHav's estimate, not a USD.AI commitment."
                ),
                "link": None,
                "status": "canhav-inferred",
            },
        ],
        # Curated, sourced off-chain facts (playbook §3 / §5).
        "offchain_facts": [
            {
                "key": "icoTerms",
                "value": (
                    "$CHIP ICO: $0.03/token, $300M FDV, 700M CHIP (7% supply), 100% unlock "
                    "at TGE, sold on CoinList."
                ),
                "freshness": "static",
                "source": {"label": "USD.AI", "url": "https://usd.ai/insights/chip-ico-airdrop"},
                "capturedAt": "2026-06-08",
            },
            {
                "key": "orgStructure",
                "value": (
                    "USD.AI Foundation (Cayman) governs; Permian Labs (Delaware) builds the protocol."
                ),
                "freshness": "static",
                "source": {"label": "USD.AI", "url": "https://usd.ai/insights/usdai-foundation-chip"},
                "capturedAt": "2026-06-08",
            },
            {
                "key": "backingRoadmap",
                "value": (
                    "Delphi 3-phase backing roadmap: T-bills -> mixed -> ~100% hardware. "
                    "Terminal hardware-backed phase remains design-stage."
                ),
                "freshness": "static",
                "source": {
                    "label": "Delphi Digital",
                    "url": "https://members.delphidigital.io/reports/usd-ai-financing-the-future-of-ai-infra",
                },
                "capturedAt": "2026-06-08",
                "theoretical": True,
            },
        ],
        "tokenomics": {
            "maxSupply": 10_000_000_000,
            "emissionsPolicy": (
                "ICO sold 700M CHIP (7% of supply) at $0.03 (≈$300M FDV) with 100% unlock at TGE; "
                "remaining supply held across foundation, ecosystem and contributors."
            ),
            "notes": [
                "10B CHIP total supply.",
                "sCHIP (staked CHIP) is the protocol's first-loss insurance capital.",
            ],
        },
        "investment_rounds": [
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
        ],
        "partnerships": [
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
        ],
        "current_scale": {
            "tvlUsd": 398_000_000,
            "users": 75_000,
            "aprPct": 7.09,
            "targetAprPct": 12.31,
            "loanPipelineUsd": 236_000_000,
            "partnerships": 80,
        },
        "scale_labels": None,
        "member_coins": [
            {
                "slug": "usdai",
                "name": "USDai",
                "symbol": "USDAI",
                "category": "Stablecoin",
                "role": "Fully backed synthetic dollar",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "susdai",
                "name": "sUSDai",
                "symbol": "sUSDai",
                "category": "Stablecoin",
                "role": "Yield-bearing synthetic dollar",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "chip",
                "name": "CHIP",
                "symbol": "CHIP",
                "category": "Token",
                "role": "Governance token",
                "subCategory": "Governance Token",
            },
            {
                "slug": "schip",
                "name": "sCHIP",
                "symbol": "sCHIP",
                "category": "Token",
                "role": "Staked CHIP — first-loss insurance capital",
                "subCategory": "Yield-generating Token",
            },
        ],
        "portal_defaults": {
            "chains": ["Arbitrum One"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": False,
            "foundedDate": None,
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
        # Primary Lending per ontology §6.1 / §7; stablecoin sub-sector is secondary.
        "sub_category": "Protocol",
        "sector": "Lending",
        "sub_sector": "Institutional / Private Credit",
        "tags": ["Institutional / Private Credit"],
        "secondary_sectors": ["Stablecoin", "RWA"],
        "stablecoin_sub_sector": "RWA-Backed Stable",
        "stablecoin_secondary_tags": ["RWA-Backed"],
    },
    "jupiter": {
        "name": "Jupiter",
        "symbol": "JUP",
        "csv_slug": None,
        "tagline": "Home of Onchain Finance",
        "description": (
            "Jupiter is a vertically integrated trading ecosystem on Solana spanning "
            "swap aggregation, perpetuals, lending, stablecoins, and launchpads. It groups "
            "governance, liquidity, dollar, and staking products under one umbrella issuer."
        ),
        "differentiator": (
            "Jupiter is a vertically integrated trading ecosystem (aggregator, perps, lend, "
            "stablecoin, launchpad), not a single credit product."
        ),
        "official_docs": "https://dev.jup.ag/",
        "website": "https://jup.ag",
        "twitter": "https://x.com/JupiterExchange",
        "discord": "https://discord.gg/jup",
        "github": "https://github.com/jup-ag",
        "components": [
            {
                "name": "Jupiter Aggregator / Ultra",
                "description": (
                    "DEX aggregator and smart order router for spot swaps across Solana "
                    "liquidity venues with low slippage routing."
                ),
            },
            {
                "name": "Jupiter Perps",
                "description": (
                    "On-chain perpetuals exchange where traders borrow from the JLP pool; "
                    "LPs take the house side of trader PnL."
                ),
            },
            {
                "name": "Jupiter Lend",
                "description": (
                    "Secured lending desk built with Fluid: up to 95% LTV on some assets, "
                    "JLP vaults at 83% LTV, with Earn vaults for yield-bearing dollars."
                ),
            },
            {
                "name": "JupUSD",
                "description": (
                    "Reserve-backed Solana stablecoin (~90% USDtb / BlackRock BUIDL-backed "
                    "+ 10% USDC buffer) built with Ethena; non-yielding for compliance."
                ),
            },
            {
                "name": "Jupiter Studio",
                "description": "Token launchpad for new Solana projects within the Jupiter ecosystem.",
            },
            {
                "name": "Predictions",
                "description": "On-chain prediction markets product within the Jupiter stack.",
            },
        ],
        "faq": [
            {
                "question": "Is JUP a utility token?",
                "answer": (
                    "No. Per founder Meow (AMA), JUP is for DAO governance only. Supply is "
                    "capped at 10B with 50% allocated to the community."
                ),
                "pinned": True,
            },
            {
                "question": "What is the JupUSD / jlJupUSD distinction?",
                "answer": (
                    "JupUSD is the plain reserve-backed dollar (no native yield). Deposit "
                    "JupUSD into Jupiter Lend Earn to receive jlJupUSD, which earns interest "
                    "and incentives while staying liquid as collateral."
                ),
                "pinned": True,
            },
            {
                "question": "How does JLP work?",
                "answer": (
                    "JLP is a tradeable index of SOL, ETH, BTC, and stables (~35% stable / "
                    "65% volatile). Its value reflects the basket, trader PnL, and 75% of perp "
                    "fees auto-compounded into the pool."
                ),
                "pinned": True,
            },
            {
                "question": "Who builds Jupiter Lend and JupUSD?",
                "answer": (
                    "Jupiter Lend uses Fluid as the lending engine. JupUSD is built with "
                    "Ethena Labs infrastructure; reserves include BlackRock BUIDL-backed USDtb "
                    "with custody via Anchorage Digital and Porto."
                ),
            },
        ],
        "org_structure": [
            {
                "name": "Jupiter (Meow team)",
                "role": "Core development",
                "description": (
                    "Core dev team behind the aggregator, perps, lend, stablecoin, and "
                    "launchpad products. Founded by Meow."
                ),
            },
            {
                "name": "Jupiter DAO (Jupiter United Planet)",
                "role": "Governance",
                "description": (
                    "Community governance via JUP tokenholders. Active community members "
                    "are known as Space Catdets."
                ),
            },
            {
                "name": "Product stewards",
                "role": "External partners",
                "description": (
                    "External partner stewards per product line: Ethena for JupUSD tech, "
                    "Fluid for Jupiter Lend engine, Anchorage Digital and Porto for custody."
                ),
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Smart order router / brokerage",
                "similarity": (
                    "Jupiter Aggregator routes orders across venues for best execution, "
                    "similar to a smart order router at a retail brokerage."
                ),
                "differences": (
                    "Fully on-chain, non-custodial, and composable across Solana DeFi "
                    "liquidity pools rather than regulated broker-dealer inventory."
                ),
            },
            {
                "product": "Market-maker / hedge-fund LP share",
                "similarity": (
                    "JLP LPs are the house: they earn fees but lose when traders win, "
                    "akin to a prop desk or MM taking the other side of flow."
                ),
                "differences": (
                    "Transparent on-chain basket, tradeable token, and auto-compounded "
                    "perp fees rather than opaque fund NAV."
                ),
            },
            {
                "product": "Tokenized money-market-backed dollar",
                "similarity": (
                    "JupUSD is a reserve-backed dollar with Treasury/MM exposure via USDtb, "
                    "similar to tokenized money-market fund shares."
                ),
                "differences": (
                    "SPL token on Solana, no native yield on JupUSD itself (compliance); "
                    "yield is opt-in via jlJupUSD in Lend Earn."
                ),
            },
            {
                "product": "Secured lending desk",
                "similarity": (
                    "Jupiter Lend offers collateralized borrowing and Earn vaults, "
                    "similar to a prime brokerage secured lending book."
                ),
                "differences": (
                    "Permissionless on-chain LTV parameters, JLP vault integration, and "
                    "Fluid-powered risk engine rather than bilateral bank credit lines."
                ),
            },
        ],
        "risks": [
            {
                "category": "Counterparty",
                "description": (
                    "JLP counterparty risk: LPs are the house and lose when traders win; "
                    "adverse selection and volatile markets can erode JLP NAV."
                ),
            },
            {
                "category": "Network",
                "description": (
                    "Solana network and outage risk: congestion or halts can delay trades, "
                    "liquidations, and redemptions across Jupiter products."
                ),
            },
            {
                "category": "Oracle",
                "description": (
                    "Oracle risk on perps and lend: stale or manipulated price feeds can "
                    "cause bad liquidations or undercollateralized positions."
                ),
            },
            {
                "category": "Reserve / Depeg",
                "description": (
                    "JupUSD reserve and depeg risk: USDtb/USDC reserve stress or custody "
                    "issues could break the dollar peg."
                ),
            },
            {
                "category": "Smart Contract",
                "description": (
                    "Smart-contract risk across aggregator, perps, lend, and stablecoin "
                    "modules; composability multiplies exploit surface."
                ),
            },
            {
                "category": "Governance",
                "description": (
                    "Governance concentration: JUP distribution and voter participation "
                    "may concentrate upgrade and parameter control."
                ),
            },
        ],
        "events": [
            {
                "date": "2021",
                "title": "Jupiter launch",
                "description": (
                    "Jupiter launches as a Solana DEX aggregator, establishing best-route "
                    "swap infrastructure for the ecosystem."
                ),
                "link": "https://jup.ag",
            },
            {
                "date": "Jan 2024",
                "title": "JUP airdrop",
                "description": (
                    "JUP governance token airdrop to the Solana community; 50% of the "
                    "10B capped supply allocated to community participants."
                ),
                "link": "https://dev.jup.ag",
            },
            {
                "date": "Dec 2025",
                "title": "JupUSD launch",
                "description": (
                    "JupUSD goes live with Ethena infrastructure: ~90% USDtb "
                    "(BlackRock BUIDL-backed) + 10% USDC buffer, custody via Anchorage/Porto."
                ),
                "link": "https://dev.jup.ag",
            },
            {
                "date": "Jan 2026",
                "title": "Jupiter Lend exits beta",
                "description": (
                    "Jupiter Lend moves out of beta with Fluid-powered markets, Earn vaults "
                    "(jlJupUSD), and JLP vault integrations."
                ),
                "link": "https://dev.jup.ag",
            },
        ],
        "investment_rounds": [],
        "partnerships": [
            {
                "name": "Ethena Labs",
                "date": "Dec 2025",
                "amountLabel": None,
                "description": (
                    "Stablecoin-as-a-Service partner for JupUSD technology and reserve "
                    "infrastructure."
                ),
            },
            {
                "name": "BlackRock BUIDL / USDtb",
                "date": "Dec 2025",
                "amountLabel": None,
                "description": (
                    "Reserve backing for JupUSD via USDtb, a tokenized dollar with "
                    "Treasury exposure under a GENIUS-compliant framework."
                ),
            },
            {
                "name": "Anchorage Digital + Porto",
                "date": "Dec 2025",
                "amountLabel": None,
                "description": "Institutional custody partners for JupUSD reserves.",
            },
            {
                "name": "Meteora",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "USDC liquidity pool partner supporting JupUSD market depth.",
            },
            {
                "name": "Fluid",
                "date": "2025",
                "amountLabel": None,
                "description": "Lending engine partner powering Jupiter Lend markets and vaults.",
            },
        ],
        "current_scale": {
            "tvlUsd": 2_700_000_000,
            "users": 125_500,
            "aprPct": None,
            "targetAprPct": None,
            "marketCapUsd": 523_500_000,
            "loanPipelineUsd": 1_080_000_000_000,
            "partnerships": 5,
        },
        "scale_labels": {
            "tvl": "TVL",
            "users": "Active Daily Users",
            "apr": "Market Cap",
            "pipeline": "Annual spot+perp volume",
            "partnerships": "Partnerships",
            "coins": "Products",
        },
        "member_coins": [
            {
                "slug": "jup",
                "name": "JUP",
                "symbol": "JUP",
                "category": "Token",
                "role": "DAO governance token (not a utility token)",
                "subCategory": "Governance Token",
            },
            {
                "slug": "jlp",
                "name": "JLP",
                "symbol": "JLP",
                "category": "Token",
                "role": "Perps liquidity provider index + fee share",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "jupusd",
                "name": "JupUSD",
                "symbol": "JUPUSD",
                "category": "Stablecoin",
                "role": "Reserve-backed dollar (no native yield)",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "jljupusd",
                "name": "Jupiter Lend JUPUSD",
                "symbol": "jlJUPUSD",
                "category": "Stablecoin",
                "role": "Yield-bearing JupUSD from Lend Earn vault",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "jupsol",
                "name": "JupSOL",
                "symbol": "JUPSOL",
                "category": "Token",
                "role": "Jupiter Staked SOL liquid staking token",
                "subCategory": "LST",
            },
        ],
        "timeline": [
            {
                "date": "2024-01-31",
                "title": "JUP genesis launch + first Jupuary airdrop",
                "description": "Jupiter launches the JUP token with its inaugural community 'Jupuary' airdrop.",
                "link": "https://jup.ag",
                "status": "executed",
            },
            {
                "date": "2025",
                "title": "JUP buyback program",
                "description": "Jupiter commits 50% of protocol fees to JUP buybacks held in the Litterbox Trust.",
                "link": "https://jup.ag",
                "status": "executed",
            },
            {
                "date": "2025 → 2026",
                "title": "JupUSD launches (built with Ethena)",
                "description": "Jupiter introduces JupUSD, a reserve-backed Solana dollar (≈90% USDtb + USDC buffer).",
                "link": "https://jup.ag",
                "status": "stated",
            },
        ],
        "offchain_facts": [
            {
                "key": "supplyCap",
                "value": "JUP is capped at 10B tokens with 50% allocated to the community.",
                "freshness": "static",
                "source": {"label": "Jupiter", "url": "https://jup.ag"},
                "capturedAt": "2026-06-08",
            },
            {
                "key": "buybacks",
                "value": (
                    "Jupiter directs 50% of protocol fees to JUP buybacks held in the Litterbox "
                    "Trust with a 3-year lock."
                ),
                "freshness": "semi-live",
                "source": {"label": "Jupiter", "url": "https://jup.ag"},
                "capturedAt": "2026-06-08",
            },
        ],
        "tokenomics": {
            "maxSupply": 10_000_000_000,
            "buybackPolicy": (
                "50% of protocol fees buy back JUP into the Litterbox Trust (3-year lock)."
            ),
            "distribution": [
                {"bucket": "Community", "pct": 50},
                {"bucket": "Team & strategic reserves", "pct": 50},
            ],
            "notes": [
                "10B JUP max supply.",
                "Half of supply is reserved for the community (airdrops, incentives, treasury).",
            ],
        },
        "portal_defaults": {
            "chains": ["Solana"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": True,
            "foundedDate": "2021",
            "logoUrl": "https://assets.coingecko.com/coins/images/34188/small/jup.png",
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
}

ENTITY_SPECS.update(BATCH_ENTITY_SPECS)
ENTITY_SPECS.update(BATCH_2_ENTITY_SPECS)
# Lending cohort (PDF Week 7+8): Morpho, Spark, Compound, Fluid, Venus,
# JustLend, Kamino, Maple — Aave is reclassified in BATCH_2_ENTITY_SPECS.
ENTITY_SPECS.update(LENDING_ENTITY_SPECS)
# Stablecoin cohort (PDF "Stablecoin Sector Expansion"): Circle, Paxos, First
# Digital, M^0, Agora, Bitget, GMO Trust, Liquity, Curve (crvUSD), Lista, Reserve,
# Frax, Resolv, Falcon, Cap, Elixir, Anzen, Mountain Protocol.
ENTITY_SPECS.update(STABLECOIN_ENTITY_SPECS)
# DEX cohort (PDF "DEX + RWA Sector Expansion" §3): Uniswap, Curve, Balancer,
# Aerodrome, PancakeSwap, Trader Joe, SushiSwap, Raydium, THORChain, Hyperliquid,
# dYdX, GMX, Drift, Gains Network — Jupiter is retro-tagged below.
ENTITY_SPECS.update(DEX_ENTITY_SPECS)
# RWA cohort (PDF "DEX + RWA Sector Expansion" §4): Securitize, Centrifuge,
# Goldfinch, RealT, Clearpool, Toucan, Lofty.ai, Franklin Templeton.
ENTITY_SPECS.update(RWA_ENTITY_SPECS)

# Stablecoin sub-sector backfill for the pre-existing issuers (PDF §2). Primary
# stablecoin issuers also get sector="Stablecoin"; cross-tagged protocols keep
# their primary sector and only gain the stablecoin sub-sector + secondary tags.
_STABLECOIN_PRIMARY_BACKFILL: Dict[str, Any] = {
    "ethena": ("Synthetic Yield-Bearing", ["RWA-Backed", "Yield-Bearing"]),
    "sky": ("Decentralized CDP", ["Yield-Bearing"]),
    "monerium": ("E-Money Regulated", ["Multi-Currency"]),
    "stably": ("Fiat-Backed Regulated", []),
    "trueusd": ("Fiat-Backed Regulated", ["Multi-Currency"]),
}
_STABLECOIN_SECONDARY_BACKFILL: Dict[str, Any] = {
    "jupiter": ("Synthetic Yield-Bearing", ["RWA-Backed"]),
    "ondo-finance": ("RWA-Backed Stable", []),
    "aave": ("Decentralized CDP", []),
    "pleasing-market": ("Fiat-Backed Regulated", []),
    "curve-finance": ("Decentralized CDP", []),
    "spark": ("Decentralized CDP", ["Yield-Bearing"]),
}
for _slug, (_subsector, _tags) in _STABLECOIN_PRIMARY_BACKFILL.items():
    _spec = ENTITY_SPECS.get(_slug)
    if _spec is not None:
        _spec["sector"] = "Stablecoin"
        _spec["stablecoin_sub_sector"] = _subsector
        _spec["stablecoin_secondary_tags"] = _tags
for _slug, (_subsector, _tags) in _STABLECOIN_SECONDARY_BACKFILL.items():
    _spec = ENTITY_SPECS.get(_slug)
    if _spec is not None:
        _spec["stablecoin_sub_sector"] = _subsector
        _spec["stablecoin_secondary_tags"] = _tags

# Cross-sector tagging (PDF §5). Additive: the primary `sector` is unchanged;
# these are the *additional* NetworkSectors an entity also belongs to so it
# surfaces under each. Lifecycle/exchange markers (Wound-Down, Exchange-Native)
# are secondary *tags* not sectors, so Mountain and Bitget get none here.
_SECONDARY_SECTORS: Dict[str, List[str]] = {
    # Primary Stablecoin issuers that also operate in other sectors.
    "sky": ["Lending"],
    "spark": ["Stablecoin"],
    "ethena": ["RWA", "Yield"],
    "anzen": ["RWA"],
    "frax": ["RWA"],
    "mountain-protocol": ["RWA"],
    # Primary Lending with stablecoin / RWA cross-tags.
    "usd-ai": ["Stablecoin", "RWA"],
    "maple": ["RWA"],
    # Protocols whose primary sector stays put but also issue a stablecoin.
    "jupiter": ["Stablecoin", "Perpetuals"],
    "curve-finance": ["Stablecoin"],
    "ondo-finance": ["Stablecoin"],
    "aave": ["Stablecoin"],
    "pleasing-market": ["Stablecoin"],
}
for _slug, _sectors in _SECONDARY_SECTORS.items():
    _spec = ENTITY_SPECS.get(_slug)
    if _spec is not None:
        _spec["secondary_sectors"] = _sectors

# --- DEX + RWA Sector Expansion (PDF §6) ----------------------------------
# Retro-tag the existing Jupiter umbrella as a primary DEX (Aggregator); its
# Stablecoin (JupUSD) + Perpetuals cross-tags are already in _SECONDARY_SECTORS.
_jupiter = ENTITY_SPECS.get("jupiter")
if _jupiter is not None:
    _jupiter["sector"] = "DEX"
    _jupiter["dex_sub_sector"] = "Aggregator"
    _jupiter["dex_secondary_tags"] = ["Solana-Native", "Routing-Layer", "Spot", "Perps"]
    _jupiter["dex"] = {
        "tvlUsd": {"value": None, "dataSource": "derived", "sourceLabel": "DefiLlama", "updatedAt": None},
        "volume30dUsd": {"value": None, "dataSource": "derived", "sourceLabel": "DefiLlama", "updatedAt": None},
        "governanceToken": "JUP",
        "auditHistory": "Audited Solana programs; OtterSec / Sec3 reviews across products.",
        "deployment": {
            "chains": ["Solana"],
            "evmCompatible": "no",
            "notes": "Solana-native vertically integrated trading stack (aggregator, perps, lend, stablecoin, launchpad).",
        },
        "subSectorMetrics": {
            "kind": "aggregator",
            "integratedDexes": {"value": None, "dataSource": "derived", "sourceLabel": "Jupiter docs", "updatedAt": None},
            "routingAlgo": "Metis smart order router across Solana liquidity venues.",
            "topRoutedVenues": [{"venue": "Raydium", "sharePct": 55}],
        },
    }

# Additive cross-sector tags for the new DEX/RWA entities (PDF §6). Centrifuge,
# Clearpool, and Goldfinch are private-credit RWA shops that also function as
# lending venues; PancakeSwap and Hyperliquid run perps alongside their DEX.
_EXPANSION_SECONDARY_SECTORS: Dict[str, List[str]] = {
    "centrifuge": ["Lending"],
    "clearpool": ["Lending"],
    "goldfinch": ["Lending"],
    "pancakeswap": ["Perpetuals"],
    "hyperliquid": ["Perpetuals"],
    "gmx": ["Perpetuals"],
    "gains-network": ["Perpetuals"],
}
for _slug, _sectors in _EXPANSION_SECONDARY_SECTORS.items():
    _spec = ENTITY_SPECS.get(_slug)
    if _spec is not None:
        _spec["secondary_sectors"] = _sectors

# RWA sub-sector backfill for entities whose primary sector is set elsewhere
# (PDF §6). Ondo + Pleasing Market become primary RWA umbrellas (keeping their
# Stablecoin cross-tag); Mountain Protocol stays a primary Stablecoin issuer and
# only gains the RWA sub-sector + Wound-Down marker.
_RWA_PRIMARY_BACKFILL: Dict[str, Any] = {
    "ondo-finance": ("Tokenized Treasuries", ["Institutional-Gated", "Yield-Bearing"]),
    "pleasing-market": ("Tokenized Commodities", ["Real-World-Custody"]),
}
for _slug, (_subsector, _tags) in _RWA_PRIMARY_BACKFILL.items():
    _spec = ENTITY_SPECS.get(_slug)
    if _spec is not None:
        _spec["sector"] = "RWA"
        _spec["rwa_sub_sector"] = _subsector
        _spec["rwa_secondary_tags"] = _tags
        # Preserve the Stablecoin cross-tag while surfacing under RWA primary.
        _existing = set(_spec.get("secondary_sectors") or [])
        _existing.add("Stablecoin")
        _spec["secondary_sectors"] = sorted(_existing)

_RWA_SECONDARY_BACKFILL: Dict[str, Any] = {
    "mountain-protocol": ("Tokenized Treasuries", ["Wound-Down"]),
}
for _slug, (_subsector, _tags) in _RWA_SECONDARY_BACKFILL.items():
    _spec = ENTITY_SPECS.get(_slug)
    if _spec is not None:
        _spec["rwa_sub_sector"] = _subsector
        _spec["rwa_secondary_tags"] = _tags
        _existing = set(_spec.get("secondary_sectors") or [])
        _existing.add("RWA")
        _spec["secondary_sectors"] = sorted(_existing)

# High-cardinality RWA parents — child entity slugs populated as data lands.
_CHILD_ENTITIES: Dict[str, List[str]] = {
    "realt": [],
    "lofty-ai": [],
    "centrifuge": [],
    "securitize": [],
    "clearpool": [],
}
for _slug, _children in _CHILD_ENTITIES.items():
    _spec = ENTITY_SPECS.get(_slug)
    if _spec is not None:
        _spec["child_entities"] = _children


def build_entity_item(
    slug: str, spec: Dict[str, Any], parent_row: Optional[Dict[str, str]], created_at: str
) -> dict:
    row = parent_row or {}
    defaults = spec["portal_defaults"]
    now = _now_iso()
    return {
        schema.PK: schema.category_pk(schema.CATEGORY_ENTITY),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_ENTITY,
        "Status": schema.STATUS_APPROVED,
        "Name": spec["name"],
        "Slug": slug,
        "Symbol": spec["symbol"],
        "Tagline": spec["tagline"],
        "Description": spec["description"],
        "Differentiator": spec["differentiator"],
        "OfficialDocs": spec["official_docs"],
        "Website": _clean(row.get("Website")) or spec["website"],
        "Twitter": _clean(row.get("Twitter")) or spec["twitter"],
        "Discord": _clean(row.get("Discord")) or spec["discord"],
        "GitHub": _clean(row.get("GitHub")) or spec["github"],
        "Components": spec["components"],
        "Faq": spec["faq"],
        "OrgStructure": spec["org_structure"],
        "TradFiComparison": spec["tradfi_comparison"],
        "Risks": spec["risks"],
        "Events": spec["events"],
        # Optional sourced milestone timeline (playbook §5); supersedes Events in
        # the UI when present. Each entry may carry `link` + `status`
        # (executed | stated | theoretical | canhav-inferred).
        "Timeline": spec.get("timeline"),
        # Optional curated off-chain facts (reg status, ratings, ICO terms) with
        # freshness + source provenance (playbook §3).
        "OffchainFacts": spec.get("offchain_facts"),
        # Optional rich detail-page overlays (additive; the frontend reader maps
        # these PascalCase keys and falls back to undefined when absent).
        "Tokenomics": spec.get("tokenomics"),
        "LongDescription": spec.get("long_description"),
        "Market": spec.get("market"),
        "PriceHistory": spec.get("price_history"),
        "TypedRisks": spec.get("typed_risks"),
        "Audits": spec.get("audits"),
        "Sources": spec.get("sources"),
        "AgentSkill": spec.get("agent_skill"),
        "InvestmentRounds": spec["investment_rounds"],
        "Partnerships": spec["partnerships"],
        "CurrentScale": spec["current_scale"],
        "ScaleLabels": spec.get("scale_labels"),
        # Taxonomy hierarchy (Network -> subCategory -> sector -> subSector).
        # subCategory defaults to "Protocol"; sector/subSector are null for the
        # legacy umbrella networks and set for the lending cohort.
        "SubCategory": spec.get("sub_category", "Protocol"),
        "Sector": spec.get("sector"),
        # Additive cross-sector tags (PDF §5); primary `Sector` is unchanged.
        "SecondarySectors": spec.get("secondary_sectors"),
        "SubSector": spec.get("sub_sector"),
        # Lending `Tags` vocabulary only; an explicit (possibly empty) list wins
        # over the sub_sector fallback so stablecoin issuers don't pollute it.
        "Tags": spec["tags"]
        if spec.get("tags") is not None
        else ([spec["sub_sector"]] if spec.get("sub_sector") else []),
        # Ranked competitors (top->bottom) + lending-specific metrics block.
        "Competitors": spec.get("competitors", []),
        "Lending": spec.get("lending"),
        "LendingTagMetrics": spec.get("lending_tag_metrics") or None,
        # Stablecoin-issuer taxonomy + metrics (PDF "Stablecoin Sector Expansion").
        "StablecoinSubSector": spec.get("stablecoin_sub_sector"),
        "StablecoinSecondaryTags": spec.get("stablecoin_secondary_tags"),
        "Stablecoin": spec.get("stablecoin"),
        # DEX taxonomy + metrics (PDF "DEX + RWA Sector Expansion" §1/§3).
        "DexSubSector": spec.get("dex_sub_sector"),
        "DexSecondaryTags": spec.get("dex_secondary_tags"),
        "Dex": spec.get("dex"),
        # RWA taxonomy + metrics (PDF "DEX + RWA Sector Expansion" §1/§4).
        "RwaSubSector": spec.get("rwa_sub_sector"),
        "RwaSecondaryTags": spec.get("rwa_secondary_tags"),
        "Rwa": spec.get("rwa"),
        "MemberCoins": spec["member_coins"],
        "ChildEntities": spec.get("child_entities"),
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")) or defaults.get("portalUrl"),
            "logoUrl": _clean(row.get("Logo URL")) or defaults.get("logoUrl"),
            "bannerUrl": _clean(row.get("Banner URL")) or defaults.get("bannerUrl"),
            "chains": _split_chains(row.get("Chains")) or defaults["chains"],
            "subCategory": defaults["subCategory"],
            "isLive": _as_bool(row.get("Is Live")) or defaults["isLive"],
            "isArbitrumNative": _as_bool(row.get("Is Arbitrum Native"))
            or defaults["isArbitrumNative"],
            "isPubliclyAudited": _as_bool(row.get("Is Publicly Audited"))
            or defaults["isPubliclyAudited"],
            "foundedDate": _clean(row.get("Founded Date")) or defaults.get("foundedDate"),
        },
        "CreatedAt": created_at,
        "UpdatedAt": now,
    }


def main(argv: List[str]) -> int:
    csv_path = resolve_csv_path(argv)
    csv_rows: Dict[str, Dict[str, str]] = {}
    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                slug = (row.get("Slug") or "").strip()
                if slug:
                    csv_rows[slug] = row

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_ENTITY)

    print(f"Source CSV : {csv_path if csv_path.exists() else '(none — hardcoded defaults)'}")
    print(f"Backend    : {type(repo).__name__}")
    print(f"Partition  : {pk}")
    print("-" * 64)
    print(f"{'STATUS':<18}{'SYMBOL':<10}{'NAME'}")
    print("-" * 64)

    for slug, spec in ENTITY_SPECS.items():
        csv_slug = spec.get("csv_slug")
        parent_row = csv_rows.get(csv_slug) if csv_slug else None
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        repo.put_item(build_entity_item(slug, spec, parent_row, created_at))
        print(f"{schema.STATUS_APPROVED:<18}{spec['symbol']:<10}{spec['name']}")

    print("-" * 64)
    total_coins = sum(len(s["member_coins"]) for s in ENTITY_SPECS.values())
    print(
        f"Published {len(ENTITY_SPECS)} entities ({total_coins} member coins total) as APPROVED."
    )

    from validate_taxonomy import validate_entity_specs  # noqa: E402

    spec_errors = validate_entity_specs(ENTITY_SPECS)
    if spec_errors:
        print("TAXONOMY VALIDATION FAILED:", file=sys.stderr)
        for err in spec_errors:
            print(f"  - {err}", file=sys.stderr)
        return 1
    print("Taxonomy validation: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
