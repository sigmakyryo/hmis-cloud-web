import type { StatusDotBadgeTone } from "@/components/ui/status-dot-badge";
import type {
  TheatreCase,
  TheatreCaseStatus,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export const THEATRE_STATUS_LABELS: Record<TheatreCaseStatus, string> = {
  booked: "Booked",
  waiting: "Waiting",
  pre_op: "Pre-op",
  in_theatre: "In theatre",
  sign_out: "Sign out",
  recovery: "Recovery",
  discharged_ward: "Returned to ward",
  discharged_home: "Discharged home",
  cancelled: "Cancelled",
  postponed: "Postponed",
};

/** Label for the button that moves a case to `status`. */
export const THEATRE_TRANSITION_ACTION_LABELS: Record<
  TheatreCaseStatus,
  string
> = {
  booked: "Rebook",
  waiting: "Check in",
  pre_op: "Start pre-op",
  in_theatre: "Into theatre",
  sign_out: "Sign out",
  recovery: "To recovery",
  discharged_ward: "Return to ward",
  discharged_home: "Discharge home",
  cancelled: "Cancel case",
  postponed: "Postpone",
};

/** Concise visible labels for the case-header primary action. */
export const THEATRE_HEADER_ACTION_LABELS: Record<TheatreCaseStatus, string> = {
  booked: "Rebook",
  waiting: "Check in",
  pre_op: "Pre-op",
  in_theatre: "In theatre",
  sign_out: "Sign out",
  recovery: "Recovery",
  discharged_ward: "To ward",
  discharged_home: "Home",
  cancelled: "Cancel",
  postponed: "Postpone",
};

/** Short jump-button step names. The full flow label stays in the aria-label. */
export const THEATRE_FLOW_STEP_SHORT_LABELS: Record<string, string> = {
  booking: "Booking",
  "pre-op": "Pre-op",
  "sign-in": "Sign in",
  "time-out": "Time out",
  "intra-op": "Operation",
  "sign-out": "Sign out",
  "op-note": "Op note",
  recovery: "Recovery",
  handover: "Handover",
};

export function theatreJumpButtonLabel(
  stepId: string,
  fullLabel: string,
): string {
  return `Go to ${THEATRE_FLOW_STEP_SHORT_LABELS[stepId] ?? fullLabel}`;
}

export function theatreJumpButtonDescription(fullLabel: string): string {
  return `Go to the current step: ${fullLabel}`;
}

export const REASON_REQUIRED_STATUSES: ReadonlySet<TheatreCaseStatus> = new Set(
  ["cancelled", "postponed"],
);

export function theatreStatusTone(
  status: TheatreCaseStatus,
): StatusDotBadgeTone {
  switch (status) {
    case "in_theatre":
    case "sign_out":
      return "warning";
    case "recovery":
    case "pre_op":
    case "waiting":
      return "info";
    case "discharged_ward":
    case "discharged_home":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function formatTheatreSlot(
  theatreCase: Pick<TheatreCase, "scheduled_start" | "scheduled_end">,
): string {
  if (!theatreCase.scheduled_start) {
    return "Unscheduled";
  }
  const start = new Date(theatreCase.scheduled_start);
  const startText = start.toLocaleString();
  if (!theatreCase.scheduled_end) {
    return startText;
  }
  const end = new Date(theatreCase.scheduled_end);
  return `${startText} – ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** Convert a `datetime-local` input value to an ISO string (or null when empty). */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
