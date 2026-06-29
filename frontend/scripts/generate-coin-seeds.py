#!/usr/bin/env python3
"""
Generate frontend/data/seed/{entity-slug-map,coins,receipts}.ts from
canhav-coins-compiled.xlsx. Run once after spreadsheet updates.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
XLSX = Path("/Users/wazarat/Downloads/canhav-coins-compiled.xlsx")
OUT_DIR = REPO / "frontend" / "data" / "seed"
BOOTSTRAP = REPO / "frontend" / "data" / "bootstrap-store.json"
COINGECKO_IDS_TS = REPO / "frontend" / "lib" / "coingeckoIds.ts"

# Spreadsheet Entity name -> existing network slug (curated overrides)
ENTITY_SLUG_MAP: dict[str, str] = {
    "Aave": "aave",
    "Aerodrome Finance": "aerodrome",
    "Aevo": "aevo",
    "Ankr": "ankr",
    "Anzen Finance": "anzen",
    "Arrakis Finance": "arrakis",
    "Aura Finance": "aura",
    "Balancer": "balancer",
    "Bedrock": "bedrock",
    "Beefy": "beefy",
    "Binance": "binance-wbeth",
    "Centrifuge": "centrifuge",
    "Clearpool": "clearpool",
    "Coinbase": "coinbase-cbeth",
    "Compound": "compound",
    "Convex Finance": "convex-finance",
    "Cozy Finance": "cozy-finance",
    "Curve Finance": "curve-finance",
    "Derive": "derive",
    "Dinari": "dinari",
    "Dopex": "dopex",
    "Drift Protocol": "drift-protocol",
    "Ease.org": "ease-org",
    "EigenLayer": "eigenlayer",
    "Ethena": "ethena",
    "Ether.fi": "ether-fi",
    "Euler": "euler",
    "Extra Finance": "extra-finance",
    "Florence Finance": "florence-finance",
    "Fluid (Instadapp)": "fluid",
    "Franklin Templeton": "franklin-templeton",
    "Frax Finance": "frax",
    "GMX": "gmx",
    "Gains Network": "gains-network",
    "Gamma": "gamma",
    "Gearbox": "gearbox",
    "Goldfinch": "goldfinch",
    "Hyperliquid": "hyperliquid",
    "InsurAce": "insurace",
    "Jones DAO": "jones-dao",
    "Karak": "karak",
    "Kava Lend": "kava-lend",
    "Kelp DAO": "kelp-dao",
    "Lido": "lido",
    "M0 (M^0)": "m-zero",
    "Mantle": "mantle-meth",
    "Maple Finance": "maple",
    "Maverick Protocol": "maverick",
    "Morpho": "morpho",
    "Mountain Protocol": "mountain-protocol",
    "Neptune Mutual": "neptune-mutual",
    "Neutra Finance": "neutra-finance",
    "Nexus Mutual": "nexus-mutual",
    "Notional Finance": "notional",
    "Ondo Finance": "ondo-finance",
    "Paladin": "paladin",
    "PancakeSwap": "pancakeswap",
    "Pendle": "pendle",
    "Puffer Finance": "puffer",
    "Radiant Capital": "radiant",
    "Rage Trade": "rage-trade",
    "RealT": "realt",
    "Redacted (Hidden Hand)": "hidden-hand",
    "Renzo": "renzo",
    "Reservoir": "reserve",
    "Ribbon Finance": "ribbon-finance",
    "Rocket Pool": "rocket-pool",
    "Securitize": "securitize",
    "Sense Finance": "sense",
    "Sherlock": "sherlock",
    "Sky (ex-MakerDAO)": "sky",
    "Spark": "spark",
    "Spectra": "spectra",
    "Stader Labs": "stader",
    "Stake DAO": "stake-dao",
    "StakeWise": "stakewise",
    "Stella": "stella",
    "Swell": "swell",
    "Symbiotic": "symbiotic",
    "Synthetix": "synthetix",
    "Term Finance": "term-finance",
    "Toucan Protocol": "toucan-protocol",
    "USD.AI": "usd-ai",
    "Uniswap": "uniswap",
    "Votium": "votium",
    "Yearn Finance": "yearn-finance",
    "YieldNest": "yieldnest",
    "dYdX": "dydx",
}

COIN_TYPE_MAP = {
    "Governance Token": "Governance",
    "Governance & Utility Token": "GovernanceUtility",
    "Native Stablecoin": "NativeStablecoin",
    "Synthetic Dollar": "SyntheticDollar",
    "Locked / Vote-Escrow Token": "LockedEscrow",
    "No Token": "NoToken",
    "N/A": "NoToken",
}

RECEIPT_TYPE_MAP = {
    "Liquid Staking Token (LST)": "LiquidStaking",
    "Liquid Restaking Token (LRT)": "LiquidRestaking",
    "Lending Receipt Token": "LendingReceipt",
    "Yield-Bearing Vault Token": "YieldVault",
    "Staked Stablecoin": "StakedStablecoin",
    "Fixed-Income / Tranche Token": "FixedIncomeTranche",
    "Tokenized RWA Token": "TokenizedRWA",
    "Locked / Vote-Escrow Receipt": "LockedEscrowReceipt",
}

# Manual gecko overrides (symbol -> gecko id) for ambiguous matches
GECKO_OVERRIDES: dict[str, str | None] = {
    "AAVE": "aave",
    "GHO": "gho",
    "COMP": "compound-governance-token",
    "MORPHO": "morpho",
    "UNI": "uniswap",
    "BAL": "balancer",
    "CRV": "curve-dao-token",
    "LDO": "lido-dao",
    "RPL": "rocket-pool",
    "ENA": "ethena",
    "SKY": "sky",
    "ONDO": "ondo-finance",
    "CFG": "centrifuge",
    "CPOOL": "clearpool",
    "GFI": "goldfinch",
    "SHER": "sherlock",
    "GMX": "gmx",
    "SNX": "havven",
    "PENDLE": "pendle",
    "AERO": "aerodrome-finance",
    "CAKE": "pancakeswap-token",
    "EIGEN": "eigenlayer",
    "KAR": "karak",
    "ETHFI": "ether-fi",
    "CHIP": None,
    "HYPE": "hyperliquid",
    "USDS": "usds",
    "USDM": "mountain-protocol-usdm",
    "USDY": "ondo-us-dollar-yield",
    "rUSD": "reservoir-rusd",
    "M": None,  # manual confirm
    "USDai": "usdai",
    "SYRUP": None,  # manual confirm - Maple migration
    "REZ": "renzo",
    "TERM": None,
    "stETH": "staked-ether",
    "wstETH": "wrapped-steth",
    "rETH": "rocket-pool-eth",
    "cbETH": "coinbase-wrapped-staked-eth",
    "wBETH": "wrapped-beacon-eth",
    "mETH": "mantle-staked-ether",
    "ETHx": "stader-ethx",
    "osETH": "stakewise-v3-oseth",
    "swETH": "sweth",
    "ankrETH": "ankreth",
    "weETH": "wrapped-eeth",
    "eETH": "ether-fi-staked-eth",
    "ezETH": "renzo-restaked-eth",
    "rsETH": "kelp-dao-restaked-eth",
    "pufETH": "pufeth",
    "uniETH": "universal-eth",
    "ynETH": "yieldnest-restaked-eth",
    "sDAI": "savings-dai",
    "sUSDe": "ethena-staked-usde",
    "sUSDS": "susds",
    "scrvUSD": "scrvusd",
    "stkGHO": None,
    "sfrxETH": "staked-frax-ether",
}

# Receipt family slug generation
RECEIPT_FAMILY_SLUGS: dict[tuple[str, str], str] = {
    ("Aave", "Lending Receipt Token"): "aave-atokens",
    ("Aave", "Locked / Vote-Escrow Receipt"): "aave-staked",
    ("Compound", "Lending Receipt Token"): "compound-ctokens",
    ("Compound", "Locked / Vote-Escrow Receipt"): "compound-comp-staked",
    ("Morpho", "Lending Receipt Token"): "morpho-metamorpho",
    ("Radiant Capital", "Lending Receipt Token"): "radiant-rtokens",
    ("Spark", "Lending Receipt Token"): "spark-sptokens",
    ("Lido", "Liquid Staking Token (LST)"): "lido-steth",
    ("Rocket Pool", "Liquid Staking Token (LST)"): "rocket-pool-reth",
    ("Binance", "Liquid Staking Token (LST)"): "binance-wbeth",
    ("Coinbase", "Liquid Staking Token (LST)"): "coinbase-cbeth",
    ("Ether.fi", "Liquid Restaking Token (LRT)"): "ether-fi-weeth",
    ("Renzo", "Liquid Restaking Token (LRT)"): "renzo-ezeth",
    ("Kelp DAO", "Liquid Restaking Token (LRT)"): "kelp-rseth",
    ("Ethena", "Staked Stablecoin"): "ethena-susde",
    ("Sky (ex-MakerDAO)", "Staked Stablecoin"): "sky-susds",
    ("Frax Finance", "Staked Stablecoin"): "frax-sfrxusd",
    ("Pendle", "Fixed-Income / Tranche Token"): "pendle-ptyt",
}


def kebab(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.strip().lower())
    return re.sub(r"-+", "-", s).strip("-")


def read_xlsx_sheet(z: zipfile.ZipFile, sheet_idx: int, shared: list[str]) -> list[list[str]]:
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        r.get("Id"): r.get("Target")
        for r in rels.findall(".//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship")
    }
    sheets = wb.findall(f".//{{{ns}}}sheet")
    rid = sheets[sheet_idx].get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    target = rel_map[rid]
    if not target.startswith("xl/"):
        target = "xl/" + target.lstrip("/")
    root = ET.fromstring(z.read(target))
    rows: list[list[str]] = []
    for row in root.findall(f".//{{{ns}}}sheetData/{{{ns}}}row"):
        vals: list[str] = []
        for c in row.findall(f"{{{ns}}}c"):
            t = c.get("t")
            v = c.find(f"{{{ns}}}v")
            if v is None:
                vals.append("")
                continue
            val = v.text or ""
            if t == "s":
                val = shared[int(val)]
            vals.append(val)
        if any(str(x).strip() for x in vals):
            rows.append(vals)
    return rows


def load_existing_gecko_ids() -> dict[str, str]:
    text = COINGECKO_IDS_TS.read_text()
    out: dict[str, str] = {}
    for m in re.finditer(r'^\s+"?([\w-]+)"?\s*:\s*"([^"]+)"', text, re.M):
        out[m.group(1)] = m.group(2)
    return out


def fetch_coingecko_list() -> list[dict]:
    url = "https://api.coingecko.com/api/v3/coins/list?include_platform=false"
    req = urllib.request.Request(url, headers={"User-Agent": "canhav-research/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def resolve_gecko(symbol: str, name: str, cg_list: list[dict], slug: str, existing: dict[str, str]) -> str | None:
    if slug in existing and existing[slug]:
        return existing[slug]
    sym = symbol.upper().strip()
    if sym in GECKO_OVERRIDES:
        return GECKO_OVERRIDES[sym]
    sym_lower = symbol.lower().strip()
    if sym_lower in existing and existing[sym_lower]:
        return existing[sym_lower]
    # match by symbol
    matches = [c for c in cg_list if c.get("symbol", "").upper() == sym]
    if len(matches) == 1:
        return matches[0]["id"]
    if matches:
        name_l = name.lower()
        for c in matches:
            if name_l in c.get("name", "").lower() or c.get("name", "").lower() in name_l:
                return c["id"]
        return matches[0]["id"]
    return None


def coin_slug(symbol: str, entity: str, coin_type: str, entity_slug: str) -> str:
    sym = symbol.strip()
    if coin_type == "NoToken" or sym in ("N/A", ""):
        return kebab(entity) + "-no-token"
    base = kebab(sym)
    # disambiguate when coin slug would collide with entity slug
    if base == entity_slug:
        return f"{base}-token"
    # disambiguate common symbols
    entity_part = kebab(entity.split()[0])
    ambiguous = {"USDC", "USDT", "DAI", "ETH", "BTC"}
    if sym.upper() in ambiguous:
        return f"{entity_part}-{base}"
    return base


def receipt_slug(entity: str, token_type: str, token_label: str) -> str:
    key = (entity, token_type)
    if key in RECEIPT_FAMILY_SLUGS:
        return RECEIPT_FAMILY_SLUGS[key]
    # derive from first token in label
    first = re.split(r"[,/(]", token_label)[0].strip()
    first = re.sub(r"\s+and other.*", "", first, flags=re.I).strip()
    if first:
        return kebab(entity.split()[0]) + "-" + kebab(first)
    return kebab(entity) + "-" + kebab(token_type.split()[0])


def ts_str(s: str | None) -> str:
    if s is None:
        return "null"
    return json.dumps(s)


def main() -> int:
    if not XLSX.exists():
        print(f"Missing xlsx: {XLSX}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(XLSX) as z:
        shared_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        shared = []
        for si in shared_root.findall(".//m:si", ns):
            texts = [t.text or "" for t in si.findall(".//m:t", ns)]
            shared.append("".join(texts))
        coins_rows = read_xlsx_sheet(z, 0, shared)
        receipts_rows = read_xlsx_sheet(z, 1, shared)

    bootstrap_slugs: set[str] = set()
    if BOOTSTRAP.exists():
        data = json.loads(BOOTSTRAP.read_text())
        for v in data.get("items", {}).values():
            if v.get("Category") in ("Network", "Entity"):
                bootstrap_slugs.add(v["Slug"])

    existing_gecko = load_existing_gecko_ids()
    try:
        cg_list = fetch_coingecko_list()
        print(f"Fetched {len(cg_list)} CoinGecko coins")
    except Exception as e:
        print(f"WARN: CoinGecko list fetch failed: {e}", file=sys.stderr)
        cg_list = []

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # entity-slug-map.ts
    entities = sorted(set(r[2] for r in coins_rows[1:] + receipts_rows[1:]))
    unmapped: list[str] = []
    map_lines = []
    for ent in entities:
        slug = ENTITY_SLUG_MAP.get(ent)
        if not slug:
            slug = kebab(ent)
            unmapped.append(ent)
        map_lines.append(f'  {json.dumps(ent)}: {json.dumps(slug)},')

    entity_map_ts = f'''/**
 * Curated map: spreadsheet Entity column -> CanHav network slug.
 * Generated by frontend/scripts/generate-coin-seeds.py — edit overrides in that script.
 */
export const ENTITY_SLUG_MAP: Record<string, string> = {{
{chr(10).join(map_lines)}
}};
'''
    (OUT_DIR / "entity-slug-map.ts").write_text(entity_map_ts)

    # coins.ts
    coin_seeds = []
    warnings: list[str] = []
    seen_slugs: set[str] = set()
    for row in coins_rows[1:]:
        sym, typ, entity, network, tag = row[0], row[1], row[2], row[3], row[4]
        coin_type = COIN_TYPE_MAP.get(typ, "GovernanceUtility")
        entity_slug = ENTITY_SLUG_MAP.get(entity, kebab(entity))
        if entity_slug not in bootstrap_slugs:
            warnings.append(f"entity not in bootstrap: {entity} -> {entity_slug}")
        slug = coin_slug(sym, entity, coin_type, entity_slug)
        if slug in seen_slugs:
            slug = f"{entity_slug}-{slug}"
        seen_slugs.add(slug)
        is_stable = coin_type in ("NativeStablecoin", "SyntheticDollar")
        gecko = None if coin_type == "NoToken" else resolve_gecko(sym, entity, cg_list, slug, existing_gecko)
        if gecko is None and coin_type != "NoToken":
            warnings.append(f"unresolved gecko_id: {sym} ({entity}) slug={slug}")
        name = entity if coin_type == "NoToken" else sym
        display_sym = "—" if coin_type == "NoToken" else sym
        coin_seeds.append({
            "slug": slug,
            "symbol": display_sym,
            "name": name if coin_type != "NoToken" else f"{entity} (no native token)",
            "coinType": coin_type,
            "entitySlug": entity_slug,
            "geckoId": gecko,
            "isStablecoin": is_stable,
            "sector": network,
            "tag": tag,
        })

    coin_lines = []
    for c in coin_seeds:
        coin_lines.append(
            f'  {{ slug: {ts_str(c["slug"])}, symbol: {ts_str(c["symbol"])}, '
            f'name: {ts_str(c["name"])}, coinType: {ts_str(c["coinType"])}, '
            f'entitySlug: {ts_str(c["entitySlug"])}, geckoId: {ts_str(c["geckoId"])}, '
            f'isStablecoin: {"true" if c["isStablecoin"] else "false"}, '
            f'sector: {ts_str(c["sector"])}, tag: {ts_str(c["tag"])} }},'
        )

    coins_ts = f'''import type {{ CoinType }} from "@/lib/types";

export interface CoinSeed {{
  slug: string;
  symbol: string;
  name: string;
  coinType: CoinType;
  entitySlug: string;
  geckoId: string | null;
  isStablecoin: boolean;
  sector: string;
  tag: string;
}}

/** {len(coin_seeds)} primary coins from canhav-coins-compiled.xlsx */
export const COIN_SEED: CoinSeed[] = [
{chr(10).join(coin_lines)}
];
'''
    (OUT_DIR / "coins.ts").write_text(coins_ts)

    # receipts.ts
    receipt_seeds = []
    seen_r: set[str] = set()
    for row in receipts_rows[1:]:
        token_label, token_type, entity, network, tag, notes = (
            row[0], row[1], row[2], row[3], row[4], row[5] if len(row) > 5 else ""
        )
        receipt_type = RECEIPT_TYPE_MAP.get(token_type, "YieldVault")
        entity_slug = ENTITY_SLUG_MAP.get(entity, kebab(entity))
        slug = receipt_slug(entity, token_type, token_label)
        if slug in seen_r:
            slug = slug + "-family"
        seen_r.add(slug)
        base_asset = None
        if receipt_type in ("LiquidStaking", "LiquidRestaking"):
            base_asset = "ETH"
        elif receipt_type == "StakedStablecoin":
            if "USDe" in token_label or "Ethena" in entity:
                base_asset = "USDe"
            elif "USDS" in token_label or "Sky" in entity or "DAI" in token_label:
                base_asset = "USDS"
            elif "GHO" in token_label:
                base_asset = "GHO"
            elif "crvUSD" in token_label:
                base_asset = "crvUSD"
            else:
                base_asset = "USD"
        first_sym = re.split(r"[,/(]", token_label)[0].strip()
        first_sym = re.sub(r"\s+and other.*", "", first_sym, flags=re.I).strip()
        gecko = resolve_gecko(first_sym, entity, cg_list, slug, existing_gecko)
        if receipt_type == "LendingReceipt":
            gecko = None
        receipt_seeds.append({
            "slug": slug,
            "symbol": first_sym[:32] if first_sym else token_label[:32],
            "name": token_label,
            "receiptType": receipt_type,
            "entitySlug": entity_slug,
            "baseAsset": base_asset,
            "geckoId": gecko,
            "sector": network,
            "tag": tag,
            "notes": notes,
        })

    receipt_lines = []
    for r in receipt_seeds:
        ba = f'{ts_str(r["baseAsset"])}' if r["baseAsset"] else "undefined"
        receipt_lines.append(
            f'  {{ slug: {ts_str(r["slug"])}, symbol: {ts_str(r["symbol"])}, '
            f'name: {ts_str(r["name"])}, receiptType: {ts_str(r["receiptType"])}, '
            f'entitySlug: {ts_str(r["entitySlug"])}, baseAsset: {ba}, '
            f'geckoId: {ts_str(r["geckoId"])}, sector: {ts_str(r["sector"])}, '
            f'tag: {ts_str(r["tag"])}, notes: {ts_str(r["notes"])} }},'
        )

    receipts_ts = f'''import type {{ ReceiptType }} from "@/lib/types";

export interface ReceiptSeed {{
  slug: string;
  symbol: string;
  name: string;
  receiptType: ReceiptType;
  entitySlug: string;
  baseAsset?: string;
  geckoId: string | null;
  sector: string;
  tag: string;
  notes: string;
}}

/** {len(receipt_seeds)} receipt families from canhav-coins-compiled.xlsx */
export const RECEIPT_SEED: ReceiptSeed[] = [
{chr(10).join(receipt_lines)}
];
'''
    (OUT_DIR / "receipts.ts").write_text(receipts_ts)

    # JSON sidecars for Python seeder
    (OUT_DIR / "coins.json").write_text(json.dumps(coin_seeds, indent=2))
    (OUT_DIR / "receipts.json").write_text(json.dumps(receipt_seeds, indent=2))

    print(f"Wrote {len(coin_seeds)} coins, {len(receipt_seeds)} receipts")
    if unmapped:
        print("Unmapped entities (used kebab fallback):", unmapped)
    if warnings:
        print("Warnings:")
        for w in warnings[:30]:
            print(f"  - {w}")
        if len(warnings) > 30:
            print(f"  ... and {len(warnings)-30} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
