import { bffRequest } from "@/lib/bff-client";

export type OhVisitEligibility = {
  eligible: boolean;
  pre_employment_form_completed?: boolean;
  block_repeat_pre_employment?: boolean;
  next_assessment_date?: string | null;
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

type OhVisitPolicy = { block_repeat_pre_employment: boolean };
const VISIT_POLICY_URL = "/api/occupational-health/visit-policy";

export function fetchOhVisitPolicy() {
  return bffRequest<OhVisitPolicy>(VISIT_POLICY_URL);
}

export function updateOhVisitPolicy(blockRepeat: boolean) {
  return bffRequest<OhVisitPolicy>(VISIT_POLICY_URL, {
    method: "PUT",
    body: { block_repeat_pre_employment: blockRepeat },
  });
}
