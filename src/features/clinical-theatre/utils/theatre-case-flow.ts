import type {
  TheatreCase,
  TheatreCaseStatus,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { isObstetricEligible } from "@/features/clinical-theatre/utils/theatre-obstetric-display";
import {
  THEATRE_INTRA_OP_SECTIONS,
  theatreNextAction,
} from "@/features/clinical-theatre/utils/theatre-workflow";

/**
 * The perioperative journey of one theatre case, as steps of the guided case
 * workspace (`/case?step=…`). Order follows what happens to the patient.
 */
export const THEATRE_FLOW_STEPS = [
  {
    id: "booking",
    label: "Booking & team",
    hint: "Procedure, slot, room and the surgical team",
  },
  { id: "pre-op", label: "Pre-op & consent", hint: "Assessment, ASA grade, consent and fasting" },
  { id: "sign-in", label: "Sign in", hint: "WHO checklist before induction" },
  { id: "time-out", label: "Time out", hint: "WHO checklist before skin incision" },
  {
    id: "intra-op",
    label: "Operation",
    hint: "Anaesthesia, theatre times, counts, trays and items used",
  },
  { id: "sign-out", label: "Sign out", hint: "WHO checklist before leaving the room" },
  { id: "op-note", label: "Operation note", hint: "Write and sign the surgeon's note" },
  { id: "recovery", label: "Recovery", hint: "PACU observations, Aldrete score and discharge" },
  { id: "handover", label: "Handover", hint: "Where the patient went and what was recorded" },
] as const;

export type TheatreFlowStepId = (typeof THEATRE_FLOW_STEPS)[number]["id"];

/**
 * - `done`: recorded.
 * - `current`: where the case is now.
 * - `blocked`: where the case is now, but something must be fixed first.
 * - `attention`: the case moved past it without it being recorded.
 * - `upcoming`: not reached yet.
 * - `stopped`: the case was cancelled or postponed before reaching it.
 */
export type TheatreFlowStepState =
  "done" | "current" | "blocked" | "attention" | "upcoming" | "stopped";

export type TheatreFlowStep = {
  id: TheatreFlowStepId;
  label: string;
  hint: string;
  state: TheatreFlowStepState;
  /** Why the step needs attention, shown inline at the step and in the rail. */
  issues: string[];
};

/** Facts the case list item does not carry (from the anaesthesia / op-note queries). */
export type TheatreFlowExtras = {
  /** `true` signed, `false` not signed yet, `null`/`undefined` unknown. */
  operationNoteSigned?: boolean | null;
  /** Monitor readings still awaiting clinician review. */
  pendingDeviceVitals?: number | null;
};

type FlowCase = Pick<
  TheatreCase,
  "status" | "allowed_transitions" | "safety" | "urgency" | "is_crash"
> &
  Partial<Pick<TheatreCase, "paperwork" | "customer_gender">>;

/** How far along the journey a status is (−1 for cancelled / postponed). */
export function theatreStatusRank(status: TheatreCaseStatus): number {
  switch (status) {
    case "booked":
      return 0;
    case "waiting":
      return 1;
    case "pre_op":
      return 2;
    case "in_theatre":
      return 3;
    case "sign_out":
      return 4;
    case "recovery":
      return 5;
    case "discharged_ward":
    case "discharged_home":
      return 6;
    default:
      return -1;
  }
}

export function isTheatreCaseStopped(status: TheatreCaseStatus): boolean {
  return status === "cancelled" || status === "postponed";
}

const STEP_INDEX: Record<TheatreFlowStepId, number> = Object.fromEntries(
  THEATRE_FLOW_STEPS.map((step, index) => [step.id, index]),
) as Record<TheatreFlowStepId, number>;

/** Step that holds the work the case needs now. */
export function currentTheatreFlowStep(theatreCase: FlowCase): TheatreFlowStepId {
  const { status, safety, urgency } = theatreCase;
  const preOpReady = Boolean(safety?.pre_op_ready) || urgency === "emergency";
  switch (status) {
    case "waiting":
    case "pre_op":
      return preOpReady ? "sign-in" : "pre-op";
    case "in_theatre":
      return safety?.time_out ? "intra-op" : "time-out";
    case "sign_out":
      return safety?.sign_out ? "op-note" : "sign-out";
    case "recovery":
      return "recovery";
    case "discharged_ward":
    case "discharged_home":
      return "handover";
    default:
      return "booking";
  }
}

function isStepRecorded(
  id: TheatreFlowStepId,
  theatreCase: FlowCase,
  extras: TheatreFlowExtras,
): boolean {
  const rank = theatreStatusRank(theatreCase.status);
  const safety = theatreCase.safety;
  switch (id) {
    case "booking":
      return rank >= 1;
    case "pre-op":
      return Boolean(safety?.pre_op_ready);
    case "sign-in":
      return Boolean(safety?.sign_in);
    case "time-out":
      return Boolean(safety?.time_out);
    case "intra-op":
      return rank >= 4;
    case "sign-out":
      return Boolean(safety?.sign_out);
    case "op-note":
      return extras.operationNoteSigned === true;
    case "recovery":
    case "handover":
      return rank >= 6;
  }
}

/** Crash paperwork key → step where it is completed. */
const PAPERWORK_STEP: Record<string, TheatreFlowStepId> = {
  pre_op: "pre-op",
  consent: "pre-op",
  sign_in: "sign-in",
  time_out: "time-out",
  sign_out: "sign-out",
  operation_note: "op-note",
};

export function paperworkStep(item: { key: string; section?: string }): TheatreFlowStepId {
  return PAPERWORK_STEP[item.key] ?? (item.section === "intra-op" ? "intra-op" : "pre-op");
}

function stepIssues(
  id: TheatreFlowStepId,
  theatreCase: FlowCase,
  extras: TheatreFlowExtras,
  current: TheatreFlowStepId,
): string[] {
  const issues: string[] = [];
  const { status, safety } = theatreCase;
  for (const item of theatreCase.paperwork?.outstanding ?? []) {
    if (paperworkStep(item) === id) issues.push(`Outstanding: ${item.label}`);
  }
  if (id === current && !theatreCase.is_crash) {
    const next = theatreNextAction(theatreCase);
    if (next.kind === "transition" && next.blocker) {
      // Only show a gate blocker on the step that clears it.
      const gateStep: TheatreFlowStepId | null =
        status === "pre_op" && next.status === "in_theatre"
          ? safety?.sign_in
            ? "pre-op"
            : "sign-in"
          : status === "in_theatre" && next.status === "sign_out"
            ? "time-out"
            : status === "sign_out" && next.status === "recovery"
              ? "sign-out"
              : null;
      if (gateStep === id) issues.push(next.blocker);
    }
  }
  if (id === "sign-out" && safety?.count_blocker && !issues.includes(safety.count_blocker)) {
    issues.push(safety.count_blocker);
  }
  if ((id === "intra-op" || id === "sign-out") && (extras.pendingDeviceVitals ?? 0) > 0) {
    const count = extras.pendingDeviceVitals ?? 0;
    issues.push(
      `${count} monitor reading${count === 1 ? "" : "s"} awaiting review before the anaesthesia chart can be signed.`,
    );
  }
  return issues;
}

/** Every step of the journey with its state and inline issues. */
export function buildTheatreFlow(
  theatreCase: FlowCase,
  extras: TheatreFlowExtras = {},
): TheatreFlowStep[] {
  const current = currentTheatreFlowStep(theatreCase);
  const currentIndex = STEP_INDEX[current];
  const stopped = isTheatreCaseStopped(theatreCase.status);
  return THEATRE_FLOW_STEPS.map((step, index) => {
    const recorded = isStepRecorded(step.id, theatreCase, extras);
    const issues = stepIssues(step.id, theatreCase, extras, current);
    let state: TheatreFlowStepState;
    if (stopped) {
      state = index === 0 ? "blocked" : recorded ? "done" : "stopped";
    } else if (index === currentIndex) {
      state = issues.length > 0 ? "blocked" : current === "handover" ? "done" : "current";
    } else if (index < currentIndex) {
      state = recorded && issues.length === 0 ? "done" : "attention";
    } else {
      state = recorded ? "done" : "upcoming";
    }
    return { id: step.id, label: step.label, hint: step.hint, state, issues };
  });
}

export function isTheatreFlowStep(value: string | null | undefined): value is TheatreFlowStepId {
  return THEATRE_FLOW_STEPS.some((step) => step.id === value);
}

/** Parts of the Operation step (`?section=`); caesarean only when it can apply. */
/** Order of the Operation parts: as the case runs in the room. */
const OPERATION_PART_ORDER = [
  "anaesthesia",
  "timings",
  "trays",
  "counts",
  "consumables",
  "caesarean",
] as const;

export function theatreOperationParts(theatreCase: Partial<Pick<TheatreCase, "customer_gender">>) {
  return THEATRE_INTRA_OP_SECTIONS.filter(
    (part) =>
      part.id !== "checklist" &&
      part.id !== "op-note" &&
      (part.id !== "caesarean" || isObstetricEligible(theatreCase)),
  ).sort(
    (a, b) =>
      OPERATION_PART_ORDER.indexOf(a.id as (typeof OPERATION_PART_ORDER)[number]) -
      OPERATION_PART_ORDER.indexOf(b.id as (typeof OPERATION_PART_ORDER)[number]),
  );
}

export type TheatreOperationPart = ReturnType<typeof theatreOperationParts>[number]["id"];

/**
 * Turn `?step=` / `?section=` (including the old section links) into the step
 * and Operation part to show. Unknown values fall back to the current step.
 */
export function resolveTheatreFlowLocation(
  theatreCase: FlowCase,
  stepParam: string | null | undefined,
  sectionParam: string | null | undefined,
): { step: TheatreFlowStepId; part: TheatreOperationPart | null } {
  const parts = theatreOperationParts(theatreCase);
  const asPart = (value: string | null | undefined) =>
    (parts.find((part) => part.id === value)?.id ?? null) as TheatreOperationPart | null;

  if (sectionParam === "op-note") return { step: "op-note", part: null };
  if (sectionParam === "checklist" || stepParam === "checklist") {
    return { step: whoStepFor(theatreCase), part: null };
  }
  if (isTheatreFlowStep(stepParam)) {
    return { step: stepParam, part: stepParam === "intra-op" ? asPart(sectionParam) : null };
  }
  const part = asPart(sectionParam);
  if (part) return { step: "intra-op", part };
  return { step: currentTheatreFlowStep(theatreCase), part: null };
}

/** The WHO stage that is due for this case (for old "checklist" links). */
export function whoStepFor(theatreCase: Pick<TheatreCase, "status" | "safety">): TheatreFlowStepId {
  const rank = theatreStatusRank(theatreCase.status);
  if (rank <= 2) return "sign-in";
  if (rank === 3 && !theatreCase.safety?.time_out) return "time-out";
  return "sign-out";
}

/** The step before / after `id`. */
export function adjacentTheatreFlowSteps(id: TheatreFlowStepId) {
  const index = STEP_INDEX[id];
  return {
    previous: index > 0 ? THEATRE_FLOW_STEPS[index - 1] : null,
    next: index < THEATRE_FLOW_STEPS.length - 1 ? THEATRE_FLOW_STEPS[index + 1] : null,
  };
}

/** Default Operation part for the moment of the case. */
export function defaultOperationPart(status: TheatreCaseStatus): TheatreOperationPart {
  return status === "sign_out" ? "counts" : "anaesthesia";
}

/** Href of a flow step on the case route. */
export function theatreFlowStepHref(
  caseHref: string,
  step: TheatreFlowStepId,
  part?: string | null,
): string {
  const params = new URLSearchParams({ step });
  if (part) params.set("section", part);
  return `${caseHref}?${params.toString()}`;
}
