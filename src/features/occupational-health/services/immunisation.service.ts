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
  series_attempt?: number;
  hbig_fast_track?: boolean;
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

export async function downloadOhImmCertificatePdf(certificateUuid: string) {
  const response = await fetch(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmCertificatePdf(certificateUuid),
    { method: "GET", credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("Could not download the vaccination certificate PDF.");
  }
  const blob = await response.blob();
  const match = /filename="?([^"]+)"?/i.exec(
    response.headers.get("Content-Disposition") ?? "",
  );
  return { blob, filename: match?.[1] ?? "vaccination-certificate.pdf" };
}


export type OhImmPathway = {
  uuid: string;
  code: string;
  name: string;
  description: string;
  is_example: boolean;
  requirements: Array<{
    uuid?: string;
    vaccine_code: string;
    schedule_code: string;
    titre_required: boolean;
    control_codes: string[];
  }>;
};

export type OhImmTask = {
  uuid: string;
  code: string;
  name: string;
  description: string;
  likelihood: number;
  severity: number;
  score: number;
  is_example: boolean;
  pathway_uuid?: string;
  pathway_code?: string;
  pathway_name?: string;
};

export type OhImmNrProtocol = {
  uuid: string;
  vaccine_code: string;
  titre_interval_days: number;
  max_series: number;
  doses_per_series: number;
  require_quantitative_titre: boolean;
  titre_threshold: number | null;
  titre_unit: string;
  flag_on_true_non_responder: boolean;
  recommend_role_change: boolean;
  recommend_ppe_plan: boolean;
  enable_hbig_fast_track: boolean;
  notes: string;
};

export function fetchOhImmPathways() {
  return list<OhImmPathway>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPathways);
}

export function createOhImmPathway(payload: Record<string, unknown>) {
  return bffRequest<OhImmPathway>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPathways, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmTasks() {
  return list<OhImmTask>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmTasks);
}

export function createOhImmTask(payload: Record<string, unknown>) {
  return bffRequest<OhImmTask>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmTasks, {
    method: "POST",
    body: payload,
  });
}

export function assignOhImmTask(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmTaskAssignments, {
    method: "POST",
    body: payload,
  });
}

export function seedOhImmRiskExamples() {
  return bffRequest<{ pathways: number; tasks: number }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmRiskSeed,
    { method: "POST", body: {} },
  );
}

export function fetchOhImmPatientControls(customerUuid: string) {
  return bffRequest<Array<Record<string, unknown>>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPatientControls(customerUuid));
}

export function fetchOhImmPatientRisk(customerUuid: string) {
  return bffRequest<{
    customer_uuid: string;
    score: number;
    band: string;
    tasks: OhImmTask[];
    pathways: Array<{ uuid: string; code: string; name: string }>;
    required_vaccines: Array<{
      vaccine_code: string;
      schedule_code: string;
      titre_required: boolean;
      reasons: string[];
    }>;
    required_controls: string[];
    episode: Record<string, string> | null;
  }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPatientRisk(customerUuid));
}

export function fetchOhImmNrProtocols() {
  return list<OhImmNrProtocol>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmNrProtocols);
}

export function createOhImmNrProtocol(payload: Record<string, unknown>) {
  return bffRequest<OhImmNrProtocol>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmNrProtocols, {
    method: "POST",
    body: payload,
  });
}

export function seedOhImmNrHepb() {
  return bffRequest<OhImmNrProtocol>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmNrSeedHepb, {
    method: "POST",
    body: {},
  });
}

export function fetchOhImmPatientNrFlags(customerUuid: string) {
  return bffRequest<{
    hbig_fast_track: boolean;
    true_non_responder: boolean;
    cases: Array<Record<string, unknown>>;
  }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPatientNrFlags(customerUuid));
}

export function decideOhImmNrCase(
  uuid: string,
  payload: { decision: string; reviewer_name?: string; decision_notes?: string },
) {
  return bffRequest<Record<string, unknown>>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmNrDecision(uuid),
    { method: "POST", body: payload },
  );
}

export type OhImmExposureClock = {
  code: string;
  label: string;
  deadline_at: string;
  max_at: string;
  status: string;
  seconds_remaining?: number;
  overdue?: boolean;
  escalated?: boolean;
  fast_track?: boolean;
};

export type OhImmExposure = {
  uuid: string;
  customer_uuid: string;
  customer_initials: string;
  exposed_at: string;
  exposure_type: string;
  pathway_code?: string;
  body_site?: string;
  device?: string;
  source_known: string;
  first_aid_done: boolean;
  site?: string;
  shift?: string;
  status: string;
  triage_band: string;
  clocks: OhImmExposureClock[];
  employee_context?: Record<string, unknown>;
  encounter_uuid?: string | null;
  visit_uuid?: string | null;
  visit_linked?: boolean;
  billing_ready?: boolean;
  rca_uuid?: string;
  rca?: { uuid: string; status: string; summary: string } | null;
  actions?: Array<Record<string, unknown>>;
  followups?: Array<Record<string, unknown>>;
  source?: Record<string, unknown> | null;
};

export function fetchOhImmExposures(params: { status?: string; customer_uuid?: string } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.customer_uuid) q.set("customer_uuid", params.customer_uuid);
  const suffix = q.toString() ? `?${q}` : "";
  return list<OhImmExposure>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposures}${suffix}`);
}

export function createOhImmExposure(payload: Record<string, unknown>) {
  return bffRequest<OhImmExposure>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposures, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmExposure(uuid: string) {
  return bffRequest<OhImmExposure>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposure(uuid));
}

export function recordOhImmExposureAction(uuid: string, payload: Record<string, unknown>) {
  return bffRequest<{ action: Record<string, unknown>; exposure: OhImmExposure }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureActions(uuid),
    { method: "POST", body: payload },
  );
}

export function updateOhImmExposureSource(uuid: string, payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureSource(uuid),
    { method: "POST", body: payload },
  );
}

export function fetchOhImmExposureDueFollowups(withinDays = 14) {
  return list<Record<string, unknown>>(
    `${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureDueFollowups}?within_days=${withinDays}`,
  );
}

export function completeOhImmExposureFollowup(uuid: string) {
  return bffRequest<Record<string, unknown>>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureFollowupComplete(uuid),
    { method: "POST", body: {} },
  );
}

export function fetchOhImmExposureOncall(site?: string) {
  const q = site ? `?site=${encodeURIComponent(site)}` : "";
  return list<Record<string, unknown>>(
    `${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureOncall}${q}`,
  );
}

export function createOhImmExposureOncall(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureOncall, {
    method: "POST",
    body: payload,
  });
}

export function seedOhImmExposureTypes() {
  return bffRequest<{ seeded: number }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureSeedTypes, {
    method: "POST",
    body: {},
  });
}

export function fetchOhImmPatientExposures(customerUuid: string) {
  return list<OhImmExposure>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPatientExposures(customerUuid));
}

export function fetchOhImmZones() {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmZones);
}
export function createOhImmZone(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmZones, { method: "POST", body: payload });
}
export function seedOhImmZones() {
  return bffRequest<{ seeded: number }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmZoneSeed, { method: "POST", body: {} });
}
export function fetchOhImmZoneClearance(uuid: string) {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmZoneClearance(uuid));
}
export function fetchOhImmAccessClients() {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAccessClients);
}
export function createOhImmAccessClient(payload: Record<string, unknown>) {
  return bffRequest<{ client: Record<string, unknown>; secret: string }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAccessClients,
    { method: "POST", body: payload },
  );
}
export function fetchOhImmControls() {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmControls);
}
export function seedOhImmControls() {
  return bffRequest<{ seeded: number }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmControlsSeed, { method: "POST", body: {} });
}
export function fetchOhImmTaskHierarchy(taskUuid: string) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmTaskHierarchy(taskUuid));
}
export function createOhImmFitTest(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmFitTests, { method: "POST", body: payload });
}
export function fetchOhImmFitTestsDue(withinDays = 30) {
  return list<Record<string, unknown>>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmFitTestsDue}?within_days=${withinDays}`);
}
export function fetchOhImmBoardMembers() {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmBoardMembers);
}
export function createOhImmBoardMember(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmBoardMembers, { method: "POST", body: payload });
}
export function fetchOhImmAccommodations(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return list<Record<string, unknown>>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAccommodations}${q}`);
}
export function fileOhImmDeclination(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmDeclination, { method: "POST", body: payload });
}
export function decideOhImmAccommodation(uuid: string, payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAccommodationDecide(uuid), { method: "POST", body: payload });
}
export function fetchOhImmPdca() {
  return bffRequest<Record<string, Array<Record<string, unknown>>>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPdca);
}
export function updateOhImmRca(uuid: string, payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmRca(uuid), { method: "PATCH", body: payload });
}
export function addOhImmRcaAction(uuid: string, payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmRcaActions(uuid), { method: "POST", body: payload });
}
export function fetchOhImmSeroAudits() {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSeroAudits);
}
export function createOhImmSeroAudit(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSeroAudits, { method: "POST", body: payload });
}
export function recordOhImmSeroAggregates(uuid: string, cells: Array<Record<string, unknown>>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSeroAggregates(uuid), { method: "POST", body: { cells } });
}
export function fetchOhImmVendors() {
  return list<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmVendors);
}
export function createOhImmVendor(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmVendors, { method: "POST", body: payload });
}
export function recordOhImmColdChain(payload: Record<string, unknown>) {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmColdChain, { method: "POST", body: payload });
}
export function clearOhImmLotQuarantine(lotUuid: string, reason = "") {
  return bffRequest<Record<string, unknown>>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmClearQuarantine(lotUuid), { method: "POST", body: { reason } });
}
