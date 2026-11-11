import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** Employer contacts. OHS takes the employer and pages from the session; the BFF only allowlists paths. */
export const employerPortalProxy = createOhModuleProxy({
  base: "/oh-portal",
  rules: {
    GET: ["me", "fitness", "random-compliance", "invoices", "invoices/{id}/pdf", "users", "requests", "annual-summary", "annual-summary/pdf", "annual-summary/csv"],
    POST: ["requests"],
  },
  binary: [
    { path: "invoices/{id}/pdf", type: "application/pdf", filename: "invoice-statement.pdf" },
    { path: "annual-summary/pdf", type: "application/pdf", filename: "annual-summary.pdf" },
    { path: "annual-summary/csv", type: "text/csv; charset=utf-8", filename: "annual-summary.csv" },
  ],
  queryKeys: ["status", "q", "year"],
  created: ["requests"],
});

/** OH staff side: employer requests (staff) and portal contacts (administrators). */
export const employerPortalAdminProxy = createOhModuleProxy({
  base: "/oh-portal-admin",
  rules: {
    GET: ["requests", "contacts", "invitations", "branding"],
    POST: ["requests/{id}", "contacts", "invitations", "invitations/{id}/revoke"],
    PATCH: ["contacts/{id}", "branding"],
  },
  queryKeys: ["status"],
  created: ["contacts", "invitations"],
});
