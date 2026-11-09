import type { ExamTemplateAnswers, ExamTemplateSnapshot } from "./exam-template-snapshot";
import { fieldOwnerKey } from "./exam-template-snapshot";
import type { OhResponseField } from "../types";

export type ExamErrors = Record<string, string>;
export const sectionErrorKey = (code: string) => `section:${code}`;
export const fieldErrorKey = (owner: string, code: string) => `field:${owner}:${code}`;
export function isRequiredField(field: OhResponseField) {
  return field.required === true || field.is_required === true || field.validation?.required === true;
}
export function validateExamAnswers(snapshot: ExamTemplateSnapshot, answers: ExamTemplateAnswers): ExamErrors {
  const errors: ExamErrors = {};
  function fields(owner: string, definitions: OhResponseField[], item = false) {
    for (const field of definitions.filter((f) => !item || f.prompt_after_select !== false)) {
      const value = answers.fields[owner]?.[field.code] ?? "";
      const key = fieldErrorKey(owner, field.code);
      const limits = field.validation ?? {};
      if (isRequiredField(field) && !value.trim()) errors[key] = `${field.label} is required.`;
      else if (value && ["number", "decimal"].includes(field.response_type) && (!Number.isFinite(Number(value)) || (limits.min != null && Number(value) < limits.min) || (limits.max != null && Number(value) > limits.max))) errors[key] = `Enter a valid value for ${field.label}.`;
      else if (value && ((limits.min_length != null && value.length < limits.min_length) || (limits.max_length != null && value.length > limits.max_length))) errors[key] = `Check the length of ${field.label}.`;
      else if (value && field.options?.length) {
        const selected = field.response_type === "multi_select" ? value.split(",").filter(Boolean) : [value];
        if (selected.some((code) => !field.options.some((option) => option.code === code))) errors[key] = `Choose a valid option for ${field.label}.`;
      }
    }
  }
  for (const section of snapshot.sections) {
    if (section.content_mode === "direct" && section.response_definitions_missing) errors[sectionErrorKey(section.code)] = "Load the configured examination fields before completing this visit.";
    if (section.content_mode === "direct") fields(fieldOwnerKey(section.code), section.response_fields ?? []);
    else {
      if (section.items.some((item) => item.response_definitions_missing)) errors[sectionErrorKey(section.code)] = "Load the configured examination fields before completing this visit.";
      const picks = answers.picks[section.code] ?? [];
      if (section.is_mandatory && picks.length === 0) errors[sectionErrorKey(section.code)] = `Choose an option in ${section.name}.`;
      if ((section.selection_mode === "exclusive" && picks.length > 1) || picks.some((pick) => !section.items.some((item) => item.code === pick))) errors[sectionErrorKey(section.code)] = `Check the selection in ${section.name}.`;
      for (const item of section.items.filter((item) => picks.includes(item.code))) {
        if (item.response_definitions_missing) errors[sectionErrorKey(section.code)] = "Load the configured examination fields before completing this visit.";
        fields(fieldOwnerKey(section.code, item.code), item.response_fields, true);
      }
    }
  }
  return errors;
}

export function focusFirstExamError(root: ParentNode | null, errors: ExamErrors) {
  const firstKey = Object.keys(errors)[0];
  const first = Array.from(root?.querySelectorAll<HTMLElement>("[data-exam-error-key]") ?? []).find((control) => control.dataset.examErrorKey === firstKey);
  first?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  first?.focus();
}
