import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import type {
  IodCaseDetail,
  IodCaseEntry,
  IodStatutoryPack,
  NewIodEntry,
} from "@/features/occupational-health/iod-case/iod-case.types";
import { bffRequest } from "@/lib/bff-client";

const routes = BFF_OCCUPATIONAL_HEALTH_ROUTES;

export const iodCaseKeys = {
  detail: (uuid: string) => ["oh-iod-case", uuid] as const,
  pack: (uuid: string) => ["oh-iod-pack", uuid] as const,
  entries: (uuid: string) => ["oh-iod-entries", uuid] as const,
  list: ["oh-iod-cases"] as const,
};

type RawIodCase = Partial<Record<keyof IodCaseDetail, unknown>> & { uuid: string };

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const nullableText = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/**
 * Fills anything the service did not send. An OH service that has not been upgraded yet
 * omits the newer case fields; the page must still open on the fields it does have.
 */
export function normalizeIodCase(raw: RawIodCase): IodCaseDetail {
  const lost = Number(raw.lost_days);
  return {
    id: Number(raw.id ?? 0),
    uuid: raw.uuid,
    customer: typeof raw.customer === "number" ? raw.customer : null,
    customer_uuid: nullableText(raw.customer_uuid),
    employment_episode: typeof raw.employment_episode === "number" ? raw.employment_episode : null,
    encounter: typeof raw.encounter === "number" ? raw.encounter : null,
    encounter_uuid: nullableText(raw.encounter_uuid),
    visit_uuid: nullableText(raw.visit_uuid),
    she_reference: text(raw.she_reference),
    severity: text(raw.severity),
    lost_days: Number.isFinite(lost) ? lost : 0,
    status: text(raw.status) || "open",
    onset_date: nullableText(raw.onset_date),
    incident_time: nullableText(raw.incident_time),
    mechanism: text(raw.mechanism),
    body_part: text(raw.body_part),
    incident_location: text(raw.incident_location),
    reported_by: text(raw.reported_by),
    safety_classification: text(raw.safety_classification),
    work_related: raw.work_related !== false,
    description: text(raw.description),
    witnesses: text(raw.witnesses),
    immediate_action: text(raw.immediate_action),
    treatment_given: text(raw.treatment_given),
    root_cause: text(raw.root_cause),
    employer_notified_on: nullableText(raw.employer_notified_on),
    authority_notified_on: nullableText(raw.authority_notified_on),
    claim_reference: text(raw.claim_reference),
    return_to_work_on: nullableText(raw.return_to_work_on),
    closed_on: nullableText(raw.closed_on),
    closure_summary: text(raw.closure_summary),
    is_active: raw.is_active !== false,
    created_at: nullableText(raw.created_at),
    updated_at: nullableText(raw.updated_at),
  };
}

export const fetchIodCaseDetail = async (uuid: string) =>
  normalizeIodCase(await bffRequest<RawIodCase>(routes.iodCase(uuid)));

export const patchIodCaseDetail = async (uuid: string, body: Record<string, unknown>) =>
  normalizeIodCase(await bffRequest<RawIodCase>(routes.iodCase(uuid), { method: "PATCH", body }));

export const fetchIodCasePack = (uuid: string) =>
  bffRequest<IodStatutoryPack>(routes.iodCaseStatutoryPack(uuid));

export const fetchIodCaseEntries = async (uuid: string) => {
  const entries = await bffRequest<IodCaseEntry[] | null>(routes.iodCaseEntries(uuid));
  return Array.isArray(entries) ? entries : [];
};

export const addIodCaseEntry = (uuid: string, entry: NewIodEntry) =>
  bffRequest<IodCaseEntry>(routes.iodCaseEntries(uuid), {
    method: "POST",
    body: entry,
  });

export const patchIodCaseAction = (
  uuid: string,
  entryUuid: string,
  body: { completed?: boolean; body?: string; owner_name?: string; due_date?: string | null },
) =>
  bffRequest<IodCaseEntry>(routes.iodCaseEntry(uuid, entryUuid), {
    method: "PATCH",
    body,
  });

export const deleteIodCaseAction = (uuid: string, entryUuid: string) =>
  bffRequest<void>(routes.iodCaseEntry(uuid, entryUuid), { method: "DELETE" });
