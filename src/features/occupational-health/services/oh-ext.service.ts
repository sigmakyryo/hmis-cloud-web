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
export const runSurvRecalls = (body: { within_days?: number; channels?: Array<"email" | "sms"> }) =>
  ohExtPost<OhRecallRunResult>("oh/surveillance/recalls/run", body);
export const acknowledgeSurvRecall = (uuid: string) => ohExtPost<OhSurvRecall>(`oh/surveillance/recalls/${uuid}/acknowledge`);

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
