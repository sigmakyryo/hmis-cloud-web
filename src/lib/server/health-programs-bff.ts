import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

export const healthProgramsProxy = createOhModuleProxy({
  base: "/oh-hp",
  rules: {
    GET: ["policies", "policies/{id}", "due", "results", "workers/{id}/(hearing|lung|vision|ergonomics|fatigue)", "reports", "reference-standards"],
    POST: ["policies", "policies/seed-examples", "policies/seed-reference", "policies/{id}/publish", "results", "results/{id}/void"],
    PATCH: ["results/{id}"],
  },
  queryKeys: ["program", "within", "employer_uuid", "customer_uuid", "visit_uuid", "outcome", "flag", "from", "to"],
  created: ["policies", "results"],
});
