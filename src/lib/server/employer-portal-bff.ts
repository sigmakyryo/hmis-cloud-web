import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** Employer contacts. OHS takes the employer and pages from the session; the BFF only allowlists paths. */
export const employerPortalProxy = createOhModuleProxy({
  base: "/oh-portal",
  rules: {
    GET: ["me", "fitness", "random-compliance", "invoices", "users", "requests"],
    POST: ["requests"],
  },
  queryKeys: ["status", "q", "year"],
  created: ["requests"],
});

/** OH staff side: employer requests (staff) and portal contacts (administrators). */
export const employerPortalAdminProxy = createOhModuleProxy({
  base: "/oh-portal-admin",
  rules: {
    GET: ["requests", "contacts"],
    POST: ["requests/{id}", "contacts"],
    PATCH: ["contacts/{id}"],
  },
  queryKeys: ["status"],
  created: ["contacts"],
});
