import { z } from "zod";

import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";

const longText = z.string().max(2000, "Keep this under 2,000 characters");
const shortText = z.string().max(255, "Keep this under 255 characters");

export const iodCaseFormSchema = z.object({
  onset_date: z.string().min(1, "Enter the incident date"),
  incident_time: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Use the 24-hour format, for example 14:30"),
  severity: z.string().min(1),
  safety_classification: z.string(),
  mechanism: shortText,
  body_part: shortText,
  incident_location: shortText,
  reported_by: shortText,
  she_reference: shortText,
  claim_reference: shortText,
  work_related: z.boolean(),
  description: z.string().trim().min(1, "Describe what happened").max(2000, "Keep this under 2,000 characters"),
  witnesses: longText,
  immediate_action: longText,
  treatment_given: longText,
  root_cause: longText,
  lost_days: z
    .string()
    .regex(/^\d+$/, "Enter a whole number of days")
    .refine((value) => Number(value) <= 3650, "That is more than ten years"),
  return_to_work_on: z.string(),
  status: z.enum(["open", "under_review", "closed"]),
});

export type IodCaseFormValues = z.infer<typeof iodCaseFormSchema>;

/** The rules for just the fields one action shows, so an untouched field elsewhere can never block a save. */
export function schemaForFields(names: ReadonlyArray<keyof IodCaseFormValues>) {
  return iodCaseFormSchema.pick(Object.fromEntries(names.map((name) => [name, true])) as Record<keyof IodCaseFormValues, true>);
}

export function toFormValues(item: IodCaseDetail): IodCaseFormValues {
  return {
    onset_date: item.onset_date ?? "",
    incident_time: item.incident_time ?? "",
    severity: item.severity || "minor",
    safety_classification: item.safety_classification,
    mechanism: item.mechanism,
    body_part: item.body_part,
    incident_location: item.incident_location,
    reported_by: item.reported_by,
    she_reference: item.she_reference,
    claim_reference: item.claim_reference,
    work_related: item.work_related,
    description: item.description,
    witnesses: item.witnesses,
    immediate_action: item.immediate_action,
    treatment_given: item.treatment_given,
    root_cause: item.root_cause,
    lost_days: String(item.lost_days),
    return_to_work_on: item.return_to_work_on ?? "",
    status: item.status === "closed" || item.status === "under_review" ? item.status : "open",
  };
}

/** Only the fields that differ from the saved case, shaped for the API (empty dates and times become null). */
export function toChangedPayload(original: IodCaseFormValues, next: IodCaseFormValues): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(next) as Array<keyof IodCaseFormValues>) {
    if (next[key] === original[key]) continue;
    const value = next[key];
    if (key === "lost_days") changes[key] = Number(value);
    else if (key === "description") changes[key] = String(value).trim();
    else if (key === "incident_time" || key === "return_to_work_on") changes[key] = value === "" ? null : value;
    else changes[key] = value;
  }
  return changes;
}
