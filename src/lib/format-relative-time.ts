import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from "date-fns";

export type RelativeTimeStyle = "compact" | "long";

function parseDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Human-readable relative time for visit timestamps and similar UI.
 * Compact: "2h ago", "2 days ago", "3 weeks ago"
 * Long: "2 hours ago", "2 days ago", "3 weeks ago"
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  options?: { style?: RelativeTimeStyle; now?: Date },
): string | null {
  if (value == null || value === "") {
    return null;
  }
  const date = parseDate(value);
  if (!date) {
    return null;
  }
  const now = options?.now ?? new Date();
  const style = options?.style ?? "long";
  const minutes = Math.max(0, differenceInMinutes(now, date));

  if (minutes < 1) {
    return style === "compact" ? "just now" : "just now";
  }
  if (minutes < 60) {
    return style === "compact" ? `${minutes}m ago` : `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = differenceInHours(now, date);
  if (hours < 24) {
    return style === "compact"
      ? `${hours}h ago`
      : `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = differenceInDays(now, date);
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const weeks = differenceInWeeks(now, date);
  if (weeks < 5) {
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  const months = differenceInMonths(now, date);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = differenceInYears(now, date);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function formatLastVisitBadgeLabel(
  lastVisitAt: string | null | undefined,
  options?: { now?: Date },
): string {
  const relative = formatRelativeTime(lastVisitAt, {
    style: "compact",
    now: options?.now,
  });
  if (!relative) {
    return "No visits";
  }
  return `Last visit ${relative}`;
}

export function formatLastVisitDetailLabel(
  lastVisitAt: string | null | undefined,
  options?: { now?: Date },
): string {
  const relative = formatRelativeTime(lastVisitAt, {
    style: "long",
    now: options?.now,
  });
  return relative ?? "No visits yet";
}
