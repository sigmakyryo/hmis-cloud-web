import type {
  TheatreCaseSafety,
  TheatreCaseStatus,
  TheatreChecklistStageId,
  TheatreTeamRole,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export const THEATRE_TEAM_ROLE_LABELS: Record<TheatreTeamRole, string> = {
  surgeon: "Surgeon",
  assistant_surgeon: "Assistant surgeon",
  anaesthetist: "Anaesthetist",
  anaesthetic_nurse: "Anaesthetic nurse",
  scrub_nurse: "Scrub nurse",
  circulating_nurse: "Circulating nurse",
  other: "Other",
};

export const THEATRE_CHECKLIST_STAGE_LABELS: Record<TheatreChecklistStageId, string> =
  {
    sign_in: "Sign in",
    time_out: "Time out",
    sign_out: "Sign out",
  };

/**
 * WHO stage that must be complete before a case can move from `from` to `to`.
 * Mirrors `SAFETY_GATES` in `eportal/theatre/services/case_transitions.py`.
 */
export function requiredChecklistStage(
  from: TheatreCaseStatus,
  to: TheatreCaseStatus,
): TheatreChecklistStageId | null {
  if (from === "pre_op" && to === "in_theatre") return "sign_in";
  if (from === "in_theatre" && to === "sign_out") return "time_out";
  if (from === "sign_out" && to === "recovery") return "sign_out";
  return null;
}

/** Why a gated move is blocked right now, or null when it may go ahead. */
export function safetyGateBlocker(
  from: TheatreCaseStatus,
  to: TheatreCaseStatus,
  safety: TheatreCaseSafety | undefined,
  urgency: string,
): string | null {
  const stage = requiredChecklistStage(from, to);
  if (!stage || !safety) return null;
  if (stage === "sign_out" && safety.count_blocker) {
    // Sign-out cannot be completed until the final count reconciles.
    return safety.count_blocker;
  }
  if (!safety[stage]) {
    return `Complete the WHO ${THEATRE_CHECKLIST_STAGE_LABELS[stage].toLowerCase()} checklist first.`;
  }
  if (stage === "sign_in" && urgency !== "emergency" && !safety.pre_op_ready) {
    return "Record the pre-op assessment (ASA grade and signed consent).";
  }
  return null;
}
