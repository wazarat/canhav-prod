#!/usr/bin/env python3
"""
Step 3 — seed the 10 Phase-1 stablecoins from the Arbitrum Portal CSV.

Reads `Arbitrum Ecosystem - scrape v2.csv`, extracts the 10 target stablecoins,
maps each CSV row onto the DynamoDB single-table item shape, and stages it with
``Status = APPROVED`` via the configured repository (LocalAdapter by
default — no installs, no cloud).

Live-sourced fields (``TotalSupply`` from Alchemy, ``HistoricalPegData`` from
Dune) are intentionally left empty here; they are populated in Step 4.

Run from anywhere:
    python3 backend/scripts/ingest_stablecoins.py
    python3 backend/scripts/ingest_stablecoins.py "/path/to/some.csv"

Stdlib only.
"""

from __future__ import annotations

import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

SCRIPTS_ROOT = Path(__file__).resolve().parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))
from classification import apply_coin_classification  # noqa: E402

# CSV slug -> (display name, symbol, peg target). These are the exact Phase-1
# targets; symbols/peg targets are added here since the CSV has no such columns.
#
# Note: the legacy combined "usd-ai" stablecoin is superseded by the two USD.AI
# coins below (USDai + sUSDai), which are part of the USD.AI Entity. The old
# "usd-ai" stablecoin item is deleted on run.
TARGETS: Dict[str, Tuple[str, str, str]] = {
    "ethena": ("Ethena (USDe)", "USDe", schema.PEG_USD),
    "inverse-finance": ("Inverse Finance", "DOLA", schema.PEG_USD),
    "monerium": ("Monerium", "EURe", schema.PEG_EUR),
    "sky": ("Sky (USDS)", "USDS", schema.PEG_USD),
    "stably": ("Stably", "USDS.s", schema.PEG_USD),
    "tether": ("Tether (USDT)", "USDT", schema.PEG_USD),
    "trueusd": ("TrueUSD", "TUSD", schema.PEG_USD),
    "usdc": ("USDC", "USDC", schema.PEG_USD),
    "usdt0": ("USDT0", "USDT0", schema.PEG_USD),
}

# USD.AI's two synthetic-dollar coins. They have no dedicated CSV row, so they
# are derived from the existing "usd-ai" Portal row (shared website / portal
# metadata) but get distinct slug / name / symbol / CoinGecko / contract and are
# tagged with EntitySlug="usd-ai" so they list under the USD.AI Entity. Addresses
# + CoinGecko ids verified via CoinGecko (detail_platforms["arbitrum-one"]).
USD_AI_PARENT_SLUG = "usd-ai"
JUPITER_PARENT_SLUG = "jupiter"

# Umbrella entities whose primary CSV stablecoin row doubles as a member product.
ENTITY_PARENT_SLUGS = frozenset({"ethena", "sky", "monerium", "stably", "trueusd"})

# TARGET coins whose parent umbrella Entity has a *different* slug than the coin
# (e.g. the USDC coin belongs to the Circle entity). These get EntitySlug set to
# the entity slug below instead of the coin slug.
TARGET_ENTITY_OVERRIDES: Dict[str, str] = {
    "usdc": "circle",
}

# Field patches applied to CSV-derived parent stablecoins when seeding entities.
ENTITY_PARENT_PATCHES: Dict[str, Dict[str, str]] = {
    "ethena": {
        "name": "USDe",
        "subCategory": "Stablecoin",
        "description": (
            "Synthetic dollar pegged via delta-hedging BTC/ETH spot plus perp shorts "
            "and liquid stables. Not fiat-backed. Mint/redeem KYC-gated to market makers."
        ),
    },
    "sky": {
        "name": "USDS",
        "subCategory": "Stablecoin",
        "description": (
            "Primary Sky dollar (DAI successor). ERC-20 with 1:1 USDC swap and base "
            "for sUSDS yield wrapper."
        ),
        "contractAddress": "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
    },
    "monerium": {
        "name": "EURe",
        "subCategory": "Stablecoin",
        "description": (
            "Regulated euro e-money issued by Monerium hf. Redeemable at par via "
            "Web3 IBAN and banking rails."
        ),
    },
    "stably": {
        "name": "Stably USD",
        "subCategory": "Stablecoin",
        "description": (
            "Stablecoin-as-a-service dollar from Stably, distinct from Sky USDS."
        ),
    },
    "trueusd": {
        "name": "TUSD",
        "subCategory": "Stablecoin",
        "description": (
            "Fiat-backed USD stablecoin with daily attestations and Chainlink Proof "
            "of Reserve. No native yield."
        ),
        "contractAddress": "0x4d15a3a2286d883af0aa1b3f21367843fac63e07",
    },
}

# Extra stablecoin products per umbrella entity (slug -> spec).
BATCH_ENTITY_COINS: Dict[str, Dict[str, Dict[str, str]]] = {
    "ethena": {
        "susde": {
            "name": "sUSDe",
            "symbol": "sUSDe",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/ethena-staked-usde",
            "contractAddress": "0x9d39a5de30e57443bff2a8307a4256c8797a3497",
            "description": (
                "Staked USDe receipt token accruing protocol revenue. Savings asset, "
                "not a separate pegged stablecoin."
            ),
        },
        "usdtb": {
            "name": "USDtb",
            "symbol": "USDtb",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Treasury-backed dollar distinct from synthetic USDe, backed by "
                "short-term Treasuries / BUIDL exposure."
            ),
        },
    },
    "sky": {
        "susds": {
            "name": "sUSDS",
            "symbol": "sUSDS",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/susds",
            "contractAddress": None,
            "description": (
                "Yield-bearing USDS via Sky Savings Rate. Non-custodial wrapper with "
                "compounding exchange rate."
            ),
        },
        "dai": {
            "name": "DAI",
            "symbol": "DAI",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/dai",
            "contractAddress": None,
            "description": "Legacy Maker collateral-minted stablecoin.",
        },
        "stusds": {
            "name": "stUSDS",
            "symbol": "stUSDS",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Expert-user yield from SKY-backed borrowing with dynamic "
                "utilization-based returns."
            ),
        },
    },
    "monerium": {
        "gbpe": {
            "name": "GBPe",
            "symbol": "GBPe",
            "pegTarget": schema.PEG_GBP,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": "Regulated pound e-money from Monerium hf.",
        },
        "monerium-usde": {
            "name": "Monerium USD (USDe)",
            "symbol": "USDe",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://monerium.com",
            "description": (
                "Monerium's regulated US-dollar e-money, redeemable 1:1 via Web3 IBAN "
                "and banking rails. Strictly distinct from Ethena's synthetic USDe — same "
                "ticker, different issuer and mechanism."
            ),
        },
        "iske": {
            "name": "ISKe",
            "symbol": "ISKe",
            "pegTarget": schema.PEG_ISK,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://monerium.com",
            "description": (
                "Regulated Icelandic króna e-money from Monerium hf, redeemable at par "
                "via SEPA/IBAN rails. No native yield (EEA e-money mandate)."
            ),
        },
    },
    "ondo-finance": {
        "rusdy": {
            "name": "rUSDY",
            "symbol": "rUSDY",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/rebasing-ondo-us-dollar-yield",
            "contractAddress": None,
            "website": "https://ondo.finance/usdy",
            "description": (
                "Rebasing version of USDY favored by DeFi apps: the price stays pegged to "
                "$1.00 while the wallet balance rebases up daily to reflect accrued "
                "short-term-Treasury yield. A yield asset, not a flat fiat stablecoin."
            ),
        },
    },
    "pleasing-market": {
        "usdpm": {
            "name": "USDpm",
            "symbol": "USDpm",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Synthetic USD stablecoin connecting on-chain liquidity to the Pleasing "
                "gold ecosystem. Peg model and custody unverified — confirm from official docs."
            ),
        },
    },
    "aave": {
        "gho": {
            "name": "GHO",
            "symbol": "GHO",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/gho",
            "contractAddress": None,
            "description": (
                "Native Aave overcollateralized stablecoin minted by locking approved "
                "collateral via Aave lending markets."
            ),
        },
        "sgho": {
            "name": "sGHO",
            "symbol": "sGHO",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "GHO savings product — yield-bearing wrapper, not the stablecoin itself. "
                "New sGHO experience live May 2026; legacy savings rebranded StkGHO."
            ),
        },
        "stkgho": {
            "name": "stkGHO",
            "symbol": "stkGHO",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Staked GHO in the Aave Safety Module / Umbrella backstop. Protects the "
                "protocol against severe liquidity shortfalls and bad debt, earning AAVE or "
                "secondary incentive rewards plus a GHO borrow-rate discount. The legacy "
                "staked-GHO position, distinct from the newer sGHO savings experience."
            ),
        },
    },
    "stably": {
        "veusd": {
            "name": "VeUSD",
            "symbol": "VeUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/veusd",
            "contractAddress": None,
            "description": (
                "VeChain USD stablecoin developed by Stably, issued by Prime Trust."
            ),
        },
        "usdsc": {
            "name": "USDS Classic (USDSC)",
            "symbol": "USDSC",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/stably",
            "contractAddress": None,
            "description": (
                "Deprecated legacy version of Stably's original USDS token, kept for "
                "backward compatibility and trading with very low liquidity after the "
                "rebrand to the unified Stably Dollar (SD)."
            ),
        },
    },
    "trueusd": {
        "tgbp": {
            "name": "TrueGBP",
            "symbol": "TGBP",
            "pegTarget": schema.PEG_GBP,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://tusd.io",
            "description": (
                "Tokenized British Pound from TrustToken. Offers localized fiat "
                "on/off-ramps for UK markets so users avoid USD conversion fees."
            ),
        },
        "taud": {
            "name": "TrueAUD",
            "symbol": "TAUD",
            "pegTarget": schema.PEG_AUD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://tusd.io",
            "description": (
                "Tokenized Australian Dollar from TrustToken. Facilitates regional trade, "
                "FX hedging, and localized margin lending."
            ),
        },
        "tcad": {
            "name": "TrueCAD",
            "symbol": "TCAD",
            "pegTarget": schema.PEG_CAD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://tusd.io",
            "description": "Tokenized Canadian Dollar from TrustToken.",
        },
        "thkd": {
            "name": "TrueHKD",
            "symbol": "THKD",
            "pegTarget": schema.PEG_HKD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://tusd.io",
            "description": "Tokenized Hong Kong Dollar from TrustToken.",
        },
    },
    # ---- Stablecoin Sector Expansion (PDF §3) -----------------------------
    # New issuer cohorts. The primary coin for `circle` is the existing `usdc`
    # TARGET (re-tagged with EntitySlug="circle" below); only EURC is added here.
    "circle": {
        "eurc": {
            "name": "Euro Coin",
            "symbol": "EURC",
            "pegTarget": schema.PEG_EUR,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/euro-coin",
            "contractAddress": "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
            "website": "https://www.circle.com/eurc",
            "description": (
                "Circle's regulated euro stablecoin, fully reserved and redeemable 1:1; "
                "MiCA-compliant EU e-money."
            ),
        },
    },
    "paxos": {
        "usdp": {
            "name": "Pax Dollar",
            "symbol": "USDP",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/paxos-standard",
            "contractAddress": "0x8E870D67F660D95d5be530380D0eC0bd388289E1",
            "website": "https://paxos.com",
            "description": "Paxos-native NYDFS-regulated USD stablecoin.",
        },
        "pyusd": {
            "name": "PayPal USD",
            "symbol": "PYUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/paypal-usd",
            "contractAddress": "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
            "website": "https://paxos.com",
            "description": "PayPal-branded dollar issued by Paxos on Ethereum, Solana and Arbitrum.",
        },
        "usdg": {
            "name": "Global Dollar",
            "symbol": "USDG",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/global-dollar",
            "contractAddress": "0x8f1B19622a888C53C8eE4f7D7B4Dc8fA9D7B7C1b",
            "website": "https://paxos.com",
            "description": "Global Dollar Network stablecoin (Paxos), Solana-primary; fastest-growing.",
        },
        "usdl": {
            "name": "Lift Dollar",
            "symbol": "USDL",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://paxos.com",
            "description": "Yield-bearing Paxos dollar, wound down in 2025.",
        },
    },
    "first-digital": {
        "fdusd": {
            "name": "First Digital USD",
            "symbol": "FDUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/first-digital-usd",
            "contractAddress": "0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409",
            "website": "https://firstdigitallabs.com",
            "description": (
                "Hong Kong trust-custody dollar, BSC-primary; recovered partially from "
                "its April 2025 depeg."
            ),
        },
    },
    "m-zero": {
        "m0": {
            "name": "M by M^0",
            "symbol": "M",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": "0x866A2BF4E572CbcF37D5071A7a58503Bfb36be1b",
            "website": "https://m0.org",
            "description": (
                "Modular institutional dollar designed as the underlying asset other "
                "stablecoin products build on, via a permissioned minter network."
            ),
        },
    },
    "agora": {
        "ausd": {
            "name": "Agora Dollar",
            "symbol": "AUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/agora-dollar",
            "contractAddress": "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
            "website": "https://www.agora.finance",
            "description": "Revenue-sharing institutional dollar; reserves via VanEck, custody at State Street.",
        },
    },
    "bitget": {
        "bgusd": {
            "name": "Bitget USD",
            "symbol": "BGUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://www.bitget.com",
            "description": "Exchange-native yield-bearing dollar for Bitget users (launched May 2025).",
        },
    },
    "gmo-trust": {
        "zusd": {
            "name": "ZUSD",
            "symbol": "ZUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/zusd",
            "contractAddress": "0xC56C2b7e71B54d38Aab6d52E94a04Cbfa8F604fA",
            "website": "https://stablecoin.z.com",
            "description": "NY-trust regulated USD stablecoin from GMO Trust.",
        },
        "gyen": {
            "name": "GYEN",
            "symbol": "GYEN",
            "pegTarget": schema.PEG_JPY,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/gyen",
            "contractAddress": "0x07e0EDf8ce600FB51d44F51E3348D77D67F298ae",
            "website": "https://stablecoin.z.com",
            "description": "First and only NYDFS-regulated Japanese yen stablecoin (winding down).",
        },
    },
    "liquity": {
        "lusd": {
            "name": "Liquity USD",
            "symbol": "LUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/liquity-usd",
            "contractAddress": "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
            "website": "https://www.liquity.org",
            "description": "Immutable zero-interest CDP dollar (Liquity V1), ETH-collateralized.",
        },
        "bold": {
            "name": "BOLD",
            "symbol": "BOLD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/liquity-bold",
            "contractAddress": "0x6440f144b7e50D6A8439336510312d2F54beB01D",
            "website": "https://www.liquity.org",
            "description": "Liquity V2 dollar with user-set borrow rates and wstETH/rETH collateral.",
        },
    },
    "curve-stablecoin": {
        "crvusd": {
            "name": "crvUSD",
            "symbol": "crvUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/crvusd",
            "contractAddress": "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",
            "website": "https://crvusd.curve.fi",
            "description": "Curve's overcollateralized dollar using the LLAMMA soft-liquidation AMM.",
        },
        "scrvusd": {
            "name": "Savings crvUSD",
            "symbol": "scrvUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/savings-crvusd",
            "contractAddress": "0x0655977FEb2f289A4aB78af67BAB0d17aab84367",
            "website": "https://crvusd.curve.fi",
            "description": "Yield-bearing crvUSD savings wrapper (appreciating exchange rate).",
        },
    },
    "lista-dao": {
        "lisusd": {
            "name": "Lista USD",
            "symbol": "lisUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/lista-usd",
            "contractAddress": "0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5",
            "website": "https://lista.org",
            "description": "BNB Chain-native CDP dollar; collateral earns liquid-staking yield.",
        },
    },
    "reserve": {
        "rsv": {
            "name": "Reserve",
            "symbol": "RSV",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": "0x196f4727526eA7FB1e17b2071B3d8eAa38486988",
            "website": "https://reserve.org",
            "description": "Original Reserve stablecoin (legacy).",
        },
        "eusd": {
            "name": "Electronic Dollar",
            "symbol": "eUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/electronic-dollar",
            "contractAddress": "0xA0d69E286B938e21CBf7E51D71F6A4c8918f482F",
            "website": "https://reserve.org",
            "description": "Flagship RToken dollar backed by a yield-bearing collateral basket.",
        },
        "rgusd": {
            "name": "Revenue Generating USD",
            "symbol": "rgUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": "0xFe0D6D83033e313691E96909d2188C150b834285",
            "website": "https://reserve.org",
            "description": "Yield-distributing RToken on Ethereum, Arbitrum and Base.",
        },
    },
    "frax": {
        "frax": {
            "name": "Frax",
            "symbol": "FRAX",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/frax",
            "contractAddress": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
            "website": "https://frax.finance",
            "description": "Original hybrid algo-collateral Frax dollar (declining supply).",
        },
        "frxusd": {
            "name": "Frax USD",
            "symbol": "frxUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/frax-usd",
            "contractAddress": None,
            "website": "https://frax.finance",
            "description": "RWA-backed Frax dollar reserved in BlackRock BUIDL / Reg D structures.",
        },
        "sfrax": {
            "name": "Staked FRAX",
            "symbol": "sFRAX",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/staked-frax",
            "contractAddress": "0xA663B02CF0a4b149d2aD41910CB81e23e1c41c32",
            "website": "https://frax.finance",
            "description": "Yield-bearing FRAX (appreciating exchange rate).",
        },
    },
    "resolv": {
        "usr": {
            "name": "Resolv USD",
            "symbol": "USR",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/resolv-usr",
            "contractAddress": "0x66a1E37c9b0eAddca17d3662a6a260b8f54Beac6",
            "website": "https://resolv.xyz",
            "description": (
                "Delta-neutral synthetic dollar; collapsed from a ~$700M peak after the "
                "March 2026 $23M private-key exploit."
            ),
        },
        "stusr": {
            "name": "Staked Resolv USD",
            "symbol": "stUSR",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": "0x6B9dE9C2B64f8A97D3b55eeC7088e2cEe48dBc43",
            "website": "https://resolv.xyz",
            "description": "Yield-bearing USR (appreciating exchange rate).",
        },
        "rlp": {
            "name": "Resolv Liquidity Pool Token",
            "symbol": "RLP",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": "0x4956b52aE2fF65D74CA2d61207523288e4528f96",
            "website": "https://resolv.xyz",
            "description": "Leveraged risk/insurance tranche that backstops USR (variable value).",
        },
    },
    "falcon": {
        "usdf": {
            "name": "Falcon USD",
            "symbol": "USDf",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/falcon-usd",
            "contractAddress": "0xFa2B947eEc368f42195f24F36d2aF29f7c24CeC2",
            "website": "https://falcon.finance",
            "description": "Universal-collateral synthetic dollar (top-10 by supply).",
        },
        "susdf": {
            "name": "Staked Falcon USD",
            "symbol": "sUSDf",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": "0xc8CF6D7991f15525488b2A83Df53468D682Ba4B0",
            "website": "https://falcon.finance",
            "description": "Yield-bearing USDf (appreciating exchange rate).",
        },
    },
    "cap": {
        "cusd": {
            "name": "Cap USD",
            "symbol": "cUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://cap.app",
            "description": (
                "Non-custodial synthetic dollar where institutional agents generate yield "
                "via EigenLayer-secured restaking (contract TBD post-mainnet)."
            ),
        },
    },
    "elixir": {
        "deusd": {
            "name": "deUSD",
            "symbol": "deUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": "0x15700B564Ca08D9439C58cA5053166E8317aa138",
            "website": "https://www.elixir.xyz",
            "description": "Wound-down synthetic dollar (shut down Q1 2026 after the Stream Finance loss).",
        },
        "sdeusd": {
            "name": "Staked deUSD",
            "symbol": "sdeUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://www.elixir.xyz",
            "description": "Wound-down staked deUSD.",
        },
    },
    "anzen": {
        "usdz": {
            "name": "Anzen USDz",
            "symbol": "USDz",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/anzen-usdz",
            "contractAddress": "0x04D5ddf5f3a8939889F84A17e8A3e3c6A1b87B0a",
            "website": "https://www.anzen.finance",
            "description": "Private-credit-backed RWA dollar targeting 8-12% APY.",
        },
        "susdz": {
            "name": "Staked Anzen USDz",
            "symbol": "sUSDz",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "website": "https://www.anzen.finance",
            "description": "Yield-bearing USDz (appreciating exchange rate).",
        },
    },
    "mountain-protocol": {
        "usdm": {
            "name": "Mountain Protocol USD",
            "symbol": "USDM",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/mountain-protocol-usd",
            "contractAddress": "0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C",
            "website": "https://mountainprotocol.com",
            "description": (
                "Regulated daily-rebase T-bill dollar; winding down post Anchorage "
                "acquisition (collapsed from a ~$150M peak)."
            ),
        },
    },
}

USD_AI_COINS: Dict[str, Dict[str, str]] = {
    "usdai": {
        "name": "USDai",
        "symbol": "USDAI",
        "subCategory": "Stablecoin",
        "coingecko": "https://www.coingecko.com/en/coins/usdai",
        "contractAddress": "0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef",
    },
    "susdai": {
        "name": "sUSDai",
        "symbol": "sUSDai",
        "subCategory": "Staked Stablecoin",
        "coingecko": "https://www.coingecko.com/en/coins/susdai",
        "contractAddress": "0x0b2b2b2076d95dda7817e785989fe353fe955ef9",
    },
}

# Jupiter stablecoins (Solana SPL). No CSV row; curated metadata + Solana mints.
JUPITER_COINS: Dict[str, Dict[str, str]] = {
    "jupusd": {
        "name": "JupUSD",
        "symbol": "JUPUSD",
        "subCategory": "Stablecoin",
        "coingecko": "https://www.coingecko.com/en/coins/jupusd",
        "contractAddress": "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD",
        "description": (
            "Reserve-backed Solana stablecoin built with Ethena: ~90% USDtb "
            "(BlackRock BUIDL-backed) + 10% USDC buffer. Does not yield natively "
            "(compliance). Custody via Anchorage Digital and Porto."
        ),
    },
    "jljupusd": {
        "name": "Jupiter Lend JUPUSD",
        "symbol": "jlJUPUSD",
        "subCategory": "Staked Stablecoin",
        "coingecko": None,
        "contractAddress": None,
        "description": (
            "Deposit JupUSD into Jupiter Lend Earn to receive jlJupUSD, which earns "
            "interest and incentives while staying liquid and usable as collateral. "
            "The yield-bearing counterpart to plain JupUSD."
        ),
    },
}

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
    return DEFAULT_CSV  # let the caller surface a clear "not found" error


def row_to_item(row: Dict[str, str], created_at: str) -> dict:
    """Map one CSV row onto a single-table item (Status=APPROVED)."""
    slug = (row.get("Slug") or "").strip()
    name, symbol, peg = TARGETS[slug]
    now = _now_iso()

    return {
        schema.PK: schema.category_pk(schema.CATEGORY_STABLECOIN),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_STABLECOIN,
        "Status": schema.STATUS_APPROVED,
        "Name": name,
        "Slug": slug,
        "Symbol": symbol,
        "PegTarget": peg,
        "Description": _clean(row.get("Description")) or "",
        "Website": _clean(row.get("Website")),
        "Twitter": _clean(row.get("Twitter")),
        "Discord": _clean(row.get("Discord")),
        "GitHub": _clean(row.get("GitHub")),
        "CoinGecko": _clean(row.get("CoinGecko")),
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": None,
        "SubCategory": None,
        "EntitySlug": None,
        # Live overlays — populated in Step 4 (Alchemy / Dune).
        "TotalSupply": {"value": None, "source": "alchemy", "updatedAt": None},
        "HistoricalPegData": {"points": [], "source": "dune", "updatedAt": None},
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": _split_chains(row.get("Chains")),
            "subCategory": _clean(row.get("Sub-category")),
            "isLive": _as_bool(row.get("Is Live")),
            "isArbitrumNative": _as_bool(row.get("Is Arbitrum Native")),
            "isPubliclyAudited": _as_bool(row.get("Is Publicly Audited")),
            "foundedDate": _clean(row.get("Founded Date")),
        },
        "CreatedAt": created_at,
        "UpdatedAt": now,
    }


def entity_coin_item(
    slug: str,
    spec: Dict[str, str],
    entity_slug: str,
    parent_row: Optional[Dict[str, str]],
    created_at: str,
    *,
    chains: Optional[List[str]] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    discord: Optional[str] = None,
    github: Optional[str] = None,
) -> dict:
    """Build a stablecoin item for an umbrella entity (USD.AI, Jupiter, batch issuers)."""
    item = row_to_item_generic(parent_row or {}, created_at)
    item[schema.SK] = schema.protocol_sk(slug)
    item["Name"] = spec["name"]
    item["Slug"] = slug
    item["Symbol"] = spec["symbol"]
    if spec.get("pegTarget"):
        item["PegTarget"] = spec["pegTarget"]
    item["SubCategory"] = spec.get("subCategory")
    item["Description"] = spec.get("description") or item["Description"]
    item["CoinGecko"] = spec.get("coingecko")
    item["ContractAddress"] = spec.get("contractAddress")
    item["EntitySlug"] = entity_slug
    deployments = spec.get("deployments")
    if deployments:
        item["Deployments"] = deployments
    if website:
        item["Website"] = website
    if twitter:
        item["Twitter"] = twitter
    if discord:
        item["Discord"] = discord
    if github:
        item["GitHub"] = github
    if chains:
        item["ArbitrumPortalMetadata"]["chains"] = chains
    return item


def row_to_item_generic(row: Dict[str, str], created_at: str) -> dict:
    """Like row_to_item but without the TARGETS name/symbol/peg lookup."""
    now = _now_iso()
    return {
        schema.PK: schema.category_pk(schema.CATEGORY_STABLECOIN),
        schema.SK: schema.protocol_sk((row.get("Slug") or "").strip()),
        "Category": schema.CATEGORY_STABLECOIN,
        "Status": schema.STATUS_APPROVED,
        "Name": _clean(row.get("Name")) or "",
        "Slug": (row.get("Slug") or "").strip(),
        "Symbol": "",
        "PegTarget": schema.PEG_USD,
        "Description": _clean(row.get("Description")) or "",
        "Website": _clean(row.get("Website")),
        "Twitter": _clean(row.get("Twitter")),
        "Discord": _clean(row.get("Discord")),
        "GitHub": _clean(row.get("GitHub")),
        "CoinGecko": _clean(row.get("CoinGecko")),
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": None,
        "SubCategory": None,
        "EntitySlug": None,
        "TotalSupply": {"value": None, "source": "alchemy", "updatedAt": None},
        "HistoricalPegData": {"points": [], "source": "dune", "updatedAt": None},
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": _split_chains(row.get("Chains")),
            "subCategory": _clean(row.get("Sub-category")),
            "isLive": _as_bool(row.get("Is Live")),
            "isArbitrumNative": _as_bool(row.get("Is Arbitrum Native")),
            "isPubliclyAudited": _as_bool(row.get("Is Publicly Audited")),
            "foundedDate": _clean(row.get("Founded Date")),
        },
        "CreatedAt": created_at,
        "UpdatedAt": now,
    }


def main(argv: List[str]) -> int:
    csv_path = resolve_csv_path(argv)
    if not csv_path.exists():
        print(f"ERROR: CSV not found at {csv_path}", file=sys.stderr)
        print(
            "Pass a path explicitly: python3 backend/scripts/ingest_stablecoins.py "
            '"/path/to/Arbitrum Ecosystem - scrape v2.csv"',
            file=sys.stderr,
        )
        return 1

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_STABLECOIN)

    # Promoted stablecoin-issuer entities: drop stale Stablecoin/{slug} rows when
    # the Entity owns the slug but the coin is not a MemberCoin (mirrors ingest_rwas).
    from stablecoin_specs import STABLECOIN_ENTITY_SPECS  # noqa: E402

    entity_slugs: set[str] = set()
    entity_member_keys: Dict[str, set] = {}
    for item in repo.all():
        if item.get("Category") != schema.CATEGORY_ENTITY:
            continue
        slug = item.get("Slug", "")
        if not slug:
            continue
        entity_slugs.add(slug)
        entity_member_keys[slug] = {
            (r.get("category"), r.get("slug"))
            for r in item.get("MemberCoins") or []
            if r.get("category") and r.get("slug")
        }

    promoted_deleted = 0
    for slug in STABLECOIN_ENTITY_SPECS:
        if slug not in entity_slugs or slug in ENTITY_PARENT_SLUGS:
            continue
        if ("Stablecoin", slug) in entity_member_keys.get(slug, set()):
            continue
        if repo.delete_item(pk, schema.protocol_sk(slug)):
            promoted_deleted += 1

    # Collect matching rows by slug (CSV is the source of truth). The legacy
    # "usd-ai" row is captured to source the two USD.AI coins below.
    matched: Dict[str, Dict[str, str]] = {}
    all_csv_rows: Dict[str, Dict[str, str]] = {}
    usd_ai_row: Optional[Dict[str, str]] = None
    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            slug = (row.get("Slug") or "").strip()
            if slug and slug not in all_csv_rows:
                all_csv_rows[slug] = row
            if slug in TARGETS and slug not in matched:
                matched[slug] = row
            if slug == USD_AI_PARENT_SLUG and usd_ai_row is None:
                usd_ai_row = row

    staged: List[str] = []
    for slug in TARGETS:
        row = matched.get(slug)
        if row is None:
            continue
        # Idempotent: preserve original CreatedAt on re-ingest.
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        item = row_to_item(row, created_at)
        if slug in TARGET_ENTITY_OVERRIDES:
            # Coin whose parent Entity slug differs from the coin slug (USDC -> Circle).
            item["EntitySlug"] = TARGET_ENTITY_OVERRIDES[slug]
        elif slug in ENTITY_PARENT_SLUGS:
            item["EntitySlug"] = slug
            patch = ENTITY_PARENT_PATCHES.get(slug, {})
            if patch.get("name"):
                item["Name"] = patch["name"]
            if patch.get("subCategory"):
                item["SubCategory"] = patch["subCategory"]
            if patch.get("description"):
                item["Description"] = patch["description"]
            if patch.get("contractAddress"):
                item["ContractAddress"] = patch["contractAddress"]
        repo.put_item(apply_coin_classification(item))
        staged.append(slug)

    # USD.AI coins (USDai + sUSDai), derived from the shared "usd-ai" row.
    usd_ai_staged: List[str] = []
    if usd_ai_row is not None:
        for slug in USD_AI_COINS:
            existing = repo.get_item(pk, schema.protocol_sk(slug))
            created_at = (existing or {}).get("CreatedAt") or _now_iso()
            repo.put_item(
                apply_coin_classification(
                    entity_coin_item(
                        slug, USD_AI_COINS[slug], USD_AI_PARENT_SLUG, usd_ai_row, created_at
                    )
                )
            )
            usd_ai_staged.append(slug)
    else:
        print(
            f"WARNING: no '{USD_AI_PARENT_SLUG}' row in CSV; "
            "USDai / sUSDai not staged.",
            file=sys.stderr,
        )

    # Jupiter stablecoins (JupUSD + jlJupUSD).
    jupiter_staged: List[str] = []
    for slug in JUPITER_COINS:
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        repo.put_item(
            apply_coin_classification(
                entity_coin_item(
                    slug,
                    JUPITER_COINS[slug],
                    JUPITER_PARENT_SLUG,
                    None,
                    created_at,
                    chains=["Solana"],
                    website="https://jup.ag",
                    twitter="https://x.com/JupiterExchange",
                    discord="https://discord.gg/jup",
                    github="https://github.com/jup-ag",
                )
            )
        )
        jupiter_staged.append(slug)

    # Batch entity extra stablecoins (Ethena, Sky, Monerium, Stably).
    batch_staged: List[str] = []
    for entity_slug, coins in BATCH_ENTITY_COINS.items():
        parent_row = matched.get(entity_slug) or all_csv_rows.get(entity_slug)
        for slug, spec in coins.items():
            existing = repo.get_item(pk, schema.protocol_sk(slug))
            created_at = (existing or {}).get("CreatedAt") or _now_iso()
            row = parent_row or {}
            repo.put_item(
                apply_coin_classification(
                    entity_coin_item(
                        slug,
                        spec,
                        entity_slug,
                        row,
                        created_at,
                        website=_clean(row.get("Website")) or spec.get("website"),
                        twitter=_clean(row.get("Twitter")),
                        discord=_clean(row.get("Discord")),
                        github=_clean(row.get("GitHub")),
                    )
                )
            )
            batch_staged.append(slug)

    # Drop the legacy combined "usd-ai" stablecoin (superseded by the two coins).
    removed_legacy = repo.delete_item(pk, schema.protocol_sk(USD_AI_PARENT_SLUG))

    # --- Report ------------------------------------------------------------
    print(f"Source CSV : {csv_path}")
    print(f"Backend    : {type(repo).__name__}")
    print(f"Partition  : {pk}")
    print("-" * 64)
    print(f"{'STATUS':<18}{'SYMBOL':<10}{'NAME'}")
    print("-" * 64)
    for slug in TARGETS:
        if slug in staged:
            name, symbol, _ = TARGETS[slug]
            print(f"{schema.STATUS_PENDING:<18}{symbol:<10}{name}")
    for slug in usd_ai_staged:
        spec = USD_AI_COINS[slug]
        print(f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}{spec['name']} (USD.AI)")
    for slug in jupiter_staged:
        spec = JUPITER_COINS[slug]
        print(f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}{spec['name']} (Jupiter)")
    for slug in batch_staged:
        for entity_slug, coins in BATCH_ENTITY_COINS.items():
            if slug in coins:
                spec = coins[slug]
                print(
                    f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}"
                    f"{spec['name']} ({entity_slug})"
                )
                break
    print("-" * 64)
    batch_count = sum(len(c) for c in BATCH_ENTITY_COINS.values())
    total_staged = len(staged) + len(usd_ai_staged) + len(jupiter_staged) + len(batch_staged)
    total_targets = len(TARGETS) + len(USD_AI_COINS) + len(JUPITER_COINS) + batch_count
    print(f"Published {total_staged} / {total_targets} target stablecoins as APPROVED.")
    if promoted_deleted:
        print(
            f"Removed {promoted_deleted} promoted-entity Stablecoin duplicate(s) "
            "(Entity owns slug; coin not a MemberCoin)."
        )
    if removed_legacy:
        print(f"Removed legacy '{USD_AI_PARENT_SLUG}' stablecoin (superseded by USDai + sUSDai).")

    missing = [s for s in TARGETS if s not in staged]
    if missing:
        print(f"WARNING: missing from CSV: {', '.join(missing)}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
