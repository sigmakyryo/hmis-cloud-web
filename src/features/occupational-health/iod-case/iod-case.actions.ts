import type { IodCaseFormValues } from "@/features/occupational-health/iod-case/iod-case.schema";
import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";
import { isCaseClosed } from "@/features/occupational-health/iod-case/iod-case.utils";

/**
 * Edit case holds only what happened. Everything else a case collects is its own small action,
 * so each one can be done by itself, in a sentence, from the section it belongs to.
 */
export type IodActionId = "edit" | "response" | "cause" | "outcome" | "reporting";

export type IodFieldKind = "text" | "date" | "time" | "number" | "area" | "severity" | "classification" | "check";

export type IodFieldSpec = {
  name: keyof IodCaseFormValues;
  label: string;
  kind: IodFieldKind;
  required?: boolean;
  /** Sits beside the next half-width field instead of taking the whole row. */
  half?: boolean;
  rows?: number;
};

export type IodActionDef = {
  id: IodActionId;
  title: string;
  description: string;
  saveLabel: string;
  wide?: boolean;
  fields: IodFieldSpec[];
};

export const IOD_ACTIONS: Record<IodActionId, IodActionDef> = {
  edit: {
    id: "edit",
    title: "Edit case",
    description: "What happened. Changes are added to the timeline.",
    saveLabel: "Save changes",
    wide: true,
    fields: [
      { name: "onset_date", label: "Incident date", kind: "date", required: true, half: true },
      { name: "incident_time", label: "Time", kind: "time", half: true },
      { name: "severity", label: "Severity", kind: "severity", half: true },
      { name: "incident_location", label: "Location", kind: "text", half: true },
      { name: "body_part", label: "Body part", kind: "text", half: true },
      { name: "mechanism", label: "Mechanism", kind: "text", half: true },
      { name: "description", label: "Description", kind: "area", required: true, rows: 4 },
      { name: "work_related", label: "Work related", kind: "check" },
    ],
  },
  response: {
    id: "response",
    title: "Record response and treatment",
    description: "What was done at the scene and what care the worker received.",
    saveLabel: "Save",
    fields: [
      { name: "immediate_action", label: "Immediate action", kind: "area", rows: 3 },
      { name: "treatment_given", label: "Treatment given", kind: "area", rows: 3 },
      { name: "witnesses", label: "Witnesses", kind: "area", rows: 2 },
    ],
  },
  cause: {
    id: "cause",
    title: "Root cause",
    description: "Why it happened. Track the fixes on the Follow-up tab.",
    saveLabel: "Save",
    fields: [{ name: "root_cause", label: "Root cause", kind: "area", rows: 5 }],
  },
  outcome: {
    id: "outcome",
    title: "Record outcome",
    description: "Time lost and when the worker was back on duty.",
    saveLabel: "Save",
    fields: [
      { name: "lost_days", label: "Lost days", kind: "number", half: true },
      { name: "return_to_work_on", label: "Returned to work", kind: "date", half: true },
    ],
  },
  reporting: {
    id: "reporting",
    title: "Reporting details",
    description: "Who reported it, how it is classified and the references used in notices.",
    saveLabel: "Save",
    fields: [
      { name: "reported_by", label: "Reported by", kind: "text" },
      { name: "safety_classification", label: "Classification", kind: "classification", half: true },
      { name: "she_reference", label: "SHE reference", kind: "text", half: true },
      { name: "claim_reference", label: "Claim reference", kind: "text" },
    ],
  },
};

/** The actions that sit beside Edit case, in the order a case is usually completed. */
export const IOD_RECORD_ACTIONS: IodActionId[] = ["response", "cause", "outcome", "reporting"];

export type StillToRecord = {
  key: string;
  label: string;
  detail: string;
  /** Opens this action. */
  action?: IodActionId;
  /** Or goes to a tab, for things recorded there. */
  tab?: "notifications";
};

const blank = (value: string | null | undefined) => !value || value.trim() === "";

/** What a case is still missing, so the page can offer each as one step. Closed cases are left alone. */
export function stillToRecord(item: IodCaseDetail, noticesNeedingDetails = 0): StillToRecord[] {
  if (isCaseClosed(item.status)) return [];
  const todo: StillToRecord[] = [];
  if (blank(item.immediate_action) && blank(item.treatment_given)) {
    todo.push({ key: "response", label: "Response and treatment", detail: "What was done at the scene and what care was given", action: "response" });
  }
  if (blank(item.root_cause)) {
    todo.push({ key: "cause", label: "Root cause", detail: "Why it happened", action: "cause" });
  }
  if (!item.return_to_work_on) {
    todo.push({ key: "outcome", label: "Outcome", detail: "Lost days and the return to work", action: "outcome" });
  }
  if (blank(item.reported_by) || blank(item.she_reference)) {
    todo.push({ key: "reporting", label: "Reporting details", detail: "Who reported it and the SHE reference", action: "reporting" });
  }
  if (noticesNeedingDetails > 0) {
    todo.push({
      key: "notices",
      label: noticesNeedingDetails === 1 ? "1 notice needs details" : `${noticesNeedingDetails} notices need details`,
      detail: "Fill in what the notification pack is missing",
      tab: "notifications",
    });
  }
  return todo;
}
