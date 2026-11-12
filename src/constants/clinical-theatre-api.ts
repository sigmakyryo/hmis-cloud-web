const upstream = (path: string) => `/theatre/${path}`;
const bff = (path: string) => `/api/theatre/${path}`;

/** Django DRF v1 theatre endpoints (relative to HMIS_API_URL). */
export const CLINICAL_THEATRE_API_PATHS = {
  rooms: upstream("rooms/"),
  room: (uuid: string) => upstream(`rooms/${uuid}/`),
  cases: upstream("cases/"),
  case: (uuid: string) => upstream(`cases/${uuid}/`),
  caseForEncounter: upstream("cases/for-encounter/"),
  transition: (uuid: string) => upstream(`cases/${uuid}/transition/`),
  reschedule: (uuid: string) => upstream(`cases/${uuid}/reschedule/`),
  assignRoom: (uuid: string) => upstream(`cases/${uuid}/assign-room/`),
  board: upstream("board/"),
  team: (uuid: string) => upstream(`cases/${uuid}/team/`),
  teamMember: (uuid: string, memberUuid: string) =>
    upstream(`cases/${uuid}/team/${memberUuid}/`),
  checklist: (uuid: string) => upstream(`cases/${uuid}/checklist/`),
  checklistStage: (uuid: string, stage: string) =>
    upstream(`cases/${uuid}/checklist/${stage}/`),
  preOp: (uuid: string) => upstream(`cases/${uuid}/pre-op/`),
  anaesthesia: (uuid: string) => upstream(`cases/${uuid}/anaesthesia/`),
  anaesthesiaVitals: (uuid: string) => upstream(`cases/${uuid}/anaesthesia/vitals/`),
  anaesthesiaSign: (uuid: string) => upstream(`cases/${uuid}/anaesthesia/sign/`),
  operationNote: (uuid: string) => upstream(`cases/${uuid}/operation-note/`),
  operationNoteSign: (uuid: string) => upstream(`cases/${uuid}/operation-note/sign/`),
  recovery: (uuid: string) => upstream(`cases/${uuid}/recovery/`),
  recoveryObservations: (uuid: string) =>
    upstream(`cases/${uuid}/recovery/observations/`),
  recoveryDischarge: (uuid: string) => upstream(`cases/${uuid}/recovery/discharge/`),
  consumables: (uuid: string) => upstream(`cases/${uuid}/consumables/`),
  consumable: (uuid: string, itemUuid: string) =>
    upstream(`cases/${uuid}/consumables/${itemUuid}/`),
  consumableIssue: (uuid: string, itemUuid: string) =>
    upstream(`cases/${uuid}/consumables/${itemUuid}/issue/`),
  reportSummary: upstream("reports/summary/"),
} as const;

/** Browser-facing BFF theatre routes. */
export const BFF_CLINICAL_THEATRE_ROUTES = {
  rooms: bff("rooms"),
  room: (uuid: string) => bff(`rooms/${uuid}`),
  cases: bff("cases"),
  case: (uuid: string) => bff(`cases/${uuid}`),
  caseForEncounter: bff("cases/for-encounter"),
  transition: (uuid: string) => bff(`cases/${uuid}/transition`),
  reschedule: (uuid: string) => bff(`cases/${uuid}/reschedule`),
  assignRoom: (uuid: string) => bff(`cases/${uuid}/assign-room`),
  board: bff("board"),
  team: (uuid: string) => bff(`cases/${uuid}/team`),
  teamMember: (uuid: string, memberUuid: string) =>
    bff(`cases/${uuid}/team/${memberUuid}`),
  checklist: (uuid: string) => bff(`cases/${uuid}/checklist`),
  checklistStage: (uuid: string, stage: string) =>
    bff(`cases/${uuid}/checklist/${stage}`),
  preOp: (uuid: string) => bff(`cases/${uuid}/pre-op`),
  anaesthesia: (uuid: string) => bff(`cases/${uuid}/anaesthesia`),
  anaesthesiaVitals: (uuid: string) => bff(`cases/${uuid}/anaesthesia/vitals`),
  anaesthesiaSign: (uuid: string) => bff(`cases/${uuid}/anaesthesia/sign`),
  operationNote: (uuid: string) => bff(`cases/${uuid}/operation-note`),
  operationNoteSign: (uuid: string) => bff(`cases/${uuid}/operation-note/sign`),
  recovery: (uuid: string) => bff(`cases/${uuid}/recovery`),
  recoveryObservations: (uuid: string) => bff(`cases/${uuid}/recovery/observations`),
  recoveryDischarge: (uuid: string) => bff(`cases/${uuid}/recovery/discharge`),
  consumables: (uuid: string) => bff(`cases/${uuid}/consumables`),
  consumable: (uuid: string, itemUuid: string) =>
    bff(`cases/${uuid}/consumables/${itemUuid}`),
  consumableIssue: (uuid: string, itemUuid: string) =>
    bff(`cases/${uuid}/consumables/${itemUuid}/issue`),
  reportSummary: bff("reports/summary"),
} as const;
