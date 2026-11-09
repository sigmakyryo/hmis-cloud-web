import { bffRequest } from "@/lib/bff-client";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

export function createNativeOhVisit(payload: {
  customer_uuid: string; department_uuid: string; clinic_uuid: string;
  visit_date: string; visit_type_uuid: string; idempotency_key: string;
}) {
  return bffRequest<OhVisitEncounter>("/api/occupational-health/visits", { method: "POST", body: payload });
}

export function completeNativeOhVisit(uuid: string) {
  return bffRequest<OhVisitEncounter>(`/api/occupational-health/visits/${encodeURIComponent(uuid)}/complete`, { method: "POST", body: {} });
}
