import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/**
 * One fitness view BFF. The signed feeds (/oh-fit/feed/*) are server-to-server only and never proxied.
 * Audit (/oh-audit) is reached through `fitnessAuditProxy`.
 */
export const fitnessProxy = createOhModuleProxy({
  base: "/oh-fit",
  rules: {
    GET: ["board", "workers/{id}", "courses", "training", "clients", "outbox"],
    POST: ["refresh", "courses", "courses/seed-examples", "training", "training/{id}/revoke", "clients", "clients/{id}/test"],
    PATCH: ["courses/{id}", "clients/{id}"],
  },
  queryKeys: ["employer_uuid", "site", "status", "q", "customer_uuid", "course_uuid", "state", "module", "entity_type"],
  created: ["courses", "training", "clients", "clients/{id}/test"],
});

/** Read-only OH audit trail (`GET /oh-audit`, OHS allows tenant administrators only). */
export const fitnessAuditProxy = createOhModuleProxy({
  base: "",
  rules: { GET: ["oh-audit", "oh-audit/csv", "oh-audit/history/{id}"] },
  binary: [{ path: "oh-audit/csv", type: "text/csv; charset=utf-8", filename: "oh-audit.csv" }],
  queryKeys: ["module", "entity_type", "entity_uuid", "action", "actor", "from", "to", "q", "limit"],
});
