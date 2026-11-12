import { differenceInCalendarDays, format, parseISO } from "date-fns";

import type { OhCampaignQueueRow } from "@/features/occupational-health/types";
import { EXAM_TYPES } from "@/features/occupational-health/utils/oh-labels";

export type OhDueFilter = "any" | "overdue" | "overdue_30" | "next_7" | "next_30" | "next_90";

export const DUE_FILTER_LABEL: Record<OhDueFilter, string> = {
  any: "Any due date",
  overdue: "Overdue",
  overdue_30: "Overdue 30+ days",
  next_7: "Due in 7 days",
  next_30: "Due in 30 days",
  next_90: "Due in 90 days",
};

export type OhWorkRow = OhCampaignQueueRow & {
  key: string;
  days: number | null;
  overdue: boolean;
  examLabel: string;
};

export function examTypeLabel(value: string | null | undefined): string {
  if (!value) return "Periodic exam";
  return EXAM_TYPES.find((t) => t.value === value)?.label ?? value.replace(/_/g, " ");
}

export function toWorkRows(rows: OhCampaignQueueRow[], today = new Date()): OhWorkRow[] {
  return rows.map((row, index) => {
    const days = row.due_date ? differenceInCalendarDays(parseISO(row.due_date), today) : null;
    return {
      ...row,
      key: row.uuid ?? `${row.customer_uuid}-${row.component_code}-${row.due_date}-${index}`,
      days,
      overdue: row.status === "overdue" || (days !== null && days < 0),
      examLabel: examTypeLabel(row.exam_type),
    };
  });
}

export function matchesDue(row: OhWorkRow, filter: OhDueFilter): boolean {
  const d = row.days;
  switch (filter) {
    case "any":
      return true;
    case "overdue":
      return row.overdue;
    case "overdue_30":
      return d !== null && d <= -30;
    case "next_7":
      return d !== null && d >= 0 && d <= 7;
    case "next_30":
      return d !== null && d >= 0 && d <= 30;
    case "next_90":
      return d !== null && d >= 0 && d <= 90;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy");
  } catch {
    return value;
  }
}

export function relativeDue(days: number | null): string {
  if (days === null) return "No due date";
  if (days === 0) return "Due today";
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  return `In ${days} day${days === 1 ? "" : "s"}`;
}

export function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
