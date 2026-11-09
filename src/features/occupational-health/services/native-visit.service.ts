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
