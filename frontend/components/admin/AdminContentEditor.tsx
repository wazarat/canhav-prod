"use client";

import Form from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { OrgOption } from "@/components/admin/AdminPanel";
import { OrgPicker } from "@/components/admin/OrgPicker";
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

const RESEARCH_KEYS = [
  "Faq",
  "Timeline",
  "Tokenomics",
  "OrgStructure",
  "InvestmentRounds",
  "TradFiComparison",
  "Sources",
  "OffchainFacts",
  "Audits",
];

interface FormSection {
  id: string;
  title: string;
  keys: string[];
  schema: RJSFSchema;
  uiSchema: UiSchema;
}

const SECTIONS: FormSection[] = [
  {
    id: "basics",
    title: "Basics",
    keys: ["Tagline", "Description", "LongDescription", "Differentiator", "Website", "Twitter", "Discord", "GitHub", "OfficialDocs"],
    schema: {
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
    uiSchema: {
      Description: { "ui:widget": "textarea" },
      LongDescription: { "ui:widget": "textarea", "ui:options": { rows: 6 } },
      Differentiator: { "ui:widget": "textarea" },
    },
  },
  {
    id: "classification",
    title: "Sectors & tags",
    keys: ["Sector", "SecondarySectors", "SubSector", "Tags"],
    schema: {
      type: "object",
      properties: {
        Sector: { type: "string", title: "Primary sector", enum: NETWORK_SECTORS },
        SecondarySectors: {
          type: "array",
          title: "Secondary sectors",
          uniqueItems: true,
          items: { type: "string", enum: NETWORK_SECTORS },
        },
        SubSector: { type: "string", title: "Sub-sector" },
        Tags: {
          type: "array",
          title: "Tags",
          items: { type: "string", examples: TAG_SUGGESTIONS },
        },
      },
    },
    uiSchema: {},
  },
  {
    id: "risks",
    title: "Risks",
    keys: ["TypedRisks", "Risks"],
    schema: {
      type: "object",
      properties: {
        TypedRisks: {
          type: "array",
          title: "Typed risks",
          items: {
            type: "object",
            required: ["category", "severity", "description"],
            properties: {
              category: { type: "string", title: "Category" },
              severity: { type: "string", title: "Severity", enum: ["low", "medium", "high"] },
              description: { type: "string", title: "Description" },
            },
          },
        },
        Risks: {
          type: "array",
          title: "Risks (legacy free-text)",
          items: { type: "string" },
        },
      },
    },
    uiSchema: {
      TypedRisks: { items: { description: { "ui:widget": "textarea" } } },
    },
  },
  {
    id: "competitors",
    title: "Competitors",
    keys: ["Competitors"],
    schema: {
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
              rank: { type: "integer", title: "Rank", minimum: 1 },
              positioning: { type: "string", title: "Positioning" },
              similarities: { type: "string", title: "Similarities" },
              differences: { type: "string", title: "Differences" },
            },
          },
        },
      },
    },
    uiSchema: {
      Competitors: {
        items: {
          slug: { "ui:widget": "OrgPicker" },
          positioning: { "ui:widget": "textarea" },
          similarities: { "ui:widget": "textarea" },
          differences: { "ui:widget": "textarea" },
        },
      },
    },
  },
  {
    id: "partnerships",
    title: "Partnerships",
    keys: ["Partnerships"],
    schema: {
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
    uiSchema: {
      Partnerships: {
        items: {
          slug: { "ui:widget": "OrgPicker" },
          description: { "ui:widget": "textarea" },
        },
      },
    },
  },
];

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export function AdminContentEditor({
  slug,
  name,
  orgOptions,
}: {
  slug: string;
  name: string;
  orgOptions: OrgOption[];
}) {
  const [fields, setFields] = useState<Record<string, unknown> | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setFields(null);
    setError(null);
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

  const save = useCallback(
    async (patch: Record<string, unknown>, hint?: string) => {
      setNotice(null);
      setError(null);
      const res = await fetch("/api/admin/content", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, patch }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      setUpdatedAt(data.updatedAt ?? null);
      setNotice(`Saved ${data.applied?.join(", ") ?? ""}.${hint ? " " + hint : ""}`);
      setFields((prev) => ({ ...(prev ?? {}), ...patch }));
    },
    [slug],
  );

  const formContext = useMemo(() => ({ orgOptions }), [orgOptions]);

  if (error && !fields) return <p className="text-sm text-rose-400">{error}</p>;
  if (!fields) return <p className="text-sm text-ink-400">Loading editor…</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-300">
          Editing <span className="font-medium text-ink-100">{name}</span>
        </p>
        <span className="text-xs text-ink-500">
          {updatedAt ? `Updated ${updatedAt}` : "Never updated"}
        </span>
      </div>

      <p className="rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2 text-xs text-ink-400">
        Only curated fields are editable here. API-managed fields (TVL, market cap, fees, volume,
        sector metrics) are written by the data pipeline — see the Data diagnostics tab.
      </p>

      {notice && <p className="text-sm text-emerald-400">{notice}</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}

      {SECTIONS.map((section) => (
        <section key={section.id} className="rounded-md border border-ink-800 p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-100">{section.title}</h2>
          <Form
            schema={section.schema}
            uiSchema={section.uiSchema}
            formData={pick(fields, section.keys)}
            validator={validator}
            widgets={{ OrgPicker }}
            formContext={formContext}
            onSubmit={({ formData }) =>
              save(
                formData ?? {},
                section.id === "classification"
                  ? "Sector/tag changes re-evaluate metric tabs on the next cron refresh."
                  : undefined,
              )
            }
          >
            <button
              type="submit"
              className="mt-2 rounded-md bg-electric-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-electric-500"
            >
              Save {section.title}
            </button>
          </Form>
        </section>
      ))}

      <ResearchJsonSection
        keys={RESEARCH_KEYS}
        initial={pick(fields, RESEARCH_KEYS)}
        onSave={(patch) => save(patch)}
      />
    </div>
  );
}

/** Raw-JSON escape hatch (Monaco) for the deeply-nested research field groups. */
function ResearchJsonSection({
  keys,
  initial,
  onSave,
}: {
  keys: string[];
  initial: Record<string, unknown>;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(initial, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(initial, null, 2));
  }, [initial]);

  function handleSave() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setJsonError(`Invalid JSON: ${String(e)}`);
      return;
    }
    // Only forward known research keys.
    const patch: Record<string, unknown> = {};
    for (const k of keys) if (k in parsed) patch[k] = parsed[k];
    setJsonError(null);
    onSave(patch);
  }

  return (
    <section className="rounded-md border border-ink-800 p-4">
      <h2 className="mb-1 text-sm font-semibold text-ink-100">Research (raw JSON)</h2>
      <p className="mb-3 text-xs text-ink-500">
        {keys.join(", ")} — schema-validated on save (must be valid JSON).
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
      <button
        onClick={handleSave}
        className="mt-3 rounded-md bg-electric-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-electric-500"
      >
        Save research JSON
      </button>
    </section>
  );
}
