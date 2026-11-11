import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** Annual employer / regulator summaries (OHS /oh-reports, see ANNUAL_REPORTS.md in the OH service). Read-only. */
export const ohAnnualReportProxy = createOhModuleProxy({
  base: "/oh-reports",
  rules: { GET: ["annual", "annual/csv", "annual/pdf", "annual/trend"] },
  binary: [
    { path: "annual/pdf", type: "application/pdf", filename: "oh-annual-summary.pdf" },
    { path: "annual/csv", type: "text/csv; charset=utf-8", filename: "oh-annual-summary.csv" },
  ],
  queryKeys: ["year", "employer_uuid", "audience", "from", "to", "years"],
});
