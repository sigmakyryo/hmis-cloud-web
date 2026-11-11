import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohPrivacy;

export type ConsentPurpose =
  | "oh_assessment"
  | "share_with_employer"
  | "drug_alcohol_testing"
  | "immunisation"
  | "wellbeing_referral"
  | "external_lab"
  | "research_aggregate"
  | "electronic_contact";
export const CONSENT_PURPOSE_LABEL: Record<ConsentPurpose, string> = {
  oh_assessment: "OH assessments",
  share_with_employer: "Share fitness outcome with employer",
  drug_alcohol_testing: "Drug & alcohol testing",
  immunisation: "Immunisation",
  wellbeing_referral: "Wellbeing / EAP referral",
  external_lab: "Send samples to an outside lab",
  research_aggregate: "Anonymous statistics",
  electronic_contact: "Contact by SMS / email",
};
export type ConsentMethod = "paper" | "electronic" | "verbal_witnessed";
export type OhConsent = {
  uuid: string;
  customer_uuid: string;
  purpose: ConsentPurpose;
  status: "granted" | "withdrawn";
  method: ConsentMethod;
  notice_version: string;
  note: string;
  recorded_by_name: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  withdraw_reason: string;
};

export type DsrKind = "access" | "rectification" | "erasure" | "restriction" | "objection" | "portability";
export const DSR_KIND_LABEL: Record<DsrKind, string> = {
  access: "Access (copy of data)",
  rectification: "Correct data",
  erasure: "Erasure (anonymise)",
  restriction: "Restrict processing",
  objection: "Object to processing",
  portability: "Portability (machine-readable copy)",
};
export type DsrStatus = "received" | "approved" | "rejected" | "completed";
export type DataSubjectRequest = {
  uuid: string;
  customer_uuid: string;
  kind: DsrKind;
  status: DsrStatus;
  channel: string;
  details: string;
  identity_check: string;
  due_on: string | null;
  requested_by_name: string;
  decided_by_name: string;
  decided_at: string | null;
  decision_note: string;
  completed_at: string | null;
  result: Record<string, unknown> | null;
  created_at: string | null;
  overdue: boolean;
};
export type AnonymiseResult = { dry_run: boolean; would_anonymise?: Record<string, number>; anonymised?: Record<string, number>; kept?: string };

const post = <T>(path: string, body: object) => bffRequest<T>(`${BASE}/${path}`, { method: "POST", body });

export const fetchConsents = async (customerUuid: string) =>
  (await bffRequest<{ results: OhConsent[] }>(`${BASE}/consents/${customerUuid}`)).results;
export const recordConsent = (customerUuid: string, body: { purpose: ConsentPurpose; method: ConsentMethod; notice_version?: string; note?: string }) =>
  post<OhConsent>(`consents/${customerUuid}`, body);
export const withdrawConsent = (uuid: string, reason: string) => post<OhConsent>(`consent/${uuid}/withdraw`, { reason });

export const fetchDsrs = async (status?: DsrStatus) =>
  (await bffRequest<{ results: DataSubjectRequest[] }>(`${BASE}/requests${status ? `?status=${status}` : ""}`)).results;
export const openDsr = (body: { customer_uuid: string; kind: DsrKind; channel?: string; details?: string; identity_check: string }) =>
  post<DataSubjectRequest>("requests", body);
export const decideDsr = (uuid: string, decision: "approve" | "reject", note: string) =>
  post<DataSubjectRequest>(`requests/${uuid}/decide`, { decision, note });
export const exportDsr = (uuid: string) => bffRequest<Record<string, unknown>>(`${BASE}/requests/${uuid}/export`);
export const anonymiseDsr = (uuid: string, apply: boolean) =>
  post<AnonymiseResult>(`requests/${uuid}/anonymise`, apply ? { apply: true, confirm: "ANONYMISE" } : {});
export const closeDsr = (uuid: string, note: string) => post<DataSubjectRequest>(`requests/${uuid}/close`, { note });
