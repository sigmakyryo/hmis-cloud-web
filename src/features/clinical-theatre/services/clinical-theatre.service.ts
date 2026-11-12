import { BFF_CLINICAL_THEATRE_ROUTES as ROUTES } from "@/constants/clinical-theatre-api";
import type {
  AddTheatreAnaesthesiaVitalPayload,
  AddTheatreConsumablePayload,
  AddTheatreRecoveryObservationPayload,
  AddTheatreTeamMemberPayload,
  IssueTheatreConsumablePayload,
  TheatreAnaesthesiaRecord,
  TheatreConsumable,
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
  UpdateTheatreRoomPayload,
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

export function transitionTheatreCase(
  uuid: string,
  payload: { status: TheatreCaseStatus; reason?: string },
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
