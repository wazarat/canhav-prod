"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import type { PickerNetwork } from "@/components/admin/AdminPanel";

/* -------------------------------------------------------------------------- */
/* Vocabulary (mirrors lib/types.ts unions + the compiled coin sheet)          */
/* -------------------------------------------------------------------------- */

const SECTORS = [
  "Credit", "Staking", "Liquidity", "Derivatives", "RWA", "Other", "Stablecoin", "DEX", "Yield",
];

const COIN_TYPE_LABEL: Record<string, string> = {
  Governance: "Governance Token",
  GovernanceUtility: "Governance & Utility Token",
  NativeStablecoin: "Native Stablecoin",
  SyntheticDollar: "Synthetic Dollar",
  LockedEscrow: "Locked / Vote-Escrow Token",
  NoToken: "No Token",
};
const TOKEN_COIN_TYPES = ["Governance", "GovernanceUtility", "LockedEscrow", "NoToken"];
const STABLE_COIN_TYPES = ["NativeStablecoin", "SyntheticDollar"];

const RECEIPT_TYPE_LABEL: Record<string, string> = {
  LiquidStaking: "Liquid Staking Token (LST)",
  LiquidRestaking: "Liquid Restaking Token (LRT)",
  LendingReceipt: "Lending Receipt Token",
  YieldVault: "Yield-Bearing Vault Token",
  StakedStablecoin: "Staked Stablecoin",
  FixedIncomeTranche: "Fixed-Income / Tranche Token",
  TokenizedRWA: "Tokenized RWA Token",
  LockedEscrowReceipt: "Locked / Vote-Escrow Receipt",
};
const RECEIPT_TYPES = Object.keys(RECEIPT_TYPE_LABEL);

const BASE_ASSET_SUGGESTIONS = ["ETH", "BTC", "SOL", "USDC", "USDT", "DAI", "USDe", "USDS"];

type FieldType = "text" | "number" | "textarea";
interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
}

/** Curated Tier-2 scaffolds expected for a given coin/receipt type (§A1.3/§A1.4). */
function curatedFieldsFor(kind: "coin" | "receipt", type: string | null): FieldDef[] {
  if (kind === "coin") {
    if (type === "NativeStablecoin") return [{ key: "Backing", label: "Backing / collateralization", type: "textarea" }];
    if (type === "SyntheticDollar")
      return [
        { key: "Backing", label: "Backing / collateralization", type: "textarea" },
        { key: "BackingApy", label: "Backing / funding APY (%)", type: "number" },
      ];
    if (type === "LockedEscrow") return [{ key: "LockDuration", label: "Lock duration", type: "text" }];
    return [];
  }
  switch (type) {
    case "LiquidRestaking":
      return [{ key: "AvsCount", label: "AVS count", type: "number" }];
    case "YieldVault":
      return [
        { key: "NavPerShare", label: "NAV per share", type: "number" },
        { key: "UnderlyingAssets", label: "Underlying assets", type: "text" },
      ];
    case "StakedStablecoin":
      return [{ key: "UnderlyingYield", label: "Underlying yield (%)", type: "number" }];
    case "FixedIncomeTranche":
      return [
        { key: "MaturityDate", label: "Maturity date (ISO)", type: "text" },
        { key: "TrancheSize", label: "Tranche size", type: "text" },
      ];
    case "TokenizedRWA":
      return [
        { key: "NavUsd", label: "NAV (USD)", type: "number" },
        { key: "UnderlyingYield", label: "Underlying yield (%)", type: "number" },
        { key: "AssetClass", label: "Asset class", type: "text" },
        { key: "Custodian", label: "Custodian", type: "text" },
        { key: "Regulatory", label: "Regulatory wrapper", type: "text" },
      ];
    case "LockedEscrowReceipt":
      return [{ key: "LockDuration", label: "Lock duration", type: "text" }];
    default:
      return [];
  }
}

const RECEIPT_REQUIRES_BASE = new Set(["LiquidStaking", "LiquidRestaking", "StakedStablecoin"]);
const NUMBER_KEYS = new Set(["BackingApy", "AvsCount", "NavPerShare", "UnderlyingYield", "NavUsd"]);

interface Loaded {
  fields: Record<string, unknown>;
  coinType: string | null;
  receiptType: string | null;
  updatedAt: string | null;
}

interface VerifyResult {
  name: string | null;
  symbol: string | null;
  image: string | null;
  currentPrice: number | null;
}

/* -------------------------------------------------------------------------- */
/* Editor                                                                       */
/* -------------------------------------------------------------------------- */

export function AdminCoinEditor({
  slug,
  name,
  category,
  kind,
  networks,
  onDirtyChange,
}: {
  slug: string;
  name: string;
  category: string; // store category: Token | Stablecoin | RWA | Receipt
  kind: "coin" | "receipt";
  networks: PickerNetwork[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [baseline, setBaseline] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoaded(null);
    setError(null);
    fetch(`/api/admin/content?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return setError(data.error ?? "Failed to load.");
        const fields = (data.fields ?? {}) as Record<string, unknown>;
        setLoaded({
          fields,
          coinType: data.coinType ?? null,
          receiptType: data.receiptType ?? null,
          updatedAt: data.updatedAt ?? null,
        });
        setDraft({ ...fields });
        setBaseline({ ...fields });
      })
      .catch((e) => setError(String(e)));
  }, [slug, category]);

  useEffect(() => load(), [load]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const type = kind === "coin" ? (loaded?.coinType ?? null) : (loaded?.receiptType ?? null);

  const setField = useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const savePatch = useCallback(
    async (keys: string[]): Promise<boolean> => {
      setError(null);
      setNotice(null);
      const patch: Record<string, unknown> = {};
      for (const k of keys) patch[k] = draft[k] ?? null;
      try {
        const res = await fetch("/api/admin/content", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, category, patch }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError((data.error ?? "Save failed.") + (data.rejected?.length ? ` (rejected: ${data.rejected.join(", ")})` : ""));
          return false;
        }
        setBaseline((prev) => ({ ...prev, ...patch }));
        setLoaded((prev) => (prev ? { ...prev, updatedAt: data.updatedAt ?? prev.updatedAt } : prev));
        const rej = data.rejected?.length ? ` — rejected ${data.rejected.join(", ")}` : "";
        setNotice(`Saved ${data.applied?.join(", ") ?? ""}${rej}.`);
        return true;
      } catch (e) {
        setError(String(e));
        return false;
      }
    },
    [draft, slug, category],
  );

  if (error && !loaded) return <p className="text-sm text-rose-400">{error}</p>;
  if (!loaded) return <p className="text-sm text-ink-300">Loading editor…</p>;

  const curated = curatedFieldsFor(kind, type);
  const isNoToken = kind === "coin" && (type === "NoToken" || draft.HasNativeToken === false);
  const typeOptions = kind === "coin" ? (category === "Stablecoin" ? STABLE_COIN_TYPES : TOKEN_COIN_TYPES) : RECEIPT_TYPES;
  const typeLabel = kind === "coin" ? COIN_TYPE_LABEL : RECEIPT_TYPE_LABEL;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-300">
          Editing <span className="font-medium text-ink-50">{name}</span>{" "}
          <span className="text-ink-500">· {category} · {slug}</span>
        </p>
        <span className="text-xs text-ink-500">
          {dirty ? "Unsaved changes" : loaded.updatedAt ? `Updated ${loaded.updatedAt}` : "Never updated"}
        </span>
      </div>

      <p className="rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2 text-xs text-ink-300">
        Editable = seeded or curated. Live market / peg / receipt metrics are written by the data
        pipeline (read-only) — see the Data diagnostics tab. Slug and category are locked (renames
        are done via seed scripts).
      </p>

      {(notice || error) && (
        <p className={`text-sm ${error ? "text-rose-400" : "text-emerald-400"}`}>{error ?? notice}</p>
      )}

      {/* 1. Identity & taxonomy */}
      <Section title="Identity & taxonomy" onSave={() => savePatch(["Name", "Symbol", "Sector", "Tag"])} dirty={dirty}>
        <TextInput label="Name" value={draft.Name} onChange={(v) => setField("Name", v)} />
        <TextInput label="Symbol" value={draft.Symbol} onChange={(v) => setField("Symbol", v)} />
        <SelectInput label="Sector" value={draft.Sector} options={SECTORS} onChange={(v) => setField("Sector", v)} />
        <TextInput label="Tag" value={draft.Tag} onChange={(v) => setField("Tag", v)} />
        <ReadOnly label="Slug (locked)" value={slug} />
      </Section>

      {/* 2. CoinGecko id (highest leverage) */}
      {!isNoToken && (
        <CoinGeckoSection
          value={typeof draft.CoingeckoId === "string" ? draft.CoingeckoId : ""}
          onChange={(v) => setField("CoingeckoId", v || null)}
          onSave={() => savePatch(["CoingeckoId"])}
          flagged={FLAGGED.has(slug) || FLAGGED_NAMES.some((n) => name.toLowerCase().includes(n))}
        />
      )}

      {/* 3. Type */}
      {!(kind === "coin" && category === "RWA") && (
        <Section title="Type" onSave={() => savePatch([kind === "coin" ? "CoinType" : "ReceiptType"])} dirty={dirty}>
          <SelectInput
            label={kind === "coin" ? "Coin type" : "Receipt type"}
            value={kind === "coin" ? draft.CoinType : draft.ReceiptType}
            options={typeOptions}
            labels={typeLabel}
            onChange={(v) => setField(kind === "coin" ? "CoinType" : "ReceiptType", v)}
          />
          <p className="text-xs text-ink-500">
            Enum only. Changing it reshapes the expected live/curated fields below. Switching a
            coin between stablecoin and non-stablecoin types is a re-key (do it in seed scripts).
          </p>
        </Section>
      )}

      {/* 4. Linkage editor */}
      <LinkageSection
        slug={slug}
        category={category}
        kind={kind}
        networks={networks}
        entitySlug={typeof draft.EntitySlug === "string" ? draft.EntitySlug : ""}
      />

      {/* 5. Type-conditional curated scaffolds */}
      {curated.length > 0 && (
        <Section title="Curated metrics (Tier 2)" onSave={() => savePatch(curated.map((f) => f.key))} dirty={dirty}>
          {curated.map((f) =>
            f.type === "number" ? (
              <NumberInput key={f.key} label={f.label} value={draft[f.key]} onChange={(v) => setField(f.key, v)} />
            ) : f.type === "textarea" ? (
              <TextArea key={f.key} label={f.label} value={draft[f.key]} onChange={(v) => setField(f.key, v)} />
            ) : (
              <TextInput key={f.key} label={f.label} value={draft[f.key]} onChange={(v) => setField(f.key, v)} />
            ),
          )}
        </Section>
      )}

      {/* 6. Receipt-family fields */}
      {kind === "receipt" && (
        <Section title="Receipt family" onSave={() => savePatch(["BaseAsset", "Members", "Notes"])} dirty={dirty}>
          <TextInput
            label={`Base asset${type && RECEIPT_REQUIRES_BASE.has(type) ? " (required)" : ""}`}
            value={draft.BaseAsset}
            onChange={(v) => setField("BaseAsset", v)}
            datalist={BASE_ASSET_SUGGESTIONS}
          />
          <TextArea
            label="Members (comma-separated)"
            value={membersToText(draft.Members)}
            onChange={(v) => setField("Members", textToMembers(v))}
          />
          <TextArea label="Notes" value={draft.Notes} onChange={(v) => setField("Notes", v)} />
        </Section>
      )}

      {/* 7. No-Token toggle (coins) */}
      {kind === "coin" && category !== "RWA" && (
        <Section title="Native token" onSave={() => savePatch(["HasNativeToken"])} dirty={dirty}>
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={draft.HasNativeToken !== false && type !== "NoToken"}
              onChange={(e) => setField("HasNativeToken", e.target.checked)}
            />
            Has a native token (uncheck for No-Token entities — suppresses market diagnostics)
          </label>
          {isNoToken && (
            <p className="text-xs text-ink-500">No native token — metrics roll up to the network.</p>
          )}
        </Section>
      )}

      {/* Notes for coins (RWA / non-receipt) */}
      {kind === "coin" && (
        <Section title="Notes" onSave={() => savePatch(["Notes"])} dirty={dirty}>
          <TextArea label="Notes" value={draft.Notes} onChange={(v) => setField("Notes", v)} />
        </Section>
      )}
    </div>
  );
}

// Verify-before-ingest list (README r13): Term Finance, Maple SYRUP, Renzo REZ, M0 "M".
const FLAGGED = new Set(["syrup", "rez", "term-finance", "m0"]);
const FLAGGED_NAMES = ["term finance", "syrup", "renzo", "m0"];

/* -------------------------------------------------------------------------- */
/* CoinGecko id section (with Verify)                                          */
/* -------------------------------------------------------------------------- */

function CoinGeckoSection({
  value,
  onChange,
  onSave,
  flagged,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => Promise<boolean>;
  flagged: boolean;
}) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  async function verify() {
    if (!value.trim()) return;
    setVerifying(true);
    setResult(null);
    setVerifyErr(null);
    try {
      const res = await fetch(`/api/admin/coingecko-verify?id=${encodeURIComponent(value.trim())}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) setVerifyErr(data.error ?? "Verify failed.");
      else setResult(data.coin as VerifyResult);
    } catch (e) {
      setVerifyErr(String(e));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section className="rounded-md border border-ink-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-50">CoinGecko id</h2>
        {flagged && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            Needs verification
          </span>
        )}
      </div>
      <p className="mb-2 text-xs text-ink-500">
        Curate one exact id (no fuzzy match). Verify to eyeball the token, then save — the next cron
        run populates the Market block.
      </p>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. aave"
          className="flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none focus:border-electric-500"
        />
        <button
          type="button"
          onClick={verify}
          disabled={verifying || !value.trim()}
          className="rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:text-ink-50 disabled:opacity-40"
        >
          {verifying ? "Verifying…" : "Verify"}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-electric-600 px-3 py-2 text-sm font-medium text-white hover:bg-electric-500"
        >
          Save id
        </button>
      </div>
      {verifyErr && <p className="mt-2 text-sm text-rose-400">{verifyErr}</p>}
      {result && (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2">
          {result.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.image} alt="" className="h-8 w-8 rounded-full" />
          ) : null}
          <div className="text-sm text-ink-200">
            <div className="font-medium text-ink-50">
              {result.name} {result.symbol ? <span className="text-ink-500">({result.symbol})</span> : null}
            </div>
            <div className="text-xs text-ink-400">
              {result.currentPrice != null ? `$${result.currentPrice}` : "no price"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Linkage section (EntitySlug + MemberCoins ops)                              */
/* -------------------------------------------------------------------------- */

function LinkageSection({
  slug,
  category,
  kind,
  networks,
  entitySlug,
}: {
  slug: string;
  category: string;
  kind: "coin" | "receipt";
  networks: PickerNetwork[];
  entitySlug: string;
}) {
  const [memberships, setMemberships] = useState<string[]>([]);
  const [entityLink, setEntityLink] = useState<string>(entitySlug);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const bucket = kind === "receipt" ? "receipts" : "coins";

  const loadMemberships = useCallback(() => {
    fetch(`/api/admin/diagnostics?category=${bucket}&slug=${encodeURIComponent(slug)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        const cov = data.items?.[0]?.coverage ?? [];
        const memberOf = cov.find((c: { field: string }) => c.field === "memberOf");
        const entity = cov.find((c: { field: string }) => c.field === "entityLink");
        setMemberships(
          memberOf?.value ? String(memberOf.value).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        );
        if (entity?.value) setEntityLink(String(entity.value));
      })
      .catch(() => {});
  }, [slug, bucket]);

  useEffect(() => loadMemberships(), [loadMemberships]);

  async function op(operation: "linkMemberCoin" | "unlinkMemberCoin", networkSlug: string, setEntity: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, category, op: operation, networkSlug, setEntity }),
      });
      const data = await res.json();
      if (!data.ok) setMsg(data.error ?? "Linkage op failed.");
      else {
        setMsg(operation === "linkMemberCoin" ? `Linked to ${networkSlug}.` : `Removed from ${networkSlug}.`);
        loadMemberships();
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  }

  const pickValid = networks.some((n) => n.slug === pick.trim());

  return (
    <section className="rounded-md border border-ink-800 p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink-50">Network linkage</h2>
      <p className="mb-2 text-xs text-ink-500">
        Primary link sets <code>EntitySlug</code> and adds this {kind} to the network&apos;s
        MemberCoins. Additional links add membership only (cross-tagged coins).
      </p>

      <div className="mb-3 text-sm text-ink-300">
        Canonical parent (EntitySlug):{" "}
        <span className="font-medium text-ink-100">{entityLink || "— none —"}</span>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-xs text-ink-400">Member of ({memberships.length}):</div>
        <div className="flex flex-wrap gap-2">
          {memberships.length === 0 && <span className="text-xs text-rose-400">Not linked to any network</span>}
          {memberships.map((m) => (
            <span key={m} className="inline-flex items-center gap-1 rounded-full bg-ink-800 px-2 py-0.5 text-xs text-ink-200">
              {m}
              <button
                type="button"
                disabled={busy}
                onClick={() => op("unlinkMemberCoin", m, false)}
                className="text-ink-500 hover:text-rose-400"
                aria-label={`Remove from ${m}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          list="linkage-networks"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          placeholder="network slug…"
          className="flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none focus:border-electric-500"
        />
        <datalist id="linkage-networks">
          {networks.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.name}
            </option>
          ))}
        </datalist>
        <button
          type="button"
          disabled={busy || !pickValid}
          onClick={() => op("linkMemberCoin", pick.trim(), true)}
          className="rounded-md bg-electric-600 px-3 py-2 text-sm font-medium text-white hover:bg-electric-500 disabled:opacity-40"
        >
          Set primary
        </button>
        <button
          type="button"
          disabled={busy || !pickValid}
          onClick={() => op("linkMemberCoin", pick.trim(), false)}
          className="rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:text-ink-50 disabled:opacity-40"
        >
          Add member
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-400">{msg}</p>}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Small inputs                                                                 */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  onSave,
  dirty,
  children,
}: {
  title: string;
  onSave: () => Promise<boolean> | void;
  dirty: boolean;
  children: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <section className="rounded-md border border-ink-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-50">{title}</h2>
        {dirty && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            Unsaved
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
      <div className="mt-3">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave();
            setSaving(false);
          }}
          className="rounded-md bg-electric-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-electric-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${title.toLowerCase()}`}
        </button>
      </div>
    </section>
  );
}

function labelWrap(label: string, node: ReactNode) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-400">{label}</span>
      {node}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none focus:border-electric-500";

function TextInput({
  label,
  value,
  onChange,
  datalist,
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  datalist?: string[];
}) {
  const listId = datalist ? `dl-${label.replace(/\W/g, "")}` : undefined;
  return labelWrap(
    label,
    <>
      <input
        list={listId}
        value={typeof value === "string" ? value : value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      {datalist && (
        <datalist id={listId}>
          {datalist.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      )}
    </>,
  );
}

function TextArea({ label, value, onChange }: { label: string; value: unknown; onChange: (v: string) => void }) {
  return labelWrap(
    label,
    <textarea
      rows={3}
      value={typeof value === "string" ? value : value == null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />,
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: unknown; onChange: (v: number | null) => void }) {
  return labelWrap(
    label,
    <input
      type="number"
      value={typeof value === "number" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={inputCls}
    />,
  );
}

function SelectInput({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: unknown;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return labelWrap(
    label,
    <select
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      <option value="">— select —</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>,
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return labelWrap(label, <input value={value} readOnly className={`${inputCls} opacity-60`} />);
}

function membersToText(v: unknown): string {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(", ");
  return typeof v === "string" ? v : "";
}
function textToMembers(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
