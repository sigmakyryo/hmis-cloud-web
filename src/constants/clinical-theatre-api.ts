const upstream = (path: string) => `/theatre/${path}`;
const bff = (path: string) => `/api/theatre/${path}`;

/** Django DRF v1 theatre endpoints (relative to HMIS_API_URL). */
export const CLINICAL_THEATRE_API_PATHS = {
  rooms: upstream("rooms/"),
  room: (uuid: string) => upstream(`rooms/${uuid}/`),
  cases: upstream("cases/"),
  case: (uuid: string) => upstream(`cases/${uuid}/`),
  caseForEncounter: upstream("cases/for-encounter/"),
  crash: upstream("cases/crash/"),
  procedures: (uuid: string) => upstream(`cases/${uuid}/procedures/`),
  procedure: (uuid: string, procedureUuid: string) =>
    upstream(`cases/${uuid}/procedures/${procedureUuid}/`),
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
  consumableReturn: (uuid: string, itemUuid: string) =>
    upstream(`cases/${uuid}/consumables/${itemUuid}/return/`),
  obstetric: (uuid: string) => upstream(`cases/${uuid}/obstetric/`),
  babies: (uuid: string) => upstream(`cases/${uuid}/babies/`),
  baby: (uuid: string, babyUuid: string) => upstream(`cases/${uuid}/babies/${babyUuid}/`),
  babyRegister: (uuid: string, babyUuid: string) =>
    upstream(`cases/${uuid}/babies/${babyUuid}/register/`),
  convertToIpd: (uuid: string) => upstream(`cases/${uuid}/convert-to-ipd/`),
  cancellationReasons: upstream("cancellation-reasons/"),
  cancellationReason: (uuid: string) => upstream(`cancellation-reasons/${uuid}/`),
  reportSummary: upstream("reports/summary/"),
  procedureBill: (uuid: string, procedureUuid: string) =>
    upstream(`cases/${uuid}/procedures/${procedureUuid}/bill/`),
  plannedItems: (uuid: string) => upstream(`cases/${uuid}/planned-items/`),
  plannedItemsLoad: (uuid: string) => upstream(`cases/${uuid}/planned-items/load/`),
  plannedItemsConfirmAll: (uuid: string) =>
    upstream(`cases/${uuid}/planned-items/confirm-all/`),
  plannedItemConfirm: (uuid: string, itemUuid: string) =>
    upstream(`cases/${uuid}/planned-items/${itemUuid}/confirm/`),
  plannedItemDismiss: (uuid: string, itemUuid: string) =>
    upstream(`cases/${uuid}/planned-items/${itemUuid}/dismiss/`),
  savePreferenceCard: (uuid: string) => upstream(`cases/${uuid}/save-preference-card/`),
  procedureProducts: upstream("procedure-products/"),
  procedureProductCodes: (productUuid: string) =>
    upstream(`procedure-products/${productUuid}/codes/`),
  procedureCodes: upstream("procedure-codes/"),
  procedureCodesImport: upstream("procedure-codes/import/"),
  procedureCodesLoadSample: upstream("procedure-codes/load-sample/"),
  procedureCode: (uuid: string) => upstream(`procedure-codes/${uuid}/`),
  preferenceCards: upstream("preference-cards/"),
  preferenceCard: (uuid: string) => upstream(`preference-cards/${uuid}/`),
  // Pro P2: timings, sessions, waiting list and pre-op clinic.
  timings: (uuid: string) => upstream(`cases/${uuid}/timings/`),
  settings: upstream("settings/"),
  sessionTemplates: upstream("session-templates/"),
  sessionTemplate: (uuid: string) => upstream(`session-templates/${uuid}/`),
  sessions: upstream("sessions/"),
  sessionCancelOccurrence: upstream("sessions/cancel-occurrence/"),
  session: (uuid: string) => upstream(`sessions/${uuid}/`),
  reportPerformance: upstream("reports/performance/"),
  reportWaitingList: upstream("reports/waiting-list/"),
  urgencyCategories: upstream("urgency-categories/"),
  urgencyCategory: (uuid: string) => upstream(`urgency-categories/${uuid}/`),
  waitingList: upstream("waiting-list/"),
  waitingListEntry: (uuid: string) => upstream(`waiting-list/${uuid}/`),
  waitingListRemove: (uuid: string) => upstream(`waiting-list/${uuid}/remove/`),
  waitingListReinstate: (uuid: string) => upstream(`waiting-list/${uuid}/reinstate/`),
  waitingListCheckSchedule: (uuid: string) =>
    upstream(`waiting-list/${uuid}/check-schedule/`),
  waitingListSchedule: (uuid: string) => upstream(`waiting-list/${uuid}/schedule/`),
  preOpRules: upstream("pre-op/rules/"),
  preOpRule: (uuid: string) => upstream(`pre-op/rules/${uuid}/`),
  preOpQueue: upstream("pre-op/queue/"),
  preOpAssessments: upstream("pre-op/assessments/"),
  preOpAssessment: (uuid: string) => upstream(`pre-op/assessments/${uuid}/`),
  preOpGenerateOrders: (uuid: string) =>
    upstream(`pre-op/assessments/${uuid}/generate-orders/`),
  preOpTest: (uuid: string, testUuid: string) =>
    upstream(`pre-op/assessments/${uuid}/tests/${testUuid}/`),
  preOpClearance: (uuid: string) => upstream(`pre-op/assessments/${uuid}/clearance/`),
} as const;

/** Browser-facing BFF theatre routes. */
export const BFF_CLINICAL_THEATRE_ROUTES = {
  rooms: bff("rooms"),
  room: (uuid: string) => bff(`rooms/${uuid}`),
  cases: bff("cases"),
  case: (uuid: string) => bff(`cases/${uuid}`),
  caseForEncounter: bff("cases/for-encounter"),
  crash: bff("cases/crash"),
  procedures: (uuid: string) => bff(`cases/${uuid}/procedures`),
  procedure: (uuid: string, procedureUuid: string) =>
    bff(`cases/${uuid}/procedures/${procedureUuid}`),
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
  consumableReturn: (uuid: string, itemUuid: string) =>
    bff(`cases/${uuid}/consumables/${itemUuid}/return`),
  obstetric: (uuid: string) => bff(`cases/${uuid}/obstetric`),
  babies: (uuid: string) => bff(`cases/${uuid}/babies`),
  baby: (uuid: string, babyUuid: string) => bff(`cases/${uuid}/babies/${babyUuid}`),
  babyRegister: (uuid: string, babyUuid: string) =>
    bff(`cases/${uuid}/babies/${babyUuid}/register`),
  convertToIpd: (uuid: string) => bff(`cases/${uuid}/convert-to-ipd`),
  cancellationReasons: bff("cancellation-reasons"),
  cancellationReason: (uuid: string) => bff(`cancellation-reasons/${uuid}`),
  reportSummary: bff("reports/summary"),
  procedureBill: (uuid: string, procedureUuid: string) =>
    bff(`cases/${uuid}/procedures/${procedureUuid}/bill`),
  plannedItems: (uuid: string) => bff(`cases/${uuid}/planned-items`),
  plannedItemsLoad: (uuid: string) => bff(`cases/${uuid}/planned-items/load`),
  plannedItemsConfirmAll: (uuid: string) =>
    bff(`cases/${uuid}/planned-items/confirm-all`),
  plannedItemConfirm: (uuid: string, itemUuid: string) =>
    bff(`cases/${uuid}/planned-items/${itemUuid}/confirm`),
  plannedItemDismiss: (uuid: string, itemUuid: string) =>
    bff(`cases/${uuid}/planned-items/${itemUuid}/dismiss`),
  savePreferenceCard: (uuid: string) => bff(`cases/${uuid}/save-preference-card`),
  procedureProducts: bff("procedure-products"),
  procedureProductCodes: (productUuid: string) =>
    bff(`procedure-products/${productUuid}/codes`),
  procedureCodes: bff("procedure-codes"),
  procedureCodesImport: bff("procedure-codes/import"),
  procedureCodesLoadSample: bff("procedure-codes/load-sample"),
  procedureCode: (uuid: string) => bff(`procedure-codes/${uuid}`),
  preferenceCards: bff("preference-cards"),
  preferenceCard: (uuid: string) => bff(`preference-cards/${uuid}`),
  timings: (uuid: string) => bff(`cases/${uuid}/timings`),
  settings: bff("settings"),
  sessionTemplates: bff("session-templates"),
  sessionTemplate: (uuid: string) => bff(`session-templates/${uuid}`),
  sessions: bff("sessions"),
  sessionCancelOccurrence: bff("sessions/cancel-occurrence"),
  session: (uuid: string) => bff(`sessions/${uuid}`),
  reportPerformance: bff("reports/performance"),
  reportWaitingList: bff("reports/waiting-list"),
  urgencyCategories: bff("urgency-categories"),
  urgencyCategory: (uuid: string) => bff(`urgency-categories/${uuid}`),
  waitingList: bff("waiting-list"),
  waitingListEntry: (uuid: string) => bff(`waiting-list/${uuid}`),
  waitingListRemove: (uuid: string) => bff(`waiting-list/${uuid}/remove`),
  waitingListReinstate: (uuid: string) => bff(`waiting-list/${uuid}/reinstate`),
  waitingListCheckSchedule: (uuid: string) => bff(`waiting-list/${uuid}/check-schedule`),
  waitingListSchedule: (uuid: string) => bff(`waiting-list/${uuid}/schedule`),
  preOpRules: bff("pre-op/rules"),
  preOpRule: (uuid: string) => bff(`pre-op/rules/${uuid}`),
  preOpQueue: bff("pre-op/queue"),
  preOpAssessments: bff("pre-op/assessments"),
  preOpAssessment: (uuid: string) => bff(`pre-op/assessments/${uuid}`),
  preOpGenerateOrders: (uuid: string) => bff(`pre-op/assessments/${uuid}/generate-orders`),
  preOpTest: (uuid: string, testUuid: string) =>
    bff(`pre-op/assessments/${uuid}/tests/${testUuid}`),
  preOpClearance: (uuid: string) => bff(`pre-op/assessments/${uuid}/clearance`),
} as const;
