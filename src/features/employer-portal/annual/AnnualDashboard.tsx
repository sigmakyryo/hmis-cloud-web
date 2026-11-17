"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { AnnualCard, Donut, SegmentBar, SliceLegend } from "@/features/employer-portal/annual/AnnualVisuals";
import {
  METRICS,
  breakdown,
  facts,
  headlines,
  metricSeries,
  readRow,
  type MetricKey,
  type YearReport,
} from "@/features/employer-portal/annual/annual-dashboard";
import { PortalPill, PortalStatStrip } from "@/features/employer-portal/components/PortalPrimitives";

const AnnualTrendChart = dynamic(() => import("@/features/employer-portal/annual/AnnualTrendChart"), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-neutral-100" role="status" aria-label="Loading chart" />,
});

function FactTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) {
    return <p className="text-[13px] text-neutral-500">Nothing recorded.</p>;
  }
  return (
    <dl className="divide-y divide-neutral-100 text-[14px]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
          <dt className="min-w-0 truncate text-neutral-600">{row.label}</dt>
          <dd className="tabular-nums text-neutral-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const OTHER_SECTIONS = [
  { key: "health_programmes", title: "Health programmes" },
  { key: "immunisation", title: "Immunisation" },
  { key: "exposure", title: "Exposure management" },
] as const;

/** The annual summary laid out as a dashboard: figures, a trend, breakdowns, and the rest in a side column. */
export function AnnualDashboard({ series, year, accent, suppression }: { series: YearReport[]; year: number; accent: string; suppression?: string | null }) {
  const [metric, setMetric] = useState<MetricKey>("examinations");
  const current = series.find((item) => item.year === year)?.report ?? null;
  const previous = series.find((item) => item.year === year - 1)?.report ?? null;
  const exams = breakdown(current, "medicals", "Examinations: ");
  const outcomes = breakdown(current, "fitness", "Outcome: ");
  const done = readRow(current, "surveillance", "Completed");
  const notDone = readRow(current, "surveillance", "Not completed");
  const completion = readRow(current, "surveillance", "Completion %");
  const metricLabel = METRICS.find((item) => item.key === metric)?.label ?? "";
  const trend = metricSeries(series, metric);

  return (
    <div data-testid="employer-portal-annual-dashboard">
      <PortalStatStrip stats={headlines(current, previous, year)} />
      <div className="grid gap-x-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <AnnualCard title={`${metricLabel} by year`}>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Measure">
              {METRICS.map((item) => (
                <PortalPill key={item.key} active={metric === item.key} onClick={() => setMetric(item.key)}>
                  {item.label}
                </PortalPill>
              ))}
            </div>
            <AnnualTrendChart data={trend} accent={accent} label={metricLabel} />
          </AnnualCard>
          <div className="grid gap-x-8 border-t border-dashed border-neutral-300/80 md:grid-cols-2">
            <AnnualCard title="Medical examinations" figure={String(readRow(current, "medicals", "Examinations") ?? "—")} note={`in ${year}`}>
              {exams.slices.length > 0 ? (
                <div className="flex flex-wrap items-center gap-5">
                  <Donut slices={exams.slices} accent={accent} label="Examinations by type" />
                  <div className="min-w-[180px] flex-1">
                    <SliceLegend slices={exams.slices} accent={accent} />
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-neutral-500">{exams.suppressed > 0 ? "Small numbers are hidden to protect privacy." : "No examinations recorded."}</p>
              )}
            </AnnualCard>
            <AnnualCard title="Fitness for work" figure={String(readRow(current, "fitness", "Certificates issued") ?? "—")} note="certificates issued">
              {outcomes.slices.length > 0 ? (
                <div className="space-y-4">
                  <SegmentBar slices={outcomes.slices} accent={accent} label="Fitness outcomes" />
                  <SliceLegend slices={outcomes.slices} accent={accent} />
                </div>
              ) : (
                <p className="text-[13px] text-neutral-500">{outcomes.suppressed > 0 ? "Small numbers are hidden to protect privacy." : "No assessments recorded."}</p>
              )}
            </AnnualCard>
          </div>
          <div className="grid gap-x-8 border-t border-dashed border-neutral-300/80 md:grid-cols-2">
            <AnnualCard title="Medical surveillance" figure={completion === null ? "—" : `${completion}%`} note="of what fell due was done">
              {done !== null && notDone !== null && done + notDone > 0 ? (
                <div className="space-y-3">
                  <SegmentBar
                    slices={[
                      { label: "Completed", value: done, display: String(done) },
                      ...(notDone > 0 ? [{ label: "Not completed", value: notDone, display: String(notDone) }] : []),
                    ]}
                    accent={accent}
                    label="Surveillance completed and not completed"
                  />
                  <FactTable rows={facts(current, "surveillance")} />
                </div>
              ) : (
                <FactTable rows={facts(current, "surveillance")} />
              )}
            </AnnualCard>
            <AnnualCard title="Safety and absence">
              <FactTable rows={[...facts(current, "injuries"), ...facts(current, "sick_leave"), ...facts(current, "drug_alcohol", ["Reason: ", "Final result: "])]} />
            </AnnualCard>
          </div>
        </div>
        <aside className="min-w-0 border-t border-dashed border-neutral-300/80 py-6 lg:border-t-0 lg:border-l lg:pl-8">
          <h2 className="text-[17px] font-medium text-neutral-900">More from {year}</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">Programmes, vaccines and exposure</p>
          <div className="mt-5 space-y-6">
            {OTHER_SECTIONS.map((section) => (
              <div key={section.key}>
                <h3 className="mb-1 text-[13px] text-neutral-400">{section.title}</h3>
                <FactTable rows={facts(current, section.key)} />
              </div>
            ))}
          </div>
        </aside>
      </div>
      {suppression ? <p className="pt-2 text-[12px] text-neutral-400">{suppression}</p> : null}
    </div>
  );
}
