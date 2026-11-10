import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohFitness;

export type FitOverall = "fit" | "fit_with_restrictions" | "not_fit" | "unknown";
export type FitItemStatus = "ok" | "expiring" | "overdue" | "restricted" | "blocked" | "missing";
export type FitSource = "medical" | "immunisation" | "drug_alcohol" | "fit_test" | "training" | "programme";

export type FitItem = {
  source: FitSource;
  label: string;
  status: FitItemStatus;
  message: string;
  expires_on: string | null;
  restriction: string | null;
};

export type FitWorker = {
  customer_uuid: string;
  worker_label: string;
  employee_number: string;
  employer_uuid: string | null;
  employer_name: string;
  site: string;
  department: string;
  job_title: string;
  overall: FitOverall;
  reasons: Array<{ source: FitSource; status: FitItemStatus; message: string }>;
  restrictions: string[];
  earliest_expiry: string | null;
  items: FitItem[];
  zones: Array<{ code: string; name: string; status: string; valid_until: string | null }>;
  role_clearance: { job_title: string; status: string };
  computed_at: string;
  changed_at?: string | null;
};

export type FitBoardRow = {
  customer_uuid: string;
  worker_label: string;
  employee_number: string;
  employer_name: string;
  site: string;
  department: string;
  job_title: string;
  overall: FitOverall;
  reason: string | null;
  reason_count: number;
  earliest_expiry: string | null;
  computed_at: string | null;
};

export type FitBoard = {
  counts: Record<FitOverall | "due_soon", number>;
  employers: Array<{ uuid: string; name: string }>;
  sites: string[];
  results: FitBoardRow[];
};

export type FitCourse = {
  uuid: string;
  code: string;
  name: string;
  validity_months: number;
  required_for_all: boolean;
  required_roles: string[];
  required_departments: string[];
  required_sites: string[];
  required_zones: string[];
  on_missing: "restricted" | "not_fit";
  is_example: boolean;
};

export type FitTraining = {
  uuid: string;
  customer_uuid: string;
  worker_label: string;
  course_uuid: string | null;
  course_code: string | null;
  course_name: string | null;
  issued_on: string | null;
  expires_on: string | null;
  provider: string;
  certificate_ref: string;
  state: "valid" | "expiring" | "expired" | "removed";
};

export type FitFeedScope = "access_cards" | "rosters" | "payroll";

export type FitClient = {
  uuid: string;
  name: string;
  client_key: string;
  webhook_url: string;
  has_webhook: boolean;
  scopes: FitFeedScope[];
  is_active: boolean;
  last_used_at: string | null;
};

export type FitOutboxRow = {
  uuid: string;
  client_name: string;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string;
  created_at: string | null;
  sent_at: string | null;
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
const send = <T>(method: "POST" | "PATCH", path: string, body: object = {}) =>
  bffRequest<T>(`${BASE}/${path}`, { method, body });

export const fetchFitBoard = (params: { employer_uuid?: string; site?: string; status?: string; q?: string } = {}) =>
  get<FitBoard>(`board${qs(params)}`);
export const fetchFitWorker = (customerUuid: string) => get<FitWorker>(`workers/${customerUuid}`);
export const refreshFitness = (body: { customer_uuid?: string; employer_uuid?: string } = {}) =>
  send<{ refreshed: number }>("POST", "refresh", body);

export const fetchFitCourses = async () => (await get<{ results: FitCourse[] }>("courses")).results;
export const createFitCourse = (body: Partial<FitCourse>) => send<FitCourse>("POST", "courses", body);
export const updateFitCourse = (uuid: string, body: Partial<FitCourse> & { is_active?: boolean }) =>
  send<FitCourse>("PATCH", `courses/${uuid}`, body);
export const seedFitCourses = () => send<{ created: number }>("POST", "courses/seed-examples");

export const fetchFitTraining = async (params: { customer_uuid?: string; course_uuid?: string; state?: string } = {}) =>
  (await get<{ results: FitTraining[] }>(`training${qs(params)}`)).results;
export const recordFitTraining = (body: {
  customer_uuid: string;
  course_uuid: string;
  issued_on: string;
  expires_on?: string;
  provider?: string;
  certificate_ref?: string;
}) => send<FitTraining>("POST", "training", body);
export const revokeFitTraining = (uuid: string, reason: string) =>
  send<FitTraining>("POST", `training/${uuid}/revoke`, { reason });

export const fetchFitClients = async () => (await get<{ results: FitClient[] }>("clients")).results;
export const createFitClient = (body: { name: string; webhook_url?: string; scopes: FitFeedScope[] }) =>
  send<{ client: FitClient; secret: string }>("POST", "clients", body);
export const updateFitClient = (
  uuid: string,
  body: { name?: string; webhook_url?: string; scopes?: FitFeedScope[]; is_active?: boolean },
) => send<FitClient>("PATCH", `clients/${uuid}`, body);
export const testFitClient = (uuid: string) => send<{ uuid: string; status: string }>("POST", `clients/${uuid}/test`);
export const fetchFitOutbox = async () => (await get<{ results: FitOutboxRow[] }>("outbox")).results;
