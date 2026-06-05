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
        "InvestmentRounds": spec["investment_rounds"],
        "Partnerships": spec["partnerships"],
        "CurrentScale": spec["current_scale"],
        "ScaleLabels": spec.get("scale_labels"),
        "MemberCoins": spec["member_coins"],
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
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
