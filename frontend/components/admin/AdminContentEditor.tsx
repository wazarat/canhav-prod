"use client";

import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { OrgOption } from "@/components/admin/AdminPanel";
import { OrgPicker } from "@/components/admin/OrgPicker";
import { AdminForm } from "@/components/admin/rjsf/adminTheme";
import {
  CREDIT_PRIMARY_TAGS,
  DERIVATIVES_PRIMARY_TAGS,
  LIQUIDITY_PRIMARY_TAGS,
  OTHER_PRIMARY_TAGS,
  RWA_SECONDARY_TAGS,
  STAKING_PRIMARY_TAGS,
} from "@/lib/networkTaxonomy";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const NETWORK_SECTORS = [
  "Credit",
  "Yield",
  "DEX",
  "Options",
  "Stablecoin",
  "RWA",
  "Staking",
  "Liquidity",
  "Derivatives",
  "Other",
];

const TAG_SUGGESTIONS = Array.from(
  new Set([
    ...CREDIT_PRIMARY_TAGS,
    ...STAKING_PRIMARY_TAGS,
    ...LIQUIDITY_PRIMARY_TAGS,
    ...DERIVATIVES_PRIMARY_TAGS,
    ...OTHER_PRIMARY_TAGS,
    ...RWA_SECONDARY_TAGS,
  ] as string[]),
);

const RISK_CATEGORIES = [
  "Counterparty",
  "Network",
  "Oracle",
  "Reserve / Depeg",
  "Smart Contract",
  "Governance",
  "Collateral",
  "Regulatory",
  "Systemic",
];

/* -------------------------------------------------------------------------- */
/* Sector-specific classification vocabulary (mirrors lib/types.ts unions).    */
/* The full sub-sector lists that networkTaxonomy.ts doesn't already export    */
/* are defined here; the primary-tag arrays are reused from taxonomy.          */
/* -------------------------------------------------------------------------- */

const STAKING_SECONDARY_TAGS = [
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
];
const LIQUIDITY_SECONDARY_TAGS = [
  "Stable-Pools",
  "Concentrated-Liquidity",
  "Auto-Compounding",
  "LP-Strategy-Manager",
  "Multi-Chain",
  "ve-Tokenomics",
];
const DERIVATIVES_SECONDARY_TAGS = [
  "Oracle-Based",
  "Orderbook",
  "Synthetic-Assets",
  "Auto-Strategy",
  "Funding-Rate-Yield",
  "Multi-Chain",
];
const OTHER_SECONDARY_TAGS = [
  "Parametric-Cover",
  "Claims-Assessed",
  "Audit-Coverage",
  "Bribe-Marketplace",
  "Vote-Aggregator",
  "Liquid-Locker",
  "Multi-Chain",
];
const RWA_SUB_SECTORS = [
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
];
const STABLECOIN_SUB_SECTORS = [
  "Fiat-Backed Regulated",
  "E-Money Regulated",
  "Decentralized CDP",
  "Synthetic Yield-Bearing",
  "RWA-Backed Stable",
  "Cross-Chain / Omnichain",
];
const STABLECOIN_SECONDARY_TAGS = [
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
];
const DEX_SUB_SECTORS = [
  "AMM",
  "Concentrated Liquidity",
  "Stableswap",
  "Aggregator",
  "Orderbook",
  "Hybrid AMM + Orderbook",
  "Perpetuals",
  "ve(3,3)",
  "Cross-Chain Native",
];
const DEX_SECONDARY_TAGS = [
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
];

interface SectorClassSpec {
  subKey: string;
  subTitle: string;
  subEnum: string[];
  secKey: string;
  secTitle: string;
  secEnum: string[];
}

/** Sector → the sector-specific classification keys + their vocabularies. */
const SECTOR_CLASSIFICATION: Record<string, SectorClassSpec> = {
  Staking: {
    subKey: "StakingSubSector",
    subTitle: "Staking sub-sector",
    subEnum: [...STAKING_PRIMARY_TAGS],
    secKey: "StakingSecondaryTags",
    secTitle: "Staking secondary tags",
    secEnum: STAKING_SECONDARY_TAGS,
  },
  Liquidity: {
    subKey: "LiquiditySubSector",
    subTitle: "Liquidity sub-sector",
    subEnum: [...LIQUIDITY_PRIMARY_TAGS],
    secKey: "LiquiditySecondaryTags",
    secTitle: "Liquidity secondary tags",
    secEnum: LIQUIDITY_SECONDARY_TAGS,
  },
  Derivatives: {
    subKey: "DerivativesSubSector",
    subTitle: "Derivatives sub-sector",
    subEnum: [...DERIVATIVES_PRIMARY_TAGS],
    secKey: "DerivativesSecondaryTags",
    secTitle: "Derivatives secondary tags",
    secEnum: DERIVATIVES_SECONDARY_TAGS,
  },
  Other: {
    subKey: "OtherSubSector",
    subTitle: "Other sub-sector",
    subEnum: [...OTHER_PRIMARY_TAGS],
    secKey: "OtherSecondaryTags",
    secTitle: "Other secondary tags",
    secEnum: OTHER_SECONDARY_TAGS,
  },
  RWA: {
    subKey: "RwaSubSector",
    subTitle: "RWA sub-sector",
    subEnum: RWA_SUB_SECTORS,
    secKey: "RwaSecondaryTags",
    secTitle: "RWA secondary tags",
    secEnum: [...RWA_SECONDARY_TAGS],
  },
  Stablecoin: {
    subKey: "StablecoinSubSector",
    subTitle: "Stablecoin sub-sector",
    subEnum: STABLECOIN_SUB_SECTORS,
    secKey: "StablecoinSecondaryTags",
    secTitle: "Stablecoin secondary tags",
    secEnum: STABLECOIN_SECONDARY_TAGS,
  },
  DEX: {
    subKey: "DexSubSector",
    subTitle: "DEX sub-sector",
    subEnum: DEX_SUB_SECTORS,
    secKey: "DexSecondaryTags",
    secTitle: "DEX secondary tags",
    secEnum: DEX_SECONDARY_TAGS,
  },
};

/* -------------------------------------------------------------------------- */
/* Section model. Each section maps curated store fields <-> an rjsf form.      */
/* toFormData/fromFormData let a section reshape data (e.g. the risks section   */
/* normalizes two legacy shapes into one edit model and writes back the right   */
/* key), while plain sections just pick their keys through unchanged.           */
/* -------------------------------------------------------------------------- */

interface FormSection {
  id: string;
  title: string;
  schema: RJSFSchema;
  uiSchema: UiSchema;
  /** Curated store fields → the form's data model. */
  toFormData: (fields: Record<string, unknown>) => Record<string, unknown>;
  /** The form's data model → a curated patch to POST. */
  fromFormData: (formData: Record<string, unknown>) => Record<string, unknown>;
}

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/** A plain section: pick `keys` on load, send the same `keys` back on save. */
function plainSection(
  id: string,
  title: string,
  keys: string[],
  schema: RJSFSchema,
  uiSchema: UiSchema = {},
): FormSection {
  return {
    id,
    title,
    schema,
    uiSchema,
    toFormData: (fields) => pick(fields, keys),
    fromFormData: (formData) => pick(formData, keys),
  };
}

/* --------- Risks normalizer (generic across legacy + typed shapes) --------- */

interface RiskEditItem {
  category?: string;
  severity?: string;
  description?: string;
}

/**
 * Collapse whatever risk shape a network stores (legacy `Risks` as string[] or
 * object[], or `TypedRisks`) into one editable object array, and record which
 * key it came from so we write back to the SAME key on save — never silently
 * migrating a legacy record into TypedRisks. Prefers TypedRisks when it has
 * content; new networks (neither present) default to the typed model.
 */
function normalizeRisks(fields: Record<string, unknown>): {
  items: RiskEditItem[];
  sourceKey: "TypedRisks" | "Risks";
} {
  const typed = fields.TypedRisks;
  const legacy = fields.Risks;
  if (Array.isArray(typed) && typed.length > 0) {
    return {
      items: typed.map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return {
          category: typeof o.category === "string" ? o.category : "Systemic",
          severity: typeof o.severity === "string" ? o.severity : undefined,
          description: typeof o.description === "string" ? o.description : "",
        };
      }),
      sourceKey: "TypedRisks",
    };
  }
  if (Array.isArray(legacy)) {
    return {
      items: legacy.map((r) => {
        if (typeof r === "string") return { category: "Systemic", description: r };
        const o = (r ?? {}) as Record<string, unknown>;
        return {
          category: typeof o.category === "string" ? o.category : "Systemic",
          severity: typeof o.severity === "string" ? o.severity : undefined,
          description: typeof o.description === "string" ? o.description : "",
        };
      }),
      sourceKey: "Risks",
    };
  }
  return { items: [], sourceKey: "TypedRisks" };
}

function buildRisksSection(fields: Record<string, unknown>): FormSection {
  const { sourceKey } = normalizeRisks(fields);
  const schema: RJSFSchema = {
    type: "object",
    properties: {
      risks: {
        type: "array",
        title: "Risks",
        items: {
          type: "object",
          required: ["category", "description"],
          properties: {
            category: { type: "string", title: "Category", examples: RISK_CATEGORIES },
            severity: { type: "string", title: "Severity (optional)", enum: ["low", "medium", "high"] },
            description: { type: "string", title: "Description" },
          },
        },
      },
    },
  };
  return {
    id: "risks",
    title: sourceKey === "TypedRisks" ? "Risks (typed)" : "Risks (legacy)",
    schema,
    uiSchema: { risks: { items: { description: { "ui:widget": "textarea" } } } },
    toFormData: (f) => ({ risks: normalizeRisks(f).items }),
    // Write back to the ORIGINATING key so we never migrate legacy → typed
    // silently (that would drop the severity-less legacy shape). Promotion to
    // TypedRisks, if wanted, should be an explicit, logged pass — not here.
    fromFormData: (formData) => {
      const items = Array.isArray(formData.risks) ? (formData.risks as RiskEditItem[]) : [];
      if (sourceKey === "TypedRisks") {
        return {
          TypedRisks: items.map((it) => ({
            category: it.category || "Systemic",
            severity: it.severity || "medium",
            description: it.description || "",
          })),
        };
      }
      return {
        Risks: items.map((it) => ({
          category: it.category || "Systemic",
          description: it.description || "",
        })),
      };
    },
  };
}

/* --------- Classification section (base keys + sector-specific) ------------ */

function buildClassificationSection(fields: Record<string, unknown>): FormSection {
  const sector = typeof fields.Sector === "string" ? fields.Sector : null;
  const spec = sector ? SECTOR_CLASSIFICATION[sector] : null;

  const properties: Record<string, RJSFSchema> = {
    Sector: { type: "string", title: "Primary sector", enum: NETWORK_SECTORS },
    SecondarySectors: {
      type: "array",
      title: "Secondary sectors",
      uniqueItems: true,
      items: { type: "string", enum: NETWORK_SECTORS },
    },
    SubSector: { type: "string", title: "Sub-sector (generic)" },
    Tags: { type: "array", title: "Tags", items: { type: "string", examples: TAG_SUGGESTIONS } },
  };
  const keys = ["Sector", "SecondarySectors", "SubSector", "Tags"];

  if (spec) {
    properties[spec.subKey] = { type: "string", title: spec.subTitle, enum: spec.subEnum };
    properties[spec.secKey] = {
      type: "array",
      title: spec.secTitle,
      uniqueItems: true,
      items: { type: "string", enum: spec.secEnum },
    };
    keys.push(spec.subKey, spec.secKey);
  }

  return {
    id: "classification",
    title: "Sectors & tags",
    schema: { type: "object", properties },
    uiSchema: {
      SecondarySectors: { "ui:widget": "checkboxes" },
      ...(spec ? { [spec.secKey]: { "ui:widget": "checkboxes" } } : {}),
    },
    toFormData: (f) => pick(f, keys),
    fromFormData: (formData) => pick(formData, keys),
  };
}

/* --------- Static section schemas (research groups + relationships) -------- */

const BASICS_SECTION = plainSection(
  "basics",
  "Basics",
  ["Tagline", "Description", "LongDescription", "Differentiator", "Website", "Twitter", "Discord", "GitHub", "OfficialDocs"],
  {
    type: "object",
    properties: {
      Tagline: { type: "string", title: "Tagline" },
      Description: { type: "string", title: "Description" },
      LongDescription: { type: "string", title: "Long description" },
      Differentiator: { type: "string", title: "Differentiator" },
      Website: { type: "string", title: "Website" },
      Twitter: { type: "string", title: "Twitter" },
      Discord: { type: "string", title: "Discord" },
      GitHub: { type: "string", title: "GitHub" },
      OfficialDocs: { type: "string", title: "Official docs" },
    },
  },
  {
    Description: { "ui:widget": "textarea" },
    LongDescription: { "ui:widget": "textarea", "ui:options": { rows: 6 } },
    Differentiator: { "ui:widget": "textarea" },
  },
);

const COMPETITORS_SECTION = plainSection(
  "competitors",
  "Competitors",
  ["Competitors"],
  {
    type: "object",
    properties: {
      Competitors: {
        type: "array",
        title: "Competitors",
        items: {
          type: "object",
          required: ["name", "rank"],
          properties: {
            name: { type: "string", title: "Name" },
            slug: { type: "string", title: "On-platform link (optional)" },
            rank: { type: "integer", title: "Rank", minimum: 1, default: 1 },
            positioning: { type: "string", title: "Positioning" },
            similarities: { type: "string", title: "Similarities" },
            differences: { type: "string", title: "Differences" },
          },
        },
      },
    },
  },
  {
    Competitors: {
      items: {
        slug: { "ui:widget": "OrgPicker" },
        positioning: { "ui:widget": "textarea" },
        similarities: { "ui:widget": "textarea" },
        differences: { "ui:widget": "textarea" },
      },
    },
  },
);

const PARTNERSHIPS_SECTION = plainSection(
  "partnerships",
  "Partnerships",
  ["Partnerships"],
  {
    type: "object",
    properties: {
      Partnerships: {
        type: "array",
        title: "Partnerships",
        items: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", title: "Name" },
            date: { type: "string", title: "Date" },
            amountLabel: { type: "string", title: "Amount label" },
            description: { type: "string", title: "Description" },
            slug: { type: "string", title: "On-platform link (optional)" },
          },
        },
      },
    },
  },
  {
    Partnerships: {
      items: {
        slug: { "ui:widget": "OrgPicker" },
        description: { "ui:widget": "textarea" },
      },
    },
  },
);

const FAQ_SECTION = plainSection(
  "faq",
  "FAQ",
  ["Faq"],
  {
    type: "object",
    properties: {
      Faq: {
        type: "array",
        title: "FAQ",
        items: {
          type: "object",
          required: ["question", "answer"],
          properties: {
            question: { type: "string", title: "Question" },
            answer: { type: "string", title: "Answer" },
            pinned: { type: "boolean", title: "Pinned" },
          },
        },
      },
    },
  },
  { Faq: { items: { answer: { "ui:widget": "textarea" } } } },
);

const ORG_STRUCTURE_SECTION = plainSection(
  "orgStructure",
  "Ownership / org structure",
  ["OrgStructure"],
  {
    type: "object",
    properties: {
      OrgStructure: {
        type: "array",
        title: "Org units",
        items: {
          type: "object",
          required: ["name", "role"],
          properties: {
            name: { type: "string", title: "Name" },
            role: { type: "string", title: "Role" },
            description: { type: "string", title: "Description" },
          },
        },
      },
    },
  },
  { OrgStructure: { items: { description: { "ui:widget": "textarea" } } } },
);

const TIMELINE_SECTION = plainSection(
  "timeline",
  "Timeline",
  ["Timeline"],
  {
    type: "object",
    properties: {
      Timeline: {
        type: "array",
        title: "Milestones",
        items: {
          type: "object",
          required: ["date", "title"],
          properties: {
            date: { type: "string", title: "Date" },
            title: { type: "string", title: "Title" },
            description: { type: "string", title: "Description" },
            link: { type: "string", title: "Source link (optional)" },
            status: {
              type: "string",
              title: "Status",
              enum: ["executed", "stated", "theoretical", "canhav-inferred"],
              default: "stated",
            },
          },
        },
      },
    },
  },
  { Timeline: { items: { description: { "ui:widget": "textarea" } } } },
);

const INVESTMENT_ROUNDS_SECTION = plainSection(
  "investmentRounds",
  "Investment rounds",
  ["InvestmentRounds"],
  {
    type: "object",
    properties: {
      InvestmentRounds: {
        type: "array",
        title: "Rounds",
        items: {
          type: "object",
          required: ["round"],
          properties: {
            date: { type: "string", title: "Date" },
            round: { type: "string", title: "Round" },
            amountUsd: { type: "number", title: "Amount (USD)" },
            amountLabel: { type: "string", title: "Amount label" },
            investors: { type: "array", title: "Investors", items: { type: "string" } },
            link: { type: "string", title: "Link" },
          },
        },
      },
    },
  },
);

const TRADFI_SECTION = plainSection(
  "tradFiComparison",
  "TradFi comparison",
  ["TradFiComparison"],
  {
    type: "object",
    properties: {
      TradFiComparison: {
        type: "array",
        title: "Comparisons",
        items: {
          type: "object",
          required: ["product"],
          properties: {
            product: { type: "string", title: "Product" },
            similarity: { type: "string", title: "Similarity" },
            differences: { type: "string", title: "Differences" },
          },
        },
      },
    },
  },
  {
    TradFiComparison: {
      items: {
        similarity: { "ui:widget": "textarea" },
        differences: { "ui:widget": "textarea" },
      },
    },
  },
);

const SOURCES_SECTION = plainSection(
  "sources",
  "Sources",
  ["Sources"],
  {
    type: "object",
    properties: {
      Sources: {
        type: "array",
        title: "Sources",
        items: {
          type: "object",
          required: ["label", "url"],
          properties: {
            label: { type: "string", title: "Label" },
            url: { type: "string", title: "URL" },
          },
        },
      },
    },
  },
);

const AUDITS_SECTION = plainSection(
  "audits",
  "Audits",
  ["Audits"],
  {
    type: "object",
    properties: {
      Audits: {
        type: "array",
        title: "Audits",
        items: {
          type: "object",
          required: ["firm"],
          properties: {
            firm: { type: "string", title: "Firm" },
            date: { type: "string", title: "Date" },
            url: { type: "string", title: "Report URL" },
          },
        },
      },
    },
  },
);

const TOKENOMICS_SECTION = plainSection(
  "tokenomics",
  "Tokenomics",
  ["Tokenomics"],
  {
    type: "object",
    properties: {
      Tokenomics: {
        type: "object",
        title: "Tokenomics",
        properties: {
          maxSupply: { type: "number", title: "Max supply" },
          totalBurned: { type: "number", title: "Total burned" },
          buybackPolicy: { type: "string", title: "Buyback policy" },
          emissionsPolicy: { type: "string", title: "Emissions policy" },
          distribution: {
            type: "array",
            title: "Distribution",
            items: {
              type: "object",
              required: ["bucket"],
              properties: {
                bucket: { type: "string", title: "Bucket" },
                pct: { type: "number", title: "Percent" },
              },
            },
          },
          notes: { type: "array", title: "Notes", items: { type: "string" } },
        },
      },
    },
  },
  {
    Tokenomics: {
      buybackPolicy: { "ui:widget": "textarea" },
      emissionsPolicy: { "ui:widget": "textarea" },
    },
  },
);

const OFFCHAIN_FACTS_SECTION = plainSection(
  "offchainFacts",
  "Off-chain facts",
  ["OffchainFacts"],
  {
    type: "object",
    properties: {
      OffchainFacts: {
        type: "array",
        title: "Facts",
        items: {
          type: "object",
          required: ["key", "value"],
          properties: {
            key: { type: "string", title: "Key" },
            value: { type: "string", title: "Value" },
            freshness: {
              type: "string",
              title: "Freshness",
              enum: ["live", "semi-live", "static"],
              default: "static",
            },
            source: {
              type: "object",
              title: "Source",
              properties: {
                label: { type: "string", title: "Label" },
                url: { type: "string", title: "URL" },
              },
            },
            capturedAt: { type: "string", title: "Captured at (ISO date)" },
            theoretical: { type: "boolean", title: "Theoretical / forward-looking" },
          },
        },
      },
    },
  },
  { OffchainFacts: { items: { value: { "ui:widget": "textarea" } } } },
);

/** All curated keys the structured editor knows — for the advanced raw-JSON panel. */
const ALL_EDITOR_KEYS = [
  "Tagline", "Description", "LongDescription", "Differentiator",
  "Website", "Twitter", "Discord", "GitHub", "OfficialDocs",
  "Sector", "SecondarySectors", "SubSector", "Tags",
  "StakingSubSector", "StakingSecondaryTags", "LiquiditySubSector", "LiquiditySecondaryTags",
  "DerivativesSubSector", "DerivativesSecondaryTags", "OtherSubSector", "OtherSecondaryTags",
  "RwaSubSector", "RwaSecondaryTags", "StablecoinSubSector", "StablecoinSecondaryTags",
  "DexSubSector", "DexSecondaryTags",
  "TypedRisks", "Risks",
  "Competitors", "Partnerships",
  "Faq", "OrgStructure", "Timeline", "InvestmentRounds", "TradFiComparison",
  "Sources", "Audits", "Tokenomics", "OffchainFacts",
];

/** Build the ordered section list for a network's loaded curated fields. */
function buildSections(fields: Record<string, unknown>): FormSection[] {
  return [
    BASICS_SECTION,
    buildClassificationSection(fields),
    buildRisksSection(fields),
    COMPETITORS_SECTION,
    PARTNERSHIPS_SECTION,
    FAQ_SECTION,
    ORG_STRUCTURE_SECTION,
    TIMELINE_SECTION,
    INVESTMENT_ROUNDS_SECTION,
    TRADFI_SECTION,
    SOURCES_SECTION,
    AUDITS_SECTION,
    TOKENOMICS_SECTION,
    OFFCHAIN_FACTS_SECTION,
  ];
}

interface SaveResult {
  ok: boolean;
  applied?: string[];
  rejected?: string[];
  error?: string;
}

/* -------------------------------------------------------------------------- */
/* Editor                                                                       */
/* -------------------------------------------------------------------------- */

export function AdminContentEditor({
  slug,
  name,
  orgOptions,
  onDirtyChange,
}: {
  slug: string;
  name: string;
  orgOptions: OrgOption[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [fields, setFields] = useState<Record<string, unknown> | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    setFields(null);
    setError(null);
    setDirtySections({});
    fetch(`/api/admin/content?slug=${encodeURIComponent(slug)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return setError(data.error ?? "Failed to load.");
        setFields(data.fields ?? {});
        setUpdatedAt(data.updatedAt ?? null);
      })
      .catch((e) => setError(String(e)));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const anyDirty = useMemo(() => Object.values(dirtySections).some(Boolean), [dirtySections]);
  useEffect(() => {
    onDirtyChange?.(anyDirty);
  }, [anyDirty, onDirtyChange]);

  // Warn before leaving/reloading the tab with unsaved section edits.
  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  const setSectionDirty = useCallback((id: string, dirty: boolean) => {
    setDirtySections((prev) => (prev[id] === dirty ? prev : { ...prev, [id]: dirty }));
  }, []);

  const save = useCallback(
    async (patch: Record<string, unknown>): Promise<SaveResult> => {
      try {
        const res = await fetch("/api/admin/content", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, patch }),
        });
        const data = await res.json();
        if (!data.ok) return { ok: false, error: data.error ?? "Save failed.", rejected: data.rejected };
        setUpdatedAt(data.updatedAt ?? null);
        setFields((prev) => ({ ...(prev ?? {}), ...patch }));
        return { ok: true, applied: data.applied, rejected: data.rejected };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
    [slug],
  );

  const sections = useMemo(() => (fields ? buildSections(fields) : []), [fields]);

  if (error && !fields) return <p className="text-sm text-rose-400">{error}</p>;
  if (!fields) return <p className="text-sm text-ink-300">Loading editor…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-300">
          Editing <span className="font-medium text-ink-50">{name}</span>
          {" · "}
          <a
            href={`/networks/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-electric-400 hover:underline"
          >
            view public page ↗
          </a>
        </p>
        <span className="text-xs text-ink-500">
          {anyDirty ? "Unsaved changes" : updatedAt ? `Updated ${updatedAt}` : "Never updated"}
        </span>
      </div>

      <p className="rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2 text-xs text-ink-300">
        Only curated fields are editable here. API-managed fields (TVL, market cap, fees, volume,
        sector metrics) are written by the data pipeline — see the Data diagnostics tab.
      </p>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {sections.map((section) => (
        <SectionForm
          key={`${slug}:${section.id}`}
          section={section}
          fields={fields}
          orgOptions={orgOptions}
          onSave={save}
          onDirtyChange={(d) => setSectionDirty(section.id, d)}
          hint={
            section.id === "classification"
              ? "Sector/tag changes re-evaluate metric tabs on the next cron refresh."
              : undefined
          }
        />
      ))}

      <AdvancedJsonSection
        keys={ALL_EDITOR_KEYS}
        initial={pick(fields, ALL_EDITOR_KEYS)}
        onSave={save}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-section form with dirty tracking, save + reset.                          */
/* -------------------------------------------------------------------------- */

function SectionForm({
  section,
  fields,
  orgOptions,
  onSave,
  onDirtyChange,
  hint,
}: {
  section: FormSection;
  fields: Record<string, unknown>;
  orgOptions: OrgOption[];
  onSave: (patch: Record<string, unknown>) => Promise<SaveResult>;
  onDirtyChange: (dirty: boolean) => void;
  hint?: string;
}) {
  const initial = useMemo(() => section.toFormData(fields), [section, fields]);
  const [data, setData] = useState<Record<string, unknown>>(initial);
  // Clean baseline for dirty-tracking. rjsf mutates formData on mount (injects
  // schema defaults like Timeline.status / OffchainFacts.freshness), which would
  // otherwise read as "unsaved" and spuriously trip the navigation guard. rjsf
  // passes a field `id` on real user edits but `undefined` for its own
  // normalization — so we adopt those normalized values as the baseline instead.
  const [baseline, setBaseline] = useState<Record<string, unknown>>(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-seed when the network (or the section's derived shape) changes.
  useEffect(() => {
    setData(initial);
    setBaseline(initial);
    setNotice(null);
    setErr(null);
  }, [initial]);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(baseline), [data, baseline]);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const formContext = useMemo(() => ({ orgOptions }), [orgOptions]);

  // Dangling / self-referential on-platform link warnings (competitors + partnerships).
  const linkWarnings = useMemo(
    () => collectLinkWarnings(section.id, data, orgOptions),
    [section.id, data, orgOptions],
  );

  async function handleSubmit() {
    setSaving(true);
    setNotice(null);
    setErr(null);
    const patch = section.fromFormData(data);
    const result = await onSave(patch);
    setSaving(false);
    if (!result.ok) {
      setErr(
        result.error +
          (result.rejected?.length ? ` (rejected: ${result.rejected.join(", ")})` : ""),
      );
      return;
    }
    const rejected = result.rejected?.length ? ` — rejected ${result.rejected.join(", ")}` : "";
    setNotice(`Saved${rejected}.${hint ? " " + hint : ""}`);
  }

  return (
    <section className="rounded-md border border-ink-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-50">{section.title}</h2>
        {dirty && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            Unsaved
          </span>
        )}
      </div>

      {linkWarnings.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          {linkWarnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}

      <AdminForm
        schema={section.schema}
        uiSchema={section.uiSchema}
        formData={data}
        validator={validator}
        widgets={{ OrgPicker }}
        formContext={formContext}
        onChange={(e, id) => {
          const fd = (e.formData ?? {}) as Record<string, unknown>;
          setData(fd);
          // `id === undefined` ⇒ rjsf's own normalization, not a user edit → keep clean.
          if (id === undefined) setBaseline(fd);
        }}
        onSubmit={handleSubmit}
      >
        <div className="mt-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={!dirty || saving}
            className="rounded-md bg-electric-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-electric-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save ${section.title}`}
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => setData(baseline)}
            className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:text-ink-50 disabled:opacity-40"
          >
            Reset
          </button>
          {notice && <span className="text-sm text-emerald-400">{notice}</span>}
          {err && <span className="text-sm text-rose-400">{err}</span>}
        </div>
      </AdminForm>
    </section>
  );
}

/** Flag on-platform competitor/partnership links that don't resolve to a profile. */
function collectLinkWarnings(
  sectionId: string,
  data: Record<string, unknown>,
  orgOptions: OrgOption[],
): string[] {
  const key = sectionId === "competitors" ? "Competitors" : sectionId === "partnerships" ? "Partnerships" : null;
  if (!key) return [];
  const rows = data[key];
  if (!Array.isArray(rows)) return [];
  const known = new Set(orgOptions.map((o) => o.slug));
  const warnings: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const slug = (row as Record<string, unknown>).slug;
    const name = (row as Record<string, unknown>).name;
    if (typeof slug === "string" && slug && !known.has(slug)) {
      warnings.push(`"${String(name ?? "?")}" links to "${slug}", which isn't a tracked profile.`);
    }
  }
  return warnings;
}

/* -------------------------------------------------------------------------- */
/* Advanced raw-JSON escape hatch (Monaco) — safety valve for shape drift.      */
/* -------------------------------------------------------------------------- */

function AdvancedJsonSection({
  keys,
  initial,
  onSave,
}: {
  keys: string[];
  initial: Record<string, unknown>;
  onSave: (patch: Record<string, unknown>) => Promise<SaveResult>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => JSON.stringify(initial, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(initial, null, 2));
  }, [initial]);

  async function handleSave() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setJsonError(`Invalid JSON: ${String(e)}`);
      return;
    }
    const patch: Record<string, unknown> = {};
    for (const k of keys) if (k in parsed) patch[k] = parsed[k];
    setJsonError(null);
    const result = await onSave(patch);
    setNotice(result.ok ? "Saved raw JSON." : result.error ?? "Save failed.");
  }

  return (
    <section className="rounded-md border border-ink-800 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold text-ink-50">Advanced (raw JSON)</h2>
        <span className="text-xs text-ink-500">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <p className="mb-3 text-xs text-ink-500">
            Escape hatch for shape drift / fields not yet modeled above. Only curated keys are
            written; anything else is ignored server-side.
          </p>
          <div className="overflow-hidden rounded-md border border-ink-800">
            <MonacoEditor
              height="360px"
              defaultLanguage="json"
              theme="vs-dark"
              value={text}
              onChange={(v) => setText(v ?? "")}
              options={{ minimap: { enabled: false }, fontSize: 12 }}
            />
          </div>
          {jsonError && <p className="mt-2 text-sm text-rose-400">{jsonError}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="rounded-md bg-electric-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-electric-500"
            >
              Save raw JSON
            </button>
            {notice && <span className="text-sm text-emerald-400">{notice}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
