import { BFF_CLINICAL_THEATRE_ROUTES as ROUTES } from "@/constants/clinical-theatre-api";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  CaptureTheatreTimingPayload,
  TheatreCaseTimings,
  TheatreClearancePayload,
  TheatrePerformanceFilters,
  TheatrePerformanceReport,
  TheatrePreOpAssessment,
  TheatrePreOpAssessmentPayload,
  TheatrePreOpQueueRow,
  TheatrePreOpTestRule,
  TheatrePreOpTestRulePayload,
  TheatreScheduleCheck,
  TheatreSchedulePayload,
  TheatreSessionFilters,
  TheatreSessionPayload,
  TheatreSessionRecord,
  TheatreSessionTemplate,
  TheatreSessionTemplatePayload,
  TheatreSessionWindow,
  TheatreSettings,
  TheatreUrgencyCategory,
  TheatreUrgencyCategoryPayload,
  TheatreWaitingListEntry,
  TheatreWaitingListFilters,
  TheatreWaitingListPayload,
  TheatreWaitingListReport,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import { bffRequest } from "@/lib/bff-client";

type QueryValue = string | number | boolean | null | undefined;

export function planningQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

// --- timings ---------------------------------------------------------------

export function fetchTheatreTimings(caseUuid: string) {
  return bffRequest<TheatreCaseTimings>(ROUTES.timings(caseUuid));
}

export function captureTheatreTiming(caseUuid: string, payload: CaptureTheatreTimingPayload) {
  return bffRequest<TheatreCaseTimings>(ROUTES.timings(caseUuid), {
    method: "POST",
    body: payload,
  });
}

// --- settings & sessions ---------------------------------------------------

export function fetchTheatreSettings() {
  return bffRequest<TheatreSettings>(ROUTES.settings);
}

export function updateTheatreSettings(payload: Partial<TheatreSettings>) {
  return bffRequest<TheatreSettings>(ROUTES.settings, { method: "PATCH", body: payload });
}

export function fetchTheatreSessionTemplates(params: { room?: string; includeInactive?: boolean } = {}) {
  return bffRequest<TheatreSessionTemplate[]>(
    `${ROUTES.sessionTemplates}${planningQuery({
      room: params.room,
      include_inactive: params.includeInactive,
    })}`,
  );
}

export function createTheatreSessionTemplate(payload: TheatreSessionTemplatePayload) {
  return bffRequest<TheatreSessionTemplate>(ROUTES.sessionTemplates, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreSessionTemplate(
  uuid: string,
  payload: Partial<TheatreSessionTemplatePayload>,
) {
  return bffRequest<TheatreSessionTemplate>(ROUTES.sessionTemplate(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function archiveTheatreSessionTemplate(uuid: string) {
  return bffRequest<void>(ROUTES.sessionTemplate(uuid), { method: "DELETE" });
}

export function fetchTheatreSessions(filters: TheatreSessionFilters = {}) {
  return bffRequest<TheatreSessionWindow>(`${ROUTES.sessions}${planningQuery(filters)}`);
}

export function createTheatreSession(payload: TheatreSessionPayload) {
  return bffRequest<TheatreSessionRecord>(ROUTES.sessions, { method: "POST", body: payload });
}

export function updateTheatreSession(uuid: string, payload: TheatreSessionPayload) {
  return bffRequest<TheatreSessionRecord>(ROUTES.session(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function archiveTheatreSession(uuid: string) {
  return bffRequest<void>(ROUTES.session(uuid), { method: "DELETE" });
}

export function cancelTheatreSessionOccurrence(payload: {
  template: string;
  date: string;
  reason?: string;
}) {
  return bffRequest<TheatreSessionRecord>(ROUTES.sessionCancelOccurrence, {
    method: "POST",
    body: payload,
  });
}

// --- reports ---------------------------------------------------------------

export function fetchTheatrePerformanceReport(filters: TheatrePerformanceFilters = {}) {
  return bffRequest<TheatrePerformanceReport>(
    `${ROUTES.reportPerformance}${planningQuery(filters)}`,
  );
}

export function fetchTheatreWaitingListReport(
  filters: { date_from?: string; date_to?: string; clinic?: string; surgeon?: string } = {},
) {
  return bffRequest<TheatreWaitingListReport>(
    `${ROUTES.reportWaitingList}${planningQuery(filters)}`,
  );
}

// --- urgency categories ----------------------------------------------------

export function fetchTheatreUrgencyCategories(includeInactive = false) {
  return bffRequest<TheatreUrgencyCategory[]>(
    `${ROUTES.urgencyCategories}${planningQuery({ include_inactive: includeInactive })}`,
  );
}

export function createTheatreUrgencyCategory(payload: TheatreUrgencyCategoryPayload) {
  return bffRequest<TheatreUrgencyCategory>(ROUTES.urgencyCategories, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreUrgencyCategory(
  uuid: string,
  payload: TheatreUrgencyCategoryPayload,
) {
  return bffRequest<TheatreUrgencyCategory>(ROUTES.urgencyCategory(uuid), {
    method: "PATCH",
    body: payload,
  });
}

// --- waiting list ----------------------------------------------------------

export function fetchTheatreWaitingList(filters: TheatreWaitingListFilters = {}) {
  return bffRequest<TheatreWaitingListEntry[]>(
    `${ROUTES.waitingList}${planningQuery({
      ...filters,
      breached: filters.breached ? "true" : undefined,
      page_size: 200,
    })}`,
  );
}

export function fetchTheatreWaitingListEntry(uuid: string) {
  return bffRequest<TheatreWaitingListEntry>(ROUTES.waitingListEntry(uuid));
}

export function createTheatreWaitingListEntry(payload: TheatreWaitingListPayload) {
  return bffRequest<TheatreWaitingListEntry>(ROUTES.waitingList, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreWaitingListEntry(uuid: string, payload: TheatreWaitingListPayload) {
  return bffRequest<TheatreWaitingListEntry>(ROUTES.waitingListEntry(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function removeTheatreWaitingListEntry(
  uuid: string,
  payload: { reason: string; note?: string },
) {
  return bffRequest<TheatreWaitingListEntry>(ROUTES.waitingListRemove(uuid), {
    method: "POST",
    body: payload,
  });
}

export function reinstateTheatreWaitingListEntry(uuid: string, note = "") {
  return bffRequest<TheatreWaitingListEntry>(ROUTES.waitingListReinstate(uuid), {
    method: "POST",
    body: { note },
  });
}

export function checkTheatreWaitingListSchedule(
  uuid: string,
  payload: { room: string; scheduled_start: string; scheduled_end?: string | null },
) {
  return bffRequest<TheatreScheduleCheck>(ROUTES.waitingListCheckSchedule(uuid), {
    method: "POST",
    body: payload,
  });
}

export function scheduleTheatreWaitingListEntry(uuid: string, payload: TheatreSchedulePayload) {
  return bffRequest<{ entry: TheatreWaitingListEntry; case: TheatreCase }>(
    ROUTES.waitingListSchedule(uuid),
    { method: "POST", body: payload },
  );
}

// --- pre-op clinic ---------------------------------------------------------

export function fetchTheatrePreOpRules(includeInactive = false) {
  return bffRequest<TheatrePreOpTestRule[]>(
    `${ROUTES.preOpRules}${planningQuery({ include_inactive: includeInactive })}`,
  );
}

export function createTheatrePreOpRule(payload: TheatrePreOpTestRulePayload) {
  return bffRequest<TheatrePreOpTestRule>(ROUTES.preOpRules, { method: "POST", body: payload });
}

export function updateTheatrePreOpRule(uuid: string, payload: TheatrePreOpTestRulePayload) {
  return bffRequest<TheatrePreOpTestRule>(ROUTES.preOpRule(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function archiveTheatrePreOpRule(uuid: string) {
  return bffRequest<void>(ROUTES.preOpRule(uuid), { method: "DELETE" });
}

export function fetchTheatrePreOpQueue(params: { includeReady?: boolean; clinic?: string } = {}) {
  return bffRequest<TheatrePreOpQueueRow[]>(
    `${ROUTES.preOpQueue}${planningQuery({
      include_ready: params.includeReady,
      clinic: params.clinic,
    })}`,
  );
}

export function fetchTheatrePreOpAssessments(params: { entry?: string; case?: string } = {}) {
  return bffRequest<TheatrePreOpAssessment[]>(
    `${ROUTES.preOpAssessments}${planningQuery(params)}`,
  );
}

export function fetchTheatrePreOpAssessment(uuid: string) {
  return bffRequest<TheatrePreOpAssessment>(ROUTES.preOpAssessment(uuid));
}

export function createTheatrePreOpAssessment(payload: TheatrePreOpAssessmentPayload) {
  return bffRequest<TheatrePreOpAssessment>(ROUTES.preOpAssessments, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatrePreOpAssessment(
  uuid: string,
  payload: TheatrePreOpAssessmentPayload,
) {
  return bffRequest<TheatrePreOpAssessment>(ROUTES.preOpAssessment(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function generateTheatrePreOpOrders(
  uuid: string,
  payload: { tests: string[]; confirm: boolean; encounter?: string | null },
) {
  return bffRequest<TheatrePreOpAssessment>(ROUTES.preOpGenerateOrders(uuid), {
    method: "POST",
    body: payload,
  });
}

export function resolveTheatrePreOpTest(
  uuid: string,
  testUuid: string,
  payload: { action: "waive" | "result" | "reopen"; note?: string },
) {
  return bffRequest<TheatrePreOpAssessment>(ROUTES.preOpTest(uuid, testUuid), {
    method: "POST",
    body: payload,
  });
}

export function recordTheatreClearance(uuid: string, payload: TheatreClearancePayload) {
  return bffRequest<TheatrePreOpAssessment>(ROUTES.preOpClearance(uuid), {
    method: "POST",
    body: payload,
  });
}
