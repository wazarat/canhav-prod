"""
Curated entity specs for Pleasing Market, Ondo Finance, and Aave.

Sourced from entity-research-batch-2.md (2026-06-05). Imported by ingest_entities.py.
"""

from __future__ import annotations

from typing import Any, Dict

BATCH_2_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    "pleasing-market": {
        "name": "Pleasing Market",
        "symbol": "Pleasing",
        "csv_slug": "pleasing-market",
        "tagline": (
            "RWA precious-metals platform issuing PGOLD and USDpm with cross-chain "
            "distribution via Chainlink CCIP."
        ),
        "description": (
            "Pleasing Market (Pleasing Golden) tokenizes LBMA-certified physical gold "
            "as PGOLD and issues USDpm, a synthetic dollar tied to the gold ecosystem. "
            "Cross-chain transfers use Chainlink CCIP; pricing uses Chainlink Data Streams."
        ),
        "differentiator": (
            "Tokenized allocated gold with unlimited physical redemption, plus an "
            "oracle/security-first cross-chain model (Chainlink CCIP + Data Streams) "
            "rather than a single-chain gold token."
        ),
        "official_docs": "https://pleasing.gitbook.io/docs",
        "website": "https://www.pleasingmarket.com/",
        "twitter": "https://x.com/PleasingMarket",
        "discord": "https://t.me/pleasing_golden",
        "github": None,
        "components": [
            {
                "name": "PGOLD",
                "description": (
                    "Each token represents 1 troy oz of LBMA-certified gold with "
                    "unlimited physical redemption (HK, expanding APAC/Dubai). "
                    "Cross-chain via Chainlink CCIP."
                ),
            },
            {
                "name": "USDpm",
                "description": (
                    "Synthetic USD stablecoin connecting on-chain liquidity to the "
                    "physical-gold ecosystem. CCIP-enabled across Arbitrum, Ethereum, "
                    "and Pharos."
                ),
            },
            {
                "name": "DeFi liquidity leasing",
                "description": (
                    "Platform markets DeFi liquidity leasing and Tokenization-as-a-Service."
                ),
            },
        ],
        "faq": [
            {
                "question": "What backs PGOLD?",
                "answer": (
                    "Each PGOLD token is intended to represent 1 troy oz of allocated "
                    "LBMA-certified physical gold. Vault custodian and on-chain contract "
                    "details should be verified from official Pleasing docs before relying "
                    "on reserve claims."
                ),
                "pinned": True,
            },
            {
                "question": "Is USDpm the same as PUSD?",
                "answer": (
                    "Secondary sources use both tickers. Chainlink announcements refer to "
                    "USDpm; confirm the canonical ticker from pleasinggold.com / GitBook."
                ),
                "pinned": True,
            },
            {
                "question": "Which chains are supported?",
                "answer": (
                    "PGOLD and USDpm transfer cross-chain via Chainlink CCIP across "
                    "Arbitrum, Ethereum, and Pharos (per Chainlink, 2026-06-03)."
                ),
                "pinned": False,
            },
        ],
        "org_structure": [
            {
                "name": "Pleasing International Limited",
                "role": "Issuer / operator",
                "description": (
                    "Described as a licensed Hong Kong precious-metals enterprise (founded "
                    "2023), issuer of the Pleasing Golden RWA platform. Legal registration "
                    "and license details need primary-source verification."
                ),
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Allocated gold certificate / physically-backed gold ETF",
                "similarity": (
                    "PGOLD maps to digitized allocated-gold with physical redemption rights."
                ),
                "differences": (
                    "Onchain composability and CCIP cross-chain transfers vs traditional "
                    "custodian certificates."
                ),
            },
            {
                "product": "Digital cash / settlement token",
                "similarity": "USDpm approximates a settlement token for the gold ecosystem.",
                "differences": (
                    "Peg and reserve mechanics unverified; not bank-issued e-money."
                ),
            },
        ],
        "risks": [
            {
                "category": "Collateral",
                "description": (
                    "Vault and reserve composition for PGOLD and USDpm not verified from "
                    "primary sources."
                ),
            },
            {
                "category": "Reserve / Depeg",
                "description": "USDpm peg mechanism and redemption rails unverified.",
            },
            {
                "category": "Smart Contract",
                "description": "CCIP bridge, mint/burn, and cross-chain contract risk.",
            },
            {
                "category": "Counterparty",
                "description": "Physical gold custodian and issuer counterparty risk.",
            },
            {
                "category": "Liquidity",
                "description": "No public depth or holder data verified from primary sources.",
            },
            {
                "category": "Regulatory",
                "description": (
                    "Precious-metals and stablecoin issuance may face commodities, "
                    "securities, or money-transmission scrutiny (especially HK)."
                ),
            },
            {
                "category": "Oracle",
                "description": "Dependence on Chainlink Data Streams for RWA pricing.",
            },
            {
                "category": "Governance",
                "description": "Upgrade authority and governance structure opaque.",
            },
        ],
        "events": [
            {
                "date": "2023",
                "title": "Pleasing International founded",
                "description": (
                    "Issuer described as founded 2023 (secondary sources — verify)."
                ),
                "link": None,
            },
            {
                "date": "2026-05-28",
                "title": "Chainlink CCT support",
                "description": "Chainlink changelog lists PGOLD among newly supported CCT tokens.",
                "link": "https://dev.chain.link/changelog",
            },
            {
                "date": "2026-06-03",
                "title": "Chainlink CCIP + Data Streams",
                "description": (
                    "Chainlink announces CCIP integration for PGOLD/USDpm and migration "
                    "from LayerZero to Chainlink CCIP after a security review."
                ),
                "link": "https://x.com/chainlink/status/2062158502517236013",
            },
        ],
        "investment_rounds": [],
        "partnerships": [
            {
                "name": "Chainlink",
                "date": "2026-06-03",
                "amountLabel": None,
                "description": (
                    "CCIP powers cross-chain transfers for PGOLD and USDpm; Data Streams "
                    "for RWA pricing. Exclusive cross-chain infra after LayerZero migration."
                ),
            },
        ],
        "current_scale": {
            "tvlUsd": None,
            "users": None,
            "aprPct": None,
            "targetAprPct": None,
            "loanPipelineUsd": None,
            "partnerships": 1,
        },
        "scale_labels": {
            "tvl": "TVL / supply",
            "users": "Holders",
            "apr": "Yield",
        },
        "member_coins": [
            {
                "slug": "pgold",
                "name": "PGOLD",
                "symbol": "PGOLD",
                "category": "RWA",
                "role": "Tokenized physical gold (1 oz LBMA per token)",
                "subCategory": "Multi-Asset",
            },
            {
                "slug": "usdpm",
                "name": "USDpm",
                "symbol": "USDpm",
                "category": "Stablecoin",
                "role": "Synthetic USD in the gold ecosystem",
                "subCategory": "Stablecoin",
            },
        ],
        "timeline": [
            {
                "date": "2023-11-01",
                "title": "Pleasing Market founded",
                "description": "Pleasing Market launches tokenized LBMA-certified gold (PGOLD) and the USDpm dollar.",
                "link": "https://www.pleasingmarket.com/",
                "status": "executed",
            },
            {
                "date": "ongoing",
                "title": "Chainlink CCIP + Data Streams integration",
                "description": "Cross-chain transfers use Chainlink CCIP; pricing uses Chainlink Data Streams.",
                "link": "https://pleasing.gitbook.io/docs",
                "status": "executed",
            },
        ],
        "offchain_facts": [
            {
                "key": "assetModel",
                "value": (
                    "PGOLD represents 1 troy oz of LBMA-certified gold with physical redemption "
                    "(Hong Kong, expanding across APAC/Dubai); distributed cross-chain via Chainlink CCIP."
                ),
                "freshness": "static",
                "source": {"label": "Pleasing Market docs", "url": "https://pleasing.gitbook.io/docs"},
                "capturedAt": "2026-06-08",
            },
            {
                "key": "pegCaveat",
                "value": (
                    "USDpm's peg mechanism and custody are not independently verified here — "
                    "confirm against official documentation before relying on it."
                ),
                "freshness": "static",
                "source": {"label": "Pleasing Market", "url": "https://www.pleasingmarket.com/"},
                "capturedAt": "2026-06-08",
                "theoretical": True,
            },
        ],
        "portal_defaults": {
            "chains": ["Arbitrum One"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": True,
            "isPubliclyAudited": False,
            "foundedDate": "November 01 2023",
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
    "ondo-finance": {
        "name": "Ondo Finance",
        "symbol": "ONDO",
        "csv_slug": None,
        "tagline": "Institutional-grade finance, delivered onchain.",
        "description": (
            "Ondo Finance packages regulated, institutionally structured real-world assets "
            "into yield-bearing onchain tokens with 24/7 mint/redeem and explicit legal "
            "wrappers (Reg S for USDY; Rule 506(c)/3(c)(7) for OUSG)."
        ),
        "differentiator": (
            "Regulated RWA yield products with legal wrappers and daily proof of reserves — "
            "not generic stablecoins or DeFi wrappers. USDY and OUSG are yield tokens, "
            "not fixed $1 stablecoins."
        ),
        "official_docs": "https://docs.ondo.finance/",
        "website": "https://ondo.finance",
        "twitter": "https://x.com/OndoFinance",
        "discord": None,
        "github": "https://github.com/ondo-finance",
        "components": [
            {
                "name": "USDY",
                "description": (
                    "Yield-bearing bearer note secured by Treasuries and bank deposits. "
                    "Reg S (non-US persons). Daily yield via NAV; 24/7 mint/redeem."
                ),
            },
            {
                "name": "OUSG",
                "description": (
                    "Tokenized short-term US Treasury fund interest for eligible investors. "
                    "Rule 506(c) / 3(c)(7) qualified access."
                ),
            },
            {
                "name": "ONDO",
                "description": "Protocol governance token on Ethereum.",
            },
            {
                "name": "Ondo Global Markets",
                "description": (
                    "Tokenized equities/ETFs product line; surpassed $1B TVL (May 2026)."
                ),
            },
        ],
        "faq": [
            {
                "question": "Is USDY a stablecoin?",
                "answer": (
                    "No. USDY is a yield-bearing bearer note whose value accrues as yield "
                    "is earned. It is dollar-denominated but not pegged to $1 like USDC."
                ),
                "pinned": True,
            },
            {
                "question": "Who can hold OUSG?",
                "answer": (
                    "OUSG is offered under Rule 506(c) and 3(c)(7) to eligible investors "
                    "with KYC/AML onboarding. Not permissionless like most DeFi tokens."
                ),
                "pinned": True,
            },
            {
                "question": "Is USDY available on Arbitrum?",
                "answer": (
                    "Yes. USDY is deployed on Arbitrum One among Ethereum, Mantle, Solana, "
                    "and other networks."
                ),
                "pinned": False,
            },
        ],
        "org_structure": [
            {
                "name": "Ondo Finance Inc.",
                "role": "Parent operating company",
                "description": "Parent entity per Ondo privacy policy and docs.",
            },
            {
                "name": "Ondo USDY LLC",
                "role": "USDY issuer SPV",
                "description": "FinCEN-registered MSB issuing USDY.",
            },
            {
                "name": "Ondo I GP LLC / Ondo Capital Management LLC",
                "role": "OUSG fund structure",
                "description": "GP and investment manager for the OUSG tokenized fund.",
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Tokenized short-duration Treasury note",
                "similarity": "USDY maps to a regulated bearer note with Treasury/bank backing.",
                "differences": (
                    "24/7 onchain mint/redeem and Reg S access restrictions vs "
                    "traditional brokered notes."
                ),
            },
            {
                "product": "Tokenized money-market / Treasury fund",
                "similarity": "OUSG approximates fund LP interests in short-term Treasuries.",
                "differences": (
                    "Onchain instant mint/redeem for eligible investors vs mutual-fund "
                    "settlement cycles."
                ),
            },
        ],
        "risks": [
            {
                "category": "Regulatory",
                "description": (
                    "Reg S / 506(c) access restrictions; transfer whitelisting and "
                    "eligibility requirements."
                ),
            },
            {
                "category": "Counterparty",
                "description": (
                    "Asset managers (BlackRock BUIDL, Franklin Templeton, banks) and "
                    "USDC banking rails for USDY."
                ),
            },
            {
                "category": "Reserve / Depeg",
                "description": (
                    "USDY NAV can drift — it is a yield note, not a fixed $1 peg."
                ),
            },
            {
                "category": "Liquidity",
                "description": (
                    "Business-day pricing, minimums, and qualified-investor gates."
                ),
            },
            {
                "category": "Smart Contract",
                "description": "Smart-contract risk across funds, USDY, and Global Markets.",
            },
            {
                "category": "Custody",
                "description": "Banking and custody rails for USDY wire mint/redeem.",
            },
            {
                "category": "Governance",
                "description": "ONDO tokenholder governance over protocol parameters.",
            },
        ],
        "events": [
            {
                "date": "2022-04-21",
                "title": "Series A $20M",
                "description": (
                    "Pantera (lead), Founders Fund, Coinbase Ventures, Tiger Global, "
                    "Wintermute."
                ),
                "link": "https://techcrunch.com/2022/04/21/ondo-finance-raises-20m-to-bring-traditional-finance-on-chain/",
            },
            {
                "date": "2022-08-23",
                "title": "Strategic extension",
                "description": "Franklin Templeton, Payne Capital, and others.",
                "link": "https://www.theblock.co/post/165576/ondo-finance-raises-new-round",
            },
            {
                "date": "2026-05-06",
                "title": "JPM / Mastercard / Ripple pilot",
                "description": "Cross-border OUSG redemption pilot on XRPL.",
                "link": "https://ondo.finance/blog/ondo-jpmorgan-mastercard-ripple-tokenization",
            },
            {
                "date": "2026-05-11",
                "title": "Global Markets >$1B TVL",
                "description": (
                    "Ondo Global Markets surpassed $1B TVL (~$970M+ TVL, ~$18B volume cited)."
                ),
                "link": "https://ondo.finance/blog/ondo-tokenized-stocks-surpass-one-billion-tvl",
            },
        ],
        "investment_rounds": [
            {
                "round": "Series A",
                "date": "2022-04-21",
                "amountUsd": 20_000_000,
                "leadInvestor": "Pantera Capital",
                "investors": [
                    "Founders Fund",
                    "Coinbase Ventures",
                    "Tiger Global",
                    "Wintermute",
                ],
            },
        ],
        "partnerships": [
            {
                "name": "BlackRock (BUIDL)",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "OUSG mostly held in BUIDL per Ondo product page.",
            },
            {
                "name": "Franklin Templeton / WisdomTree / Fidelity",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "OUSG fund managers and yield infrastructure.",
            },
            {
                "name": "J.P. Morgan Kinexys / Mastercard / Ripple",
                "date": "2026-05-06",
                "amountLabel": None,
                "description": "Cross-border OUSG redemption pilot on XRPL.",
            },
        ],
        "current_scale": {
            "tvlUsd": 2_140_000_000,
            "users": None,
            "aprPct": 3.55,
            "targetAprPct": None,
            "loanPipelineUsd": None,
            "partnerships": 3,
        },
        "scale_labels": {
            "tvl": "USDY TVL",
            "apr": "USDY APY",
        },
        "member_coins": [
            {
                "slug": "usdy",
                "name": "USDY",
                "symbol": "USDY",
                "category": "Token",
                "role": "Yield-bearing Treasury note (not a stablecoin)",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "rusdy",
                "name": "rUSDY",
                "symbol": "rUSDY",
                "category": "Stablecoin",
                "role": "Rebasing USDY — $1 price, balance grows with yield",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "ousg",
                "name": "OUSG",
                "symbol": "OUSG",
                "category": "RWA",
                "role": "Tokenized US Treasury fund interest",
                "subCategory": "Treasuries & Funds",
            },
            {
                "slug": "ondo-gm",
                "name": "Ondo Global Markets",
                "symbol": "GM",
                "category": "RWA",
                "role": "Tokenized US equities/ETFs (TSLA/SPY/QQQ/NVDA)",
                "subCategory": "Tokenized Equities",
            },
            {
                "slug": "ondo-gov",
                "name": "ONDO",
                "symbol": "ONDO",
                "category": "Token",
                "role": "Protocol governance token",
                "subCategory": "Governance Token",
            },
        ],
        "timeline": [
            {
                "date": "2023",
                "title": "USDY launches (Reg S)",
                "description": "Ondo issues USDY, a yield-bearing tokenized note backed by short-term Treasuries under a Reg S wrapper.",
                "link": "https://ondo.finance",
                "status": "executed",
            },
            {
                "date": "2024-01-18",
                "title": "ONDO governance token launch",
                "description": "ONDO becomes transferable and the protocol's governance token goes live.",
                "link": "https://ondo.finance",
                "status": "executed",
            },
            {
                "date": "2024",
                "title": "OUSG institutional access",
                "description": "OUSG offers tokenized US Treasury fund exposure to eligible investors under Rule 506(c)/3(c)(7).",
                "link": "https://ondo.finance",
                "status": "executed",
            },
            {
                "date": "2025",
                "title": "Ondo Global Markets launches",
                "description": "Tokenized US equities/ETFs (TSLA, SPY, QQQ, NVDA) come on-chain for 24/7 trading and DeFi composability.",
                "link": "https://ondo.finance",
                "status": "executed",
            },
        ],
        "offchain_facts": [
            {
                "key": "legalWrappers",
                "value": (
                    "USDY uses a Reg S wrapper; OUSG uses Rule 506(c)/3(c)(7). Access is legally "
                    "gated to eligible investors — these are securities, not stablecoins."
                ),
                "freshness": "static",
                "source": {"label": "Ondo Finance", "url": "https://ondo.finance"},
                "capturedAt": "2026-06-08",
            },
            {
                "key": "globalMarkets",
                "value": (
                    "Ondo Global Markets tokenizes US equities and ETFs (e.g. TSLA, SPY, QQQ, NVDA) "
                    "1:1 against custodied shares for 24/7 on-chain trading."
                ),
                "freshness": "semi-live",
                "source": {"label": "Ondo Finance", "url": "https://ondo.finance"},
                "capturedAt": "2026-06-08",
            },
        ],
        "tokenomics": {
            "maxSupply": 10_000_000_000,
            "emissionsPolicy": (
                "Large allocations to ecosystem growth and protocol development vest over multi-year "
                "schedules; governance directs treasury deployment."
            ),
            "notes": [
                "10B ONDO max supply.",
                "ONDO is governance only — product yields accrue to USDY/OUSG holders, not ONDO.",
            ],
        },
        "portal_defaults": {
            "chains": ["Arbitrum One", "Ethereum"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": True,
            "foundedDate": None,
            "logoUrl": "https://assets.coingecko.com/coins/images/26580/small/ONDO.png",
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
    "aave": {
        "name": "Aave",
        "symbol": "AAVE",
        "csv_slug": "aave",
        "tagline": "Savings for Everyone — open-source non-custodial liquidity protocol.",
        "description": (
            "Aave is a multichain non-custodial lending protocol for supplying, borrowing, "
            "and earning interest. The Aave DAO governs parameters, listings, and emissions; "
            "Aave Labs is the primary development company."
        ),
        "differentiator": (
            "Scale and breadth: large multichain lending network plus native overcollateralized "
            "stablecoin (GHO), staking/backstop mechanics (stkAAVE → Umbrella), and "
            "institutional/RWA lending (Horizon) under DAO governance."
        ),
        "official_docs": "https://aave.com/docs",
        "website": "https://aave.com",
        "twitter": "https://twitter.com/aaveaave",
        "discord": "https://discord.com/invite/aave",
        "github": "https://github.com/aave/aave-protocol",
        "components": [
            {
                "name": "Lending markets",
                "description": (
                    "Core/Prime/Plus/Horizon markets: supply assets to pools, borrow against "
                    "collateral, earn real-time interest. Not a token — the protocol product."
                ),
            },
            {
                "name": "aTokens",
                "description": (
                    "Interest-bearing deposit receipts (e.g. aUSDC) minted on supply — "
                    "accrue yield, redeemable for underlying + interest."
                ),
            },
            {
                "name": "GHO",
                "description": (
                    "Native Aave stablecoin minted by locking approved collateral via Aave."
                ),
            },
            {
                "name": "sGHO / StkGHO",
                "description": (
                    "GHO savings product — yield-bearing, not the stablecoin itself. "
                    "New sGHO experience live May 2026."
                ),
            },
            {
                "name": "AAVE / stkAAVE",
                "description": (
                    "AAVE governs the DAO; stkAAVE is the legacy Safety Module position "
                    "being superseded by Umbrella."
                ),
            },
        ],
        "faq": [
            {
                "question": "What is the GHO / sGHO distinction?",
                "answer": (
                    "GHO is the overcollateralized stablecoin. sGHO is the yield-bearing "
                    "savings wrapper — same pattern as USDe/sUSDe or USDS/sUSDS."
                ),
                "pinned": True,
            },
            {
                "question": "Is Aave custodial?",
                "answer": (
                    "No. Aave is a non-custodial liquidity protocol; users retain control "
                    "of assets in smart contracts."
                ),
                "pinned": True,
            },
            {
                "question": "What replaced the Safety Module?",
                "answer": (
                    "Umbrella is the new insolvency backstop; legacy stkAAVE/stkABPT positions "
                    "remain on-chain but the module role is superseded."
                ),
                "pinned": False,
            },
        ],
        "org_structure": [
            {
                "name": "Aave Labs",
                "role": "Development company",
                "description": (
                    "Primary DAO service provider under the Aave Will Win framework."
                ),
            },
            {
                "name": "Aave DAO",
                "role": "Governance",
                "description": (
                    "Tokenholder governance over parameters, listings, emissions, and buybacks."
                ),
            },
            {
                "name": "Umbrella",
                "role": "Insolvency backstop",
                "description": (
                    "New backstop replacing the legacy Safety Module ($246.6M cited May 2026)."
                ),
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Money-market fund + secured lending desk",
                "similarity": (
                    "Supply/borrow markets resemble secured lending with interest-bearing "
                    "deposit receipts (aTokens)."
                ),
                "differences": (
                    "Overcollateralized onchain pools vs bank balance-sheet lending; "
                    "governance via AAVE tokenholders."
                ),
            },
            {
                "product": "Overcollateralized dollar liability",
                "similarity": "GHO maps to a decentralized overcollateralized dollar.",
                "differences": (
                    "Minted via Aave collateral vs fiat or Treasury reserves."
                ),
            },
        ],
        "risks": [
            {
                "category": "Collateral",
                "description": (
                    "Bad collateral or oracle failures can create bad debt in lending pools."
                ),
            },
            {
                "category": "Oracle",
                "description": "Stale price feeds impair liquidations and collateral valuation.",
            },
            {
                "category": "Smart Contract",
                "description": "Risk across V3/V4 markets, GHO, and Umbrella upgrades.",
            },
            {
                "category": "Liquidity",
                "description": "Thin markets impair exits and liquidations during stress.",
            },
            {
                "category": "Regulatory",
                "description": (
                    "Aave App is not a regulated financial product; jurisdictional exposure."
                ),
            },
            {
                "category": "Governance",
                "description": (
                    "Concentration and coordination risk over emissions, buybacks, and listings."
                ),
            },
            {
                "category": "Counterparty",
                "description": (
                    "Dependency on bridges, external vaults, and partner infra (e.g. Whop/Veda)."
                ),
            },
        ],
        "events": [
            {
                "date": "2026-03",
                "title": "Aave V4 on Ethereum",
                "description": "V4 launches on Ethereum mainnet.",
                "link": "https://aave.com/security",
            },
            {
                "date": "2026-04",
                "title": "rsETH incident",
                "description": "Governance response to rsETH-related incident.",
                "link": "https://governance.aave.com",
            },
            {
                "date": "2026-05-13",
                "title": "Babylon BTC spoke (temp-check)",
                "description": "Governance temp-check for Babylon native-BTC borrowing spoke.",
                "link": "https://governance.aave.com/t/temp-check-establish-babylon-spoke-and-onboard-babylon-native-btc/24911",
            },
            {
                "date": "2026-06-04",
                "title": "Whop Treasury integration",
                "description": (
                    "Whop routes treasury balances through Veda vault into Aave Plasma V3."
                ),
                "link": "https://aave.com/blog/aave-powers-whop-treasury",
            },
        ],
        "investment_rounds": [],
        "partnerships": [
            {
                "name": "Whop",
                "date": "2026-06-04",
                "amountLabel": None,
                "description": (
                    "Treasury balances routed to Veda vault → Aave Plasma V3 (up to 6% APY)."
                ),
            },
            {
                "name": "Circle / Arc",
                "date": "2026-05-29",
                "amountLabel": None,
                "description": "Governance temp-check to deploy Aave V4 on Arc (proposal).",
            },
        ],
        "current_scale": {
            "tvlUsd": 12_480_000_000,
            "users": None,
            "aprPct": None,
            "targetAprPct": None,
            "loanPipelineUsd": None,
            "partnerships": 2,
        },
        "scale_labels": {
            "tvl": "Protocol TVL",
        },
        "member_coins": [
            {
                "slug": "gho",
                "name": "GHO",
                "symbol": "GHO",
                "category": "Stablecoin",
                "role": "Native Aave overcollateralized stablecoin",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "sgho",
                "name": "sGHO",
                "symbol": "sGHO",
                "category": "Stablecoin",
                "role": "Yield-bearing GHO savings (not the stablecoin itself)",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "aave-gov",
                "name": "AAVE",
                "symbol": "AAVE",
                "category": "Token",
                "role": "DAO governance token (max supply 16M)",
                "subCategory": "Governance Token",
            },
            {
                "slug": "stkaave",
                "name": "stkAAVE",
                "symbol": "stkAAVE",
                "category": "Token",
                "role": "Legacy Safety Module staked AAVE",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "stkgho",
                "name": "stkGHO",
                "symbol": "stkGHO",
                "category": "Stablecoin",
                "role": "Staked GHO backstop (Safety Module / Umbrella)",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "ausdc",
                "name": "Aave aUSDC",
                "symbol": "aUSDC",
                "category": "Token",
                "role": "Interest-bearing USDC deposit receipt",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "ausdt",
                "name": "Aave aUSDT",
                "symbol": "aUSDT",
                "category": "Token",
                "role": "Interest-bearing USDT deposit receipt",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "aweth",
                "name": "Aave aWETH",
                "symbol": "aWETH",
                "category": "Token",
                "role": "Interest-bearing WETH deposit receipt",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "stkabpt",
                "name": "stkABPT",
                "symbol": "stkABPT",
                "category": "Token",
                "role": "Staked AAVE/wstETH LP backstop (first-loss)",
                "subCategory": "Yield-generating Token",
            },
        ],
        "timeline": [
            {
                "date": "2020-10",
                "title": "LEND → AAVE migration",
                "description": "LEND migrates to AAVE at 100:1, fixing a 16M max supply and launching the Aave governance token.",
                "link": "https://aave.com",
                "status": "executed",
            },
            {
                "date": "2022",
                "title": "GHO stablecoin launches",
                "description": "Aave introduces GHO, a native overcollateralized stablecoin minted against Aave collateral.",
                "link": "https://aave.com",
                "status": "executed",
            },
            {
                "date": "2025",
                "title": "Aavenomics + Umbrella go live",
                "description": "Protocol revenue funds AAVE buybacks (~$50M/yr scale); Umbrella replaces the legacy Safety Module.",
                "link": "https://aave.com",
                "status": "executed",
            },
            {
                "date": "2026",
                "title": "sGHO savings + Aave V4 direction",
                "description": "A new sGHO savings experience ships and governance advances Aave V4 (e.g. deployment on Arc).",
                "link": "https://aave.com",
                "status": "stated",
            },
        ],
        "offchain_facts": [
            {
                "key": "buyback",
                "value": (
                    "Aavenomics directs protocol revenue to recurring AAVE buybacks (~$1M/week, "
                    "~$50M/yr scale) alongside the Umbrella safety backstop."
                ),
                "freshness": "semi-live",
                "source": {"label": "Aave", "url": "https://aave.com"},
                "capturedAt": "2026-06-08",
            },
            {
                "key": "safetyModule",
                "value": (
                    "Umbrella replaces the legacy Safety Module; stkGHO and stkABPT absorb first-loss "
                    "to cover protocol shortfalls and bad debt."
                ),
                "freshness": "static",
                "source": {"label": "Aave", "url": "https://aave.com"},
                "capturedAt": "2026-06-08",
            },
        ],
        "tokenomics": {
            "maxSupply": 16_000_000,
            "buybackPolicy": (
                "Aavenomics buys back AAVE with protocol revenue (~$1M/week, ~$50M/yr scale)."
            ),
            "distribution": [
                {"bucket": "Migrated from LEND (100:1)", "pct": 77},
                {"bucket": "Ecosystem reserve", "pct": 23},
            ],
            "notes": [
                "16M AAVE max supply.",
                "stkAAVE/stkGHO/stkABPT provide Safety Module / Umbrella first-loss capital.",
            ],
        },
        "portal_defaults": {
            "chains": ["Arbitrum One"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": True,
            "foundedDate": None,
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
}
