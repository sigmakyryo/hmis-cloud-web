import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/**
 * Allowlisted proxy for the OH capabilities added after the module BFFs:
 * surveillance recalls, certificate/IOD/sick-leave documents, integrations,
 * data-subject requests, retention, audit and annual reports.
 * Paths are relative to the OHS API root.
 */
export const ohExtProxy = createOhModuleProxy({
  base: "",
  rules: {
    GET: [
      "oh/surveillance/recalls",
      "fitness-certificates/{id}/pdf",
      "fitness-certificates/{id}/verify-link",
      "fitness-certificates/{id}/history",
      "oh/visit-cancellation-reasons",
      "oh/reports/visit-cancellations",
      "oh/reports/visit-cancellations/csv",
    ],
    POST: ["oh/surveillance/recalls/run", "oh/surveillance/recalls/{id}/acknowledge"],
  },
  binary: [
    { path: "fitness-certificates/{id}/pdf", type: "application/pdf", filename: "certificate-of-fitness.pdf" },
    { path: "oh/reports/visit-cancellations/csv", type: "text/csv", filename: "oh-visit-cancellations.csv" },
  ],
  queryKeys: ["status", "stage", "channel", "customer_uuid", "open_only", "limit", "from", "to"],
});
