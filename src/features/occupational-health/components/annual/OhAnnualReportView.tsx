"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { annualChanges, rankChanges, type AnnualFigureKey } from "@/features/occupational-health/components/annual/annual-changes";
import { ANNUAL_SURFACE } from "@/features/occupational-health/components/annual/annual-panel";
import { annualNarrative, latestActiveYear } from "@/features/occupational-health/components/annual/annual-narrative";
import { periodLabel, type AnnualPeriod } from "@/features/occupational-health/components/annual/annual-utils";
import { OhAnnualAreas } from "@/features/occupational-health/components/annual/OhAnnualAreas";
import { OhAnnualChangesPanel } from "@/features/occupational-health/components/annual/OhAnnualChangesPanel";
import { OhAnnualKeyFigures } from "@/features/occupational-health/components/annual/OhAnnualKeyFigures";
import { OhAnnualKpis } from "@/features/occupational-health/components/annual/OhAnnualKpis";
import { OhAnnualTrendPanel } from "@/features/occupational-health/components/annual/OhAnnualTrendPanel";
import type { AnnualAudience, AnnualReport, AnnualTrendPoint } from "@/features/occupational-health/services/oh-annual-report.service";
import { cn } from "@/lib/utils";

/**
 * The annual report as a dashboard set as white cards on a white page: the headline figures, the chosen figure
 * year by year beside what changed, the exact numbers, then a panel per area. Free of fetching, so it
 * renders the same in the page and in tests.
 */
export function OhAnnualReportView({
  report,
  series,
  period,
  audience,
  employerName,
  isRefreshing,
  onOpenYear,
}: {
  report: AnnualReport;
  series: AnnualTrendPoint[];
  period: AnnualPeriod;
  audience: AnnualAudience;
  employerName: string;
  isRefreshing: boolean;
  onOpenYear: (year: number) => void;
}) {
  const [selected, setSelected] = useState<AnnualFigureKey>("examinations");
  const label = report.period?.label ?? periodLabel(period);
  const yearBefore = period.mode === "year" ? period.year - 1 : null;
  const withComparison = annualChanges(report, series, yearBefore);
  const narrative = annualNarrative(withComparison, report.employer?.name ?? null, label);
  // Why: a period with no records is missing data, not a 100% fall, so it is never compared with the year before.
  const compareYear = narrative !== null ? yearBefore : null;
  const changes = compareYear === yearBefore ? withComparison : annualChanges(report, series, null);
  const ranked = compareYear !== null ? rankChanges(changes) : { better: [], worse: [] };
  // Why: only the years before this report lead up to it; later years would read as a forecast.
  const earlier = series.filter((point) => point.year < report.year).slice(-4);
  const activeYear = latestActiveYear(series, report.year);
  const chosen = changes.find((change) => change.figure.key === selected) ?? changes[0];

  return (
    <article className={cn("@container space-y-4 transition-opacity", isRefreshing && "opacity-60")} aria-labelledby="oh-annual-title" data-testid="oh-annual-paper">
      <h2 id="oh-annual-title" className="sr-only">
        {employerName}, {label}
      </h2>

      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1 pb-1">
        <h3 id="oh-annual-highlights" className="text-[17px] font-semibold tracking-tight text-brand-navy">
          {period.mode === "year" ? `${period.year} in brief` : "The period in brief"}
        </h3>
        {audience === "regulator" ? (
          <p className="text-[12px] text-amber-900 print:hidden" role="note">
            The layout is generic. Check it against the regulator&apos;s current return form before you submit it.
          </p>
        ) : null}
      </header>

      {narrative === null ? (
        <div className={cn(ANNUAL_SURFACE, "flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4")} data-testid="oh-annual-empty">
          <p className="text-[13px] text-brand-slate">{`Nothing was recorded ${report.employer ? `for ${report.employer.name}` : "across all employers"} in ${label}.`}</p>
          {activeYear !== null ? (
            <button
              type="button"
              onClick={() => onOpenYear(activeYear)}
              className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-primary hover:text-brand-primary-hover focus-visible:underline focus-visible:outline-none"
            >
              Open {activeYear}, the latest year with records
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={cn(ANNUAL_SURFACE, "p-2")}>
        <OhAnnualKpis changes={changes} earlier={earlier} currentLabel={label} compareYear={compareYear} selected={chosen.figure.key} onSelect={setSelected} />
      </div>

      <div className={cn(ANNUAL_SURFACE, "grid gap-x-8 gap-y-8 p-6 @4xl:grid-cols-[minmax(0,1fr)_20rem]")}>
        <OhAnnualTrendPanel change={chosen} earlier={earlier} currentLabel={label} onOpenYear={onOpenYear} />
        <OhAnnualChangesPanel
          className="@4xl:border-l @4xl:border-dash-border @4xl:pl-8"
          better={ranked.better}
          worse={ranked.worse}
          compareYear={compareYear}
          noCompareText={narrative === null ? "Nothing to compare yet." : "A custom period is not compared."}
        />
      </div>

      <div className={cn(ANNUAL_SURFACE, "px-6 py-4")}>
        <OhAnnualKeyFigures changes={changes} series={series} reportYear={report.year} currentLabel={label} compareYear={compareYear} />
      </div>

      <section aria-labelledby="oh-annual-detail" className={cn(ANNUAL_SURFACE, "space-y-7 p-6")}>
        <h3 id="oh-annual-detail" className="text-[17px] font-semibold tracking-tight text-brand-navy">
          Detail by area
        </h3>
        <OhAnnualAreas report={report} />
      </section>

      {report.suppression ? <p className="px-1 text-[11.5px] text-dash-muted">{report.suppression}</p> : null}
    </article>
  );
}
