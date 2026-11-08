import {
  FileBadge2,
  ShieldAlert,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

export const OH_ENCOUNTER_MODULES = [
  {
    id: "medical-examinations",
    label: "Medical Examinations",
    description: "Complete the exam template for this risk profile",
    icon: Stethoscope,
  },
  {
    id: "certificate",
    label: "Occupational Health Certificate",
    description: "Issue fitness certificates for HR",
    icon: FileBadge2,
  },
  {
    id: "iod",
    label: "Injury on Duty Management",
    description: "Record and manage injury-on-duty cases",
    icon: ShieldAlert,
  },
] as const;

export type OhEncounterModuleId = (typeof OH_ENCOUNTER_MODULES)[number]["id"];

/** Secondary panel for assigning employment / risk profile (not a primary module). */
export const OH_EMPLOYMENT_PANEL_ID = "employment" as const;

export type OhEncounterPanelId = OhEncounterModuleId | typeof OH_EMPLOYMENT_PANEL_ID;

export function isOhEncounterModuleId(value: string | null | undefined): value is OhEncounterModuleId {
  return OH_ENCOUNTER_MODULES.some((module) => module.id === value);
}

export function isOhEncounterPanelId(value: string | null | undefined): value is OhEncounterPanelId {
  return value === OH_EMPLOYMENT_PANEL_ID || isOhEncounterModuleId(value);
}

export function moduleIcon(id: OhEncounterModuleId): LucideIcon {
  return OH_ENCOUNTER_MODULES.find((module) => module.id === id)!.icon;
}

/** Envelope key for risk-profile exam template answers inside examination.responses_json. */
export const EXAM_TEMPLATE_RESPONSE_KEY = "__exam_template__";

export const EMPLOYEE_FORM_RESPONSE_KEY = "__employee_form__";

export const COF_TEMPLATE_RESPONSE_KEY = "__cof_template__";

export function isCaptureSaved(row: { row_version?: number | null } | null | undefined) {
  return (row?.row_version ?? 0) > 1;
}

/** Native visits collect the examination, then the certificate. */
export function isVisitStepOpen(
  panel: string,
  saved: { exam: boolean },
  native: boolean,
) {
  if (!native) {
    return true;
  }
  if (panel === "certificate") {
    return saved.exam;
  }
  return true;
}
