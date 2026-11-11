import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohHealthPrograms;

export const HP_PROGRAMS = ["hearing", "lung", "vision", "ergonomics", "fatigue"] as const;
export type HpProgram = (typeof HP_PROGRAMS)[number];
export type HpOutcome = "fit" | "restricted" | "unfit";

export type HpSnapshot = {
  assignment: { all: boolean; roles: string[]; departments: string[]; sites: string[]; exposures: string[] };
  frequency_months: number;
  thresholds: Record<string, number | boolean>;
  billing?: { product_uuid: string | null };
  disclaimer?: string;
  standard?: { name: string; citation: string; notes?: string };
  [key: string]: unknown;
};

export type HpPolicy = {
  uuid: string;
  program: HpProgram;
  program_label: string;
  code: string;
  name: string;
  employer_uuid: string | null;
  description: string;
  is_example: boolean;
  version: number | null;
  snapshot: HpSnapshot | null;
  versions?: Array<{ uuid: string; number: number; status: string; published_at: string | null }>;
};

export type HpResult = {
  uuid: string;
  customer_uuid: string;
  worker_label: string;
  program: HpProgram;
  performed_at: string | null;
  is_baseline: boolean;
  data: Record<string, unknown>;
  computed: (Record<string, unknown> & { flags?: string[]; suggested_outcome?: HpOutcome }) | null;
  outcome: HpOutcome;
  outcome_overridden: boolean;
  referral: boolean;
  restrictions: string[];
  next_due_on: string | null;
  visit_uuid: string | null;
  billed: boolean;
  recorded_by_initials: string;
  notes: string;
  is_active: boolean;
};

export type HpDueRow = {
  customer_uuid: string;
  worker_label: string;
  employee_number: string;
  employer_name: string;
  job_title: string;
  site: string;
  program: HpProgram;
  policy_uuid: string;
  policy_name: string;
  due_on: string;
  state: "overdue" | "due" | "never";
  last_performed_at: string | null;
  last_outcome: HpOutcome | null;
};

export type HpDue = { rows: HpDueRow[]; counts: Record<string, number> };

export type HpReport = {
  from: string;
  to: string;
  programs: Array<{
    program: HpProgram;
    label: string;
    tests: number;
    workers: number;
    fit: number;
    restricted: number;
    unfit: number;
    referrals: number;
    overdue: number;
    flags: Record<string, number>;
    by_month: Array<{ month: string; tests: number; referrals: number }>;
  }>;
};

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const get = <T>(path: string) => bffRequest<T>(`${BASE}/${path}`);
const post = <T>(path: string, body: object = {}) => bffRequest<T>(`${BASE}/${path}`, { method: "POST", body });

export const fetchHpPolicies = async (program?: HpProgram) => (await get<{ results: HpPolicy[] }>(`policies${qs({ program })}`)).results;
export const fetchHpPolicy = (uuid: string) => get<HpPolicy>(`policies/${uuid}`);
export const createHpPolicy = (body: { program: HpProgram; code: string; name: string; description?: string; snapshot?: Partial<HpSnapshot> }) =>
  post<HpPolicy>("policies", body);
export const publishHpPolicy = (uuid: string, snapshot: Partial<HpSnapshot>) => post<HpPolicy>(`policies/${uuid}/publish`, { snapshot });
export const seedHpPolicies = () => post<{ created: number; results: HpPolicy[] }>("policies/seed-examples");
/** Cited reference standards (OSHA STS, NHANES III LLN, EU driver vision, RULA/REBA, Epworth), loaded as editable policies. */
export const seedHpReferencePolicies = () => post<{ created: number; results: HpPolicy[] }>("policies/seed-reference");

export const fetchHpDue = (params: { program?: string; within?: number; employer_uuid?: string } = {}) => get<HpDue>(`due${qs(params)}`);
export const fetchHpResults = async (params: { program?: string; customer_uuid?: string; visit_uuid?: string; outcome?: string; flag?: string } = {}) =>
  (await get<{ results: HpResult[] }>(`results${qs(params)}`)).results;
export const recordHpResult = (body: {
  program: HpProgram;
  customer_uuid: string;
  visit_uuid?: string;
  policy_uuid?: string;
  performed_at?: string;
  is_baseline?: boolean;
  data: Record<string, unknown>;
  outcome?: HpOutcome;
  restrictions?: string[];
  notes?: string;
}) => post<HpResult>("results", body);
export const voidHpResult = (uuid: string, reason: string) => post<HpResult>(`results/${uuid}/void`, { reason });
export const fetchHpTrend = (customerUuid: string, program: HpProgram) =>
  get<{ program: HpProgram; customer_uuid: string; worker_label: string; results: HpResult[] }>(`workers/${customerUuid}/${program}`);
export const fetchHpReports = (params: { from?: string; to?: string } = {}) => get<HpReport>(`reports${qs(params)}`);
