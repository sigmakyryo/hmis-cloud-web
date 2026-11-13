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

export type ExamAnswerRow = {
  key: string;
  label: string;
  value: string;
  empty: boolean;
};

export type ExamAnswerSectionView = {
  code: string;
  name: string;
  rows: ExamAnswerRow[];
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

/** Sections with question labels and formatted answers, including empty fields as "Not recorded". */
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
    const rows: ExamAnswerRow[] = [];
    const picks = picksMap[section.code] ?? [];

    if (section.content_mode === "direct") {
      for (const field of section.response_fields ?? []) {
        const raw = fieldsMap[section.code]?.[field.code] ?? "";
        const empty = String(raw).trim() === "";
        rows.push({
          key: `field:${section.code}:${field.code}`,
          label: field.label || field.code,
          value: formatExamFieldValue({ ...field, unit: fieldUnit(field) }, String(raw)),
          empty,
        });
      }
    } else {
      if (section.items.length) {
        const labels = section.items
          .filter((item) => picks.includes(item.code) || (item.uuid != null && picks.includes(item.uuid)))
          .map((item) => item.name);
        rows.push({
          key: `pick:${section.code}`,
          label: "Selected",
          value: labels.length ? labels.join(", ") : "Not recorded",
          empty: labels.length === 0,
        });
      }
      for (const item of section.items) {
        const picked = picks.includes(item.code) || (item.uuid != null && picks.includes(item.uuid));
        if (!picked) {
          continue;
        }
        const owner = `${section.code}:${item.code}`;
        for (const field of item.response_fields ?? []) {
          const raw = fieldsMap[owner]?.[field.code] ?? "";
          const empty = String(raw).trim() === "";
          rows.push({
            key: `field:${owner}:${field.code}`,
            label: `${item.name} · ${field.label || field.code}`,
            value: formatExamFieldValue({ ...field, unit: fieldUnit(field) }, String(raw)),
            empty,
          });
        }
      }
    }

    if (rows.length === 0) {
      rows.push({
        key: `empty:${section.code}`,
        label: section.name,
        value: "Not recorded",
        empty: true,
      });
    }
    sections.push({ code: section.code, name: section.name, rows });
  }
  return sections;
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
