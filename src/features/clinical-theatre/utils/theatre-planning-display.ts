import type { StatusDotBadgeTone } from "@/components/ui/status-dot-badge";
import type {
  TheatreCaseTimings,
  TheatreClearance,
  TheatreComorbidity,
  TheatreMilestone,
  TheatreReadinessStatus,
  TheatreRemovalReason,
  TheatreRequiredTestStatus,
  TheatreWaitInfo,
} from "@/features/clinical-theatre/types/theatre-planning.types";

export const THEATRE_MILESTONES: readonly { key: TheatreMilestone; label: string }[] = [
  { key: "in_suite", label: "In suite" },
  { key: "anaesthesia_start", label: "Anaesthesia start" },
  { key: "anaesthesia_ready", label: "Anaesthesia ready" },
  { key: "knife_to_skin", label: "Knife to skin" },
  { key: "closure", label: "Closure" },
  { key: "out_of_theatre", label: "Out of theatre" },
  { key: "in_recovery", label: "In recovery" },
];

export const MILESTONE_LABELS = Object.fromEntries(
  THEATRE_MILESTONES.map((row) => [row.key, row.label]),
) as Record<TheatreMilestone, string>;

/** Mirrors the server: booked, cancelled and postponed cases cannot be timed. */
const NOT_TIMEABLE = new Set(["booked", "cancelled", "postponed"]);

export function canRecordTimings(status: string): boolean {
  return !NOT_TIMEABLE.has(status);
}

/**
 * Client-side mirror of the server's order check: the proposed time must not be
 * before an earlier milestone or after a later one.
 */
export function milestoneOrderProblem(
  timings: Pick<TheatreCaseTimings, "milestones">,
  milestone: TheatreMilestone,
  at: Date,
): string | null {
  const position = THEATRE_MILESTONES.findIndex((row) => row.key === milestone);
  for (const row of timings.milestones) {
    if (row.key === milestone || !row.value) continue;
    const other = new Date(row.value);
    const otherIndex = THEATRE_MILESTONES.findIndex((item) => item.key === row.key);
    if (otherIndex < position && at < other) {
      return `${MILESTONE_LABELS[milestone]} cannot be before ${row.label}.`;
    }
    if (otherIndex > position && at > other) {
      return `${MILESTONE_LABELS[milestone]} cannot be after ${row.label}.`;
    }
  }
  return null;
}

export function formatClock(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `datetime-local` value → ISO string (browser local time), or null. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "08:00:00" → "08:00". */
export function shortTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value}%`;
}

export const WEEKDAYS: readonly { value: number; label: string }[] = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export const READINESS_TONE: Record<TheatreReadinessStatus, StatusDotBadgeTone> = {
  ready: "success",
  not_assessed: "neutral",
  in_progress: "info",
  expired: "warning",
  unfit: "danger",
  deferred: "warning",
};

export const READINESS_LABELS: Record<TheatreReadinessStatus, string> = {
  ready: "Fit for surgery",
  not_assessed: "Not assessed",
  in_progress: "Assessment in progress",
  expired: "Clearance expired",
  unfit: "Unfit",
  deferred: "Deferred",
};

export const CLEARANCE_LABELS: Record<TheatreClearance, string> = {
  fit: "Fit",
  unfit: "Unfit",
  deferred: "Deferred",
};

export const REMOVAL_REASONS: readonly { value: TheatreRemovalReason; label: string }[] = [
  { value: "operated", label: "Operated" },
  { value: "treated_elsewhere", label: "Treated elsewhere" },
  { value: "no_longer_required", label: "No longer required" },
  { value: "patient_declined", label: "Patient declined" },
  { value: "medically_unfit", label: "Medically unfit" },
  { value: "unable_to_contact", label: "Unable to contact" },
  { value: "deceased", label: "Deceased" },
  { value: "duplicate", label: "Duplicate entry" },
  { value: "other", label: "Other" },
];

export const COMORBIDITIES: readonly { value: TheatreComorbidity; label: string }[] = [
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hypertension" },
  { value: "cardiac", label: "Cardiac disease" },
  { value: "respiratory", label: "Respiratory disease" },
  { value: "renal", label: "Renal disease" },
  { value: "liver", label: "Liver disease" },
  { value: "anaemia", label: "Anaemia" },
  { value: "anticoagulated", label: "On anticoagulants" },
  { value: "obesity", label: "Obesity (BMI ≥ 35)" },
  { value: "hiv", label: "HIV" },
  { value: "sickle_cell", label: "Sickle cell disease" },
  { value: "pregnancy_possible", label: "Possible pregnancy" },
  { value: "smoker", label: "Smoker" },
];

export const COMORBIDITY_LABELS = Object.fromEntries(
  COMORBIDITIES.map((row) => [row.value, row.label]),
) as Record<TheatreComorbidity, string>;

export const ASA_GRADES = ["1", "2", "3", "4", "5", "6"] as const;

export const REQUIRED_TEST_TONE: Record<TheatreRequiredTestStatus, StatusDotBadgeTone> = {
  required: "warning",
  ordered: "info",
  resulted: "success",
  waived: "neutral",
};

/** "12 d of 30" plus a tone: breached red, within 20% of target amber. */
export function waitSummary(wait: TheatreWaitInfo): { text: string; tone: StatusDotBadgeTone } {
  const text = `${wait.days_waited} d / ${wait.target_days} d`;
  if (wait.breached) return { text: `${text} · breached`, tone: "danger" };
  if (wait.days_remaining <= Math.max(1, Math.round(wait.target_days * 0.2))) {
    return { text: `${text} · ${wait.days_remaining} d left`, tone: "warning" };
  }
  return { text, tone: "neutral" };
}

/** Combine a date (YYYY-MM-DD) and time (HH:MM) entered in the browser into ISO. */
export function combineLocalDateTime(day: string, clock: string): string | null {
  if (!day || !clock) return null;
  return localInputToIso(`${day}T${clock}`);
}
