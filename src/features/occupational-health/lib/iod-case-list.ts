import type { IodCase } from "@/features/occupational-health/types";

export type IodListStatus = "all" | "open" | "under_review" | "closed";
export type IodListSeverity = "all" | "minor" | "moderate" | "major" | "fatal";

const SEVERITY_RANK: Record<string, number> = { fatal: 4, major: 3, moderate: 2, minor: 1 };

export const isClosed = (row: Pick<IodCase, "status">) => (row.status || "open").toLowerCase() === "closed";

/** Search is plain words over what a person would type: worker, employer, body part, how it happened, where. */
export function matchesCase(row: IodCase, query: string, status: IodListStatus, severity: IodListSeverity): boolean {
  const state = (row.status || "open").toLowerCase();
  if (status !== "all" && state !== status) return false;
  if (severity !== "all" && (row.severity || "").toLowerCase() !== severity) return false;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = [row.worker_name, row.employer_name, row.body_part, row.mechanism, row.incident_location, row.she_reference, row.description, row.severity]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((word) => text.includes(word));
}

/** Open cases first, worst and newest at the top; closed cases newest first. */
export function groupCases(rows: IodCase[]): { open: IodCase[]; closed: IodCase[] } {
  const byNewest = (a: IodCase, b: IodCase) => (b.onset_date || "").localeCompare(a.onset_date || "");
  const open = rows
    .filter((row) => !isClosed(row))
    .sort((a, b) => (SEVERITY_RANK[(b.severity || "").toLowerCase()] ?? 0) - (SEVERITY_RANK[(a.severity || "").toLowerCase()] ?? 0) || byNewest(a, b));
  const closed = rows.filter(isClosed).sort(byNewest);
  return { open, closed };
}

/** What an open case has not recorded yet. A field the service did not send is not reported as missing. */
export function missingRecords(row: IodCase): string[] {
  if (isClosed(row)) return [];
  const missing: string[] = [];
  const blank = (value: string | undefined) => typeof value === "string" && value.trim() === "";
  if (blank(row.immediate_action) && blank(row.treatment_given)) missing.push("No treatment recorded");
  if (blank(row.root_cause)) missing.push("No root cause");
  return missing;
}

/** The day of the incident counts as day 1. */
export function dayOfCase(onset: string | null | undefined, now = Date.now()): number | null {
  if (!onset) return null;
  const start = new Date(`${onset.slice(0, 10)}T00:00:00`).getTime();
  return Number.isNaN(start) ? null : Math.max(1, Math.floor((now - start) / 86_400_000) + 1);
}
