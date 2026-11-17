import { isSuppressed, toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import type { AnnualReport } from "@/features/occupational-health/services/oh-annual-report.service";

export type MetricKey = "examinations" | "workers" | "certificates" | "sick_days";

export const METRICS: Array<{ key: MetricKey; label: string; section: string; row: string }> = [
  { key: "examinations", label: "Examinations", section: "medicals", row: "Examinations" },
  { key: "workers", label: "Workers", section: "workforce", row: "Workers on file during the year" },
  { key: "certificates", label: "Certificates", section: "fitness", row: "Certificates issued" },
  { key: "sick_days", label: "Sick-leave days", section: "sick_leave", row: "Sick-leave days" },
];

export type YearReport = { year: number; report: AnnualReport | null };

/** One measure from a report. Null when the report is missing, or the cell is suppressed or not a number. */
export function readRow(report: AnnualReport | null, section: string, row: string): number | null {
  return toNumber(report?.sections?.[section]?.[row]);
}

export function metricSeries(series: YearReport[], key: MetricKey): Array<{ year: string; value: number | null }> {
  const metric = METRICS.find((item) => item.key === key) ?? METRICS[0];
  return series.map(({ year, report }) => ({ year: String(year), value: readRow(report, metric.section, metric.row) }));
}

export type Headline = { label: string; value: string; note?: string; tone?: "good" | "bad" | "muted" };

function describeChange(current: number | null, previous: number | null, previousYear: number, unit = ""): Pick<Headline, "note" | "tone"> {
  if (current === null || previous === null) return { note: undefined, tone: undefined };
  const change = current - previous;
  if (change === 0) return { note: `same as ${previousYear}`, tone: "muted" };
  return { note: `${change > 0 ? "+" : "−"}${Math.abs(change)}${unit} vs ${previousYear}`, tone: change > 0 ? "good" : "bad" };
}

function display(value: unknown): string {
  if (isSuppressed(value)) return String(value);
  const n = toNumber(value);
  return n === null ? "—" : n.toLocaleString();
}

/** The four figures at the top, each compared with the year before. */
export function headlines(current: AnnualReport | null, previous: AnnualReport | null, year: number): Headline[] {
  const spec: Array<{ label: string; section: string; row: string; unit?: string }> = [
    { label: "Workers on file", section: "workforce", row: "Workers on file during the year" },
    { label: "Examinations", section: "medicals", row: "Examinations" },
    { label: "Certificates issued", section: "fitness", row: "Certificates issued" },
    { label: "Surveillance completed", section: "surveillance", row: "Completion %", unit: " pts" },
  ];
  return spec.map(({ label, section, row, unit }) => {
    const raw = current?.sections?.[section]?.[row];
    const value = unit ? (toNumber(raw) === null ? "—" : `${toNumber(raw)}%`) : display(raw);
    return { label, value, ...describeChange(readRow(current, section, row), readRow(previous, section, row), year - 1, unit) };
  });
}

export type Slice = { label: string; value: number; display: string };

/** "Outcome: fit for work" rows as slices. Suppressed cells keep their label but have no size. */
export function breakdown(report: AnnualReport | null, section: string, prefix: string): { slices: Slice[]; suppressed: number } {
  const rows = report?.sections?.[section] ?? {};
  const slices: Slice[] = [];
  let suppressed = 0;
  for (const [label, raw] of Object.entries(rows)) {
    if (!label.startsWith(prefix)) continue;
    const value = toNumber(raw);
    if (value === null) {
      suppressed += 1;
      continue;
    }
    const text = label.slice(prefix.length).replace(/_/g, " ").trim();
    slices.push({ label: text ? text[0].toUpperCase() + text.slice(1) : label, value, display: value.toLocaleString() });
  }
  return { slices: slices.sort((a, b) => b.value - a.value), suppressed };
}

export function shareOf(value: number, slices: Slice[]): number {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export type FactRow = { label: string; value: string };

/** Plain label/value rows of one section, skipping breakdown rows already shown elsewhere. */
export function facts(report: AnnualReport | null, section: string, skipPrefixes: string[] = []): FactRow[] {
  const rows = report?.sections?.[section] ?? {};
  return Object.entries(rows)
    .filter(([label]) => !skipPrefixes.some((prefix) => label.startsWith(prefix)))
    .map(([label, value]) => ({ label: label.replace(/_/g, " "), value: display(value) }));
}
