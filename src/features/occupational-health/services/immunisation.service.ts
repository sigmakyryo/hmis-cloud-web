import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

export type OhVaccine = {
  uuid: string;
  code: string;
  name: string;
  cvx_code: string;
  atc_code: string;
  brand: string;
  manufacturer: string;
  route: string;
  site: string;
  dose_volume_ml: number | null;
  contraindications: string[];
  billing_product_uuid: string | null;
  titre_lab_product_uuid?: string | null;
  active: boolean;
};

export type OhVaccineLot = {
  uuid: string;
  vaccine_uuid: string | null;
  vaccine_code: string | null;
  lot_number: string;
  expiry_date: string | null;
  quantity_on_hand: number;
  recalled: boolean;
  recall_reason: string;
  expired: boolean;
  warning: "recalled" | "expired" | "low_stock" | null;
};

export type OhImmSchedule = {
  uuid: string;
  code: string;
  name: string;
  category: string;
  description: string;
  is_example: boolean;
  published_version: {
    uuid: string;
    number: number;
    status: string;
    snapshot: {
      disclaimer?: string;
      series?: Array<Record<string, unknown>>;
      assignment?: Record<string, unknown>;
    };
    published_at: string | null;
  } | null;
};

export type OhImmStatus = {
  uuid: string;
  certificate_gate_block?: boolean;
  customer_uuid: string;
  vaccine_uuid: string | null;
  vaccine_code: string;
  vaccine_name: string | null;
  status: string;
  doses_received: number;
  doses_required: number | null;
  next_due_date: string | null;
  last_dose_date: string | null;
};

export type OhImmDose = {
  uuid: string;
  customer_uuid: string;
  vaccine_uuid: string | null;
  vaccine_code: string;
  vaccine_name: string | null;
  lot_number: string | null;
  dose_number: number | null;
  route: string;
  site: string;
  source: string;
  given_by_name: string;
  administered_at: string | null;
  billing_key: string | null;
  status: string;
  notes: string;
};

export type OhImmPatientRecord = {
  customer_uuid: string;
  statuses: OhImmStatus[];
  doses: OhImmDose[];
  exemptions: Array<Record<string, unknown>>;
  aefi: Array<Record<string, unknown>>;
};

type ListEnvelope<T> = { results: T[]; pagination: unknown };

async function list<T>(path: string): Promise<T[]> {
  const response = await bffRequest<ListEnvelope<T> | T[]>(path);
  if (Array.isArray(response)) return response;
  return response.results ?? [];
}

export function fetchOhImmVaccines() {
  return list<OhVaccine>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmVaccines);
}

export function createOhImmVaccine(payload: Record<string, unknown>) {
  return bffRequest<OhVaccine>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmVaccines, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmLots(vaccineUuid?: string) {
  const query = vaccineUuid
    ? `?vaccine_uuid=${encodeURIComponent(vaccineUuid)}`
    : "";
  return list<OhVaccineLot>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmLots}${query}`);
}

export function createOhImmLot(payload: Record<string, unknown>) {
  return bffRequest<OhVaccineLot>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmLots, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmSchedules() {
  return list<OhImmSchedule>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSchedules);
}

export function seedOhImmExamples() {
  return bffRequest<{ seeded: unknown[] }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSeedExamples,
    { method: "POST", body: {} },
  );
}

export function publishOhImmSchedule(
  uuid: string,
  snapshot?: Record<string, unknown>,
) {
  return bffRequest(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPublishSchedule(uuid),
    { method: "POST", body: snapshot ? { snapshot } : {} },
  );
}

export function createOhImmSchedule(payload: Record<string, unknown>) {
  return bffRequest<OhImmSchedule>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSchedules,
    { method: "POST", body: payload },
  );
}

export function fetchOhImmPatient(customerUuid: string) {
  return bffRequest<OhImmPatientRecord>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPatient(customerUuid),
  );
}

export function administerOhImmDose(payload: Record<string, unknown>) {
  return bffRequest<{
    dose: OhImmDose;
    status: OhImmStatus;
    warnings: string[];
  }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAdminister, {
    method: "POST",
    body: payload,
  });
}

export function createOhImmExemption(payload: Record<string, unknown>) {
  return bffRequest(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExemptions, {
    method: "POST",
    body: payload,
  });
}

export function createOhImmAefi(payload: Record<string, unknown>) {
  return bffRequest(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAefi, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmDue(withinDays = 7) {
  return list<OhImmStatus>(
    `${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmDue}?within_days=${withinDays}`,
  );
}

export function previewOhImmAssignment(assignment: Record<string, unknown>, pregnancy?: boolean) {
  return bffRequest<{ matched: number; scanned: number; sample: Array<Record<string, string>> }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPreviewAssignment,
    { method: "POST", body: { assignment, ...(pregnancy != null ? { pregnancy } : {}) } },
  );
}

export function remindOhImm(statusUuids: string[], channel: "email" | "sms" = "email") {
  return bffRequest<Array<Record<string, unknown>>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmRemind, {
    method: "POST",
    body: { status_uuids: statusUuids, channel },
  });
}

export function fetchOhImmCompliance(groupBy: "employer" | "department" | "role" = "employer") {
  return bffRequest<{
    group_by: string;
    summary: { people: number; compliant: number; percent_compliant: number; overdue_rows: number };
    groups: Array<{ group: string; people: number; compliant: number; overdue: number; percent_compliant: number }>;
    overdue: Array<Record<string, unknown>>;
  }>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmCompliance}?group_by=${groupBy}`);
}

export async function downloadOhImmComplianceCsv() {
  const response = await fetch(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmComplianceCsv, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Could not export immunisation compliance.");
  }
  const blob = await response.blob();
  return { blob, filename: "oh-imm-compliance.csv" };
}

export function recordOhImmTitre(payload: Record<string, unknown>) {
  return bffRequest<{ result: Record<string, unknown>; status: OhImmStatus }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmTitreResults,
    { method: "POST", body: payload },
  );
}

export function orderOhImmTitre(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmTitreOrder, {
    method: "POST",
    body: payload,
  });
}

export function issueOhImmCertificate(customerUuid: string) {
  return bffRequest<{
    uuid: string;
    display_name: string;
    verify_url: string;
    qr_svg: string;
  }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmCertificates, {
    method: "POST",
    body: { customer_uuid: customerUuid },
  });
}

export function fetchOhImmDueFiltered(
  withinDays = 7,
  filters: Record<string, string> = {},
) {
  const params = new URLSearchParams({ within_days: String(withinDays) });
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return list<OhImmStatus>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmDue}?${params.toString()}`);
}

export function fetchOhImmFitnessGate(customerUuid: string) {
  return bffRequest<{
    mode: "off" | "warn" | "block";
    blocking: boolean;
    issues: Array<{ vaccine_code: string; status: string; message: string; next_due_date?: string | null }>;
  }>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmFitnessGate}?customer_uuid=${encodeURIComponent(customerUuid)}`);
}

export function fetchOhImmAudits(params: { entity_type?: string; entity_uuid?: string; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.entity_type) q.set("entity_type", params.entity_type);
  if (params.entity_uuid) q.set("entity_uuid", params.entity_uuid);
  if (params.limit) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  return bffRequest<Array<Record<string, unknown>>>(
    `${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAudits}${suffix}`,
  );
}

export function exportOhImmPack(scheduleUuid: string) {
  return bffRequest<Record<string, unknown>>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExportPack(scheduleUuid),
  );
}

export function importOhImmPack(pack: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmImportPack, {
    method: "POST",
    body: { pack },
  });
}

export function fetchOhImmDhisMappings() {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmDhisMappings);
}

export function createOhImmDhisMapping(payload: Record<string, unknown>) {
  return bffRequest<{ uuid: string }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmDhisMappings, {
    method: "POST",
    body: payload,
  });
}

export async function downloadOhImmFhirNdjson() {
  const response = await fetch(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmFhirNdjson, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Could not export FHIR immunizations.");
  return { blob: await response.blob(), filename: "oh-imm-fhir.ndjson" };
}

export async function downloadOhImmDhisCsv(period: string, orgUnit: string) {
  const q = new URLSearchParams({ period, org_unit: orgUnit });
  const response = await fetch(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmDhisCsv}?${q}`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Could not export DHIS2 values.");
  return { blob: await response.blob(), filename: "oh-imm-dhis2.csv" };
}
