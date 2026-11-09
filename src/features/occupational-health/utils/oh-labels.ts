import { humanizeOhCode } from "@/features/occupational-health/utils/oh-format";

export const EXAM_TYPES = [
  { value: "pre_employment", label: "Admission exam" },
  { value: "periodic", label: "Periodic exam" },
  { value: "transfer", label: "Change of function exam" },
  { value: "rtw", label: "Return to work exam" },
  { value: "post_incident", label: "Post-incident exam" },
  { value: "exit", label: "Demissional exam" },
] as const;

/** Exam types offered when starting Medical Examinations (excludes post_incident). */
export const MEDICAL_EXAM_START_TYPES = EXAM_TYPES.filter(
  (option) => option.value !== "post_incident",
);

export const FITNESS_OUTCOMES = [
  { value: "fit", label: "Fit" },
  { value: "fit_with_restrictions", label: "Fit with restrictions" },
  { value: "temporarily_unfit", label: "Temporarily unfit" },
  { value: "permanently_unfit", label: "Permanently unfit for job" },
  { value: "unfit", label: "Unfit" },
  { value: "deferred", label: "Deferred" },
] as const;

const EXAM_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EXAM_TYPES.map((option) => [option.value, option.label]),
);

const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  FITNESS_OUTCOMES.map((option) => [option.value, option.label]),
);

const VISIT_CODE_TO_EXAM_TYPE: Record<string, string> = {
  pre_employment: "pre_employment",
  periodic: "periodic",
  change_of_function: "transfer",
  return_to_work: "rtw",
  post_incident: "post_incident",
  exit: "exit",
  injury_on_duty: "post_incident",
};

/** Exam type already chosen when the visit was started at the front desk. */
export function examTypeForVisitCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return VISIT_CODE_TO_EXAM_TYPE[code] ?? null;
}

export function formatExamTypeLabel(examType: string): string {
  return EXAM_TYPE_LABELS[examType] ?? humanizeOhCode(examType);
}

export function formatFitnessOutcome(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? humanizeOhCode(outcome);
}
