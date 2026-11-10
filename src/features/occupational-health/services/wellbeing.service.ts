import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohWellbeing;

export type WbProvider = {
  uuid: string;
  name: string;
  kind: "eap" | "sap" | "counsellor" | "treatment";
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  referral_instructions: string;
  sessions_included: number | null;
  active: boolean;
};

export type WbSession = {
  uuid: string;
  session_at: string | null;
  kind: string;
  attendance: "attended" | "missed" | "cancelled";
  note: string;
  recorded_by_initials: string;
};

/** Everyone gets the status fields; `detail: true` adds the clinical fields. */
export type WbCase = {
  uuid: string;
  customer_uuid: string;
  customer_initials: string;
  status: "open" | "referred" | "engaged" | "closed";
  in_support: boolean;
  opened_at: string | null;
  closed_at: string | null;
  return_to_duty: { uuid: string; status: string; followups_done: number; followups_required: number } | null;
  detail: boolean;
  origin?: "positive" | "refusal" | "self_referral" | "referral";
  safe_harbour?: boolean;
  outcome?: "" | "ongoing" | "recovered" | "relapsed" | "left" | "declined";
  outcome_at?: string | null;
  consent?: { given: boolean; scope: string; at: string | null; withdrawn_at: string | null };
  provider?: WbProvider | null;
  referred_at?: string | null;
  first_session_at?: string | null;
  review_due_on?: string | null;
  clinician_initials?: string;
  plan?: { treatment?: string; goals?: string; relapse_prevention?: string; supports?: string; review_every_weeks?: number };
  notes?: string;
  sessions?: WbSession[];
  attendance?: { attended: number; missed: number };
};

export type WbDiscipline = {
  uuid: string;
  customer_uuid: string;
  action: string;
  decided_on: string | null;
  note: string;
  recorded_by_initials: string;
  test_uuid: string | null;
};

export type WbReport = {
  from: string;
  to: string;
  k_threshold: number;
  totals: {
    cases: number | null;
    open: number | null;
    engaged: number | null;
    engagement_rate: number | null;
    median_days_to_first_session: number | null;
    safe_harbour: number | null;
  };
  by_origin: Array<{ group: string; cases: number | null }>;
  by_outcome: Array<{ group: string; cases: number | null }>;
  discipline: Array<{ group: string; count: number | null }>;
};

type Results<T> = { results: T[] };

const get = <T>(path: string) => bffRequest<T>(`${BASE}/${path}`);
const post = <T>(path: string, body: object = {}) => bffRequest<T>(`${BASE}/${path}`, { method: "POST", body });
const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const fetchWbProviders = () => get<Results<WbProvider>>("providers").then((r) => r.results);
export const createWbProvider = (body: Partial<WbProvider>) => post<WbProvider>("providers", body);
export const updateWbProvider = (uuid: string, body: Partial<WbProvider>) =>
  bffRequest<WbProvider>(`${BASE}/providers/${uuid}`, { method: "PATCH", body });

export const fetchWbCases = (status?: string, customerUuid?: string) =>
  get<Results<WbCase> & { can_manage: boolean }>(`cases${qs({ status, customer_uuid: customerUuid })}`);
export const fetchWbCase = (uuid: string) => get<WbCase>(`cases/${uuid}`);
export const openWbCase = (body: { customer_uuid: string; customer_initials?: string; origin?: "self_referral" | "referral"; safe_harbour?: boolean }) =>
  post<WbCase>("cases", body);
export const recordWbConsent = (uuid: string, body: { scope?: "eap" | "sap" | "both"; withdraw?: boolean }) => post<WbCase>(`cases/${uuid}/consent`, body);
export const referWbCase = (uuid: string, providerUuid: string) => post<WbCase>(`cases/${uuid}/refer`, { provider_uuid: providerUuid });
export const saveWbPlan = (uuid: string, body: Record<string, unknown>) => post<WbCase>(`cases/${uuid}/plan`, body);
export const recordWbSession = (uuid: string, body: { session_at: string; kind?: string; attendance?: string; note?: string }) =>
  post<WbCase>(`cases/${uuid}/sessions`, body);
export const recordWbOutcome = (uuid: string, outcome: string, note?: string) => post<WbCase>(`cases/${uuid}/outcome`, { outcome, note });
export const fetchWbPatient = (customerUuid: string) =>
  get<{ customer_uuid: string; in_support: boolean; cases: WbCase[] }>(`patients/${customerUuid}`);

export const fetchWbDiscipline = (customerUuid?: string) =>
  get<Results<WbDiscipline>>(`discipline${qs({ customer_uuid: customerUuid })}`).then((r) => r.results);
export const recordWbDiscipline = (body: { customer_uuid: string; test_uuid?: string; action: string; decided_on?: string; note?: string }) =>
  post<WbDiscipline>("discipline", body);

export const fetchWbReport = (from?: string, to?: string) => get<WbReport>(`reports${qs({ from, to })}`);

export const WB_STATUS_LABEL: Record<string, string> = {
  open: "New",
  referred: "Referred",
  engaged: "Attending",
  closed: "Closed",
};
export const WB_ORIGIN_LABEL: Record<string, string> = {
  positive: "After a positive result",
  refusal: "After a refusal",
  self_referral: "Asked for help",
  referral: "Referred by a clinician",
};
export const WB_OUTCOME_LABEL: Record<string, string> = {
  "": "Not yet",
  ongoing: "Ongoing",
  recovered: "Recovered",
  relapsed: "Relapsed",
  left: "Left the company",
  declined: "Declined support",
};
export const WB_PROVIDER_KIND_LABEL: Record<string, string> = {
  eap: "Employee assistance (EAP)",
  sap: "Substance abuse professional (SAP)",
  counsellor: "Counsellor",
  treatment: "Treatment centre",
};
export const WB_ACTION_LABEL: Record<string, string> = {
  none: "No action",
  counselling_only: "Support only",
  verbal_warning: "Verbal warning",
  written_warning: "Written warning",
  final_warning: "Final warning",
  suspension: "Suspension",
  dismissal: "Dismissal",
  other: "Other",
};
