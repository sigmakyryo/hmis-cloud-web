import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { sectionChartRows, isSuppressed, toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import { OhColumnChart, OhDonutChart } from "@/features/occupational-health/components/dashboard/OhCharts";
import { OH_COLORS, OH_SERIES_PALETTE } from "@/features/occupational-health/components/dashboard/oh-dashboard-colors";
import { ANNUAL_SECTION_LABEL, type AnnualReport } from "@/features/occupational-health/services/oh-annual-report.service";

const SECTION_COLOR: Record<string, string> = {
  medicals: OH_SERIES_PALETTE[0],
  fitness: OH_SERIES_PALETTE[1],
  injuries: OH_COLORS.overdue,
  sick_leave: OH_COLORS.due,
  health_programmes: OH_SERIES_PALETTE[2],
  drug_alcohol: OH_SERIES_PALETTE[3],
  immunisation: OH_SERIES_PALETTE[4],
};

function SectionTable({ rows }: { rows: Record<string, number | string> }) {
  return (
    <table className="w-full text-[13px]">
      <thead className="sr-only">
        <tr>
          <th scope="col">Measure</th>
          <th scope="col">Count</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(rows).map(([label, value]) => (
          <tr key={label} className="border-b border-dash-border/60 last:border-0">
            <th scope="row" className="py-1.5 pr-3 text-left font-normal text-brand-navy">
              {label}
            </th>
            <td className={cn("py-1.5 text-right tabular-nums font-medium", isSuppressed(value) ? "text-dash-muted" : "text-brand-navy")}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SurveillanceDonut({ rows }: { rows: Record<string, number | string> }) {
  const done = toNumber(rows["Completed"]);
  const notDone = toNumber(rows["Not completed"]);
  if (done === null || notDone === null || done + notDone === 0) return null;
  const pct = rows["Completion %"];
  return (
    <OhDonutChart
      label="Surveillance completed vs not completed"
      size={150}
      stacked
      centerValue={typeof pct === "string" && pct !== "—" ? `${pct}%` : String(done)}
      centerLabel="completed"
      data={[
        { key: "completed", label: "Completed", value: done, color: OH_COLORS.completed },
        { key: "not_completed", label: "Not completed", value: notDone, color: OH_COLORS.overdue },
      ]}
    />
  );
}

/**
 * The report body: one card per section with its table and, where it has a breakdown, a chart.
 * Suppressed cells ("<5") stay in the tables and are left out of the charts.
 */
export function AnnualReportSections({ report, charts = true }: { report: AnnualReport; charts?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-flow-row-dense md:grid-cols-2 print:block print:space-y-4" data-testid="annual-report-sections">
      {Object.entries(report.sections).map(([key, rows]) => {
        const title = ANNUAL_SECTION_LABEL[key] ?? key.replace(/_/g, " ");
        const empty = Object.keys(rows).length === 0;
        const chart = charts && !empty ? sectionChartRows(key, rows) : { data: [], hidden: 0 };
        const donut = charts && key === "surveillance" ? <SurveillanceDonut rows={rows} /> : null;
        const wide = chart.data.length > 0;
        return (
          <section
            key={key}
            aria-labelledby={`annual-section-${key}`}
            className={cn(
              "break-inside-avoid rounded-xl border border-dash-border bg-white p-4 text-[13px] print:rounded-none print:border-x-0 print:border-b-0 print:px-0",
              wide && "md:col-span-2",
            )}
            data-testid={`annual-section-${key}`}
          >
            <h3 id={`annual-section-${key}`} className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-brand-navy">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: SECTION_COLOR[key] ?? OH_COLORS.primary }} />
              {title}
            </h3>
            {empty ? (
              <p className="text-dash-muted">Nothing recorded.</p>
            ) : wide || donut ? (
              <div className={cn("grid items-start gap-5", wide ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "grid-cols-1")}>
                <div className="min-w-0">
                  {wide ? (
                    <OhColumnChart
                      horizontal
                      label={`${title} breakdown`}
                      valueLabel="Count"
                      color={SECTION_COLOR[key] ?? OH_COLORS.primary}
                      data={chart.data}
                      height={Math.max(140, chart.data.length * 30 + 30)}
                    />
                  ) : (
                    donut
                  )}
                  {chart.hidden > 0 ? (
                    <p className="mt-1 text-[11px] text-dash-muted">
                      {chart.hidden} small {chart.hidden === 1 ? "count is" : "counts are"} shown in the table only.
                    </p>
                  ) : null}
                </div>
                <SectionTable rows={rows} />
              </div>
            ) : (
              <SectionTable rows={rows} />
            )}
          </section>
        );
      })}
      {report.suppression ? (
        <p className="flex items-start gap-2 text-[12px] text-dash-muted md:col-span-2">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {report.suppression}
        </p>
      ) : null}
    </div>
  );
}
