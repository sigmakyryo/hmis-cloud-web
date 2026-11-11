/** Helpers for the annual report: suppressed employer counts arrive as "<5" and must never be charted as numbers. */

export const SUPPRESSED = /^<\d+$/;

export function isSuppressed(value: unknown): boolean {
  return typeof value === "string" && SUPPRESSED.test(value.trim());
}

/** A plottable number, or null for suppressed / non-numeric cells ("—", "<5"). */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "" && !isSuppressed(value)) {
    const n = Number(value.replace(/[,%\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Year-over-year change; null when either side is missing or suppressed. */
export function yoyDelta(current: unknown, previous: unknown): number | null {
  const a = toNumber(current);
  const b = toNumber(previous);
  return a === null || b === null ? null : a - b;
}

export type AnnualPeriod = { mode: "year"; year: number } | { mode: "custom"; from: string; to: string };

export const MAX_CUSTOM_DAYS = 366 * 3;

/** Validation for a custom period; mirrors the OHS rules (to ≥ from, to ≤ today, at most 3 years). */
export function customPeriodError(from: string, to: string, today = new Date().toISOString().slice(0, 10)): string | null {
  if (!from || !to) return "Choose both a start and an end date.";
  if (from > to) return "The start date must be on or before the end date.";
  if (to > today) return "The end date cannot be in the future.";
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days > MAX_CUSTOM_DAYS) return "A custom period can cover at most 3 years.";
  return null;
}

export function periodLabel(period: AnnualPeriod): string {
  return period.mode === "year" ? String(period.year) : `${period.from} to ${period.to}`;
}

/** Rows a section charts: breakdown rows (label prefix stripped) where the section has them, otherwise every numeric row. */
const BREAKDOWN_PREFIX: Record<string, string> = {
  medicals: "Examinations: ",
  fitness: "Outcome: ",
};
const NO_CHART = new Set(["workforce", "surveillance"]);

export type SectionChartRow = { key: string; label: string; value: number };

export function sectionChartRows(section: string, rows: Record<string, number | string>): { data: SectionChartRow[]; hidden: number } {
  if (NO_CHART.has(section)) return { data: [], hidden: 0 };
  const prefix = BREAKDOWN_PREFIX[section];
  const entries = Object.entries(rows).filter(([label]) => (prefix ? label.startsWith(prefix) : true));
  const data: SectionChartRow[] = [];
  let hidden = 0;
  for (const [label, value] of entries) {
    const n = toNumber(value);
    if (n === null) {
      if (isSuppressed(value)) hidden += 1;
      continue;
    }
    data.push({ key: label, label: prefix ? label.slice(prefix.length) : label, value: n });
  }
  return { data: data.length >= 2 ? data : [], hidden: data.length >= 2 ? hidden : 0 };
}
