"""
Pydantic models mirroring the single-table item shape.

These give the (deferred) FastAPI layer typed request/response validation and a
clean ``to_item`` / ``from_item`` bridge to the DynamoDB representation. The
ingestion script intentionally does NOT depend on this module (it stays
stdlib-only so it runs with zero installs); these models come into play in
Step 4 when the FastAPI approval API is built.

Requires: pydantic>=2 (see backend/requirements.txt).
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from .db import schema

ApprovalStatus = Literal["PENDING_APPROVAL", "APPROVED"]
PegTarget = Literal["USD", "EUR"]
RwaAssetClass = Literal[
    "Tokenized Equities",
    "Private Credit",
    "Real Estate",
    "Treasuries & Funds",
    "Event Finance",
    "Structured Products",
    "Multi-Asset",
    "Stablecoins & FX",
]


class PegDataPoint(BaseModel):
    date: str  # YYYY-MM-DD
    price: float


class TotalSupply(BaseModel):
    value: Optional[float] = None
    source: Literal["alchemy"] = "alchemy"
    updatedAt: Optional[str] = None


class HistoricalPegData(BaseModel):
    points: List[PegDataPoint] = Field(default_factory=list)
    source: Literal["dune"] = "dune"
    updatedAt: Optional[str] = None


class ArbitrumPortalMetadata(BaseModel):
    portalUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    bannerUrl: Optional[str] = None
    chains: List[str] = Field(default_factory=list)
    subCategory: Optional[str] = None
    isLive: bool = False
    isArbitrumNative: bool = False
    isPubliclyAudited: bool = False
    foundedDate: Optional[str] = None


class StablecoinProfile(BaseModel):
    category: Literal["Stablecoin"] = "Stablecoin"
    slug: str
    name: str
    symbol: str
    status: ApprovalStatus = "PENDING_APPROVAL"
    pegTarget: PegTarget = "USD"
    description: str = ""
    website: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    github: Optional[str] = None
    coingecko: Optional[str] = None
    auditUrl: Optional[str] = None
    contractAddress: Optional[str] = None
    totalSupply: TotalSupply = Field(default_factory=TotalSupply)
    historicalPegData: HistoricalPegData = Field(default_factory=HistoricalPegData)
    arbitrumPortalMetadata: ArbitrumPortalMetadata = Field(
        default_factory=ArbitrumPortalMetadata
    )
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    # --- DynamoDB item bridge ---------------------------------------------
    def to_item(self) -> dict:
        """Serialize to a single-table item (with PK/SK and PascalCase attrs)."""
        return {
            schema.PK: schema.category_pk(schema.CATEGORY_STABLECOIN),
            schema.SK: schema.protocol_sk(self.slug),
            "Category": self.category,
            "Status": self.status,
            "Name": self.name,
            "Slug": self.slug,
            "Symbol": self.symbol,
            "PegTarget": self.pegTarget,
            "Description": self.description,
            "Website": self.website,
            "Twitter": self.twitter,
            "Discord": self.discord,
            "GitHub": self.github,
            "CoinGecko": self.coingecko,
            "AuditURL": self.auditUrl,
            "ContractAddress": self.contractAddress,
            "TotalSupply": self.totalSupply.model_dump(),
            "HistoricalPegData": self.historicalPegData.model_dump(),
            "ArbitrumPortalMetadata": self.arbitrumPortalMetadata.model_dump(),
            "CreatedAt": self.createdAt,
            "UpdatedAt": self.updatedAt,
        }

    @classmethod
    def from_item(cls, item: dict) -> "StablecoinProfile":
        """Inverse of :meth:`to_item`."""
        return cls(
            slug=item["Slug"],
            name=item["Name"],
            symbol=item.get("Symbol", ""),
            status=item.get("Status", "PENDING_APPROVAL"),
            pegTarget=item.get("PegTarget", "USD"),
            description=item.get("Description", ""),
            website=item.get("Website"),
            twitter=item.get("Twitter"),
            discord=item.get("Discord"),
            github=item.get("GitHub"),
            coingecko=item.get("CoinGecko"),
            auditUrl=item.get("AuditURL"),
            contractAddress=item.get("ContractAddress"),
            totalSupply=TotalSupply(**(item.get("TotalSupply") or {})),
            historicalPegData=HistoricalPegData(**(item.get("HistoricalPegData") or {})),
            arbitrumPortalMetadata=ArbitrumPortalMetadata(
                **(item.get("ArbitrumPortalMetadata") or {})
            ),
            createdAt=item.get("CreatedAt"),
            updatedAt=item.get("UpdatedAt"),
        )


# --- RWAs ------------------------------------------------------------------


class TvlDataPoint(BaseModel):
    date: str  # YYYY-MM-DD
    value: float


class TotalValueLocked(BaseModel):
    value: Optional[float] = None
    source: Literal["alchemy"] = "alchemy"
    updatedAt: Optional[str] = None


class HistoricalTvlData(BaseModel):
    points: List[TvlDataPoint] = Field(default_factory=list)
    source: Literal["dune"] = "dune"
    updatedAt: Optional[str] = None


class RwaProfile(BaseModel):
    """Parallel of :class:`StablecoinProfile` for the RWA category partition."""

    category: Literal["RWA"] = "RWA"
    slug: str
    name: str
    symbol: str = ""
    status: ApprovalStatus = "PENDING_APPROVAL"
    assetClass: RwaAssetClass = "Multi-Asset"
    description: str = ""
    website: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    github: Optional[str] = None
    coingecko: Optional[str] = None
    auditUrl: Optional[str] = None
    contractAddress: Optional[str] = None
    vaultAddresses: Optional[List[str]] = None
    totalValueLocked: TotalValueLocked = Field(default_factory=TotalValueLocked)
    historicalTvlData: HistoricalTvlData = Field(default_factory=HistoricalTvlData)
    arbitrumPortalMetadata: ArbitrumPortalMetadata = Field(
        default_factory=ArbitrumPortalMetadata
    )
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    # --- DynamoDB item bridge ---------------------------------------------
    def to_item(self) -> dict:
        """Serialize to a single-table item (with PK/SK and PascalCase attrs)."""
        return {
            schema.PK: schema.category_pk(schema.CATEGORY_RWA),
            schema.SK: schema.protocol_sk(self.slug),
            "Category": self.category,
            "Status": self.status,
            "Name": self.name,
            "Slug": self.slug,
            "Symbol": self.symbol,
            "AssetClass": self.assetClass,
            "Description": self.description,
            "Website": self.website,
            "Twitter": self.twitter,
            "Discord": self.discord,
            "GitHub": self.github,
            "CoinGecko": self.coingecko,
            "AuditURL": self.auditUrl,
            "ContractAddress": self.contractAddress,
            "VaultAddresses": self.vaultAddresses,
            "TotalValueLocked": self.totalValueLocked.model_dump(),
            "HistoricalTvlData": self.historicalTvlData.model_dump(),
            "ArbitrumPortalMetadata": self.arbitrumPortalMetadata.model_dump(),
            "CreatedAt": self.createdAt,
            "UpdatedAt": self.updatedAt,
        }

    @classmethod
    def from_item(cls, item: dict) -> "RwaProfile":
        """Inverse of :meth:`to_item`."""
        return cls(
            slug=item["Slug"],
            name=item["Name"],
            symbol=item.get("Symbol", ""),
            status=item.get("Status", "PENDING_APPROVAL"),
            assetClass=item.get("AssetClass", "Multi-Asset"),
            description=item.get("Description", ""),
            website=item.get("Website"),
            twitter=item.get("Twitter"),
            discord=item.get("Discord"),
            github=item.get("GitHub"),
            coingecko=item.get("CoinGecko"),
            auditUrl=item.get("AuditURL"),
            contractAddress=item.get("ContractAddress"),
            vaultAddresses=item.get("VaultAddresses"),
            totalValueLocked=TotalValueLocked(**(item.get("TotalValueLocked") or {})),
            historicalTvlData=HistoricalTvlData(**(item.get("HistoricalTvlData") or {})),
            arbitrumPortalMetadata=ArbitrumPortalMetadata(
                **(item.get("ArbitrumPortalMetadata") or {})
            ),
            createdAt=item.get("CreatedAt"),
            updatedAt=item.get("UpdatedAt"),
        )
