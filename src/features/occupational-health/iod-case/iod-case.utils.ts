import { differenceInCalendarDays, isValid, parseISO } from "date-fns";

import type {
  IodCaseDetail,
  IodCaseEntry,
  IodCaseStatus,
  IodNotice,
} from "@/features/occupational-health/iod-case/iod-case.types";

/** Matches the backend's lost-time threshold (IodStatutoryPack::LOST_TIME_DAYS). */
export const LOST_TIME_DAYS = 3;
const DUE_SOON_DAYS = 7;

export const IOD_STATUSES: ReadonlyArray<{ value: IodCaseStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "closed", label: "Closed" },
];

export const IOD_SEVERITIES = [
  { value: "minor", label: "Minor" },
  { value: "moderate", label: "Moderate" },
  { value: "major", label: "Major" },
  { value: "fatal", label: "Fatal" },
] as const;

export const IOD_SAFETY_CLASSES = [
  { value: "near_miss", label: "Near miss" },
  { value: "first_aid", label: "First aid" },
  { value: "medical_treatment", label: "Medical treatment" },
  { value: "lost_time", label: "Lost time" },
  { value: "fatality", label: "Fatality" },
] as const;

export function iodStatusLabel(status: string): string {
  return IOD_STATUSES.find((item) => item.value === status)?.label ?? "Open";
}

export function isCaseClosed(status: string): boolean {
  return status === "closed";
}

export function isLostTime(item: Pick<IodCaseDetail, "lost_days">): boolean {
  return item.lost_days >= LOST_TIME_DAYS;
}

/** Short reference people can quote: the SHE reference, else the start of the case id. */
export function caseReference(item: Pick<IodCaseDetail, "uuid" | "she_reference">): string {
  return item.she_reference.trim() || `IOD-${item.uuid.slice(0, 8).toUpperCase()}`;
}

export function incidentTitle(item: Pick<IodCaseDetail, "mechanism" | "body_part">): string {
  const mechanism = item.mechanism.trim();
  const bodyPart = item.body_part.trim();
  if (mechanism && bodyPart) return `${mechanism} · ${bodyPart}`;
  return mechanism || bodyPart || "Injury on duty";
}

function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** Whole calendar days from `from` to `to` (never negative). */
export function daysBetween(from: string | null | undefined, to: Date): number | null {
  const start = parseDay(from);
  return start ? Math.max(0, differenceInCalendarDays(to, start)) : null;
}

export function describeDaysAgo(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "today";
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function pluralDays(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Days the case was open: onset to closure, or onset to today while it is still open. */
export function caseDuration(
  item: Pick<IodCaseDetail, "onset_date" | "closed_on">,
  today: Date,
): number | null {
  const end = parseDay(item.closed_on) ?? today;
  return daysBetween(item.onset_date, end);
}

export type ActionState = "done" | "overdue" | "due_soon" | "open";

export function actionState(entry: IodCaseEntry, today: Date): ActionState {
  if (entry.completed_on) return "done";
  const due = parseDay(entry.due_date);
  if (!due) return "open";
  const remaining = differenceInCalendarDays(due, today);
  if (remaining < 0) return "overdue";
  return remaining <= DUE_SOON_DAYS ? "due_soon" : "open";
}

/** Open actions first (soonest due first, undated last), then completed ones. */
export function sortActions(entries: readonly IodCaseEntry[]): IodCaseEntry[] {
  return [...entries].sort((a, b) => {
    if (Boolean(a.completed_on) !== Boolean(b.completed_on)) return a.completed_on ? 1 : -1;
    return (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
  });
}

export type ActionCounts = { open: number; overdue: number; done: number };

export function countActions(entries: readonly IodCaseEntry[], today: Date): ActionCounts {
  const counts: ActionCounts = { open: 0, overdue: 0, done: 0 };
  for (const entry of entries) {
    if (entry.kind !== "action") continue;
    const state = actionState(entry, today);
    if (state === "done") counts.done += 1;
    else {
      counts.open += 1;
      if (state === "overdue") counts.overdue += 1;
    }
  }
  return counts;
}

export type NoticeSummary = { ready: number; total: number; needAttention: number };

/** How many statutory notices are ready, and how many likely-required ones still lack data. */
export function summariseNotices(notices: readonly IodNotice[]): NoticeSummary {
  return {
    ready: notices.filter((notice) => notice.ready).length,
    total: notices.length,
    needAttention: notices.filter((notice) => notice.likely_required && !notice.ready).length,
  };
}

const FIELD_LABELS: Record<string, string> = {
  "employee.full_name": "Worker name",
  "employee.identifier": "Worker ID",
  "employer.name": "Employer name",
  "employer.registration_number": "Employer registration number",
  "incident.date": "Incident date",
  "incident.location": "Incident location",
  "incident.description": "Description",
  "incident.body_part": "Body part",
  "incident.mechanism": "Mechanism",
  "incident.severity": "Severity",
  "medical.first_treatment_date": "First treatment date",
};

export function missingFieldLabel(path: string): string {
  return FIELD_LABELS[path] ?? path.split(".").pop()?.replace(/_/g, " ") ?? path;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}
