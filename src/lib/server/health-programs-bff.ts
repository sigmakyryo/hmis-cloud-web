import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

export const healthProgramsProxy = createOhModuleProxy({
  base: "/oh-hp",
  rules: {
    GET: ["policies", "policies/{id}", "due", "results", "workers/{id}/(hearing|lung|vision|ergonomics|fatigue)", "reports"],
    POST: ["policies", "policies/seed-examples", "policies/{id}/publish", "results", "results/{id}/void"],
  },
  queryKeys: ["program", "within", "employer_uuid", "customer_uuid", "visit_uuid", "outcome", "flag", "from", "to"],
  created: ["policies", "results"],
});
