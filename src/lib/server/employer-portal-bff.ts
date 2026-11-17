import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** Employer contacts. OHS takes the employer and pages from the session; the BFF only allowlists paths. */
export const employerPortalProxy = createOhModuleProxy({
  base: "/oh-portal",
  rules: {
    GET: ["me", "fitness", "random-compliance", "invoices", "invoices/{id}/pdf", "users", "requests", "annual-summary", "annual-summary/pdf", "annual-summary/csv"],
    POST: ["requests", "invoices/{id}/payment-notice"],
  },
  binary: [
    { path: "invoices/{id}/pdf", type: "application/pdf", filename: "invoice-statement.pdf" },
    { path: "annual-summary/pdf", type: "application/pdf", filename: "annual-summary.pdf" },
    { path: "annual-summary/csv", type: "text/csv; charset=utf-8", filename: "annual-summary.csv" },
  ],
  queryKeys: ["status", "q", "year"],
  created: ["requests", "invoices/{id}/payment-notice"],
  credential: "portal",
});

/** OH staff side: employer requests (staff) and portal contacts (administrators). */
export const employerPortalAdminProxy = createOhModuleProxy({
  base: "/oh-portal-admin",
  rules: {
    GET: ["requests", "contacts", "invitations", "branding", "employers/{id}/invoices", "payment-notices"],
    POST: ["requests/{id}", "contacts", "invitations", "invitations/{id}/revoke", "invoices", "payment-notices/{id}/mark-paid", "payment-notices/{id}/reject"],
    PATCH: ["contacts/{id}", "branding"],
  },
  queryKeys: ["status"],
  created: ["contacts", "invitations", "invoices"],
});
