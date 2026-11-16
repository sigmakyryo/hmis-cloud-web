"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { annualChanges, rankChanges, type AnnualFigureKey } from "@/features/occupational-health/components/annual/annual-changes";
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
    <article className={cn("@container space-y-5 transition-opacity", isRefreshing && "opacity-60")} aria-labelledby="oh-annual-title" data-testid="oh-annual-paper">
      <h2 id="oh-annual-title" className="sr-only">
        {employerName}, {label}
      </h2>

      <header>
        <h3 id="oh-annual-highlights" className="text-[20px] font-semibold tracking-tight text-brand-navy">
          {period.mode === "year" ? `${period.year} in brief` : "The period in brief"}
        </h3>
        {narrative ? (
          <p className="mt-1 max-w-4xl text-[13.5px] leading-relaxed text-brand-slate" data-testid="oh-annual-narrative">
            {narrative}
          </p>
        ) : null}
        {audience === "regulator" ? (
          <p className="mt-2 text-[12.5px] text-amber-900 print:hidden" role="note">
            The layout is generic. Check it against the regulator&apos;s current return form before you submit it.
          </p>
        ) : null}
      </header>

      {narrative === null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dash-border bg-white px-5 py-4" data-testid="oh-annual-empty">
          <p className="text-[14px] font-medium text-brand-navy">{`Nothing was recorded ${report.employer ? `for ${report.employer.name}` : "across all employers"} in ${label}.`}</p>
          {activeYear !== null ? (
            <button
              type="button"
              onClick={() => onOpenYear(activeYear)}
              className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-primary hover:text-brand-primary-hover focus-visible:underline focus-visible:outline-none"
            >
              Open {activeYear}, the latest year with records
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <OhAnnualKpis changes={changes} earlier={earlier} currentLabel={label} compareYear={compareYear} selected={chosen.figure.key} onSelect={setSelected} />

      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <OhAnnualTrendPanel change={chosen} earlier={earlier} currentLabel={label} onOpenYear={onOpenYear} />
        <OhAnnualChangesPanel
          better={ranked.better}
          worse={ranked.worse}
          compareYear={compareYear}
          noCompareText={narrative === null ? `Nothing to compare until records are added for ${label}.` : "A custom period is not compared with an earlier one."}
        />
      </div>

      <OhAnnualKeyFigures changes={changes} series={series} reportYear={report.year} currentLabel={label} compareYear={compareYear} />

      <section aria-labelledby="oh-annual-detail" className="space-y-4 pt-3">
        <h3 id="oh-annual-detail" className="text-[20px] font-semibold tracking-tight text-brand-navy">
          Detail by area
        </h3>
        <OhAnnualAreas report={report} />
      </section>

      {report.suppression ? <p className="text-[12px] text-dash-muted">{report.suppression}</p> : null}
    </article>
  );
}
