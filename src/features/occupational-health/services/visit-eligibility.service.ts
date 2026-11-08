import { bffRequest } from "@/lib/bff-client";

export type OhVisitEligibility = {
  eligible: boolean;
  code: "eligible" | "oh_risk_profile_required";
  message: string;
  episode_uuid: string | null;
  risk_profile_uuid: string | null;
  templates: { cof: string | null; exam: string | null };
};

export function fetchOhVisitEligibility(customerUuid: string) {
  const query = new URLSearchParams({ customer_uuid: customerUuid });
  return bffRequest<OhVisitEligibility>(
    `/api/occupational-health/visit-eligibility?${query}`,
  );
}
