"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Activity,
  Briefcase,
  CalendarRange,
  ClipboardCheck,
  Download,
  Eye,
  FileBadge,
  FlaskConical,
  HardHat,
  Lock,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Thermometer,
} from "lucide-react";
import { useState } from "react";

import { errorText, isForbidden } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListPageHeaderActions,
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import { AnnualReportSections } from "@/features/occupational-health/components/AnnualReportSections";
import { OhAnnualPeriodDialog } from "@/features/occupational-health/components/annual/OhAnnualPeriodDialog";
import { OhAnnualPreviewDialog } from "@/features/occupational-health/components/annual/OhAnnualPreviewDialog";
import { periodLabel, toNumber, yoyDelta, type AnnualPeriod } from "@/features/occupational-health/components/annual/annual-utils";
import { OhLineTrendChart } from "@/features/occupational-health/components/dashboard/OhCharts";
import { OhKpiCard } from "@/features/occupational-health/components/dashboard/OhKpiCard";
import { OhPanelState } from "@/features/occupational-health/components/dashboard/OhPanel";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import { OH_COLORS, OH_SERIES_PALETTE } from "@/features/occupational-health/components/dashboard/oh-dashboard-colors";
import {
  annualReportFileUrl,
  fetchAnnualReport,
  fetchAnnualTrend,
  type AnnualAudience,
  type AnnualParams,
  type AnnualReport,
  type AnnualTrendPoint,
} from "@/features/occupational-health/services/oh-annual-report.service";
import { fetchOhEmployers } from "@/features/occupational-health/services/oh.service";
import type { LucideIcon } from "lucide-react";

type Highlight = {
  key: keyof Omit<AnnualTrendPoint, "year">;
  label: string;
  icon: LucideIcon;
  goodWhen: "up" | "down";
  read: (r: AnnualReport) => number | string | undefined;
  percent?: boolean;
};

const HIGHLIGHTS: Highlight[] = [
  { key: "workers", label: "Workers on file", icon: Briefcase, goodWhen: "up", read: (r) => r.sections.workforce?.["Workers on file during the year"] },
  { key: "examinations", label: "Examinations", icon: Stethoscope, goodWhen: "up", read: (r) => r.sections.medicals?.["Examinations"] },
  { key: "certificates", label: "Certificates issued", icon: FileBadge, goodWhen: "up", read: (r) => r.sections.fitness?.["Certificates issued"] },
  {
    key: "surveillance_completion",
    label: "Surveillance completed",
    icon: ClipboardCheck,
    goodWhen: "up",
    percent: true,
    read: (r) => r.sections.surveillance?.["Completion %"],
  },
  { key: "iod_cases", label: "Injury on duty cases", icon: HardHat, goodWhen: "down", read: (r) => r.sections.injuries?.["Injury on duty cases"] },
  { key: "days_lost", label: "Days lost to injury", icon: ShieldAlert, goodWhen: "down", read: (r) => r.sections.injuries?.["Days lost"] },
  { key: "sick_leave_days", label: "Sick-leave days", icon: Thermometer, goodWhen: "down", read: (r) => r.sections.sick_leave?.["Sick-leave days"] },
  { key: "da_tests", label: "Drug & alcohol tests", icon: FlaskConical, goodWhen: "up", read: (r) => r.sections.drug_alcohol?.["Tests collected"] },
];

type TrendGroup = "activity" | "harm" | "workforce";
const TREND_GROUPS: Record<TrendGroup, { label: string; keys: Array<Highlight["key"]> }> = {
  activity: { label: "Activity", keys: ["examinations", "certificates", "da_tests"] },
  harm: { label: "Injury & absence", keys: ["iod_cases", "days_lost", "sick_leave_days"] },
  workforce: { label: "Workforce", keys: ["workers", "surveillance_completion"] },
};
const HIGHLIGHT_LABEL = Object.fromEntries(HIGHLIGHTS.map((h) => [h.key, h.label])) as Record<Highlight["key"], string>;

function generatedLabel(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy, HH:mm");
  } catch {
    return iso;
  }
}

export function OhAnnualReportPage() {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => thisYear - i);
  const [period, setPeriod] = useState<AnnualPeriod>({ mode: "year", year: thisYear - 1 });
  const [employer, setEmployer] = useState("");
  const [audience, setAudience] = useState<AnnualAudience>("employer");
  const [trendGroup, setTrendGroup] = useState<TrendGroup>("activity");
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
  const prevPoint = period.mode === "year" ? series.find((p) => p.year === period.year - 1) : undefined;
  const thisPoint = period.mode === "year" ? series.find((p) => p.year === period.year) : undefined;
  const label = r?.period?.label ?? periodLabel(period);
  const employerName = r?.employer?.name ?? (employer ? (employers.data ?? []).find((e) => e.uuid === employer)?.name : undefined) ?? "All employers";
  const groupKeys = TREND_GROUPS[trendGroup].keys;
  const chartData = series.map((p) => ({ year: String(p.year), ...Object.fromEntries(groupKeys.map((k) => [k, toNumber(p[k])])) }));
  const hiddenInTrend = series.some((p) => groupKeys.some((k) => typeof p[k] === "string" && toNumber(p[k]) === null));

  return (
    <ListPageLayout data-testid="oh-annual-report-page">
      <ListPageHeaderSection className="bg-white px-4 pt-4 md:px-6 print:hidden">
        <ListPageHeaderTopRow>
          <ListPageHeaderTitleBlock title="Annual report" description="Occupational health activity, outcomes and injuries for a year or a custom period." />
          <ListPageHeaderActions className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label="Refresh"
              disabled={report.isFetching}
              onClick={() => {
                void report.refetch();
                void trend.refetch();
              }}
            >
              <RefreshCw className={report.isFetching ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={forbidden} onClick={() => setPreviewOpen(true)}>
              <Eye className="size-3.5" aria-hidden /> Preview
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={annualReportFileUrl(params, "csv")} data-testid="oh-annual-csv">
                <Download className="size-3.5" aria-hidden /> CSV
              </a>
            </Button>
            <Button asChild variant="primary" size="sm" className="gap-1.5">
              <a href={annualReportFileUrl(params, "pdf")} target="_blank" rel="noreferrer" data-testid="oh-annual-pdf">
                <Download className="size-3.5" aria-hidden /> PDF
              </a>
            </Button>
          </ListPageHeaderActions>
        </ListPageHeaderTopRow>
        <div className="flex flex-wrap items-center gap-2 pb-3 pt-1" role="toolbar" aria-label="Report options">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPeriodOpen(true)} aria-label={`Period: ${periodLabel(period)}. Change period`}>
            <CalendarRange className="size-3.5" aria-hidden />
            {periodLabel(period)}
          </Button>
          <label className="sr-only" htmlFor="oh-annual-employer">
            Employer
          </label>
          <select
            id="oh-annual-employer"
            className="h-8 max-w-[220px] rounded-md border border-dash-border bg-white px-2.5 text-[13px]"
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
          >
            <option value="">All employers</option>
            {(employers.data ?? []).map((e) => (
              <option key={e.uuid} value={e.uuid}>
                {e.name}
              </option>
            ))}
          </select>
          <OhSegmented
            label="Report copy"
            role="radiogroup"
            value={audience}
            onChange={setAudience}
            options={[
              { value: "employer", label: "Employer copy" },
              { value: "regulator", label: "Regulator copy" },
            ]}
          />
          <span className="text-[12px] text-dash-muted">
            {audience === "employer" ? "Counts of 1–4 are hidden to protect individuals." : "Exact counts. Administrators only."}
          </span>
        </div>
      </ListPageHeaderSection>

      <div data-list-band className="px-4 pb-10 md:px-6 print:p-0">
        {audience === "regulator" && !forbidden ? (
          <div className="mx-auto mb-3 max-w-5xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 print:hidden" role="note">
            The layout is generic. Check it against the regulator&apos;s current return form before you submit it.
          </div>
        ) : null}

        {forbidden ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-dash-border bg-white px-6 py-10 text-center" role="alert">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-tint text-brand-primary">
              <Lock className="size-5" aria-hidden />
            </span>
            <p className="text-[15px] font-semibold text-brand-navy">Only an administrator can produce the regulator summary.</p>
            <p className="text-[13px] text-dash-muted">The employer copy is available to you, with small counts hidden.</p>
            <Button type="button" variant="primary" size="sm" onClick={() => setAudience("employer")}>
              Show the employer copy
            </Button>
          </div>
        ) : report.isError ? (
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800" role="alert">
            <span>{errorText(report.error, "Could not build the report.")}</span>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => void report.refetch()}>
              Try again
            </Button>
          </div>
        ) : report.isLoading ? (
          <div className="mx-auto max-w-5xl space-y-3" aria-busy="true" aria-label="Loading report">
            <div className="h-28 animate-pulse rounded-xl bg-dash-canvas" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-dash-canvas" />
              ))}
            </div>
          </div>
        ) : r ? (
          <article
            className={`mx-auto max-w-5xl space-y-6 rounded-2xl border border-dash-border bg-white p-5 shadow-sm transition-opacity sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none ${report.isFetching ? "opacity-70" : ""}`}
            aria-labelledby="oh-annual-title"
            data-testid="oh-annual-paper"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-dash-border pb-5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-primary">Occupational health annual report</p>
                <h2 id="oh-annual-title" className="text-2xl font-semibold text-brand-navy">
                  {employerName} · {label}
                </h2>
                <p className="text-[12px] text-dash-muted">
                  {r.period ? `${r.period.from} to ${r.period.to}` : `Calendar year ${r.year}`} · generated {generatedLabel(r.generated_at)}
                </p>
              </div>
              <Badge variant={r.audience === "regulator" ? "warning" : "secondary"} className="shrink-0">
                {r.audience === "regulator" ? "Regulator copy · exact counts" : "Employer copy · small counts hidden"}
              </Badge>
            </header>

            <section aria-labelledby="oh-annual-highlights">
              <h3 id="oh-annual-highlights" className="mb-3 text-[14px] font-semibold text-brand-navy">
                Highlights{period.mode === "year" && prevPoint ? <span className="ml-2 text-[12px] font-normal text-dash-muted">vs {period.year - 1}</span> : null}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="oh-annual-highlights">
                {HIGHLIGHTS.map((h) => {
                  const raw = h.read(r);
                  const shown = raw === undefined ? "—" : h.percent && toNumber(raw) !== null ? `${raw}%` : raw;
                  const delta = prevPoint ? yoyDelta(thisPoint?.[h.key] ?? raw, prevPoint[h.key]) : null;
                  return (
                    <OhKpiCard
                      key={h.key}
                      label={h.label}
                      value={shown}
                      icon={h.icon}
                      delta={prevPoint ? { value: delta, goodWhen: h.goodWhen, suffix: h.percent ? " pts" : "", label: `vs ${period.mode === "year" ? period.year - 1 : ""}` } : undefined}
                      data-testid={`oh-annual-kpi-${h.key}`}
                    />
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="oh-annual-trend" className="break-inside-avoid rounded-xl border border-dash-border p-4 print:border-0 print:p-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="oh-annual-trend" className="text-[14px] font-semibold text-brand-navy">
                    Five-year trend
                  </h3>
                  <p className="text-[12px] text-dash-muted">Calendar years, same employer and copy as this report.</p>
                </div>
                <OhSegmented
                  label="Trend measures"
                  role="radiogroup"
                  className="print:hidden"
                  value={trendGroup}
                  onChange={setTrendGroup}
                  options={(Object.keys(TREND_GROUPS) as TrendGroup[]).map((k) => ({ value: k, label: TREND_GROUPS[k].label }))}
                />
              </div>
              <OhPanelState
                isLoading={trend.isLoading}
                error={trend.error}
                onRetry={() => void trend.refetch()}
                isEmpty={series.length === 0}
                emptyText="No earlier years to compare."
                height={240}
              >
                <OhLineTrendChart
                  label={`${TREND_GROUPS[trendGroup].label} by year`}
                  xKey="year"
                  data={chartData}
                  series={groupKeys.map((k, i) => ({
                    key: k,
                    label: HIGHLIGHT_LABEL[k],
                    color: trendGroup === "harm" ? [OH_COLORS.overdue, OH_COLORS.due, OH_COLORS.brown][i] : OH_SERIES_PALETTE[i],
                  }))}
                />
                {hiddenInTrend ? <p className="mt-1 text-[11px] text-dash-muted">Years with fewer than 5 are left as gaps in the line.</p> : null}
              </OhPanelState>
            </section>

            <section aria-labelledby="oh-annual-detail">
              <h3 id="oh-annual-detail" className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-brand-navy">
                <Activity className="size-4 text-brand-primary" aria-hidden /> Detail by area
              </h3>
              <AnnualReportSections report={r} />
            </section>
          </article>
        ) : null}
      </div>

      <OhAnnualPeriodDialog open={periodOpen} onOpenChange={setPeriodOpen} value={period} onApply={setPeriod} years={years} />
      <OhAnnualPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        pdfUrl={annualReportFileUrl(params, "pdf")}
        title={`Annual report · ${employerName} · ${label}`}
      />
    </ListPageLayout>
  );
}
