import {
  sessionFormStepKey,
  type SessionFormStep,
  type SessionStepStatus,
} from "@/features/occupational-health/lib/oh-session-forms";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import type {
  OhVisitBillingCharge,
  OhVisitEncounter,
} from "@/features/occupational-health/types";
import type { StatusDotBadgeTone } from "@/components/ui/status-dot-badge";

/** Clinical modules that live on the visit journey rail (not session form steps). */
export const OH_CLINICAL_MODULES = [
  { id: "immunizations", label: "Immunizations" },
  { id: "drug-alcohol", label: "Drug & alcohol" },
  { id: "health-checks", label: "Health checks" },
  { id: "fitness", label: "Fitness" },
  { id: "employment", label: "Employment" },
] as const satisfies ReadonlyArray<{ id: OhEncounterPanelId; label: string }>;

export type OhClinicalModuleId = (typeof OH_CLINICAL_MODULES)[number]["id"];

export const OH_QUEUE_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "no_show", label: "Did not attend" },
] as const;

export type OhQueueStatusFilter =
  (typeof OH_QUEUE_STATUS_FILTERS)[number]["id"];

const SESSION_STATUS_LABEL: Record<SessionStepStatus, string> = {
  not_started: "To do",
  in_progress: "In progress",
  done: "Done",
  locked: "Locked",
};

const VISIT_STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Did not attend",
};

export function sessionStatusLabel(status: SessionStepStatus): string {
  return SESSION_STATUS_LABEL[status];
}

export function ohVisitStatusLabel(status: string): string {
  return VISIT_STATUS_LABEL[status] ?? status.replaceAll("_", " ");
}

export function ohVisitStatusTone(status: string): StatusDotBadgeTone {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "primary";
    case "waiting":
      return "warning";
    case "cancelled":
    case "no_show":
      return "danger";
    default:
      return "neutral";
  }
}

/** First incomplete, unlocked session step — the clinician's live place in the visit. */
export function resolveLiveSessionStep(
  steps: SessionFormStep[],
  statuses: Record<string, SessionStepStatus>,
): string {
  const open = steps.find((step) => {
    const status = statuses[sessionFormStepKey(step)];
    return status !== "done" && status !== "locked";
  });
  const fallback = steps[steps.length - 1] ?? {
    kind: "examination" as const,
    title: "Examination" as const,
  };
  return sessionFormStepKey(open ?? fallback);
}

export function panelForSessionStep(key: string): OhEncounterPanelId {
  if (key === "certificate") {
    return "certificate";
  }
  if (key === "employment") {
    return "employment";
  }
  return "medical-examinations";
}

export function isClinicalModulePanel(panel: OhEncounterPanelId): boolean {
  return OH_CLINICAL_MODULES.some((module) => module.id === panel);
}

/** Whether the open panel/step is the visit's live session step. */
export function isViewingLiveSessionStep(
  panel: OhEncounterPanelId,
  activeStep: string,
  liveStep: string,
): boolean {
  if (isClinicalModulePanel(panel)) {
    return false;
  }
  return activeStep === liveStep;
}

export function shortSessionStepTitle(title: string): string {
  if (title === "Certificate of fitness") {
    return "Certificate";
  }
  if (title === "Employee form") {
    return "Employee";
  }
  if (title === "Examination") {
    return "Exam";
  }
  return title;
}

export function ohJumpButtonLabel(stepTitle: string): string {
  return `Go to ${shortSessionStepTitle(stepTitle)}`;
}

export function ohJumpButtonDescription(stepTitle: string): string {
  return `Go to the current step: ${stepTitle}`;
}

export const OH_HEADER_ACTIONS = {
  next: {
    visible: "Next",
    aria: "Continue",
    title: "Continue to the next step",
  },
  complete: {
    visible: "Complete",
    aria: "Complete visit",
    title: "Complete this visit",
  },
  completingNext: {
    visible: "Saving…",
    aria: "Saving",
    title: "Saving this step",
  },
  completingLast: {
    visible: "Completing…",
    aria: "Completing visit",
    title: "Completing this visit",
  },
} as const;

export function isNativeOhVisit(
  encounter: Pick<OhVisitEncounter, "origin">,
): boolean {
  return encounter.origin === "laravel";
}

/** A visit referred from the core clinic, which OHS cannot complete or cancel. */
export function isReferredOhVisit(
  encounter: Pick<OhVisitEncounter, "origin">,
): boolean {
  return encounter.origin !== "laravel";
}

export const OH_REFERRED_VISIT_MESSAGE =
  "This visit was started from the main clinic, so it is read-only here. Complete or cancel it on the clinic visit — Occupational Health cannot close a referred visit from this workspace.";

const QUEUE_SEARCH_FIELDS: Array<keyof OhVisitEncounter | "full_name"> = [
  "customer_name",
  "customer_identifier",
  "first_name",
  "middle_name",
  "last_name",
  "employer_name",
  "hazard_profile_name",
  "department_name",
  "clinician_name",
  "status",
  "uuid",
];

/** Client-side queue/home search: client and employer names as well as department, clinician, and status. */
export function encounterMatchesQuery(
  row: OhVisitEncounter,
  search: string,
): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const fullName = [row.first_name, row.middle_name, row.last_name]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(" ")
    .toLowerCase();
  if (fullName.includes(needle)) {
    return true;
  }
  return QUEUE_SEARCH_FIELDS.some((field) => {
    if (field === "full_name") {
      return false;
    }
    const value = row[field];
    return typeof value === "string" && value.toLowerCase().includes(needle);
  });
}

export function encounterMatchesQueue(
  row: OhVisitEncounter,
  search?: string,
  status?: string,
): boolean {
  if (status && status !== "all" && row.status !== status) {
    return false;
  }
  return encounterMatchesQuery(row, search ?? "");
}

type BillingSource = {
  billing_charges?: OhVisitBillingCharge[] | null;
};

/** Deduplicated billing charges already returned on exam and form records. */
export function collectWorkspaceBillingCharges(
  examinations: Array<BillingSource>,
  employeeForms: Array<BillingSource> = [],
  cofResponses: Array<BillingSource> = [],
): OhVisitBillingCharge[] {
  const rows: OhVisitBillingCharge[] = [];
  const seen = new Set<string>();
  for (const record of [...examinations, ...employeeForms, ...cofResponses]) {
    for (const charge of record.billing_charges ?? []) {
      const key = charge.uuid || charge.billing_key;
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(charge);
    }
  }
  return rows;
}
