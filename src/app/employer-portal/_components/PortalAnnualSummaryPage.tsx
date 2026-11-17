"use client";

import { useQuery } from "@tanstack/react-query";
import { File02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { PortalPage, PortalPageHeader } from "@/features/employer-portal/components/PortalPrimitives";

import { AnnualReportSections } from "@/features/occupational-health/components/AnnualReportSections";
import { fetchPortalAnnualSummary, portalAnnualFileUrl } from "@/features/occupational-health/services/oh-annual-report.service";

import { PortalState } from "./PortalShell";

export function PortalAnnualSummaryPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear - 1);
  const query = useQuery({ queryKey: ["employer-portal", "annual", year], queryFn: () => fetchPortalAnnualSummary(year), retry: false });
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

  return (
    <PortalPage testId="employer-portal-annual">
      <PortalPageHeader icon={File02Icon} title="Annual summary" subtitle="Your company's year at a glance" />
      <div className="flex flex-wrap items-center gap-3 py-4 text-[13px]">
        <select aria-label="Year" className="h-9 rounded-lg border border-neutral-200 bg-white px-2.5" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <a className="font-medium underline" style={{ color: "var(--portal-accent)" }} href={portalAnnualFileUrl(year, "pdf")} target="_blank" rel="noreferrer">
          PDF
        </a>
        <a className="font-medium underline" style={{ color: "var(--portal-accent)" }} href={portalAnnualFileUrl(year, "csv")}>
          CSV
        </a>
      </div>
      <PortalState loading={query.isLoading} error={query.error}>
        {query.data ? <AnnualReportSections report={query.data} /> : null}
      </PortalState>
    </PortalPage>
  );
}
