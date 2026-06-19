"""
Single-table schema for CanHav Research.

The whole platform lives in ONE logical table. The partition key encodes the
taxonomy category and the sort key encodes the protocol, so the model expands to
RWAs, Lending, Perpetuals, etc. by changing only the ``CATEGORY#`` partition — no
new tables, no migrations.

    PK = "CATEGORY#<Category>"     e.g. "CATEGORY#Stablecoin"
    SK = "PROTOCOL#<slug>"         e.g. "PROTOCOL#ethena"

Keeping the key/attribute names in one place means every adapter speaks exactly
the same item shape: the local file-backed adapter and the Upstash Redis adapter
both key items by ``"<PK>|<SK>"``.
"""

from __future__ import annotations

# Logical table / namespace name.
TABLE_NAME = "canhav-research"

# --- Key attribute names ---------------------------------------------------
PK = "PK"
SK = "SK"

# --- Categories (taxonomy partitions) --------------------------------------
CATEGORY_STABLECOIN = "Stablecoin"
CATEGORY_RWA = "RWA"
# Top-tier umbrella protocols that group several coins (e.g. USD.AI groups USDai,
# sUSDai and CHIP). Entities "sit above" Stablecoins/RWAs in the taxonomy.
CATEGORY_ENTITY = "Entity"
# Standalone governance / utility tokens (e.g. CHIP).
CATEGORY_TOKEN = "Token"

# Token classifications (the store has no such column; assigned at ingest).
TOKEN_TYPES = (
    "Governance",
    "Utility",
)

# Categories queued for the sequential rollout (kept here for reference).
FUTURE_CATEGORIES = (
    "Perpetuals",
    "Yield",
    "DEX",
    "Options",
)

# --- Network taxonomy hierarchy --------------------------------------------
# Networks (stored on the CATEGORY#Entity partition) carry an optional
# sub-taxonomy: subCategory (what kind of network) -> sector (what it does) ->
# subSector (functional leaf). This is distinct from the coin-level subtypes.
NETWORK_SUBCATEGORIES = (
    "Protocol",
    "Chain",
    "Rollup",
    "Appchain",
)

NETWORK_SECTORS = (
    "Lending",
    "Perpetuals",
    "Yield",
    "DEX",
    "Options",
    "Stablecoin",
    "RWA",
)

# Lending sub-sectors (PDF "Further sub categories within lending").
# Also used as lending tags — networks may carry multiple tags from this set.
LENDING_SUBSECTORS = (
    "Money Markets",
    "Isolated / Curated Lending",
    "Stablecoin-Native Credit Stack",
    "Liquidity Hybrid",
    "Institutional / Private Credit",
)
LENDING_TAGS = LENDING_SUBSECTORS

# Legacy primary sectors — prefer DEX sub-sector "Perpetuals" + secondarySectors.
LEGACY_NETWORK_SECTORS = ("Perpetuals", "Yield", "Options")

STABLECOIN_SUBSECTORS = (
    "Fiat-Backed Regulated",
    "E-Money Regulated",
    "Decentralized CDP",
    "Synthetic Yield-Bearing",
    "RWA-Backed Stable",
    "Cross-Chain / Omnichain",
)

STABLECOIN_SECONDARY_TAGS = (
    "Yield-Bearing",
    "Institutional-Gated",
    "Multi-Currency",
    "Multi-Chain",
    "Hybrid-Chain",
    "Compliance-Heavy",
    "DAO-Governed",
    "Exchange-Native",
    "RWA-Backed",
    "Wound-Down",
    "Recently-Exploited",
)

DEX_SUBSECTORS = (
    "AMM",
    "Concentrated Liquidity",
    "Stableswap",
    "Aggregator",
    "Orderbook",
    "Hybrid AMM + Orderbook",
    "Perpetuals",
    "ve(3,3)",
    "Cross-Chain Native",
)

DEX_SECONDARY_TAGS = (
    "Spot",
    "Perps",
    "Derivatives",
    "Multi-Chain",
    "Non-EVM",
    "Solana-Native",
    "L2-Native",
    "Appchain",
    "MEV-Resistant",
    "veTokenomics",
    "Hooks",
    "CLMM",
    "Routing-Layer",
    "Wound-Down",
    "Recently-Exploited",
)

RWA_SUBSECTORS = (
    "Tokenized Treasuries",
    "Tokenized Equities",
    "Tokenized Commodities",
    "Real Estate",
    "Private Credit",
    "Carbon / ESG",
    "Tokenization Infrastructure",
    "Structured Products",
    "Event Finance",
    "Stablecoins & FX",
)

RWA_SECONDARY_TAGS = (
    "Institutional-Gated",
    "Permissioned",
    "Compliance-Heavy",
    "Multi-Chain",
    "Multi-Currency",
    "Non-EVM",
    "Hybrid-Chain",
    "Yield-Bearing",
    "Real-World-Custody",
    "DAO-Governed",
    "Wound-Down",
)

ASSET_SUBTYPES = (
    "fiat-stablecoin",
    "synthetic-dollar",
    "e-money",
    "yield-bearing-stable",
    "rwa-backed-stable",
    "governance",
    "staked-governance",
    "insurance-firstloss",
    "lp-receipt",
    "lst",
    "institutional-gated",
    "tokenized-commodity",
    "tokenized-equity",
    "tokenized-treasury",
    "legacy",
    "conceptual",
)

PEG_MECHANISMS = (
    "fiat-reserve",
    "overcollateralized",
    "delta-neutral-hedge",
    "rwa-collateral",
    "algorithmic-rebase",
    "none",
)

# Cross-sector matrix (ontology §7): slug -> required secondary sectors.
CROSS_SECTOR_MATRIX: dict[str, tuple[str, ...]] = {
    "aave": ("Stablecoin",),
    "sky": ("Lending",),
    "spark": ("Stablecoin",),
    "curve-finance": ("Stablecoin",),
    "jupiter": ("Stablecoin", "Perpetuals"),
    "pancakeswap": ("Perpetuals",),
    "hyperliquid": ("Perpetuals",),
    "ondo-finance": ("Stablecoin",),
    "pleasing-market": ("Stablecoin",),
    "mountain-protocol": ("RWA",),
    "ethena": ("RWA", "Yield"),
    "anzen": ("RWA",),
    "usd-ai": ("Stablecoin", "RWA"),
    "frax": ("RWA",),
    "centrifuge": ("Lending",),
    "goldfinch": ("Lending",),
    "clearpool": ("Lending",),
    "maple": ("RWA",),
}

# Derived RWA asset classes (coin-level; distinct from entity RwaSubSector).
RWA_ASSET_CLASSES = (
    "Tokenized Equities",
    "Private Credit",
    "Real Estate",
    "Treasuries & Funds",
    "Event Finance",
    "Structured Products",
    "Multi-Asset",
    "Stablecoins & FX",
)

# --- Approval status values ------------------------------------------------
STATUS_PENDING = "PENDING_APPROVAL"
STATUS_APPROVED = "APPROVED"
VALID_STATUSES = (STATUS_PENDING, STATUS_APPROVED)

# --- Peg targets -----------------------------------------------------------
PEG_USD = "USD"
PEG_EUR = "EUR"
PEG_GBP = "GBP"
# Foreign-FX pegs for multi-currency e-money / fiat stablecoins (TrueCurrencies,
# Monerium ISKe). The frontend `PegTarget` union mirrors this set.
PEG_AUD = "AUD"
PEG_CAD = "CAD"
PEG_HKD = "HKD"
PEG_ISK = "ISK"
PEG_JPY = "JPY"


def category_pk(category: str) -> str:
    """Build a partition key for a taxonomy category."""
    return f"CATEGORY#{category}"


def protocol_sk(slug: str) -> str:
    """Build a sort key for a protocol within a category."""
    return f"PROTOCOL#{slug}"


def slug_from_sk(sk: str) -> str:
    """Inverse of :func:`protocol_sk`."""
    return sk.split("#", 1)[1] if "#" in sk else sk


def is_valid_status(status: str) -> bool:
    return status in VALID_STATUSES
