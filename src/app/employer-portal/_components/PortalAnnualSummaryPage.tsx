"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AnnualReportSections } from "@/features/occupational-health/components/AnnualReportSections";
import { fetchPortalAnnualSummary, portalAnnualFileUrl } from "@/features/occupational-health/services/oh-annual-report.service";

import { PortalState } from "./PortalShell";

export function PortalAnnualSummaryPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear - 1);
  const query = useQuery({ queryKey: ["employer-portal", "annual", year], queryFn: () => fetchPortalAnnualSummary(year), retry: false });
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

  return (
    <div data-testid="employer-portal-annual" className="space-y-4 px-5 py-4">
      <h1 className="sr-only">Annual summary</h1>
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <select aria-label="Year" className="h-9 rounded-md border border-dash-border px-2.5" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <a className="text-primary underline" href={portalAnnualFileUrl(year, "pdf")} target="_blank" rel="noreferrer">
          PDF
        </a>
        <a className="text-primary underline" href={portalAnnualFileUrl(year, "csv")}>
          CSV
        </a>
      </div>
      <PortalState loading={query.isLoading} error={query.error}>
        {query.data ? <AnnualReportSections report={query.data} /> : null}
      </PortalState>
    </div>
  );
}
