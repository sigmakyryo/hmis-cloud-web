import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohExt;

export function ohExtQs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const ohExtGet = <T>(path: string) => bffRequest<T>(`${BASE}/${path}`);
export const ohExtPost = <T>(path: string, body: object = {}) => bffRequest<T>(`${BASE}/${path}`, { method: "POST", body });
export const ohExtPatch = <T>(path: string, body: object = {}) => bffRequest<T>(`${BASE}/${path}`, { method: "PATCH", body });
/** Browser URL for a binary (PDF / CSV) document served through the oh-ext proxy. */
export const ohExtFileUrl = (path: string) => `${BASE}/${path}`;

// ---- Surveillance recalls -------------------------------------------------

export type OhSurvRecall = {
  uuid: string;
  customer_uuid: string | null;
  requirement_uuid: string | null;
  component_code: string | null;
  exam_type: string | null;
  stage: "due_soon" | "overdue" | "overdue_30";
  channel: "in_app" | "email" | "sms";
  status: string;
  to_address: string;
  subject: string;
  body: string;
  due_date: string | null;
  attempts: number;
  sent_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string;
  last_error: string;
  created_at: string | null;
};

export type OhRecallRunResult = { in_app: number; queued: number; sent: number; skipped: number; failed: number };

export const fetchSurvRecalls = (params: { status?: string; stage?: string; channel?: string; customer_uuid?: string; open_only?: boolean } = {}) =>
  ohExtGet<OhSurvRecall[]>(`oh/surveillance/recalls${ohExtQs(params)}`);
export const runSurvRecalls = (body: { within_days?: number; channels?: Array<"email" | "sms">; requirement_uuids?: string[] }) =>
  ohExtPost<OhRecallRunResult>("oh/surveillance/recalls/run", body);
export const acknowledgeSurvRecall = (uuid: string) => ohExtPost<OhSurvRecall>(`oh/surveillance/recalls/${uuid}/acknowledge`);

// ---- Compliance insights (trend, breakdowns, due windows) -----------------

export type OhBreakdownRow = { key: string; due: number; overdue: number; total: number };
export type OhDueWindow = "overdue_30_plus" | "overdue" | "next_7" | "next_30" | "next_90" | "later";
export type OhComplianceInsights = {
  generated_at: string;
  months: number;
  totals: { open: number; due: number; overdue: number; completed: number; waived: number };
  compliance: { rate_3m: number | null; rate_prev_3m: number | null; rate_period: number | null };
  completed: { last_30_days: number; previous_30_days: number };
  due_windows: Record<OhDueWindow, number>;
  trend: Array<{ month: string; label: string; due: number; completed: number; open: number; waived: number; rate: number | null }>;
  by_exam: OhBreakdownRow[];
  by_site: OhBreakdownRow[];
  by_department: OhBreakdownRow[];
  by_hazard_profile: OhBreakdownRow[];
  by_employer: OhBreakdownRow[];
};

export const fetchComplianceInsights = (months = 12) =>
  ohExtGet<OhComplianceInsights>(`oh/compliance/insights${ohExtQs({ months })}`);

// ---- Certificate of fitness documents and lifecycle ----------------------

export type OhCertificateHistory = {
  versions: Array<{
    uuid: string;
    version: number;
    status: string;
    in_force: boolean;
    valid_from: string | null;
    valid_to: string | null;
    signed_at: string | null;
    signed_by: number | null;
    outcome: string | null;
    restrictions: string[];
    withdrawn_at: string | null;
    withdrawal_reason: string | null;
    previous_uuid: string | null;
  }>;
  events: Array<{
    certificate_uuid: string;
    action: string;
    actor_name: string;
    summary: string;
    reason: string | null;
    occurred_at: string | null;
  }>;
};

export const certificatePdfUrl = (uuid: string) => ohExtFileUrl(`fitness-certificates/${uuid}/pdf`);
export const fetchCertificateHistory = (uuid: string) => ohExtGet<OhCertificateHistory>(`fitness-certificates/${uuid}/history`);
export const fetchCertificateVerifyLink = (uuid: string) =>
  ohExtGet<{ verify_url: string }>(`fitness-certificates/${uuid}/verify-link`);

// ---- Visit cancellations / no-shows report -------------------------------

export type OhCancellationReport = {
  from: string;
  to: string;
  total_visits: number;
  cancelled: number;
  no_show: number;
  no_show_rate: number | null;
  by_reason: Array<{ code: string; label: string; count: number }>;
  by_month: Array<{ month: string; cancelled: number; no_show: number }>;
  by_visit_type: Record<string, number>;
  by_employer: Record<string, number>;
  rows: Array<{ uuid: string; date: string | null; outcome: string; reason_code: string; reason: string; visit_type: string; employer: string }>;
};

export const fetchCancellationReport = (params: { from?: string; to?: string }) =>
  ohExtGet<OhCancellationReport>(`oh/reports/visit-cancellations${ohExtQs(params)}`);
export const cancellationReportCsvUrl = (params: { from?: string; to?: string }) =>
  ohExtFileUrl(`oh/reports/visit-cancellations/csv${ohExtQs(params)}`);

// ---- IOD notification pack ------------------------------------------------

/** Printable IOD / occupational disease notification pack (generic layout, marked to be verified). */
export const iodPackPdfUrl = (uuid: string) => ohExtFileUrl(`iod-cases/${uuid}/statutory-pack/pdf`);

// ---- Sick leave ----------------------------------------------------------

export type OhSickLeave = {
  uuid: string;
  customer_uuid: string | null;
  status: "issued" | "returned" | "cancelled" | string;
  start_date: string | null;
  days: number;
  expected_return: string | null;
  work_capacity: "unfit_all_work" | "modified_duties" | string;
  employer_note: string | null;
  signed_at: string | null;
  returned_on: string | null;
  return_outcome: string | null;
  return_restrictions: string[];
  cancel_reason: string | null;
  hr_notified_at: string | null;
  rtw_notified_at: string | null;
};

export const sickLeavePath = (uuid: string) => `oh/sick-leave/${uuid}`;
export const fetchSickLeave = (uuid: string) => ohExtGet<OhSickLeave>(sickLeavePath(uuid));
export const sickLeavePdfUrl = (uuid: string) => ohExtFileUrl(`oh/sick-leave/${uuid}/pdf`);
export const recordSickLeaveReturn = (uuid: string, body: { returned_on: string; outcome: string; restrictions?: string[] }) =>
  ohExtPost<OhSickLeave>(`oh/sick-leave/${uuid}/return`, body);
export const cancelSickLeave = (uuid: string, reason: string) => ohExtPost<OhSickLeave>(`oh/sick-leave/${uuid}/cancel`, { reason });
export const fetchSickLeaveReturnDue = (within = 7) => ohExtGet<OhSickLeave[]>(`oh/sick-leave/return-due${ohExtQs({ within })}`);

// ---- Integration layer: exports, roster import, device result import -----

export type OhExportDataset = { code: string; label: string; columns: string[] };
export type OhIntegrationCatalogue = {
  datasets: OhExportDataset[];
  device_templates: Record<"hearing" | "lung", string[]>;
  roster_columns: string[];
  scopes: { events: string[]; api: string[] };
};
export type OhImportRow = {
  line: number;
  customer_uuid: string;
  employee_number: string;
  action: string;
  errors?: string[];
  changes?: string[];
  outcome?: string | null;
};
export type OhImportResult = { dry_run: boolean; summary: Record<string, number>; rows: OhImportRow[] };

export const fetchIntegrationCatalogue = () => ohExtGet<OhIntegrationCatalogue>("oh/integrations");
export const ohExportCsvUrl = (dataset: string, params: { from?: string; to?: string; updated_since?: string } = {}) =>
  ohExtFileUrl(`oh/integrations/exports/${dataset}/csv${ohExtQs(params)}`);
export const ohTemplateCsvUrl = (kind: "roster" | "hearing" | "lung") => ohExtFileUrl(`oh/integrations/templates/${kind}/csv`);
export const importRoster = (body: { csv: string; dry_run: boolean; create_job_titles?: boolean }) =>
  ohExtPost<OhImportResult>("oh/integrations/roster-import", body);
export const importDeviceResults = (body: { program: "hearing" | "lung"; csv: string; dry_run: boolean }) =>
  ohExtPost<OhImportResult>("oh/integrations/device-import", body);
