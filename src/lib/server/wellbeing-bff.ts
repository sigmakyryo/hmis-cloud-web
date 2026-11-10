import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** Wellbeing / EAP. Detail vs status-only is decided by OHS from the session; the BFF only allowlists paths. */
export const wellbeingProxy = createOhModuleProxy({
  base: "/oh-wb",
  rules: {
    GET: ["providers", "cases", "cases/{id}", "patients/{id}", "discipline", "reports"],
    POST: [
      "providers",
      "cases",
      "cases/{id}/(consent|refer|plan|sessions|outcome|clinician)",
      "discipline",
    ],
    PATCH: ["providers/{id}"],
  },
  queryKeys: ["status", "customer_uuid", "from", "to"],
  created: ["providers", "cases", "discipline"],
});
