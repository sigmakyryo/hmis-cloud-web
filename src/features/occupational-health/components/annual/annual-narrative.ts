import type { AnnualChange, AnnualFigureKey } from "@/features/occupational-health/components/annual/annual-changes";
import { isSuppressed, toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import type { AnnualTrendPoint } from "@/features/occupational-health/services/oh-annual-report.service";

/** How each headline figure reads in a sentence, singular and plural. The rest are left to the charts, to keep it short. */
const CLAUSE: Partial<Record<AnnualFigureKey, [string, string]>> = {
  workers: ["worker was on file", "workers were on file"],
  examinations: ["examination was done", "examinations were done"],
  certificates: ["fitness certificate was issued", "fitness certificates were issued"],
  iod_cases: ["injury on duty case was reported", "injury on duty cases were reported"],
};

/** "<5" reads as "fewer than 5"; a plain number reads as itself. */
function amount(value: unknown): string {
  return isSuppressed(value) ? `fewer than ${String(value).trim().slice(1)}` : String(value);
}

function joinClauses(clauses: string[]): string {
  if (clauses.length <= 1) return clauses.join("");
  return `${clauses.slice(0, -1).join(", ")} and ${clauses[clauses.length - 1]}`;
}

/** True when the figure has something in it: a count above zero, or a hidden small count. */
function hasActivity(value: unknown): boolean {
  return isSuppressed(value) || (toNumber(value) ?? 0) > 0;
}

/**
 * The period in one or two plain sentences, built only from figures that have something in them:
 * "Across all employers in 2025, 120 workers were on file, 90 examinations were done and 6 injury on
 * duty cases were reported. 85% of the surveillance that fell due was completed."
 * Returns null when nothing at all was recorded.
 */
export function annualNarrative(changes: AnnualChange[], employerName: string | null, label: string): string | null {
  const scope = employerName ? `For ${employerName} in ${label}` : `Across all employers in ${label}`;
  const clauses: string[] = [];
  for (const { figure, current } of changes) {
    const words = CLAUSE[figure.key];
    if (!words || !hasActivity(current)) continue;
    clauses.push(`${amount(current)} ${toNumber(current) === 1 ? words[0] : words[1]}`);
  }
  const surveillance = changes.find((change) => change.figure.key === "surveillance_completion");
  const completion = toNumber(surveillance?.current);
  const sentences: string[] = [];
  if (clauses.length > 0) sentences.push(`${scope}, ${joinClauses(clauses)}.`);
  if (completion !== null) sentences.push(`${completion}% of the surveillance that fell due was completed.`);
  return sentences.length > 0 ? sentences.join(" ") : null;
}

/** The latest year in the trend, other than this one, where anything was recorded. */
export function latestActiveYear(series: AnnualTrendPoint[], exceptYear: number): number | null {
  const active = series.filter(
    (point) => point.year !== exceptYear && (Object.keys(point) as Array<keyof AnnualTrendPoint>).some((key) => key !== "year" && hasActivity(point[key])),
  );
  return active.length > 0 ? Math.max(...active.map((point) => point.year)) : null;
}
