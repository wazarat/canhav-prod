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
PegTarget = Literal["USD", "EUR", "GBP"]
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


class LendingMarket(BaseModel):
    """Live Aave V3 reserve rates (on-chain via Alchemy). See app/live/aave.py."""

    supplyApyPct: Optional[float] = None
    variableBorrowApyPct: Optional[float] = None
    utilizationPct: Optional[float] = None
    underlyingSymbol: Optional[str] = None
    source: Literal["aave"] = "aave"
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
    status: ApprovalStatus = "APPROVED"
    pegTarget: PegTarget = "USD"
    subCategory: Optional[str] = None
    description: str = ""
    website: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    github: Optional[str] = None
    coingecko: Optional[str] = None
    auditUrl: Optional[str] = None
    contractAddress: Optional[str] = None
    # Slug of the parent umbrella Entity (e.g. "usd-ai"), if this coin is grouped.
    entitySlug: Optional[str] = None
    totalSupply: TotalSupply = Field(default_factory=TotalSupply)
    historicalPegData: HistoricalPegData = Field(default_factory=HistoricalPegData)
    lendingMarket: Optional[LendingMarket] = None
    # Protocol fees/revenue overlay (DeFi Llama; written by the cron). Stored as
    # a passthrough dict so unknown Llama fields survive round-trips.
    protocolFeesRevenue: Optional[dict] = None
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
            "SubCategory": self.subCategory,
            "Description": self.description,
            "Website": self.website,
            "Twitter": self.twitter,
            "Discord": self.discord,
            "GitHub": self.github,
            "CoinGecko": self.coingecko,
            "AuditURL": self.auditUrl,
            "ContractAddress": self.contractAddress,
            "EntitySlug": self.entitySlug,
            "TotalSupply": self.totalSupply.model_dump(),
            "HistoricalPegData": self.historicalPegData.model_dump(),
            "LendingMarket": self.lendingMarket.model_dump() if self.lendingMarket else None,
            "ProtocolFeesRevenue": self.protocolFeesRevenue,
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
            status=item.get("Status", "APPROVED"),
            pegTarget=item.get("PegTarget", "USD"),
            subCategory=item.get("SubCategory"),
            description=item.get("Description", ""),
            website=item.get("Website"),
            twitter=item.get("Twitter"),
            discord=item.get("Discord"),
            github=item.get("GitHub"),
            coingecko=item.get("CoinGecko"),
            auditUrl=item.get("AuditURL"),
            contractAddress=item.get("ContractAddress"),
            entitySlug=item.get("EntitySlug"),
            totalSupply=TotalSupply(**(item.get("TotalSupply") or {})),
            historicalPegData=HistoricalPegData(**(item.get("HistoricalPegData") or {})),
            lendingMarket=LendingMarket(**item["LendingMarket"])
            if item.get("LendingMarket")
            else None,
            protocolFeesRevenue=item.get("ProtocolFeesRevenue"),
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
    status: ApprovalStatus = "APPROVED"
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
    # Protocol fees/revenue overlay (DeFi Llama; written by the cron).
    protocolFeesRevenue: Optional[dict] = None
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
            "ProtocolFeesRevenue": self.protocolFeesRevenue,
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
            status=item.get("Status", "APPROVED"),
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
            protocolFeesRevenue=item.get("ProtocolFeesRevenue"),
            arbitrumPortalMetadata=ArbitrumPortalMetadata(
                **(item.get("ArbitrumPortalMetadata") or {})
            ),
            createdAt=item.get("CreatedAt"),
            updatedAt=item.get("UpdatedAt"),
        )


# --- Tokens ----------------------------------------------------------------

TokenType = Literal["Governance", "Utility", "Yield", "LST"]
StablecoinSubCategory = Literal["Stablecoin", "Staked Stablecoin"]
TokenSubCategory = Literal[
    "Governance Token",
    "Yield-generating Token",
    "LST",
    "Utility Token",
]
RiskCategory = Literal[
    "Counterparty",
    "Network",
    "Oracle",
    "Reserve / Depeg",
    "Smart Contract",
    "Governance",
    "Collateral",
    "Regulatory",
    "Systemic",
]


class TokenProfile(BaseModel):
    """A standalone governance / utility token (e.g. CHIP)."""

    category: Literal["Token"] = "Token"
    slug: str
    name: str
    symbol: str = ""
    status: ApprovalStatus = "APPROVED"
    tokenType: TokenType = "Governance"
    subCategory: Optional[str] = None
    description: str = ""
    website: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    github: Optional[str] = None
    coingecko: Optional[str] = None
    auditUrl: Optional[str] = None
    contractAddress: Optional[str] = None
    # Slug of the parent umbrella Entity (e.g. "usd-ai").
    entitySlug: Optional[str] = None
    totalSupply: TotalSupply = Field(default_factory=TotalSupply)
    lendingMarket: Optional[LendingMarket] = None
    # DeFi Llama overlays (written by the cron); passthrough dicts.
    protocolFeesRevenue: Optional[dict] = None
    dexVolume: Optional[dict] = None
    arbitrumPortalMetadata: ArbitrumPortalMetadata = Field(
        default_factory=ArbitrumPortalMetadata
    )
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_item(self) -> dict:
        return {
            schema.PK: schema.category_pk(schema.CATEGORY_TOKEN),
            schema.SK: schema.protocol_sk(self.slug),
            "Category": self.category,
            "Status": self.status,
            "Name": self.name,
            "Slug": self.slug,
            "Symbol": self.symbol,
            "TokenType": self.tokenType,
            "SubCategory": self.subCategory,
            "Description": self.description,
            "Website": self.website,
            "Twitter": self.twitter,
            "Discord": self.discord,
            "GitHub": self.github,
            "CoinGecko": self.coingecko,
            "AuditURL": self.auditUrl,
            "ContractAddress": self.contractAddress,
            "EntitySlug": self.entitySlug,
            "TotalSupply": self.totalSupply.model_dump(),
            "LendingMarket": self.lendingMarket.model_dump() if self.lendingMarket else None,
            "ProtocolFeesRevenue": self.protocolFeesRevenue,
            "DexVolume": self.dexVolume,
            "ArbitrumPortalMetadata": self.arbitrumPortalMetadata.model_dump(),
            "CreatedAt": self.createdAt,
            "UpdatedAt": self.updatedAt,
        }

    @classmethod
    def from_item(cls, item: dict) -> "TokenProfile":
        return cls(
            slug=item["Slug"],
            name=item["Name"],
            symbol=item.get("Symbol", ""),
            status=item.get("Status", "APPROVED"),
            tokenType=item.get("TokenType", "Governance"),
            subCategory=item.get("SubCategory"),
            description=item.get("Description", ""),
            website=item.get("Website"),
            twitter=item.get("Twitter"),
            discord=item.get("Discord"),
            github=item.get("GitHub"),
            coingecko=item.get("CoinGecko"),
            auditUrl=item.get("AuditURL"),
            contractAddress=item.get("ContractAddress"),
            entitySlug=item.get("EntitySlug"),
            totalSupply=TotalSupply(**(item.get("TotalSupply") or {})),
            lendingMarket=LendingMarket(**item["LendingMarket"])
            if item.get("LendingMarket")
            else None,
            protocolFeesRevenue=item.get("ProtocolFeesRevenue"),
            dexVolume=item.get("DexVolume"),
            arbitrumPortalMetadata=ArbitrumPortalMetadata(
                **(item.get("ArbitrumPortalMetadata") or {})
            ),
            createdAt=item.get("CreatedAt"),
            updatedAt=item.get("UpdatedAt"),
        )


# --- Entities (top-tier umbrella protocols) --------------------------------


class EntityComponent(BaseModel):
    name: str
    description: str


class FaqItem(BaseModel):
    question: str
    answer: str
    # Pinned questions sort to the top of the FAQ.
    pinned: bool = False


class OrgUnit(BaseModel):
    name: str
    role: str
    description: str


class TradFiRow(BaseModel):
    product: str
    similarity: str
    differences: str


class InvestmentRound(BaseModel):
    date: str
    round: str
    amountUsd: Optional[float] = None
    amountLabel: Optional[str] = None
    investors: List[str] = Field(default_factory=list)
    link: Optional[str] = None


class Partnership(BaseModel):
    name: str
    date: str
    amountLabel: Optional[str] = None
    description: str = ""


class CurrentScale(BaseModel):
    tvlUsd: Optional[float] = None
    users: Optional[int] = None
    aprPct: Optional[float] = None
    targetAprPct: Optional[float] = None
    marketCapUsd: Optional[float] = None
    loanPipelineUsd: Optional[float] = None
    partnerships: Optional[int] = None


class MemberCoinRef(BaseModel):
    slug: str
    name: str
    symbol: str
    # Which category partition the coin lives in.
    category: Literal["Stablecoin", "Token", "RWA"]
    role: str = ""
    subCategory: Optional[str] = None


class EntityRisk(BaseModel):
    category: str
    description: str


def _parse_risks(raw: object) -> List[EntityRisk]:
    """Accept legacy string bullets or typed {category, description} objects."""
    if not raw:
        return []
    out: List[EntityRisk] = []
    for item in raw:  # type: ignore[union-attr]
        if isinstance(item, str):
            out.append(EntityRisk(category="Systemic", description=item))
        elif isinstance(item, dict):
            out.append(EntityRisk(**item))
    return out


class EntityEvent(BaseModel):
    date: str
    title: str
    description: str
    link: Optional[str] = None


class ScaleLabels(BaseModel):
    tvl: Optional[str] = None
    users: Optional[str] = None
    apr: Optional[str] = None
    pipeline: Optional[str] = None
    partnerships: Optional[str] = None
    coins: Optional[str] = None


class EntityProfile(BaseModel):
    """A top-tier umbrella protocol grouping several coins (e.g. USD.AI)."""

    category: Literal["Entity"] = "Entity"
    slug: str
    name: str
    symbol: str = ""
    status: ApprovalStatus = "APPROVED"
    tagline: str = ""
    description: str = ""
    differentiator: str = ""
    officialDocs: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    github: Optional[str] = None
    components: List[EntityComponent] = Field(default_factory=list)
    faq: List[FaqItem] = Field(default_factory=list)
    orgStructure: List[OrgUnit] = Field(default_factory=list)
    tradFiComparison: List[TradFiRow] = Field(default_factory=list)
    risks: List[EntityRisk] = Field(default_factory=list)
    events: List[EntityEvent] = Field(default_factory=list)
    investmentRounds: List[InvestmentRound] = Field(default_factory=list)
    partnerships: List[Partnership] = Field(default_factory=list)
    currentScale: CurrentScale = Field(default_factory=CurrentScale)
    scaleLabels: Optional[ScaleLabels] = None
    # Taxonomy hierarchy (Network -> subCategory -> sector -> subSector).
    subCategory: Optional[str] = "Protocol"
    sector: Optional[str] = None
    secondarySectors: List[str] = Field(default_factory=list)
    subSector: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    stablecoinSubSector: Optional[str] = None
    stablecoinSecondaryTags: List[str] = Field(default_factory=list)
    dexSubSector: Optional[str] = None
    dexSecondaryTags: List[str] = Field(default_factory=list)
    rwaSubSector: Optional[str] = None
    rwaSecondaryTags: List[str] = Field(default_factory=list)
    stakingSubSector: Optional[str] = None
    stakingSecondaryTags: List[str] = Field(default_factory=list)
    liquiditySubSector: Optional[str] = None
    liquiditySecondaryTags: List[str] = Field(default_factory=list)
    childEntities: List[str] = Field(default_factory=list)
    # Ranked competitors (top->bottom) + sector metrics; passthrough dicts.
    competitors: List[dict] = Field(default_factory=list)
    lending: Optional[dict] = None
    # Credit tag-specific metric blocks (CreditTagMetrics). Field `lending`
    # above retains its name per the Lending→Credit migration naming note.
    creditTagMetrics: Optional[dict] = None
    stablecoin: Optional[dict] = None
    dex: Optional[dict] = None
    rwa: Optional[dict] = None
    liquidity: Optional[dict] = None
    memberCoins: List[MemberCoinRef] = Field(default_factory=list)
    # DeFi Llama overlays (written by the cron); passthrough dicts. Options /
    # open-interest are scaffolded for the coming-soon options/perpetuals categories.
    protocolFeesRevenue: Optional[dict] = None
    dexVolume: Optional[dict] = None
    optionsVolume: Optional[dict] = None
    openInterest: Optional[dict] = None
    arbitrumPortalMetadata: ArbitrumPortalMetadata = Field(
        default_factory=ArbitrumPortalMetadata
    )
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_item(self) -> dict:
        return {
            schema.PK: schema.category_pk(schema.CATEGORY_ENTITY),
            schema.SK: schema.protocol_sk(self.slug),
            "Category": self.category,
            "Status": self.status,
            "Name": self.name,
            "Slug": self.slug,
            "Symbol": self.symbol,
            "Tagline": self.tagline,
            "Description": self.description,
            "Differentiator": self.differentiator,
            "OfficialDocs": self.officialDocs,
            "Website": self.website,
            "Twitter": self.twitter,
            "Discord": self.discord,
            "GitHub": self.github,
            "Components": [c.model_dump() for c in self.components],
            "Faq": [f.model_dump() for f in self.faq],
            "OrgStructure": [o.model_dump() for o in self.orgStructure],
            "TradFiComparison": [t.model_dump() for t in self.tradFiComparison],
            "Risks": [r.model_dump() for r in self.risks],
            "Events": [e.model_dump() for e in self.events],
            "InvestmentRounds": [r.model_dump() for r in self.investmentRounds],
            "ScaleLabels": self.scaleLabels.model_dump() if self.scaleLabels else None,
            "SubCategory": self.subCategory,
            "Sector": self.sector,
            "SecondarySectors": self.secondarySectors or None,
            "SubSector": self.subSector,
            "Tags": self.tags or None,
            "StablecoinSubSector": self.stablecoinSubSector,
            "StablecoinSecondaryTags": self.stablecoinSecondaryTags or None,
            "DexSubSector": self.dexSubSector,
            "DexSecondaryTags": self.dexSecondaryTags or None,
            "RwaSubSector": self.rwaSubSector,
            "RwaSecondaryTags": self.rwaSecondaryTags or None,
            "StakingSubSector": self.stakingSubSector,
            "StakingSecondaryTags": self.stakingSecondaryTags or None,
            "LiquiditySubSector": self.liquiditySubSector,
            "LiquiditySecondaryTags": self.liquiditySecondaryTags or None,
            "ChildEntities": self.childEntities or None,
            "Competitors": self.competitors,
            "Lending": self.lending,
            "CreditTagMetrics": self.creditTagMetrics,
            "Stablecoin": self.stablecoin,
            "Dex": self.dex,
            "Rwa": self.rwa,
            "Staking": self.staking,
            "Liquidity": self.liquidity,
            "Partnerships": [p.model_dump() for p in self.partnerships],
            "CurrentScale": self.currentScale.model_dump(),
            "MemberCoins": [m.model_dump() for m in self.memberCoins],
            "ProtocolFeesRevenue": self.protocolFeesRevenue,
            "DexVolume": self.dexVolume,
            "OptionsVolume": self.optionsVolume,
            "OpenInterest": self.openInterest,
            "ArbitrumPortalMetadata": self.arbitrumPortalMetadata.model_dump(),
            "CreatedAt": self.createdAt,
            "UpdatedAt": self.updatedAt,
        }

    @classmethod
    def from_item(cls, item: dict) -> "EntityProfile":
        return cls(
            slug=item["Slug"],
            name=item["Name"],
            symbol=item.get("Symbol", ""),
            status=item.get("Status", "APPROVED"),
            tagline=item.get("Tagline", ""),
            description=item.get("Description", ""),
            differentiator=item.get("Differentiator", ""),
            officialDocs=item.get("OfficialDocs"),
            website=item.get("Website"),
            twitter=item.get("Twitter"),
            discord=item.get("Discord"),
            github=item.get("GitHub"),
            components=[EntityComponent(**c) for c in (item.get("Components") or [])],
            faq=[FaqItem(**f) for f in (item.get("Faq") or [])],
            orgStructure=[OrgUnit(**o) for o in (item.get("OrgStructure") or [])],
            tradFiComparison=[TradFiRow(**t) for t in (item.get("TradFiComparison") or [])],
            risks=_parse_risks(item.get("Risks")),
            events=[EntityEvent(**e) for e in (item.get("Events") or [])],
            investmentRounds=[
                InvestmentRound(**r) for r in (item.get("InvestmentRounds") or [])
            ],
            partnerships=[Partnership(**p) for p in (item.get("Partnerships") or [])],
            currentScale=CurrentScale(**(item.get("CurrentScale") or {})),
            scaleLabels=ScaleLabels(**item["ScaleLabels"])
            if item.get("ScaleLabels")
            else None,
            subCategory=item.get("SubCategory", "Protocol"),
            sector=item.get("Sector"),
            secondarySectors=item.get("SecondarySectors") or [],
            subSector=item.get("SubSector"),
            tags=item.get("Tags") or [],
            stablecoinSubSector=item.get("StablecoinSubSector"),
            stablecoinSecondaryTags=item.get("StablecoinSecondaryTags") or [],
            dexSubSector=item.get("DexSubSector"),
            dexSecondaryTags=item.get("DexSecondaryTags") or [],
            rwaSubSector=item.get("RwaSubSector"),
            rwaSecondaryTags=item.get("RwaSecondaryTags") or [],
            stakingSubSector=item.get("StakingSubSector"),
            stakingSecondaryTags=item.get("StakingSecondaryTags") or [],
            liquiditySubSector=item.get("LiquiditySubSector"),
            liquiditySecondaryTags=item.get("LiquiditySecondaryTags") or [],
            childEntities=item.get("ChildEntities") or [],
            competitors=item.get("Competitors") or [],
            lending=item.get("Lending"),
            creditTagMetrics=item.get("CreditTagMetrics"),
            stablecoin=item.get("Stablecoin"),
            dex=item.get("Dex"),
            rwa=item.get("Rwa"),
            staking=item.get("Staking"),
            liquidity=item.get("Liquidity"),
            memberCoins=[MemberCoinRef(**m) for m in (item.get("MemberCoins") or [])],
            protocolFeesRevenue=item.get("ProtocolFeesRevenue"),
            dexVolume=item.get("DexVolume"),
            optionsVolume=item.get("OptionsVolume"),
            openInterest=item.get("OpenInterest"),
            arbitrumPortalMetadata=ArbitrumPortalMetadata(
                **(item.get("ArbitrumPortalMetadata") or {})
            ),
            createdAt=item.get("CreatedAt"),
            updatedAt=item.get("UpdatedAt"),
        )
