import { BadgeCheck, BedDouble, ClipboardCheck, FlaskConical, HardHat, HeartPulse, Info, Stethoscope, Syringe, Users, Wind, type LucideIcon } from "lucide-react";

import { breakdownShares, isSuppressed, sectionChartRows, toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import { ANNUAL_SECTION_LABEL, type AnnualReport } from "@/features/occupational-health/services/oh-annual-report.service";
import { cn } from "@/lib/utils";

type Rows = Record<string, number | string>;

/** Bar colour per section; harm reads red and amber, everything else stays in the brand family. */
const SECTION_BAR: Record<string, string> = {
  injuries: "bg-red-500",
  sick_leave: "bg-amber-500",
  exposure: "bg-amber-500",
};

/** "Examinations: pre_employment" → "Pre employment"; "HEPB · up_to_date" → "HEPB · up to date". */
export function rowLabel(label: string, prefix = ""): string {
  const text = (prefix && label.startsWith(prefix) ? label.slice(prefix.length) : label).replace(/_/g, " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : label;
}

const SECTION_ICON: Record<string, LucideIcon> = {
  workforce: Users,
  medicals: Stethoscope,
  fitness: BadgeCheck,
  surveillance: ClipboardCheck,
  injuries: HardHat,
  sick_leave: BedDouble,
  health_programmes: HeartPulse,
  drug_alcohol: FlaskConical,
  immunisation: Syringe,
  exposure: Wind,
};

const PREFIX: Record<string, string> = { medicals: "Examinations: ", fitness: "Outcome: " };

/** Surveillance as one sentence and a bar: how much of what fell due was done. */
function SurveillanceProgress({ rows }: { rows: Rows }) {
  const done = toNumber(rows["Completed"]);
  const notDone = toNumber(rows["Not completed"]);
  if (done === null || notDone === null || done + notDone === 0) return null;
  const percent = toNumber(rows["Completion %"]) ?? Math.round((done / (done + notDone)) * 1000) / 10;
  return (
    <div className="mb-3">
      <p className="text-[13px] text-dash-muted">
        <span className="text-[22px] leading-none font-semibold text-brand-navy tabular-nums">{percent}%</span> completed, {done} of {done + notDone}
      </p>
      <div role="img" aria-label={`Surveillance: ${done} completed, ${notDone} not completed`} className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full">
        <span className="bg-brand-primary" style={{ flexGrow: done }} />
        {notDone > 0 ? <span className="bg-red-500" style={{ flexGrow: notDone }} /> : null}
      </div>
    </div>
  );
}

function SectionRows({ section, rows, bars }: { section: string; rows: Rows; bars: boolean }) {
  const chart = bars ? sectionChartRows(section, rows) : { data: [], hidden: 0 };
  const charted = new Map(chart.data.map((row) => [row.key, row.value]));
  const max = Math.max(1, ...chart.data.map((row) => row.value));
  const prefix = PREFIX[section] ?? "";
  const shares = bars ? breakdownShares(section, rows) : {};

  return (
    <>
      <table className="w-full text-[13px]">
        <thead className="sr-only">
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(rows).map(([label, value]) => {
            const barValue = charted.get(label);
            const isPart = prefix !== "" && label.startsWith(prefix);
            return (
              <tr key={label} className="border-b border-dash-border/60 last:border-0">
                <th scope="row" className={cn("py-2 pr-3 text-left font-normal", isPart ? "pl-3 text-brand-slate" : "text-brand-navy")}>
                  {rowLabel(label, prefix)}
                  {barValue !== undefined ? (
                    <span aria-hidden className="mt-1 block h-1 overflow-hidden rounded-full bg-dash-canvas">
                      <span className={cn("block h-full rounded-full", SECTION_BAR[section] ?? "bg-brand-primary")} style={{ width: `${Math.max(2, (barValue / max) * 100)}%` }} />
                    </span>
                  ) : null}
                </th>
                {Object.keys(shares).length > 0 ? (
                  <td className="w-11 py-2 text-right align-top text-[12px] text-dash-muted tabular-nums" aria-label={shares[label] !== undefined ? `${shares[label]} percent` : undefined}>
                    {shares[label] !== undefined ? `${shares[label]}%` : ""}
                  </td>
                ) : null}
                <td className={cn("w-16 py-2 text-right align-top font-semibold tabular-nums", isSuppressed(value) ? "font-normal text-dash-muted" : "text-brand-navy")}>{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {chart.hidden > 0 ? (
        <p className="mt-1.5 text-[11.5px] text-dash-muted">
          {chart.hidden} small {chart.hidden === 1 ? "count is" : "counts are"} shown without a bar.
        </p>
      ) : null}
    </>
  );
}

/**
 * The report body: sections flow down two columns like a printed report, each a heading and its rows.
 * Breakdown rows carry a thin bar; suppressed cells ("<5") keep their place but never get one.
 */
export function AnnualReportSections({ report, charts = true }: { report: AnnualReport; charts?: boolean }) {
  return (
    <div data-testid="annual-report-sections">
      <div className="gap-x-10 md:columns-2 xl:columns-3 2xl:columns-4 print:columns-2">
        {Object.entries(report.sections).map(([key, rows]) => {
          const title = ANNUAL_SECTION_LABEL[key] ?? rowLabel(key);
          const empty = Object.keys(rows).length === 0;
          const Icon = SECTION_ICON[key] ?? ClipboardCheck;
          return (
            <section
              key={key}
              aria-labelledby={`annual-section-${key}`}
              className="mb-8 break-inside-avoid border-t-2 border-brand-navy pt-3"
              data-testid={`annual-section-${key}`}
            >
              <h3 id={`annual-section-${key}`} className="mb-3 flex items-center gap-2.5 text-[14.5px] font-semibold text-brand-navy">
                <Icon className="size-4 text-brand-primary print:hidden" aria-hidden />
                {title}
              </h3>
              {empty ? (
                <p className="text-[13px] text-dash-muted">Nothing recorded.</p>
              ) : (
                <>
                  {charts && key === "surveillance" ? <SurveillanceProgress rows={rows} /> : null}
                  <SectionRows section={key} rows={rows} bars={charts} />
                </>
              )}
            </section>
          );
        })}
      </div>
      {report.suppression ? (
        <p className="mt-1 flex items-start gap-2 text-[12px] text-dash-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {report.suppression}
        </p>
      ) : null}
    </div>
  );
}
