"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useState } from "react";

import { errorText, isForbidden } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPageLayout } from "@/features/app-shell/components/page-layout";
import { OhAnnualPeriodDialog } from "@/features/occupational-health/components/annual/OhAnnualPeriodDialog";
import { OhAnnualPreviewDialog } from "@/features/occupational-health/components/annual/OhAnnualPreviewDialog";
import { OhAnnualReportView } from "@/features/occupational-health/components/annual/OhAnnualReportView";
import { OhAnnualToolbar } from "@/features/occupational-health/components/annual/OhAnnualToolbar";
import { periodLabel, type AnnualPeriod } from "@/features/occupational-health/components/annual/annual-utils";
import {
  annualReportFileUrl,
  fetchAnnualReport,
  fetchAnnualTrend,
  type AnnualAudience,
  type AnnualParams,
} from "@/features/occupational-health/services/oh-annual-report.service";
import { fetchOhEmployers } from "@/features/occupational-health/services/oh.service";

export function OhAnnualReportPage() {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => thisYear - i);
  const [period, setPeriod] = useState<AnnualPeriod>({ mode: "year", year: thisYear - 1 });
  const [employer, setEmployer] = useState("");
  const [audience, setAudience] = useState<AnnualAudience>("employer");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const params: AnnualParams =
    period.mode === "year"
      ? { year: period.year, employer_uuid: employer || undefined, audience }
      : { year: Number(period.to.slice(0, 4)), from: period.from, to: period.to, employer_uuid: employer || undefined, audience };
  const employers = useQuery({ queryKey: ["oh", "employers", "all"], queryFn: fetchOhEmployers, retry: false });
  const report = useQuery({
    queryKey: ["oh-annual", period, employer, audience],
    queryFn: () => fetchAnnualReport(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const trend = useQuery({
    queryKey: ["oh-annual-trend", employer, audience],
    queryFn: () => fetchAnnualTrend({ employer_uuid: employer || undefined, audience, years: 5 }),
    retry: false,
  });

  const forbidden = isForbidden(report.error);
  const r = report.data && !report.isError ? report.data : undefined;
  const series = [...(trend.data?.series ?? [])].sort((a, b) => a.year - b.year);
  const label = r?.period?.label ?? periodLabel(period);
  const employerName = r?.employer?.name ?? (employer ? (employers.data ?? []).find((e) => e.uuid === employer)?.name : undefined) ?? "All employers";

  return (
    <ListPageLayout data-testid="oh-annual-report-page">
      <OhAnnualToolbar
        periodText={periodLabel(period)}
        onChangePeriod={() => setPeriodOpen(true)}
        employers={employers.data ?? []}
        employer={employer}
        onEmployerChange={setEmployer}
        audience={audience}
        onAudienceChange={setAudience}
        isRefreshing={report.isFetching}
        onRefresh={() => {
          void report.refetch();
          void trend.refetch();
        }}
        canPreview={!forbidden}
        onPreview={() => setPreviewOpen(true)}
        csvHref={annualReportFileUrl(params, "csv")}
        pdfHref={annualReportFileUrl(params, "pdf")}
      />

      <div data-list-band className="flex-1 px-5 pt-6 pb-16 md:px-8 print:p-0">
        <div className="w-full">
          {forbidden ? (
            <div className="max-w-md py-10" role="alert">
              <Lock className="size-5 text-dash-muted" aria-hidden />
              <p className="mt-3 text-[17px] font-semibold text-brand-navy">Only an administrator can produce the regulator summary.</p>
              <p className="mt-1 text-[13.5px] text-dash-muted">The employer copy is available to you, with small counts hidden.</p>
              <Button type="button" variant="primary" size="sm" className="mt-4" onClick={() => setAudience("employer")}>
                Show the employer copy
              </Button>
            </div>
          ) : report.isError ? (
            <p className="py-8 text-[13.5px] text-red-800" role="alert">
              {errorText(report.error, "Could not build the report.")}{" "}
              <button type="button" className="font-medium underline" onClick={() => void report.refetch()}>
                Try again
              </button>
            </p>
          ) : report.isLoading ? (
            <div className="space-y-12" aria-busy="true" aria-label="Loading report">
              <div className="flex items-end gap-14">
                <Skeleton className="h-28 w-80" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full max-w-2xl" />
                  <Skeleton className="h-6 w-3/4 max-w-xl" />
                </div>
              </div>
              <div className="grid gap-x-16 gap-y-4 lg:grid-cols-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : r ? (
            <OhAnnualReportView
              report={r}
              series={series}
              period={period}
              audience={audience}
              employerName={employerName}
              isRefreshing={report.isFetching}
              onOpenYear={(year) => setPeriod({ mode: "year", year })}
            />
          ) : null}
        </div>
      </div>

      <OhAnnualPeriodDialog open={periodOpen} onOpenChange={setPeriodOpen} value={period} onApply={setPeriod} years={years} />
      <OhAnnualPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} pdfUrl={annualReportFileUrl(params, "pdf")} title={`Annual report · ${employerName} · ${label}`} />
    </ListPageLayout>
  );
}
