import type { OhCancelReasonCode } from "@/features/occupational-health/utils/oh-cancel-reasons";
import { bffRequest } from "@/lib/bff-client";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

export type CreateNativeOhVisitPayload = {
  customer_uuid: string;
  department_uuid: string;
  clinic_uuid: string;
  visit_date: string;
  visit_type_uuid: string;
  idempotency_key: string;
  mode_of_payment: "cash" | "insurance" | "free";
  insurance_scheme?: string | null;
  requires_pre_authorization?: boolean;
  pre_authorization_number?: string;
  pre_authorization_comments?: string;
};

export function createNativeOhVisit(payload: CreateNativeOhVisitPayload) {
  return bffRequest<OhVisitEncounter>("/api/occupational-health/visits", {
    method: "POST",
    body: payload,
  });
}

export function completeNativeOhVisit(uuid: string) {
  return bffRequest<OhVisitEncounter>(
    `/api/occupational-health/visits/${encodeURIComponent(uuid)}/complete`,
    { method: "POST", body: {} },
  );
}

export type CancelNativeOhVisitPayload = {
  outcome: "cancelled" | "no_show";
  reason: string;
  /** Structured reason for reporting; OHS defaults it when left out. */
  reason_code?: OhCancelReasonCode;
};

export type CancelledOhVisitEncounter = OhVisitEncounter & {
  open_billing_lines?: number;
};

export function cancelNativeOhVisit(uuid: string, payload: CancelNativeOhVisitPayload) {
  return bffRequest<CancelledOhVisitEncounter>(
    `/api/occupational-health/visits/${encodeURIComponent(uuid)}/cancel`,
    { method: "POST", body: payload },
  );
}
