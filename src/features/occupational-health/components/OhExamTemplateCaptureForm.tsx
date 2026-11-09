"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import type { OhResponseField, OhVisitBillingCharge } from "../types";
import { emptyExamTemplateAnswers, fieldOwnerKey, type ExamTemplateAnswers, type ExamTemplateSnapshot } from "../lib/exam-template-snapshot";
import { fieldErrorKey, isRequiredField, sectionErrorKey, type ExamErrors } from "../lib/exam-template-validation";
import { cn } from "@/lib/utils";

type Props = {
  snapshot: ExamTemplateSnapshot;
  templateName?: string | null;
  value?: ExamTemplateAnswers;
  onChange: (next: ExamTemplateAnswers) => void;
  disabled?: boolean;
  errors?: ExamErrors;
  setupHref?: string;
  billingCharges?: OhVisitBillingCharge[];
};

export function OhExamTemplateCaptureForm({ snapshot, value, onChange, disabled, errors = {}, billingCharges = [] }: Props) {
  const answers = value ?? emptyExamTemplateAnswers();
  function setField(owner: string, code: string, next: string) {
    onChange({ ...answers, fields: { ...answers.fields, [owner]: { ...answers.fields[owner], [code]: next } } });
  }
  return <div data-testid="oh-exam-template-capture">
    <ol className="space-y-0">{snapshot.sections.map((section, index) => {
      const picks = answers.picks[section.code] ?? [];
      const direct = section.content_mode === "direct";
      const exclusive = section.selection_mode === "exclusive";
      const sectionError = errors[sectionErrorKey(section.code)];
      const headingId = `exam-section-${section.code}`;
      const errorId = `${headingId}-error`;
      return <li key={section.code} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 border-t border-dash-border py-5">
        <span aria-hidden className={cn("mt-0.5 flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold", picks.length || direct ? "border-brand-primary bg-brand-primary text-white" : "border-dash-border text-dash-muted")}>{index + 1}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 id={headingId} tabIndex={-1} data-exam-error-key={direct && section.response_definitions_missing ? sectionErrorKey(section.code) : undefined} className="text-[14.5px] font-semibold text-brand-navy">{section.name}{section.is_mandatory ? <RequiredFieldMarker /> : null}</h3><span className="text-xs text-dash-muted">{direct ? "Enter responses" : exclusive ? "Choose one" : "Choose all that apply"}</span></div>
          {sectionError ? <p id={errorId} className="mt-2 text-xs text-red-700">{sectionError}</p> : null}
          {direct ? <div className="mt-4 space-y-4">{(section.response_fields ?? []).map((field) => <ResponseField key={field.code} field={field} owner={section.code} value={answers.fields[section.code]?.[field.code] ?? ""} disabled={disabled} errors={errors} onChange={(next) => setField(section.code, field.code, next)} />)}</div>
            : section.items.length === 0 ? <p className="mt-3 text-sm text-dash-muted">No items in this section.</p>
              : <ul role={exclusive ? "radiogroup" : "group"} aria-labelledby={headingId} aria-invalid={Boolean(sectionError)} aria-describedby={sectionError ? errorId : undefined} className="mt-3 grid gap-2 sm:grid-cols-2">
                {section.items.map((item) => {
                  const checked = picks.includes(item.code);
                  const owner = fieldOwnerKey(section.code, item.code);
                  const fields = item.response_fields.filter((field) => field.prompt_after_select !== false);
                  const panelId = `exam-responses-${owner}`;
                  function toggle() {
                    const next = checked ? picks.filter((code) => code !== item.code) : exclusive ? [item.code] : [...picks, item.code];
                    onChange({ ...answers, picks: { ...answers.picks, [section.code]: next } });
                  }
                  return <li key={item.code} className={cn("min-w-0 border-b border-dash-border/60", checked && "sm:col-span-2")}>
                    <button type="button" role={exclusive ? "radio" : "checkbox"} aria-checked={checked} aria-expanded={checked} aria-controls={panelId} aria-invalid={Boolean(sectionError)} aria-describedby={sectionError ? errorId : undefined} data-exam-error-key={sectionErrorKey(section.code)} disabled={disabled} onClick={toggle} className="flex w-full items-center gap-3 px-1 py-3 text-left text-[13.5px] font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:opacity-60">
                      <span aria-hidden className={cn("flex size-[18px] shrink-0 items-center justify-center border", exclusive ? "rounded-full" : "rounded", checked ? "border-brand-primary bg-brand-primary text-white" : "border-slate-300 bg-white")}>{checked ? <Check className="size-3" /> : null}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.name}</span>
                        {checked ? (() => {
                          const charge = billingCharges.find((row) => row.item_code === item.code && row.status !== "removed");
                          if (!charge?.ui_status) return null;
                          return <span className="mt-0.5 block text-[11px] font-normal text-dash-muted">{charge.ui_status}</span>;
                        })() : null}
                      </span>
                    </button>
                    {checked ? <div id={panelId} className="mb-4 ml-8 space-y-4 pt-1">
                      {fields.map((field) => <ResponseField key={field.code} field={field} owner={owner} value={answers.fields[owner]?.[field.code] ?? ""} disabled={disabled} errors={errors} onChange={(next) => setField(owner, field.code, next)} />)}
                      {fields.length === 0 && !item.response_definitions_missing ? <p className="text-xs text-dash-muted">No additional response needed.</p> : null}
                    </div> : null}
                  </li>;
                })}
              </ul>}
        </div>
      </li>;
    })}</ol>
  </div>;
}

function ResponseField({ field, owner, value, disabled, errors, onChange }: { field: OhResponseField; owner: string; value: string; disabled?: boolean; errors: ExamErrors; onChange: (next: string) => void }) {
  const key = fieldErrorKey(owner, field.code);
  const id = `exam-field-${owner}-${field.code}`;
  const error = errors[key];
  const label = <>{field.label}{isRequiredField(field) ? <RequiredFieldMarker /> : null}</>;
  const props = { id, disabled, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined, "data-exam-error-key": key, "aria-required": isRequiredField(field) };
  const multi = field.response_type === "multi_select";
  const options = field.options?.length ? field.options : field.response_type === "boolean" ? [{ code: "true", label: "Yes" }, { code: "false", label: "No" }] : [];
  const selected = multi ? value.split(",").filter(Boolean) : [value];
  return <div className="space-y-2">
    {options.length ? <fieldset disabled={disabled} aria-describedby={props["aria-describedby"]}>
      <legend className="mb-2 text-xs font-medium text-brand-slate">{label}</legend>
      <div role={multi ? "group" : "radiogroup"} aria-label={field.label} className="flex flex-wrap gap-2">{options.map((option) => <button {...props} id={`${id}-${option.code}`} key={option.code} type="button" role={multi ? "checkbox" : "radio"} aria-checked={selected.includes(option.code)} onClick={() => onChange(multi ? (selected.includes(option.code) ? selected.filter((code) => code !== option.code) : [...selected, option.code]).join(",") : option.code)} className={cn("rounded-md border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:opacity-60", selected.includes(option.code) ? "border-brand-primary bg-brand-primary text-white" : "border-brand-primary/20 bg-white text-brand-navy")}>{option.label}</button>)}</div>
    </fieldset> : <>
      <label htmlFor={id} className="block text-xs font-medium text-brand-slate">{label}</label>
      {field.response_type === "file" ? <p {...props} tabIndex={-1} className="text-xs text-dash-muted">File responses are not available in this workspace. Ask an administrator to review this template requirement.</p>
        : ["text", "textarea", "long_text"].includes(field.response_type) ? <Textarea {...props} rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-20 resize-y bg-white text-sm" />
          : <Input {...props} type={["number", "decimal"].includes(field.response_type) ? "number" : field.response_type === "datetime" ? "datetime-local" : ["date", "time"].includes(field.response_type) ? field.response_type : "text"} step={field.response_type === "decimal" ? "any" : undefined} min={field.validation?.min} max={field.validation?.max} value={value} onChange={(event) => onChange(event.target.value)} className="bg-white text-sm" />}
    </>}
    {error ? <p id={`${id}-error`} className="text-xs text-red-700">{error}</p> : null}
  </div>;
}
