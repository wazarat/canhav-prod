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
    "Credit",
    "Perpetuals",
    "Yield",
    "DEX",
    "Options",
    "Stablecoin",
    "RWA",
    "Staking",
    "Liquidity",
    "Derivatives",
)

# Credit-sector tags (replaces the legacy 5-value lending taxonomy).
# Networks may carry multiple tags from this set.
CREDIT_TAGS = (
    "Lending",          # Aave V3, Compound, Morpho, Radiant, Spark
    "Leveraged Yield",  # Gearbox, Stella, Extra Finance
    "Fixed Income",     # Pendle, Notional, Spectra, Sense
)
# Backward-compat aliases used across validation/ingest during the migration.
LENDING_SUBSECTORS = CREDIT_TAGS
LENDING_TAGS = CREDIT_TAGS

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

# RWA attribute tags — deliberately narrowed to 5 to avoid overwhelming users.
# Collapses the legacy 11-tag set (Compliance-Heavy + Permissioned ->
# Institutional-Gated; Hybrid-Chain -> Multi-Chain; Multi-Currency / Non-EVM /
# Wound-Down dropped and represented structurally elsewhere). Keep
# STABLECOIN_SECONDARY_TAGS / DEX_SECONDARY_TAGS untouched — they legitimately
# reuse some of these strings.
RWA_SECONDARY_TAGS = (
    "Institutional-Gated",  # absorbs Compliance-Heavy + Permissioned (KYC/AML or accredited-only)
    "Yield-Bearing",        # passes TradFi yield (T-Bill interest, rent) to the holder's wallet
    "Real-World-Custody",   # underlying held in an off-chain legal entity (LLC / SPV / vault)
    "DAO-Governed",         # token holders vote on risk params, pool deployment, treasury
    "Multi-Chain",          # absorbs Hybrid-Chain (natively bridges across EVM / EVM<->non-EVM)
)

# Staking sub-sectors — the three staking tags (canhav-staking spec §2.2).
STAKING_SUBSECTORS = (
    "Liquid Staking",
    "Restaking",
    "Liquid Restaking",
)

STAKING_SECONDARY_TAGS = (
    "Exchange-Native",
    "Non-Custodial",
    "Permissionless-Operators",
    "Native-Restaking",
    "Multi-Asset",
    "Multi-Chain",
    "LST-Backed-Basket",
    "EigenLayer-Strategy-Manager",
    "CDP-Integrated",
    "L2-Ecosystem",
)

# Liquidity sub-sectors — the two Liquidity tags (canhav-liquidity spec §1.2).
LIQUIDITY_SUBSECTORS = (
    "Pools",   # LPing / stable pools (Curve, Uniswap V3, Balancer)
    "Vaults",  # yield farming / auto-compounding vaults (Yearn, Convex, Beefy)
)

LIQUIDITY_SECONDARY_TAGS = (
    "Stable-Pools",            # pools of like-priced assets (Curve 3pool)
    "Concentrated-Liquidity",  # Uniswap V3 / Maverick style
    "Auto-Compounding",        # vaults that harvest + reinvest
    "LP-Strategy-Manager",     # manages/optimizes LP positions (Gamma, Arrakis)
    "Multi-Chain",
    "ve-Tokenomics",           # vote-escrow boosted (Curve, Convex, Aura)
)

# Derivatives sub-sectors — the three Derivatives tags (canhav-derivatives spec §1.2).
DERIVATIVES_SUBSECTORS = (
    "Perp DEX",       # on-chain perpetual futures (GMX, Synthetix, Gains, Aevo, Hyperliquid)
    "Option Vaults",  # automated options strategy vaults / DOVs (Ribbon, Dopex, Derive, Jones)
    "Delta-Neutral",  # hedged zero-delta yield strategies (Ethena, Rage Trade, Neutra)
)

DERIVATIVES_SECONDARY_TAGS = (
    "Oracle-Based",        # GMX, Gains (oracle pricing vs orderbook)
    "Orderbook",           # Aevo, Hyperliquid
    "Synthetic-Assets",    # Synthetix synths
    "Auto-Strategy",       # DOVs / managed vaults (Ribbon, Jones)
    "Funding-Rate-Yield",  # delta-neutral funding capture (Ethena)
    "Multi-Chain",
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
    "sky": ("Credit",),
    "spark": ("Stablecoin",),
    "curve-finance": ("Stablecoin", "Liquidity"),
    "jupiter": ("Stablecoin", "Perpetuals"),
    "pancakeswap": ("Perpetuals", "Liquidity"),
    # Perp DEX venues cross-tagged into the new Derivatives sector (Perp DEX) —
    # canhav-derivatives spec §3 (extend the existing DEX entity, do not duplicate).
    # Legacy "Perpetuals" kept for back-compat (removed in a later cleanup).
    "hyperliquid": ("Perpetuals", "Derivatives"),
    "gmx": ("Perpetuals", "Derivatives"),
    "gains-network": ("Perpetuals", "Derivatives"),
    # DEX venues cross-tagged into the Liquidity sector (Pools) — canhav-liquidity
    # spec §1.3 (extend the existing DEX entity, do not duplicate).
    "uniswap": ("Liquidity",),
    "balancer": ("Liquidity",),
    "aerodrome": ("Liquidity",),
    "ondo-finance": ("Stablecoin",),
    "pleasing-market": ("Stablecoin",),
    "mountain-protocol": ("RWA",),
    # Ethena & Frax are stablecoin issuers whose backing touches RWAs; they are
    # NOT RWA tokenization protocols. Keep them out of the RWA sector (the
    # RWA-Backed flavour is captured via StablecoinSecondaryTag instead). Ethena is
    # DeFi Llama-classified "Basis Trading" (delta-neutral) → Derivatives cross-tag.
    "ethena": ("Yield", "Derivatives"),
    "anzen": ("RWA",),
    "usd-ai": ("Stablecoin", "RWA"),
    "frax": ("Staking",),
    "centrifuge": ("Credit",),
    "goldfinch": ("Credit",),
    "clearpool": ("Credit",),
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
