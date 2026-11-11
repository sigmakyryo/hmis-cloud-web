"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmNotice } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, isForbidden } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { AnnualReportSections } from "@/features/occupational-health/components/AnnualReportSections";
import {
  annualReportFileUrl,
  fetchAnnualReport,
  type AnnualAudience,
  type AnnualParams,
} from "@/features/occupational-health/services/oh-annual-report.service";
import { fetchOhEmployers } from "@/features/occupational-health/services/oh.service";

const field = "h-9 rounded-md border border-dash-border px-2.5 text-[13px]";

export function OhAnnualReportPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear - 1);
  const [employer, setEmployer] = useState("");
  const [audience, setAudience] = useState<AnnualAudience>("employer");
  const params: AnnualParams = { year, employer_uuid: employer || undefined, audience };
  const employers = useQuery({ queryKey: ["oh", "employers", "all"], queryFn: fetchOhEmployers, retry: false });
  const report = useQuery({ queryKey: ["oh-annual", year, employer, audience], queryFn: () => fetchAnnualReport(params), retry: false });

  return (
    <ImmPageShell title="Annual report" testId="oh-annual-report-page">
      <div className="flex flex-wrap items-end gap-3 px-1 pb-3 text-[13px]">
        <label className="space-y-1">
          <span className="block text-dash-muted">Year</span>
          <select aria-label="Year" className={field} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 8 }, (_, i) => thisYear - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">Employer</span>
          <select aria-label="Employer" className={field} value={employer} onChange={(e) => setEmployer(e.target.value)}>
            <option value="">All employers</option>
            {(employers.data ?? []).map((e) => (
              <option key={e.uuid} value={e.uuid}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">For</span>
          <select aria-label="Audience" className={field} value={audience} onChange={(e) => setAudience(e.target.value as AnnualAudience)}>
            <option value="employer">Employer (small counts hidden)</option>
            <option value="regulator">Regulator (exact counts, administrators)</option>
          </select>
        </label>
        <a className="text-primary underline" href={annualReportFileUrl(params, "pdf")} target="_blank" rel="noreferrer" data-testid="oh-annual-pdf">
          PDF
        </a>
        <a className="text-primary underline" href={annualReportFileUrl(params, "csv")} data-testid="oh-annual-csv">
          CSV
        </a>
      </div>
      {audience === "regulator" ? (
        <ImmNotice tone="warning">The layout is generic. Check it against the regulator&apos;s current return form before you submit it.</ImmNotice>
      ) : null}
      {report.isLoading ? <QuietLoading /> : null}
      {report.isError ? (
        <LoadError>{isForbidden(report.error) ? "Only an administrator can produce the regulator summary." : errorText(report.error, "Could not build the report.")}</LoadError>
      ) : null}
      {report.data ? (
        <div className="px-1">
          <AnnualReportSections report={report.data} />
        </div>
      ) : null}
    </ImmPageShell>
  );
}
