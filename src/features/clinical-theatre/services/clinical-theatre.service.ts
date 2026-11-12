import { BFF_CLINICAL_THEATRE_ROUTES as ROUTES } from "@/constants/clinical-theatre-api";
import type {
  AddTheatreAnaesthesiaVitalPayload,
  AddTheatreConsumablePayload,
  AddTheatreRecoveryObservationPayload,
  AddTheatreTeamMemberPayload,
  IssueTheatreConsumablePayload,
  TheatreAnaesthesiaRecord,
  TheatreConsumable,
  TheatreConsumableReturn,
  TheatreCancellationReason,
  CreateTheatreCancellationReasonPayload,
  UpdateTheatreCancellationReasonPayload,
  ReturnTheatreConsumablePayload,
  TheatreOperationNote,
  TheatreRecoveryRecord,
  TheatreReportFilters,
  TheatreReportSummary,
  UpdateTheatreAnaesthesiaPayload,
  UpdateTheatreOperationNotePayload,
  UpdateTheatreRecoveryPayload,
  CreateTheatreCasePayload,
  CreateTheatreRoomPayload,
  RecordTheatreChecklistPayload,
  TheatreBoard,
  TheatreBoardFilters,
  TheatreCase,
  TheatreCaseFilters,
  TheatreCaseStatus,
  TheatreChecklistStage,
  TheatreChecklistStageId,
  TheatrePreOp,
  TheatreRoom,
  TheatreRoomFilters,
  TheatreTeamMember,
  UpdateTheatrePreOpPayload,
  UpdateTheatreCaseDetailsPayload,
  UpdateTheatreRoomPayload,
  StartTheatreCrashCasePayload,
  TheatreCaseProcedurePayload,
  TheatreObstetricPayload,
  UpdateTheatreObstetricPayload,
  TheatreBabyWritePayload,
  RegisterTheatreNewbornPayload,
  ConvertTheatreCaseToIpdPayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { bffRequest } from "@/lib/bff-client";

export function theatreQueryString(
  params: Record<string, string | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function fetchTheatreRooms(filters: TheatreRoomFilters = {}) {
  return bffRequest<TheatreRoom[]>(
    `${ROUTES.rooms}${theatreQueryString(filters)}`,
  );
}

export function createTheatreRoom(payload: CreateTheatreRoomPayload) {
  return bffRequest<TheatreRoom>(ROUTES.rooms, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreRoom(uuid: string, payload: UpdateTheatreRoomPayload) {
  return bffRequest<TheatreRoom>(ROUTES.room(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function fetchTheatreCases(filters: TheatreCaseFilters = {}) {
  return bffRequest<TheatreCase[]>(
    `${ROUTES.cases}${theatreQueryString(filters)}`,
  );
}

export function fetchTheatreCase(uuid: string) {
  return bffRequest<TheatreCase>(ROUTES.case(uuid));
}

export function createTheatreCase(payload: CreateTheatreCasePayload) {
  return bffRequest<TheatreCase>(ROUTES.cases, {
    method: "POST",
    body: payload,
  });
}

export function startTheatreCrashCase(payload: StartTheatreCrashCasePayload) {
  return bffRequest<TheatreCase>(ROUTES.crash, {
    method: "POST",
    body: payload,
  });
}

export function addTheatreCaseProcedure(
  uuid: string,
  payload: TheatreCaseProcedurePayload,
) {
  return bffRequest<TheatreCase>(ROUTES.procedures(uuid), {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreCaseProcedure(
  uuid: string,
  procedureUuid: string,
  payload: TheatreCaseProcedurePayload,
) {
  return bffRequest<TheatreCase>(ROUTES.procedure(uuid, procedureUuid), {
    method: "PATCH",
    body: payload,
  });
}

export function removeTheatreCaseProcedure(uuid: string, procedureUuid: string) {
  return bffRequest<TheatreCase>(ROUTES.procedure(uuid, procedureUuid), {
    method: "DELETE",
  });
}

export function updateTheatreCaseDetails(
  uuid: string,
  payload: UpdateTheatreCaseDetailsPayload,
) {
  return bffRequest<TheatreCase>(ROUTES.case(uuid), {
    method: "PATCH",
    body: payload,
  });
}

/** Return the encounter's theatre case, setting up a draft one when missing. */
export function ensureTheatreCaseForEncounter(encounterUuid: string) {
  return bffRequest<TheatreCase>(ROUTES.caseForEncounter, {
    method: "POST",
    body: { encounter: encounterUuid },
  });
}

export function transitionTheatreCase(
  uuid: string,
  payload: {
    status: TheatreCaseStatus;
    reason?: string;
    cancellation_reason?: string | null;
  },
) {
  return bffRequest<TheatreCase>(ROUTES.transition(uuid), {
    method: "POST",
    body: payload,
  });
}

export function rescheduleTheatreCase(
  uuid: string,
  payload: { scheduled_start: string; scheduled_end?: string | null },
) {
  return bffRequest<TheatreCase>(ROUTES.reschedule(uuid), {
    method: "POST",
    body: payload,
  });
}

export function assignTheatreCaseRoom(uuid: string, room: string) {
  return bffRequest<TheatreCase>(ROUTES.assignRoom(uuid), {
    method: "POST",
    body: { room },
  });
}

export function fetchTheatreBoard(filters: TheatreBoardFilters = {}) {
  return bffRequest<TheatreBoard>(`${ROUTES.board}${theatreQueryString(filters)}`);
}

export function fetchTheatreTeam(caseUuid: string) {
  return bffRequest<TheatreTeamMember[]>(ROUTES.team(caseUuid));
}

export function addTheatreTeamMember(
  caseUuid: string,
  payload: AddTheatreTeamMemberPayload,
) {
  return bffRequest<TheatreTeamMember>(ROUTES.team(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function removeTheatreTeamMember(caseUuid: string, memberUuid: string) {
  return bffRequest<null>(ROUTES.teamMember(caseUuid, memberUuid), {
    method: "DELETE",
  });
}

export function fetchTheatreChecklist(caseUuid: string) {
  return bffRequest<TheatreChecklistStage[]>(ROUTES.checklist(caseUuid));
}

export function recordTheatreChecklistStage(
  caseUuid: string,
  stage: TheatreChecklistStageId,
  payload: RecordTheatreChecklistPayload,
) {
  return bffRequest<TheatreChecklistStage[]>(
    ROUTES.checklistStage(caseUuid, stage),
    { method: "POST", body: payload },
  );
}

export function fetchTheatrePreOp(caseUuid: string) {
  return bffRequest<TheatrePreOp | null>(ROUTES.preOp(caseUuid));
}

export function updateTheatrePreOp(
  caseUuid: string,
  payload: UpdateTheatrePreOpPayload,
) {
  return bffRequest<TheatrePreOp>(ROUTES.preOp(caseUuid), {
    method: "PUT",
    body: payload,
  });
}

export function fetchTheatreAnaesthesia(caseUuid: string) {
  return bffRequest<TheatreAnaesthesiaRecord | null>(ROUTES.anaesthesia(caseUuid));
}

export function updateTheatreAnaesthesia(
  caseUuid: string,
  payload: UpdateTheatreAnaesthesiaPayload,
) {
  return bffRequest<TheatreAnaesthesiaRecord>(ROUTES.anaesthesia(caseUuid), {
    method: "PUT",
    body: payload,
  });
}

export function addTheatreAnaesthesiaVital(
  caseUuid: string,
  payload: AddTheatreAnaesthesiaVitalPayload,
) {
  return bffRequest<TheatreAnaesthesiaRecord>(ROUTES.anaesthesiaVitals(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function signTheatreAnaesthesia(caseUuid: string) {
  return bffRequest<TheatreAnaesthesiaRecord>(ROUTES.anaesthesiaSign(caseUuid), {
    method: "POST",
    body: {},
  });
}

export function fetchTheatreOperationNote(caseUuid: string) {
  return bffRequest<TheatreOperationNote | null>(ROUTES.operationNote(caseUuid));
}

export function updateTheatreOperationNote(
  caseUuid: string,
  payload: UpdateTheatreOperationNotePayload,
) {
  return bffRequest<TheatreOperationNote>(ROUTES.operationNote(caseUuid), {
    method: "PUT",
    body: payload,
  });
}

export function signTheatreOperationNote(caseUuid: string) {
  return bffRequest<TheatreOperationNote>(ROUTES.operationNoteSign(caseUuid), {
    method: "POST",
    body: {},
  });
}

export function fetchTheatreRecovery(caseUuid: string) {
  return bffRequest<TheatreRecoveryRecord | null>(ROUTES.recovery(caseUuid));
}

export function updateTheatreRecovery(
  caseUuid: string,
  payload: UpdateTheatreRecoveryPayload,
) {
  return bffRequest<TheatreRecoveryRecord>(ROUTES.recovery(caseUuid), {
    method: "PATCH",
    body: payload,
  });
}

export function addTheatreRecoveryObservation(
  caseUuid: string,
  payload: AddTheatreRecoveryObservationPayload,
) {
  return bffRequest<TheatreRecoveryRecord>(ROUTES.recoveryObservations(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function dischargeTheatreRecovery(
  caseUuid: string,
  payload: UpdateTheatreRecoveryPayload = {},
) {
  return bffRequest<TheatreRecoveryRecord>(ROUTES.recoveryDischarge(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function fetchTheatreConsumables(caseUuid: string) {
  return bffRequest<TheatreConsumable[]>(ROUTES.consumables(caseUuid));
}

export function addTheatreConsumable(
  caseUuid: string,
  payload: AddTheatreConsumablePayload,
) {
  return bffRequest<TheatreConsumable>(ROUTES.consumables(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function issueTheatreConsumable(
  caseUuid: string,
  itemUuid: string,
  payload: IssueTheatreConsumablePayload = {},
) {
  return bffRequest<TheatreConsumable>(ROUTES.consumableIssue(caseUuid, itemUuid), {
    method: "POST",
    body: payload,
  });
}

export function returnTheatreConsumable(
  caseUuid: string,
  itemUuid: string,
  payload: ReturnTheatreConsumablePayload,
) {
  return bffRequest<{ item: TheatreConsumable; return: TheatreConsumableReturn }>(
    ROUTES.consumableReturn(caseUuid, itemUuid),
    { method: "POST", body: payload },
  );
}

export function fetchTheatreCancellationReasons(
  options: { includeInactive?: boolean } = {},
) {
  const query = options.includeInactive ? "?include_inactive=true" : "";
  return bffRequest<TheatreCancellationReason[]>(
    `${ROUTES.cancellationReasons}${query}`,
  );
}

export function createTheatreCancellationReason(
  payload: CreateTheatreCancellationReasonPayload,
) {
  return bffRequest<TheatreCancellationReason>(ROUTES.cancellationReasons, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreCancellationReason(
  uuid: string,
  payload: UpdateTheatreCancellationReasonPayload,
) {
  return bffRequest<TheatreCancellationReason>(ROUTES.cancellationReason(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function fetchTheatreObstetric(caseUuid: string) {
  return bffRequest<TheatreObstetricPayload>(ROUTES.obstetric(caseUuid));
}

export function updateTheatreObstetric(
  caseUuid: string,
  payload: UpdateTheatreObstetricPayload,
) {
  return bffRequest<TheatreObstetricPayload>(ROUTES.obstetric(caseUuid), {
    method: "PUT",
    body: payload,
  });
}

export function addTheatreBaby(caseUuid: string, payload: TheatreBabyWritePayload) {
  return bffRequest<TheatreObstetricPayload>(ROUTES.babies(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreBaby(
  caseUuid: string,
  babyUuid: string,
  payload: Partial<TheatreBabyWritePayload>,
) {
  return bffRequest<TheatreObstetricPayload>(ROUTES.baby(caseUuid, babyUuid), {
    method: "PATCH",
    body: payload,
  });
}

export function removeTheatreBaby(caseUuid: string, babyUuid: string) {
  return bffRequest<TheatreObstetricPayload>(ROUTES.baby(caseUuid, babyUuid), {
    method: "DELETE",
  });
}

export function registerTheatreNewborn(
  caseUuid: string,
  babyUuid: string,
  payload: RegisterTheatreNewbornPayload = {},
) {
  return bffRequest<TheatreObstetricPayload>(ROUTES.babyRegister(caseUuid, babyUuid), {
    method: "POST",
    body: payload,
  });
}

export function convertTheatreCaseToIpd(
  caseUuid: string,
  payload: ConvertTheatreCaseToIpdPayload,
) {
  return bffRequest<TheatreCase>(ROUTES.convertToIpd(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function cancelTheatreConsumable(caseUuid: string, itemUuid: string) {
  return bffRequest<TheatreConsumable>(ROUTES.consumable(caseUuid, itemUuid), {
    method: "DELETE",
  });
}

export function fetchTheatreReportSummary(filters: TheatreReportFilters) {
  return bffRequest<TheatreReportSummary>(
    `${ROUTES.reportSummary}${theatreQueryString(filters)}`,
  );
}
