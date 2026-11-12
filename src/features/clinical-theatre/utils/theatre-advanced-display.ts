import type {
  StartTheatreCrashCasePayload,
  TheatreCase,
  TheatreCaseProcedure,
  TheatreCaseReturnLink,
  TheatreNcepodCategory,
  TheatreProcedureApproach,
  TheatreProcedureLaterality,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export const NCEPOD_OPTIONS: { value: TheatreNcepodCategory; label: string; hint: string }[] =
  [
    { value: "immediate", label: "1 · Immediate", hint: "Life or limb; within minutes" },
    { value: "urgent", label: "2 · Urgent", hint: "Acute threat; within hours" },
    { value: "expedited", label: "3 · Expedited", hint: "Stable; within days" },
    { value: "elective", label: "4 · Elective", hint: "Planned" },
  ];

export const LATERALITY_OPTIONS: { value: TheatreProcedureLaterality; label: string }[] = [
  { value: "not_applicable", label: "N/A" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
  { value: "midline", label: "Midline" },
];

export const APPROACH_OPTIONS: { value: TheatreProcedureApproach; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "laparoscopic", label: "Laparoscopic" },
  { value: "endoscopic", label: "Endoscopic" },
  { value: "robotic", label: "Robotic" },
  { value: "percutaneous", label: "Percutaneous" },
  { value: "vaginal", label: "Vaginal" },
  { value: "other", label: "Other" },
];

export function ncepodShortLabel(category: TheatreNcepodCategory | "" | null | undefined) {
  const option = NCEPOD_OPTIONS.find((item) => item.value === category);
  return option ? `NCEPOD ${option.label}` : "";
}

/** "Appendicectomy · Right · Laparoscopic" style one-liner for a procedure. */
export function procedureDetailLine(procedure: TheatreCaseProcedure): string {
  const parts = [procedure.name];
  if (procedure.laterality && procedure.laterality !== "not_applicable") {
    parts.push(procedure.laterality_label);
  }
  if (procedure.approach) parts.push(procedure.approach_label);
  if (procedure.code) parts.push(procedure.code);
  return parts.join(" · ");
}

/** Text for the op note "procedure performed" box built from the case procedures. */
export function procedurePerformedText(procedures: TheatreCaseProcedure[]): string {
  return procedures.map((procedure, index) => `${index + 1}. ${procedureDetailLine(procedure)}`).join("\n");
}

/** Show the crash banner only while a crash case still owes paperwork. */
export function crashPaperworkOutstanding(
  theatreCase: Pick<TheatreCase, "is_crash" | "paperwork" | "status">,
): boolean {
  return Boolean(
    theatreCase.is_crash &&
      theatreCase.status !== "cancelled" &&
      theatreCase.paperwork &&
      !theatreCase.paperwork.is_complete,
  );
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Payload for a crash case started from a picked patient (queue or visit). */
export function buildCrashCasePayload(input: {
  customerUuid?: string | null;
  visitUuid?: string | null;
  stayUuid?: string | null;
  clinicUuid?: string | null;
  roomUuid?: string | null;
  procedure: string;
  ncepod: TheatreNcepodCategory;
  surgeonId?: number | null;
}): StartTheatreCrashCasePayload {
  const payload: StartTheatreCrashCasePayload = {
    procedure_description: input.procedure.trim(),
    ncepod_category: input.ncepod,
    room: input.roomUuid ?? null,
  };
  if (input.stayUuid) payload.stay = input.stayUuid;
  else if (input.visitUuid) payload.visit = input.visitUuid;
  else if (input.customerUuid) payload.customer = input.customerUuid;
  if (input.clinicUuid) payload.clinic = input.clinicUuid;
  if (input.surgeonId) payload.lead_surgeon = input.surgeonId;
  return payload;
}

/** "Unplanned return · 2 days after" style label for a return link. */
export function returnLinkLabel(
  planned: boolean | null | undefined,
  intervalDays: number | null | undefined,
): string {
  const kind =
    planned === true ? "Planned return" : planned === false ? "Unplanned return" : "Return";
  if (intervalDays === null || intervalDays === undefined) return kind;
  if (intervalDays === 0) return `${kind} · same day`;
  return `${kind} · ${intervalDays} day${intervalDays === 1 ? "" : "s"} after`;
}

/** Workspace URL for a linked case, or null when it has no encounter yet. */
export function linkedCaseHref(link: TheatreCaseReturnLink): string | null {
  if (!link.visit_uuid || !link.encounter_uuid) return null;
  return `/clinical/theatre/${link.visit_uuid}/${link.encounter_uuid}/case`;
}

/** Earlier operated cases of the same patient that a return can point at. */
export function returnCandidates(
  theatreCase: Pick<TheatreCase, "uuid">,
  patientCases: TheatreCase[],
): TheatreCase[] {
  return patientCases.filter(
    (item) =>
      item.uuid !== theatreCase.uuid &&
      item.status !== "cancelled" &&
      Boolean(item.actual_start),
  );
}
