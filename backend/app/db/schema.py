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

# Categories queued for the sequential rollout (kept here for reference).
FUTURE_CATEGORIES = (
    "Lending",
    "Perpetuals",
    "Yield",
    "DEX",
    "Options",
)

# Derived RWA asset classes (the CSV labels everything "Real World Assets
# (RWAs)"; the finer classification is assigned during ingestion).
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
