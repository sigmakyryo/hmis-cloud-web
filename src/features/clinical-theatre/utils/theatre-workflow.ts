import type {
  TheatreCase,
  TheatreCaseStatus,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  requiredChecklistStage,
  safetyGateBlocker,
} from "@/features/clinical-theatre/utils/theatre-safety-display";

/** Workspace sections in the theatre case tab bar (route segments). */
export type TheatreWorkspaceSection = "case" | "pre-op" | "intra-op" | "recovery";

/** Sub-sections of the Intra-op section (`?section=`). */
export const THEATRE_INTRA_OP_SECTIONS = [
  { id: "checklist", label: "Time-out & sign-out" },
  { id: "anaesthesia", label: "Anaesthesia" },
  { id: "op-note", label: "Op note" },
  { id: "consumables", label: "Consumables" },
] as const;

export type TheatreIntraOpSection = (typeof THEATRE_INTRA_OP_SECTIONS)[number]["id"];

export function isIntraOpSection(value: string | null | undefined): value is TheatreIntraOpSection {
  return THEATRE_INTRA_OP_SECTIONS.some((section) => section.id === value);
}

/** The intra-op sub-section most useful at this point of the case. */
export function defaultIntraOpSection(status: TheatreCaseStatus): TheatreIntraOpSection {
  if (status === "sign_out") return "op-note";
  if (status === "in_theatre") return "anaesthesia";
  if (status === "recovery" || status.startsWith("discharged")) return "op-note";
  return "checklist";
}

export type TheatreStageId = "scheduled" | "pre_op" | "in_theatre" | "recovery" | "done";

export const THEATRE_STAGES: readonly { id: TheatreStageId; label: string }[] = [
  { id: "scheduled", label: "Scheduled" },
  { id: "pre_op", label: "Pre-op" },
  { id: "in_theatre", label: "In theatre" },
  { id: "recovery", label: "Recovery" },
  { id: "done", label: "Done" },
];

/** Stepper stage for a case status (cancelled cases show where they stopped). */
export function theatreStageForStatus(status: TheatreCaseStatus): TheatreStageId {
  switch (status) {
    case "pre_op":
      return "pre_op";
    case "in_theatre":
    case "sign_out":
      return "in_theatre";
    case "recovery":
      return "recovery";
    case "discharged_ward":
    case "discharged_home":
      return "done";
    default:
      return "scheduled";
  }
}

/** Section that holds the work of the current stage. */
export function sectionForStatus(status: TheatreCaseStatus): TheatreWorkspaceSection {
  switch (theatreStageForStatus(status)) {
    case "pre_op":
      return "pre-op";
    case "in_theatre":
      return "intra-op";
    case "recovery":
    case "done":
      return "recovery";
    default:
      return status === "waiting" ? "pre-op" : "case";
  }
}

/** Forward moves in the order staff normally take them. */
const FORWARD_ORDER: readonly TheatreCaseStatus[] = [
  "waiting",
  "pre_op",
  "in_theatre",
  "sign_out",
  "recovery",
  "booked",
];

export type TheatreNextAction =
  | {
      kind: "transition";
      status: TheatreCaseStatus;
      blocker: string | null;
      /** Where to go to clear the blocker. */
      fixSection: TheatreWorkspaceSection | null;
      fixSubSection: TheatreIntraOpSection | null;
    }
  | { kind: "recovery-discharge" }
  | { kind: "none" };

/** The single primary action for the case header. */
export function theatreNextAction(
  theatreCase: Pick<TheatreCase, "status" | "allowed_transitions" | "safety" | "urgency">,
): TheatreNextAction {
  if (theatreCase.status === "recovery") {
    return { kind: "recovery-discharge" };
  }
  const next = FORWARD_ORDER.find((status) =>
    theatreCase.allowed_transitions.includes(status),
  );
  if (!next) return { kind: "none" };
  const blocker = safetyGateBlocker(
    theatreCase.status,
    next,
    theatreCase.safety,
    theatreCase.urgency,
  );
  const stage = blocker ? requiredChecklistStage(theatreCase.status, next) : null;
  return {
    kind: "transition",
    status: next,
    blocker,
    fixSection: stage === null ? null : stage === "sign_in" ? "pre-op" : "intra-op",
    fixSubSection: stage === "time_out" || stage === "sign_out" ? "checklist" : null,
  };
}

/** Postpone / cancel moves that live in the Overview section. */
export function theatreSecondaryTransitions(
  theatreCase: Pick<TheatreCase, "allowed_transitions">,
): TheatreCaseStatus[] {
  return theatreCase.allowed_transitions.filter(
    (status) => status === "postponed" || status === "cancelled",
  );
}
