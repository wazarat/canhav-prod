"""
DynamoDB single-table schema for CanHav Research.

The whole platform lives in ONE table. The partition key encodes the taxonomy
category and the sort key encodes the protocol, so the model expands to RWAs,
Lending, Perpetuals, etc. by changing only the ``CATEGORY#`` partition — no new
tables, no schema migrations.

    PK = "CATEGORY#<Category>"     e.g. "CATEGORY#Stablecoin"
    SK = "PROTOCOL#<slug>"         e.g. "PROTOCOL#ethena"

Keeping the key/attribute names in one place means the local file-backed adapter
and the boto3/DynamoDB adapter (Step 4) speak exactly the same item shape.
"""

from __future__ import annotations

# Logical table name (used by the DynamoDB adapter / provisioning later).
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


# Optional future Global Secondary Index for cross-category "approved" queries.
# Not required by the local adapter; documented so Step 4 can provision it.
STATUS_INDEX_NAME = "StatusIndex"


def status_gsi_pk(status: str) -> str:
    """GSI partition key, e.g. ``STATUS#APPROVED`` (future use)."""
    return f"STATUS#{status}"
