import { toNumber, yoyDelta } from "@/features/occupational-health/components/annual/annual-utils";
import type { AnnualReport, AnnualTrendPoint } from "@/features/occupational-health/services/oh-annual-report.service";

export type AnnualFigureKey = keyof Omit<AnnualTrendPoint, "year">;

export type AnnualFigure = {
  key: AnnualFigureKey;
  label: string;
  /** Which direction is good news: more examinations, fewer injuries. */
  goodWhen: "up" | "down";
  read: (report: AnnualReport) => number | string | undefined;
  /** A percentage figure, whose change is in points rather than a share of itself. */
  percent?: boolean;
};

export const ANNUAL_FIGURES: AnnualFigure[] = [
  { key: "workers", label: "Workers on file", goodWhen: "up", read: (r) => r.sections.workforce?.["Workers on file during the year"] },
  { key: "examinations", label: "Examinations", goodWhen: "up", read: (r) => r.sections.medicals?.["Examinations"] },
  { key: "certificates", label: "Certificates issued", goodWhen: "up", read: (r) => r.sections.fitness?.["Certificates issued"] },
  { key: "surveillance_completion", label: "Surveillance completed", goodWhen: "up", percent: true, read: (r) => r.sections.surveillance?.["Completion %"] },
  { key: "iod_cases", label: "Injury on duty cases", goodWhen: "down", read: (r) => r.sections.injuries?.["Injury on duty cases"] },
  { key: "days_lost", label: "Days lost to injury", goodWhen: "down", read: (r) => r.sections.injuries?.["Days lost"] },
  { key: "sick_leave_days", label: "Sick-leave days", goodWhen: "down", read: (r) => r.sections.sick_leave?.["Sick-leave days"] },
  { key: "da_tests", label: "Drug & alcohol tests", goodWhen: "up", read: (r) => r.sections.drug_alcohol?.["Tests collected"] },
];

export type AnnualChange = {
  figure: AnnualFigure;
  /** What this report shows, as the service sent it (may be "<5"). */
  current: number | string | null | undefined;
  previous: number | string | null | undefined;
  /** The change on the previous year, or null when either side is hidden or missing. */
  delta: number | null;
  /** True when the change is good news, false when it is not, null when nothing changed or it is unknown. */
  good: boolean | null;
  /** The change as a share of last year, or in points for a percentage figure. Null when it cannot be worked out. */
  relative: number | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Every figure against the year before. With no earlier year, nothing is compared. */
export function annualChanges(report: AnnualReport, series: AnnualTrendPoint[], compareYear: number | null): AnnualChange[] {
  const previousPoint = compareYear === null ? undefined : series.find((point) => point.year === compareYear);
  const currentPoint = compareYear === null ? undefined : series.find((point) => point.year === compareYear + 1);
  return ANNUAL_FIGURES.map((figure) => {
    // Why: the report's own value is what the page shows, so the change is worked out from that same value.
    // The trend point only stands in when the report has no such row.
    const current = figure.read(report) ?? currentPoint?.[figure.key];
    const previous = previousPoint?.[figure.key];
    const raw = previousPoint ? yoyDelta(current, previous) : null;
    const delta = raw === null ? null : round1(raw);
    const before = toNumber(previous);
    return {
      figure,
      current,
      previous,
      delta,
      good: delta === null || delta === 0 ? null : figure.goodWhen === "up" ? delta > 0 : delta < 0,
      relative: delta === null ? null : figure.percent ? delta : before === null || before === 0 ? null : round1((delta / before) * 100),
    };
  });
}

const display = (value: number | string | null | undefined, percent?: boolean) => (value === undefined || value === null ? "—" : percent && toNumber(value) !== null ? `${value}%` : String(value));

/** One plain sentence: "Injury on duty cases fell 15% (27 → 23)". */
export function describeChange(change: AnnualChange): string {
  const { figure, delta, relative } = change;
  if (delta === null) return `${figure.label} could not be compared.`;
  const verb = delta > 0 ? "rose" : "fell";
  const size = figure.percent ? `${Math.abs(delta)} pts` : relative === null ? `by ${Math.abs(delta)}` : `${Math.abs(relative)}%`;
  return `${figure.label} ${verb} ${size} (${display(change.previous, figure.percent)} → ${display(change.current, figure.percent)})`;
}

/** The biggest moves each way, by size of change. Changes under half a percent, and unknowns, are left out. */
export function rankChanges(changes: AnnualChange[], limit = 3): { better: AnnualChange[]; worse: AnnualChange[] } {
  const size = (change: AnnualChange) => Math.abs(change.relative ?? change.delta ?? 0);
  const moved = changes.filter((change) => change.good !== null && size(change) >= 0.5).sort((a, b) => size(b) - size(a));
  return { better: moved.filter((change) => change.good).slice(0, limit), worse: moved.filter((change) => !change.good).slice(0, limit) };
}
