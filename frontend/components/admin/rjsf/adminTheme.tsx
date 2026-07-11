"use client";

import { withTheme, type ThemeProps } from "@rjsf/core";
import {
  type ArrayFieldTemplateProps,
  type ArrayFieldTemplateItemType,
  type BaseInputTemplateProps,
  type FieldTemplateProps,
  type IconButtonProps,
  type ObjectFieldTemplateProps,
  type WidgetProps,
} from "@rjsf/utils";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent, FocusEvent } from "react";

/**
 * Field-agnostic Tailwind theme for @rjsf/core, using the app tokens (ink-*,
 * electric-*). The rjsf base theme ships no CSS, so its default templates render
 * labels inline with tiny inputs and invisible add/remove buttons — this file
 * replaces the templates/widgets with styled, labelled equivalents so ANY schema
 * passed to <AdminForm> is readable and its arrays are add/remove/reorder-able.
 *
 * Nothing here is network- or field-specific: it styles whatever schema it's
 * given, so it works uniformly across all 120 networks and every sector.
 */

const inputClass =
  "w-full rounded-md border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-ink-50 " +
  "placeholder:text-ink-500 outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500 " +
  "disabled:opacity-50";

/* -------------------------------------------------------------------------- */
/* Widgets                                                                     */
/* -------------------------------------------------------------------------- */

function BaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id,
    value,
    type,
    onChange,
    onChangeOverride,
    onBlur,
    onFocus,
    options,
    disabled,
    readonly,
    autofocus,
    placeholder,
    required,
  } = props;

  const handleChange =
    onChangeOverride ??
    ((e: ChangeEvent<HTMLInputElement>) =>
      onChange(e.target.value === "" ? options.emptyValue : e.target.value));

  return (
    <input
      id={id}
      type={type || "text"}
      className={inputClass}
      value={value ?? ""}
      required={required}
      disabled={disabled || readonly}
      autoFocus={autofocus}
      placeholder={placeholder}
      onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
      onBlur={(e: FocusEvent<HTMLInputElement>) => onBlur(id, e.target.value)}
      onFocus={(e: FocusEvent<HTMLInputElement>) => onFocus(id, e.target.value)}
    />
  );
}

function TextareaWidget(props: WidgetProps) {
  const { id, value, onChange, onBlur, onFocus, options, disabled, readonly, placeholder } = props;
  const rows = typeof options?.rows === "number" ? options.rows : 3;
  return (
    <textarea
      id={id}
      className={`${inputClass} resize-y leading-relaxed`}
      rows={rows}
      value={value ?? ""}
      disabled={disabled || readonly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? options.emptyValue : e.target.value)}
      onBlur={(e) => onBlur(id, e.target.value)}
      onFocus={(e) => onFocus(id, e.target.value)}
    />
  );
}

function SelectWidget(props: WidgetProps) {
  const { id, value, onChange, options, disabled, readonly, placeholder, multiple } = props;
  const enumOptions = (options?.enumOptions ?? []) as { value: unknown; label: string }[];
  return (
    <select
      id={id}
      className={inputClass}
      value={multiple ? undefined : (value ?? "")}
      multiple={multiple}
      disabled={disabled || readonly}
      onChange={(e) => onChange(e.target.value === "" ? options.emptyValue : e.target.value)}
    >
      {!multiple && <option value="">{placeholder || "— select —"}</option>}
      {enumOptions.map((opt, i) => (
        <option key={i} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function CheckboxWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, label } = props;
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-100">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-ink-600 bg-ink-900 accent-electric-500"
        checked={Boolean(value)}
        disabled={disabled || readonly}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/** Multi-select enum (e.g. SecondarySectors, *SecondaryTags) as a checkbox grid. */
function CheckboxesWidget(props: WidgetProps) {
  const { id, value, onChange, options, disabled, readonly } = props;
  const enumOptions = (options?.enumOptions ?? []) as { value: unknown; label: string }[];
  const selected: unknown[] = Array.isArray(value) ? value : [];
  return (
    <div id={id} className="flex flex-wrap gap-x-4 gap-y-2">
      {enumOptions.map((opt, i) => {
        const checked = selected.includes(opt.value);
        return (
          <label key={i} className="flex cursor-pointer items-center gap-2 text-sm text-ink-100">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-600 bg-ink-900 accent-electric-500"
              checked={checked}
              disabled={disabled || readonly}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, opt.value]
                  : selected.filter((v) => v !== opt.value);
                onChange(next);
              }}
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Field / object / array templates                                            */
/* -------------------------------------------------------------------------- */

function FieldTemplate(props: FieldTemplateProps) {
  const { id, label, children, errors, help, description, hidden, required, displayLabel, schema } =
    props;
  if (hidden) return <div className="hidden">{children}</div>;

  // Object/array fields render their own titles via their templates; suppressing
  // the redundant field label keeps the layout clean for nested structures.
  const isStructural = schema.type === "object" || schema.type === "array";
  const showLabel = displayLabel && !isStructural && Boolean(label);

  return (
    <div className="mb-3">
      {showLabel && (
        <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-100">
          {label}
          {required && <span className="ml-0.5 text-rose-400">*</span>}
        </label>
      )}
      {description}
      {children}
      {errors}
      {help}
    </div>
  );
}

function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { title, description, properties } = props;
  return (
    <div className="space-y-1">
      {title && <h3 className="text-sm font-medium text-ink-100">{title}</h3>}
      {description && <p className="text-xs text-ink-300">{description}</p>}
      <div className="space-y-2">
        {properties.map((element) => (
          <div key={element.name}>{element.content}</div>
        ))}
      </div>
    </div>
  );
}

function ArrayFieldItemTemplate(props: ArrayFieldTemplateItemType) {
  const {
    children,
    hasToolbar,
    hasMoveUp,
    hasMoveDown,
    hasRemove,
    index,
    onDropIndexClick,
    onReorderClick,
    disabled,
    readonly,
    registry,
  } = props;
  const { MoveUpButton, MoveDownButton, RemoveButton } = registry.templates.ButtonTemplates;

  return (
    <div className="rounded-md border border-ink-700 bg-ink-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-300">#{index + 1}</span>
        {hasToolbar && (
          <div className="flex items-center gap-1">
            {hasMoveUp && (
              <MoveUpButton
                registry={registry}
                disabled={disabled || readonly}
                onClick={onReorderClick(index, index - 1)}
              />
            )}
            {hasMoveDown && (
              <MoveDownButton
                registry={registry}
                disabled={disabled || readonly}
                onClick={onReorderClick(index, index + 1)}
              />
            )}
            {hasRemove && (
              <RemoveButton
                registry={registry}
                disabled={disabled || readonly}
                onClick={onDropIndexClick(index)}
              />
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { canAdd, items, onAddClick, title, disabled, readonly, registry } = props;
  const { AddButton } = registry.templates.ButtonTemplates;

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-medium text-ink-100">{title}</h3>}
      {items.length === 0 && (
        <p className="text-xs italic text-ink-500">None yet. Add one below.</p>
      )}
      <div className="space-y-3">
        {items.map(({ key, ...itemProps }) => (
          <ArrayFieldItemTemplate key={key} {...itemProps} />
        ))}
      </div>
      {canAdd && (
        <AddButton
          registry={registry}
          disabled={disabled || readonly}
          onClick={onAddClick}
          className="mt-1"
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                      */
/* -------------------------------------------------------------------------- */

function AddButton(props: IconButtonProps) {
  const { onClick, disabled } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md border border-electric-600 bg-electric-600/15 px-2.5 py-1 text-xs font-medium text-electric-400 hover:bg-electric-600/25 disabled:opacity-50"
    >
      <Plus className="h-3.5 w-3.5" /> Add
    </button>
  );
}

function RemoveButton(props: IconButtonProps) {
  const { onClick, disabled } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Remove"
      className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:border-rose-500 hover:text-rose-400 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> Remove
    </button>
  );
}

function MoveUpButton(props: IconButtonProps) {
  const { onClick, disabled } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Move up"
      className="inline-flex items-center rounded-md border border-ink-700 p-1 text-ink-300 hover:border-electric-500 hover:text-electric-400 disabled:opacity-40"
    >
      <ChevronUp className="h-3.5 w-3.5" />
    </button>
  );
}

function MoveDownButton(props: IconButtonProps) {
  const { onClick, disabled } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Move down"
      className="inline-flex items-center rounded-md border border-ink-700 p-1 text-ink-300 hover:border-electric-500 hover:text-electric-400 disabled:opacity-40"
    >
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  );
}

const theme: ThemeProps = {
  templates: {
    BaseInputTemplate,
    FieldTemplate,
    ObjectFieldTemplate,
    ArrayFieldTemplate,
    ArrayFieldItemTemplate,
    ButtonTemplates: { AddButton, RemoveButton, MoveUpButton, MoveDownButton },
  },
  widgets: {
    TextareaWidget,
    SelectWidget,
    CheckboxWidget,
    CheckboxesWidget,
  },
};

/** Tailwind-themed rjsf Form. Drop-in replacement for the bare `@rjsf/core` Form. */
export const AdminForm = withTheme(theme);
