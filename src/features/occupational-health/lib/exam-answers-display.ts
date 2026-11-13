import { format, isValid, parseISO } from "date-fns";

import type { ExamTemplateAnswers, ExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";
import { validateExamAnswers } from "@/features/occupational-health/lib/exam-template-validation";
import { formatOhDate } from "@/features/occupational-health/utils/oh-format";

export type ExamAnswerFieldDisplay = {
  response_type?: string;
  options?: Array<{ code: string; label: string }>;
  unit?: string;
  label?: string;
  code?: string;
};

export type ExamAnswerFieldKind =
  | "text"
  | "long"
  | "boolean"
  | "date"
  | "number"
  | "choice"
  | "attachment";

export type ExamAnswerRow = {
  key: string;
  label: string;
  value: string;
  empty: boolean;
  kind: ExamAnswerFieldKind;
  compact: boolean;
};

/** A sub-group under a section (an item with its own fields), or an unnamed block of direct fields. */
export type ExamAnswerGroup = {
  code: string;
  name: string;
  /** Picked findings that have no follow-up fields — shown as chips, not a "Selected" row. */
  chips?: string[];
  rows: ExamAnswerRow[];
};

export type ExamAnswerSectionView = {
  code: string;
  name: string;
  groups: ExamAnswerGroup[];
};

export type ExamAnswerHighlight = {
  key: string;
  label: string;
  value: string;
  role: "outcome" | "validity" | "restriction" | "vital" | "finding";
};

export type ExamAnswerSummary = {
  outcome?: string;
  validFrom?: string | null;
  validTo?: string | null;
  restrictions: string[];
  highlights: ExamAnswerHighlight[];
};

/** True when the snapshot + answers pass the same validation used to mark a session step done. */
export function examAnswersAreComplete(
  snapshot: ExamTemplateSnapshot | null | undefined,
  answers: ExamTemplateAnswers | null | undefined,
): boolean {
  if (!snapshot || !answers) {
    return false;
  }
  return Object.keys(validateExamAnswers(snapshot, answers)).length === 0;
}

export function formatExamFieldValue(
  field: ExamAnswerFieldDisplay,
  value: string | null | undefined,
): string {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return "Not recorded";
  }
  const type = field.response_type ?? "text";
  const unit = typeof field.unit === "string" ? field.unit.trim() : "";

  if (type === "boolean") {
    const lowered = raw.toLowerCase();
    if (["true", "yes", "1"].includes(lowered)) {
      return "Yes";
    }
    if (["false", "no", "0"].includes(lowered)) {
      return "No";
    }
  }

  if (type === "signature") {
    if (raw.startsWith("data:") || raw.length > 120) {
      return "Signed";
    }
    return raw;
  }

  if (type === "file") {
    return formatFileValue(raw);
  }

  if (type === "date") {
    const formatted = formatOhDate(raw);
    return formatted === "—" ? raw : formatted;
  }

  if (type === "datetime") {
    return formatDateTime(raw);
  }

  if (field.options?.length) {
    const codes =
      type === "multi_select"
        ? raw
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean)
        : [raw];
    return codes
      .map((code) => field.options?.find((option) => option.code === code)?.label ?? code)
      .join(", ");
  }

  if ((type === "number" || type === "decimal") && unit) {
    return `${raw} ${unit}`;
  }

  return raw;
}

function formatFileValue(raw: string): string {
  if (raw.startsWith("data:")) {
    return "Attached";
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const name = record.name ?? record.original_name ?? record.filename ?? record.file_name;
      if (typeof name === "string" && name.trim()) {
        return name.trim();
      }
    }
  } catch {
    // plain filename
  }
  return raw.length > 120 ? "Attached" : raw;
}

function formatDateTime(raw: string): string {
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = parseISO(normalized);
  if (isValid(parsed)) {
    return format(parsed, "d MMM yyyy, HH:mm");
  }
  return raw;
}

function fieldUnit(field: { unit?: unknown }): string | undefined {
  return typeof field.unit === "string" && field.unit.trim() ? field.unit.trim() : undefined;
}

function describeRow(field: ExamAnswerFieldDisplay, raw: string): Omit<ExamAnswerRow, "key" | "label"> {
  const empty = raw.trim() === "";
  const value = formatExamFieldValue({ ...field, unit: fieldUnit(field) }, raw);
  const type = field.response_type ?? "text";
  let kind: ExamAnswerFieldKind = "text";
  if (type === "boolean" || value === "Yes" || value === "No") {
    kind = "boolean";
  } else if (type === "date" || type === "datetime" || type === "time") {
    kind = "date";
  } else if (type === "number" || type === "decimal") {
    kind = "number";
  } else if (type === "signature" || type === "file") {
    kind = "attachment";
  } else if (type === "single_select" || type === "multi_select") {
    kind = "choice";
  } else if (type === "textarea" || type === "long_text" || value.length > 48 || value.includes("\n")) {
    kind = "long";
  }
  const compact =
    !empty &&
    (kind === "boolean" ||
      kind === "date" ||
      kind === "number" ||
      kind === "attachment" ||
      (kind === "choice" && value.length < 36) ||
      (kind === "text" && value.length < 28));
  return { value, empty, kind, compact };
}

function itemHasFields(fields: ExamAnswerFieldDisplay[] | undefined): boolean {
  return (fields ?? []).length > 0;
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Sections with sub-groups and field labels only (no repeated section/item prefix).
 * Item picks are either a sub-group heading (when the item has fields) or chips
 * (when the pick itself is the finding). A "Selected" meta row is never emitted.
 */
export function examAnswerSections(
  snapshot: ExamTemplateSnapshot | null | undefined,
  answers: ExamTemplateAnswers | null | undefined,
): ExamAnswerSectionView[] {
  if (!snapshot) {
    return [];
  }
  const picksMap = answers?.picks ?? {};
  const fieldsMap = answers?.fields ?? {};
  const sections: ExamAnswerSectionView[] = [];

  for (const section of snapshot.sections) {
    const groups: ExamAnswerGroup[] = [];

    if (section.content_mode === "direct") {
      const rows: ExamAnswerRow[] = [];
      for (const field of section.response_fields ?? []) {
        const raw = fieldsMap[section.code]?.[field.code] ?? "";
        rows.push({
          key: `field:${section.code}:${field.code}`,
          label: field.label || field.code,
          ...describeRow(field, String(raw)),
        });
      }
      if (rows.length) {
        groups.push({ code: section.code, name: "", rows });
      }
    } else {
      const picks = picksMap[section.code] ?? [];
      const chips: string[] = [];
      for (const item of section.items) {
        const picked = picks.includes(item.code) || (item.uuid != null && picks.includes(item.uuid));
        if (!picked) {
          continue;
        }
        if (!itemHasFields(item.response_fields)) {
          chips.push(item.name);
          continue;
        }
        const owner = `${section.code}:${item.code}`;
        const rows: ExamAnswerRow[] = [];
        for (const field of item.response_fields ?? []) {
          const raw = fieldsMap[owner]?.[field.code] ?? "";
          rows.push({
            key: `field:${owner}:${field.code}`,
            label: field.label || field.code,
            ...describeRow(field, String(raw)),
          });
        }
        groups.push({
          code: item.code,
          name: namesMatch(item.name, section.name) ? "" : item.name,
          rows,
        });
      }
      if (chips.length) {
        groups.unshift({
          code: `${section.code}:picks`,
          name: "",
          chips,
          rows: [],
        });
      }
    }

    sections.push({ code: section.code, name: section.name, groups });
  }
  return sections;
}

export function sectionAnswerRows(section: ExamAnswerSectionView): ExamAnswerRow[] {
  return section.groups.flatMap((group) => group.rows);
}

export function emptyAnswerCount(sections: ExamAnswerSectionView[]): number {
  return sections.reduce(
    (total, section) => total + sectionAnswerRows(section).filter((row) => row.empty).length,
    0,
  );
}

const OUTCOME_CODE = /^(outcome|fitness_outcome|fitness_result|fitness|verdict|fit_status|result)$/i;
const OUTCOME_LABEL = /\b(outcome|verdict|fitness|fit for|fitness result)\b/i;
const RESTRICTION_CODE = /restrict/i;
const RESTRICTION_LABEL = /restrict/i;
const VALID_FROM_CODE = /^(valid_from|validfrom|effective_from|start_date|effective)$/i;
const VALID_FROM_LABEL = /valid from|effective from|start date/i;
const VALID_TO_CODE = /^(valid_to|validto|valid_until|expiry|expires|end_date|review_date)$/i;
const VALID_TO_LABEL = /valid to|valid until|expir|end date|review date/i;
const VITAL_CODE =
  /^(bp|blood_pressure|pulse|hr|heart_rate|height|weight|bmi|temp|temperature|spo2|o2_sat|oxygen)$/i;
const VITAL_LABEL = /blood pressure|\bbp\b|pulse|heart rate|height|weight|\bbmi\b|temperature|\bspo2\b|oxygen/i;

function walkFilledRows(
  sections: ExamAnswerSectionView[],
  visit: (row: ExamAnswerRow) => void,
): void {
  for (const section of sections) {
    for (const row of sectionAnswerRows(section)) {
      if (!row.empty) {
        visit(row);
      }
    }
  }
}

function splitRestrictionLines(value: string): string[] {
  const parts = value
    .split(/\n|;|(?:(?<=\S),\s+(?=[A-Z]))/)
    .map((part) => part.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
  return parts.length ? parts : value.trim() ? [value.trim()] : [];
}

/** Key outcome / vitals / findings for the answers-view summary strip. */
export function examAnswerSummary(
  snapshot: ExamTemplateSnapshot | null | undefined,
  answers: ExamTemplateAnswers | null | undefined,
  family: "exam" | "cof",
): ExamAnswerSummary {
  const sections = examAnswerSections(snapshot, answers);
  const summary: ExamAnswerSummary = { restrictions: [], highlights: [] };

  if (family === "cof") {
    walkFilledRows(sections, (row) => {
      const codeKey = row.key.split(":").pop() ?? "";
      if (!summary.outcome && (OUTCOME_CODE.test(codeKey) || OUTCOME_LABEL.test(row.label))) {
        summary.outcome = row.value;
        summary.highlights.push({ key: row.key, label: row.label, value: row.value, role: "outcome" });
        return;
      }
      if (RESTRICTION_CODE.test(codeKey) || RESTRICTION_LABEL.test(row.label)) {
        summary.restrictions.push(...splitRestrictionLines(row.value));
        return;
      }
      if (!summary.validFrom && (VALID_FROM_CODE.test(codeKey) || VALID_FROM_LABEL.test(row.label))) {
        summary.validFrom = row.value;
        return;
      }
      if (!summary.validTo && (VALID_TO_CODE.test(codeKey) || VALID_TO_LABEL.test(row.label))) {
        summary.validTo = row.value;
      }
    });
    if (summary.validFrom || summary.validTo) {
      const validity =
        summary.validFrom && summary.validTo
          ? `${summary.validFrom} – ${summary.validTo}`
          : (summary.validTo ?? summary.validFrom ?? "");
      summary.highlights.push({
        key: "validity",
        label: "Valid",
        value: validity,
        role: "validity",
      });
    }
    return summary;
  }

  walkFilledRows(sections, (row) => {
    const codeKey = row.key.split(":").pop() ?? "";
    if (VITAL_CODE.test(codeKey) || VITAL_LABEL.test(row.label)) {
      summary.highlights.push({ key: row.key, label: row.label, value: row.value, role: "vital" });
    }
  });
  for (const section of sections) {
    for (const group of section.groups) {
      for (const chip of group.chips ?? []) {
        summary.highlights.push({
          key: `finding:${section.code}:${chip}`,
          label: chip,
          value: chip,
          role: "finding",
        });
      }
    }
  }
  return summary;
}

export function formatCompletedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const formatted = formatOhDate(trimmed);
    return formatted === "—" ? trimmed : formatted;
  }
  return formatDateTime(trimmed);
}
