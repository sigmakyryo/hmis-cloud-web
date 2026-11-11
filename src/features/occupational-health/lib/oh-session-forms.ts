import {
  parseExamTemplateSnapshot,
  type ExamTemplateAnswers,
  type ExamTemplateResponseEnvelope,
} from "@/features/occupational-health/lib/exam-template-snapshot";
import { validateExamAnswers } from "@/features/occupational-health/lib/exam-template-validation";
import { isCaptureSaved } from "@/features/occupational-health/lib/oh-encounter-modules";
import type { OhExamination, OhTemplateCapture } from "@/features/occupational-health/types";

export type SessionAttachedForm = {
  uuid: string;
  name: string;
  system_type?: string | null;
};

export type SessionVisitType = {
  code: string;
  forms?: SessionAttachedForm[];
} | null;

export type SessionFormStep =
  | { kind: "employee"; title: "Employee form" }
  | { kind: "examination"; title: "Examination" }
  | { kind: "certificate"; title: "Certificate of fitness" }
  | { kind: "attached"; uuid: string; title: string };

export type SessionStepStatus = "not_started" | "in_progress" | "done" | "locked";

const BUILTIN_SYSTEM_TYPES = new Set(["employee_form", "examination", "certificate"]);

/** Forms for one occupational visit, in the order they are completed. */
export function sessionFormSteps(visitType: SessionVisitType): SessionFormStep[] {
  const steps: SessionFormStep[] = [];
  const forms = visitType?.forms ?? [];
  const wantsEmployee =
    visitType?.code === "pre_employment" ||
    forms.some((form) => form.system_type === "employee_form");
  if (wantsEmployee) {
    steps.push({ kind: "employee", title: "Employee form" });
  }
  steps.push({ kind: "examination", title: "Examination" });
  steps.push({ kind: "certificate", title: "Certificate of fitness" });
  const seen = new Set<string>();
  for (const form of forms) {
    if (form.system_type && BUILTIN_SYSTEM_TYPES.has(form.system_type)) {
      continue;
    }
    if (seen.has(form.uuid)) {
      continue;
    }
    seen.add(form.uuid);
    steps.push({ kind: "attached", uuid: form.uuid, title: form.name });
  }
  return steps;
}

export function sessionFormStepKey(step: SessionFormStep): string {
  return step.kind === "attached" ? step.uuid : step.kind;
}

export function sessionStepIndex(steps: SessionFormStep[], key: string): number {
  return steps.findIndex((step) => sessionFormStepKey(step) === key);
}

export function nextSessionStep(steps: SessionFormStep[], key: string): SessionFormStep | null {
  const index = sessionStepIndex(steps, key);
  if (index < 0 || index >= steps.length - 1) {
    return null;
  }
  return steps[index + 1] ?? null;
}

export function isLastSessionStep(steps: SessionFormStep[], key: string): boolean {
  return sessionStepIndex(steps, key) === steps.length - 1;
}

/** Examination is ready when every active exam has a complete, valid saved answer set. */
export function isExaminationStepReady(examinations: OhExamination[]): boolean {
  const active = examinations.filter((exam) => exam.is_active !== false);
  if (active.length === 0) {
    return false;
  }
  return active.every((exam) => {
    const schema = parseExamTemplateSnapshot(exam.template_snapshot);
    const envelope = exam.responses_json?.__exam_template__ as ExamTemplateResponseEnvelope | undefined;
    if (!schema || !envelope?.answers) {
      return false;
    }
    return Object.keys(validateExamAnswers(schema, envelope.answers)).length === 0;
  });
}

export function employeeFormStatus(form: OhTemplateCapture | null | undefined): SessionStepStatus {
  if (!form) {
    return "not_started";
  }
  if (form.status === "submitted" || form.status === "uploaded") {
    return "done";
  }
  if (form.status === "in_progress" || isCaptureSaved(form)) {
    return "in_progress";
  }
  return "not_started";
}

export function examinationStepStatus(examinations: OhExamination[]): SessionStepStatus {
  if (isExaminationStepReady(examinations)) {
    return "done";
  }
  if (examinations.some((exam) => exam.is_active !== false)) {
    return "in_progress";
  }
  return "not_started";
}

export function certificateStepStatus(
  records: OhTemplateCapture[],
  examReady: boolean,
): SessionStepStatus {
  if (!examReady) {
    return "locked";
  }
  const active = records.find((row) => row.is_active !== false) ?? null;
  if (!active) {
    return "not_started";
  }
  const schema = parseExamTemplateSnapshot(active.template_snapshot);
  const envelope = active.responses_json?.__cof_template__ as ExamTemplateResponseEnvelope | undefined;
  if (schema && envelope?.answers && Object.keys(validateExamAnswers(schema, envelope.answers)).length === 0) {
    return "done";
  }
  if (isCaptureSaved(active)) {
    return "in_progress";
  }
  return "not_started";
}

export function sessionStepStatus(
  step: SessionFormStep,
  context: {
    employeeForm?: OhTemplateCapture | null;
    examinations: OhExamination[];
    cofResponses: OhTemplateCapture[];
  },
): SessionStepStatus {
  const examReady = isExaminationStepReady(context.examinations);
  if (step.kind === "employee") {
    return employeeFormStatus(context.employeeForm);
  }
  if (step.kind === "examination") {
    return examinationStepStatus(context.examinations);
  }
  if (step.kind === "certificate") {
    return certificateStepStatus(context.cofResponses, examReady);
  }
  return "not_started";
}

export type AnswerSummaryRow = {
  key: string;
  label: string;
  value: string;
};

/** Human-readable summary rows from a pinned snapshot + answers. */
export function summarizeExamAnswers(
  snapshot: ReturnType<typeof parseExamTemplateSnapshot>,
  answers: ExamTemplateAnswers | null | undefined,
): AnswerSummaryRow[] {
  if (!snapshot || !answers) {
    return [];
  }
  const rows: AnswerSummaryRow[] = [];
  for (const section of snapshot.sections) {
    const picks = answers.picks[section.code] ?? [];
    if (picks.length) {
      const labels = picks.map((code) => {
        const item = section.items.find((entry) => entry.code === code || entry.uuid === code);
        return item?.name ?? code;
      });
      rows.push({
        key: `pick:${section.code}`,
        label: section.name,
        value: labels.join(", "),
      });
    }
    if (section.content_mode === "direct") {
      for (const field of section.response_fields ?? []) {
        const raw = answers.fields[section.code]?.[field.code] ?? "";
        if (String(raw).trim() === "") continue;
        rows.push({
          key: `field:${section.code}:${field.code}`,
          label: field.label || field.code,
          value: formatFieldValue(field, String(raw)),
        });
      }
      continue;
    }
    for (const item of section.items) {
      if (
        !picks.includes(item.code) &&
        !(item.uuid != null && picks.includes(item.uuid))
      ) {
        continue;
      }
      const owner = `${section.code}:${item.code}`;
      for (const field of item.response_fields ?? []) {
        const raw = answers.fields[owner]?.[field.code] ?? "";
        if (String(raw).trim() === "") continue;
        rows.push({
          key: `field:${owner}:${field.code}`,
          label: `${item.name} · ${field.label || field.code}`,
          value: formatFieldValue(field, String(raw)),
        });
      }
    }
  }
  return rows;
}

function formatFieldValue(
  field: { response_type?: string; options?: Array<{ code: string; label: string }> },
  value: string,
): string {
  if (!field.options?.length) {
    return value;
  }
  const codes = field.response_type === "multi_select" ? value.split(",").filter(Boolean) : [value];
  return codes
    .map((code) => field.options?.find((option) => option.code === code)?.label ?? code)
    .join(", ");
}
