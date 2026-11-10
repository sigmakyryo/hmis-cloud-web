import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { BffError, bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohDrugAlcohol;

export type DaReason =
  | "pre_employment"
  | "random"
  | "post_incident"
  | "reasonable_suspicion"
  | "return_to_duty"
  | "follow_up"
  | "periodic"
  | "voluntary";

export type DaScreenResult = "negative" | "non_negative" | "invalid";

export type DaTest = {
  uuid: string;
  reference: string;
  customer_uuid: string;
  customer_initials: string;
  employer_name: string;
  department_name: string;
  reason: DaReason;
  specimen_types: string[];
  status: string;
  safety_critical: boolean;
  visit_uuid: string | null;
  policy: { uuid: string; name: string; version: number | null } | null;
  created_at: string | null;
  arrived_at: string | null;
  proceed_by_at: string | null;
  consent_given: boolean;
  id_verified: boolean;
  id_method: string;
  custody: {
    ccf_number: string;
    specimen_id: string;
    seal_number: string;
    seal_intact: boolean | null;
    collector_initials: string;
    collection_site: string;
    split_specimen: boolean;
    observed: boolean;
    observed_reason: string;
    temperature_c: number | null;
    temperature_read_minutes: number | null;
    temperature_in_range: boolean | null;
    validity_checked: boolean;
    specimen_flag: string | null;
    collected_at: string | null;
    limits: { temp_min_c: number; temp_max_c: number; temp_read_within_minutes: number };
  };
  shy: {
    type: string;
    started_at: string | null;
    deadline_at: string | null;
    ended_at: string | null;
    outcome: string;
    max_fluid_oz: number;
    lung_attempts: number;
  };
  alcohol: {
    outcome: string;
    screen_value: number | null;
    screen_at: string | null;
    confirm_value: number | null;
    confirm_at: string | null;
    confirm_earliest_at: string | null;
    confirm_latest_at: string | null;
    unit: string;
    device: string;
  };
  screen_outcome: string;
  poct_results: Array<{ code: string; result: DaScreenResult }>;
  lab: {
    ordered_at: string | null;
    resulted_at: string | null;
    order_ref: string;
    results: Array<{ code: string; value: number | null; unit: string; cutoff: number | null; positive: boolean }>;
  };
  refusal: boolean;
  refusal_reason: string;
  final_result: string | null;
  final_substances: string[];
  fitness_outcome: string;
  restricted_until: string | null;
  verified_at: string | null;
  retest_required: boolean;
  retest_observed: boolean;
  retain_until: string | null;
  purged: boolean;
  mro: { uuid: string; status: string; trigger: string; verification: string } | null;
  custody_events: Array<{ event: string; actor_initials: string; occurred_at: string | null }>;
  detail_visible: boolean;
  notes: string;
  refusal_reasons?: string[];
};

export type DaStatus = {
  uuid: string;
  customer_uuid: string;
  status: string;
  fit_for_safety_critical: boolean;
  safety_critical: boolean;
  reason_code: string | null;
  since: string | null;
  restricted_until?: string | null;
};

export type DaPolicySnapshot = {
  standard?: string;
  disclaimer?: string;
  reasons: DaReason[];
  specimen_types: string[];
  panel: Array<{ code: string; name: string; class?: string; cutoffs?: Record<string, { screen: number | null; confirm: number | null; unit: string }> }>;
  alcohol: {
    unit: string;
    screen_threshold: number;
    restricted_threshold: number;
    positive_threshold: number;
    wait_min_minutes: number;
    wait_max_minutes: number;
    restricted_hours: number;
  };
  collection: Record<string, unknown> & { dilute_negative_rule?: string; split_specimen?: boolean };
  safety_critical?: { all?: boolean; departments?: string[]; job_titles?: string[]; sites?: string[]; zones?: string[] };
  consequences?: Record<string, string>;
  billing?: { test_products?: Record<string, string>; confirmation_lab_product_uuid?: string | null };
  random?: { annual_drug_rate?: number; annual_alcohol_rate?: number; frequency?: string };
  rtd?: { followup_tests?: number; followup_months?: number; observed?: boolean; sap_required?: boolean };
  retention?: { negative_years?: number; non_negative_years?: number };
  fitness_gate?: "off" | "warn" | "block";
  [key: string]: unknown;
};

export type DaPolicy = {
  uuid: string;
  code: string;
  name: string;
  standard: string;
  description: string;
  is_example: boolean;
  employer_uuid?: string | null;
  employer_name?: string | null;
  published_version: { uuid: string; number: number; status: string; snapshot: DaPolicySnapshot; published_at: string | null; content_hash?: string } | null;
  draft_snapshot?: DaPolicySnapshot | null;
  versions?: Array<{ uuid: string; number: number; status: string; published_at: string | null; content_hash?: string }>;
};

export type DaVisitPanel = {
  visit_uuid: string | null;
  customer_uuid: string;
  policy: {
    uuid: string;
    name: string;
    version: number;
    reasons: DaReason[];
    specimen_types: string[];
    panel: Array<{ code: string; name: string }>;
    alcohol: DaPolicySnapshot["alcohol"];
    collection: Record<string, unknown>;
    is_example: boolean;
  } | null;
  status: DaStatus | null;
  tests: DaTest[];
  open: {
    random_selections: Array<{ uuid: string; kind: string; proceed_by_at: string | null }>;
    followups: Array<{ uuid: string; sequence: number; due_date: string; kind: string; observed: boolean }>;
    rtd_cases: Array<{ uuid: string }>;
  };
  refusal_reasons: string[];
  can_view_results: boolean;
};

export type DaDueRow = {
  kind: string;
  uuid: string;
  customer_uuid: string;
  customer_initials: string;
  label: string;
  due_at: string | null;
  status: string;
  links: Record<string, string | null | undefined>;
};

export type DaDue = { rows: DaDueRow[]; counts: Record<string, number> };

export type DaMroReview = {
  uuid: string;
  status: string;
  trigger: string;
  donor_contacted: boolean;
  interview_at: string | null;
  interview_notes: string;
  legitimate_prescription: boolean;
  prescription: { medication?: string; prescriber_verified?: boolean } | null;
  safety_concern: boolean;
  verification: string;
  retest_required: boolean;
  split_requested_at: string | null;
  split_result: string;
  reviewer_initials: string;
  verified_at: string | null;
  created_at: string | null;
  test: DaTest | null;
  verifications?: string[];
};

export type DaPool = {
  uuid: string;
  code: string;
  name: string;
  policy_uuid: string | null;
  policy_name: string | null;
  employer_uuid: string | null;
  annual_drug_rate: number;
  annual_alcohol_rate: number;
  frequency: "weekly" | "monthly" | "quarterly";
  criteria: { departments?: string[]; job_titles?: string[]; sites?: string[]; safety_critical_only?: boolean };
  proceed_window_minutes: number;
  alternates_count: number;
  active: boolean;
  last_draw_at: string | null;
  last_period: string | null;
};

export type DaSelection = {
  uuid: string;
  customer_uuid: string;
  customer_initials: string;
  rank: number;
  kind: string;
  is_alternate: boolean;
  status: string;
  notified_at: string | null;
  proceed_by_at: string | null;
  arrived_at: string | null;
  overdue: boolean;
  excuse_reason: string;
};

export type DaDraw = {
  uuid: string;
  pool_uuid: string | null;
  pool_name: string | null;
  period_label: string;
  drawn_at: string | null;
  algorithm: string;
  seed_hex: string;
  seed_commitment: string;
  population_hash: string;
  population_size: number;
  drug_selected: number;
  alcohol_selected: number;
  alternates: number;
  drawn_by: string;
  audit: Record<string, unknown> | null;
  selections: DaSelection[];
};

export type DaCompliance = {
  pool_uuid: string;
  pool_name: string;
  year: number;
  average_population: number;
  draws: number;
  drug_tests_done: number;
  drug_tests_required: number;
  alcohol_tests_done: number;
  alcohol_tests_required: number;
  drug_on_track: boolean;
  alcohol_on_track: boolean;
  no_shows: number;
  excused: number;
};

export type DaRtdCase = {
  uuid: string;
  customer_uuid: string;
  customer_initials: string;
  status: string;
  sap_name: string;
  referred_at: string | null;
  assessed_at: string | null;
  sap_cleared_at: string | null;
  recommendation: string;
  rtd_passed_at: string | null;
  followup_tests_required: number;
  followup_months: number;
  followup_observed: boolean;
  followups_done?: number;
  notes: string;
  followups: Array<{ uuid: string; sequence: number; due_date: string; window_end: string | null; kind: string; observed: boolean; status: string }>;
};

export type DaReportCell = {
  group: string;
  tests: number;
  verified: number;
  non_negative: number | null;
  rate: number | null;
  suppressed: boolean;
};

export type DaReport = {
  from: string;
  to: string;
  k_threshold: number;
  totals: {
    tests: number;
    verified: number;
    in_progress: number;
    cancelled: number;
    refusals: number | null;
    non_negative: number | null;
    positivity_rate: number | null;
  };
  by_reason: DaReportCell[];
  by_employer: DaReportCell[];
  by_month: DaReportCell[];
  by_substance: Array<{ substance: string; positives: number | null; suppressed: boolean }>;
  turnaround_hours: { collection_to_verified: number | null; lab_order_to_result: number | null; mro_review: number | null };
  random_compliance: DaCompliance[];
};

export type DaAudit = {
  uuid: string;
  entity_type: string;
  entity_uuid: string | null;
  action: string;
  actor_type: string;
  actor_name: string;
  summary: string;
  occurred_at: string | null;
  after?: Record<string, unknown> | null;
};

export type DaNotification = {
  uuid: string;
  event: string;
  channel: string;
  status: string;
  subject: string;
  attempts: number;
  sent_at: string | null;
  created_at: string | null;
  last_error?: string;
};

type Results<T> = { results: T[] };

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const post = <T>(path: string, body: object = {}) => bffRequest<T>(`${BASE}/${path}`, { method: "POST", body });
const get = <T>(path: string) => bffRequest<T>(`${BASE}/${path}`);

async function download(path: string, fallback: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${BASE}/${path}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    let message = "Download failed.";
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      // keep default
    }
    throw new BffError(message, response.status);
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { blob: await response.blob(), filename: match?.[1] ?? fallback };
}

// Worklist, tests, visit panel
export const fetchDaDue = (within = 14) => get<DaDue>(`due${qs({ within })}`);
export const fetchDaTests = (params: { status?: string; reason?: string; q?: string; fitness?: string; customer_uuid?: string } = {}) =>
  get<{ results: DaTest[]; count: number }>(`tests${qs(params)}`);
export const fetchDaTest = (uuid: string) => get<DaTest>(`tests/${uuid}`);
export const startDaTest = (body: {
  customer_uuid?: string;
  reason?: DaReason;
  policy_uuid?: string;
  visit_uuid?: string | null;
  specimen_types?: string[];
  random_selection_uuid?: string;
  followup_uuid?: string;
  rtd_case_uuid?: string;
  customer_name?: string;
}) => post<DaTest>("tests", body);
export const recordDaConsent = (uuid: string, body: { consent_given: boolean; id_verified: boolean; id_method: string }) =>
  post<DaTest>(`tests/${uuid}/consent`, body);
export const recordDaCustody = (uuid: string, body: Record<string, unknown>) =>
  post<{ test: DaTest; warnings: string[]; requires_observed_recollection: boolean }>(`tests/${uuid}/custody`, body);
export const recordDaShy = (uuid: string, body: { action: "start" | "end"; type?: "bladder" | "lung"; outcome?: string; fluid_oz?: number }) =>
  post<DaTest>(`tests/${uuid}/shy`, body);
export const recordDaAlcohol = (uuid: string, body: { stage: "screen" | "confirm"; value: number; device?: string }) =>
  post<{ test: DaTest; warnings: string[] }>(`tests/${uuid}/alcohol`, body);
export const recordDaScreen = (uuid: string, body: { results: Array<{ code: string; result: DaScreenResult }>; send_to_lab?: boolean }) =>
  post<DaTest>(`tests/${uuid}/screen`, body);
export const recordDaRefusal = (uuid: string, body: { reason: string; notes?: string }) => post<DaTest>(`tests/${uuid}/refusal`, body);
export const cancelDaTest = (uuid: string, reason: string) => post<DaTest>(`tests/${uuid}/cancel`, { reason });
export const recordDaLabResults = (uuid: string, body: { results: Array<{ code: string; value?: number | null; unit?: string; result?: string }>; specimen_flag?: string }) =>
  post<DaTest>(`tests/${uuid}/lab-results`, body);
export const downloadDaCcf = (uuid: string) => download(`tests/${uuid}/ccf.pdf`, "custody-form.pdf");
export const downloadDaLetter = (uuid: string, audience: "employer" | "worker") =>
  download(`tests/${uuid}/letter.pdf${qs({ audience })}`, "result-letter.pdf");
export const fetchDaVisitPanel = (visitUuid: string, customerUuid?: string | null) =>
  get<DaVisitPanel>(`visits/${visitUuid}/panel${qs({ customer_uuid: customerUuid ?? undefined })}`);
export const fetchDaPatient = (customerUuid: string) =>
  get<{ customer_uuid: string; status: DaStatus | null; tests: DaTest[]; rtd_cases: DaRtdCase[]; can_view_results: boolean }>(
    `patients/${customerUuid}`,
  );
export const fetchDaFitnessGate = (customerUuid: string) =>
  get<{ mode: string; blocking: boolean; issues: Array<{ code: string; message: string }> }>(`fitness-gate${qs({ customer_uuid: customerUuid })}`);

// MRO
export const fetchDaMroQueue = (includeClosed = false) =>
  get<Results<DaMroReview>>(`mro/queue${qs({ include_closed: includeClosed ? 1 : undefined })}`).then((r) => r.results);
export const fetchDaMroReview = (uuid: string) => get<DaMroReview>(`mro/${uuid}`);
export const recordDaMroInterview = (
  uuid: string,
  body: { donor_contacted?: boolean; notes?: string; legitimate_prescription?: boolean; prescription?: { medication?: string; prescriber_verified?: boolean }; safety_concern?: boolean },
) => post<DaMroReview>(`mro/${uuid}/interview`, body);
export const verifyDaMro = (
  uuid: string,
  body: { verification: string; substances?: string[]; donor_unreachable?: boolean; retest_required?: boolean; retest_observed?: boolean },
) => post<DaMroReview>(`mro/${uuid}/verify`, body);
export const requestDaSplit = (uuid: string) => post<DaMroReview>(`mro/${uuid}/split-request`);
export const recordDaSplitResult = (uuid: string, result: string) => post<DaMroReview>(`mro/${uuid}/split-result`, { result });

// Policies
export const fetchDaPolicies = () => get<Results<DaPolicy>>("policies").then((r) => r.results);
export const fetchDaPolicy = (uuid: string) => get<DaPolicy>(`policies/${uuid}`);
export const createDaPolicy = (body: { code: string; name: string; standard?: string; description?: string; employer_uuid?: string; snapshot?: DaPolicySnapshot }) =>
  post<DaPolicy>("policies", body);
export const publishDaPolicy = (uuid: string, snapshot?: DaPolicySnapshot) =>
  post<DaPolicy>(`policies/${uuid}/publish`, snapshot ? { snapshot } : {});
export const seedDaPolicies = () => post<{ created: number; results: DaPolicy[] }>("policies/seed-examples");

// Random testing
export const fetchDaPools = () => get<Results<DaPool>>("pools").then((r) => r.results);
export const createDaPool = (body: Partial<DaPool>) => post<DaPool>("pools", body);
export const updateDaPool = (uuid: string, body: Partial<DaPool>) =>
  bffRequest<DaPool>(`${BASE}/pools/${uuid}`, { method: "PATCH", body });
export const previewDaPool = (uuid: string) =>
  get<{ population: number; periods_per_year: number; drug_per_draw: number; alcohol_per_draw: number; next_period: string }>(`pools/${uuid}/preview`);
export const drawDaPool = (uuid: string, periodLabel?: string) => post<DaDraw>(`pools/${uuid}/draw`, periodLabel ? { period_label: periodLabel } : {});
export const fetchDaDraws = (poolUuid?: string) => get<Results<DaDraw>>(`draws${qs({ pool_uuid: poolUuid })}`).then((r) => r.results);
export const fetchDaCompliance = (year?: number) => get<DaCompliance[]>(`random/compliance${qs({ year })}`);
export const notifyDaSelection = (uuid: string, channel: "email" | "sms" = "email") => post<DaSelection>(`selections/${uuid}/notify`, { channel });
export const noShowDaSelection = (uuid: string, treatAsRefusal = true) =>
  post<DaSelection>(`selections/${uuid}/no-show`, { treat_as_refusal: treatAsRefusal });
export const excuseDaSelection = (uuid: string, reason: string) =>
  post<{ selection: DaSelection; alternate: DaSelection | null }>(`selections/${uuid}/excuse`, { reason });

// Return to duty
export const fetchDaRtdCases = (status?: string) => get<Results<DaRtdCase>>(`rtd${qs({ status })}`).then((r) => r.results);
export const fetchDaRtdCase = (uuid: string) => get<DaRtdCase>(`rtd/${uuid}`);
export const recordDaSapStep = (
  uuid: string,
  body: { action: "assess" | "clear" | "note"; sap_name?: string; recommendation?: string; followup_tests?: number; followup_months?: number; notes?: string },
) => post<DaRtdCase>(`rtd/${uuid}/sap`, body);
export const replanDaRtd = (uuid: string, body: { followup_tests?: number; followup_months?: number; observed?: boolean }) =>
  post<DaRtdCase>(`rtd/${uuid}/plan`, body);

// Reports, audit, retention
export const fetchDaReport = (params: { from?: string; to?: string; employer_uuid?: string } = {}) => get<DaReport>(`reports${qs(params)}`);
export const downloadDaReportCsv = (params: { from?: string; to?: string } = {}) => download(`reports.csv${qs(params)}`, "drug-alcohol-report.csv");
export const fetchDaAudits = (params: { entity_type?: string; action?: string } = {}) =>
  get<Results<DaAudit>>(`audits${qs(params)}`).then((r) => r.results);
export const fetchDaNotifications = () => get<Results<DaNotification>>("notifications").then((r) => r.results);
export const runDaRetention = (purge: boolean) =>
  post<{ eligible: number; purged: number; dry_run: boolean }>("retention", purge ? { purge: true } : {});
