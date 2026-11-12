"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "@/features/clinical-theatre/services/theatre-planning.service";
import type {
  CaptureTheatreTimingPayload,
  TheatreClearancePayload,
  TheatrePerformanceFilters,
  TheatrePreOpAssessmentPayload,
  TheatrePreOpTestRulePayload,
  TheatreSchedulePayload,
  TheatreSessionFilters,
  TheatreSessionPayload,
  TheatreSessionTemplatePayload,
  TheatreSettings,
  TheatreUrgencyCategoryPayload,
  TheatreWaitingListFilters,
  TheatreWaitingListPayload,
} from "@/features/clinical-theatre/types/theatre-planning.types";

export const theatrePlanningKeys = {
  timings: (caseUuid: string) => ["theatre", "timings", caseUuid] as const,
  settings: ["theatre", "settings"] as const,
  sessionTemplates: (room: string, includeInactive: boolean) =>
    ["theatre", "session-templates", room, includeInactive] as const,
  sessions: (filters: TheatreSessionFilters) => ["theatre", "sessions", filters] as const,
  performance: (filters: TheatrePerformanceFilters) =>
    ["theatre", "reports", "performance", filters] as const,
  waitingListReport: (filters: Record<string, string | undefined>) =>
    ["theatre", "reports", "waiting-list", filters] as const,
  urgencyCategories: (includeInactive: boolean) =>
    ["theatre", "urgency-categories", includeInactive] as const,
  waitingList: (filters: TheatreWaitingListFilters) =>
    ["theatre", "waiting-list", filters] as const,
  waitingListEntry: (uuid: string) => ["theatre", "waiting-list-entry", uuid] as const,
  preOpRules: (includeInactive: boolean) => ["theatre", "pre-op-rules", includeInactive] as const,
  preOpQueue: (includeReady: boolean, clinic: string) =>
    ["theatre", "pre-op-queue", includeReady, clinic] as const,
  preOpAssessments: (params: { entry?: string; case?: string }) =>
    ["theatre", "pre-op-assessments", params] as const,
  preOpAssessment: (uuid: string) => ["theatre", "pre-op-assessment", uuid] as const,
};

/** Every theatre mutation refreshes theatre queries (board, case, lists). */
function usePlanningMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["theatre"] }),
  });
}

// --- timings ---------------------------------------------------------------

export function useTheatreTimings(caseUuid: string | undefined) {
  return useQuery({
    queryKey: theatrePlanningKeys.timings(caseUuid ?? ""),
    queryFn: () => api.fetchTheatreTimings(caseUuid as string),
    enabled: Boolean(caseUuid),
  });
}

export function useCaptureTheatreTiming() {
  return usePlanningMutation(
    (input: { caseUuid: string; payload: CaptureTheatreTimingPayload }) =>
      api.captureTheatreTiming(input.caseUuid, input.payload),
  );
}

// --- settings & sessions ---------------------------------------------------

export function useTheatreSettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: theatrePlanningKeys.settings,
    queryFn: api.fetchTheatreSettings,
    enabled: options.enabled ?? true,
  });
}

export function useUpdateTheatreSettings() {
  return usePlanningMutation((payload: Partial<TheatreSettings>) =>
    api.updateTheatreSettings(payload),
  );
}

export function useTheatreSessionTemplates(room = "", includeInactive = false) {
  return useQuery({
    queryKey: theatrePlanningKeys.sessionTemplates(room, includeInactive),
    queryFn: () =>
      api.fetchTheatreSessionTemplates({ room: room || undefined, includeInactive }),
  });
}

export function useCreateTheatreSessionTemplate() {
  return usePlanningMutation((payload: TheatreSessionTemplatePayload) =>
    api.createTheatreSessionTemplate(payload),
  );
}

export function useUpdateTheatreSessionTemplate() {
  return usePlanningMutation(
    (input: { uuid: string; payload: Partial<TheatreSessionTemplatePayload> }) =>
      api.updateTheatreSessionTemplate(input.uuid, input.payload),
  );
}

export function useArchiveTheatreSessionTemplate() {
  return usePlanningMutation((uuid: string) => api.archiveTheatreSessionTemplate(uuid));
}

export function useTheatreSessions(
  filters: TheatreSessionFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatrePlanningKeys.sessions(filters),
    queryFn: () => api.fetchTheatreSessions(filters),
    enabled: options.enabled ?? true,
  });
}

export function useCreateTheatreSession() {
  return usePlanningMutation((payload: TheatreSessionPayload) =>
    api.createTheatreSession(payload),
  );
}

export function useUpdateTheatreSession() {
  return usePlanningMutation((input: { uuid: string; payload: TheatreSessionPayload }) =>
    api.updateTheatreSession(input.uuid, input.payload),
  );
}

export function useArchiveTheatreSession() {
  return usePlanningMutation((uuid: string) => api.archiveTheatreSession(uuid));
}

export function useCancelTheatreSessionOccurrence() {
  return usePlanningMutation(
    (payload: { template: string; date: string; reason?: string }) =>
      api.cancelTheatreSessionOccurrence(payload),
  );
}

// --- reports ---------------------------------------------------------------

export function useTheatrePerformanceReport(
  filters: TheatrePerformanceFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatrePlanningKeys.performance(filters),
    queryFn: () => api.fetchTheatrePerformanceReport(filters),
    enabled: options.enabled ?? true,
  });
}

export function useTheatreWaitingListReport(
  filters: { date_from?: string; date_to?: string; clinic?: string; surgeon?: string },
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatrePlanningKeys.waitingListReport(filters),
    queryFn: () => api.fetchTheatreWaitingListReport(filters),
    enabled: options.enabled ?? true,
  });
}

// --- urgency categories ----------------------------------------------------

export function useTheatreUrgencyCategories(includeInactive = false) {
  return useQuery({
    queryKey: theatrePlanningKeys.urgencyCategories(includeInactive),
    queryFn: () => api.fetchTheatreUrgencyCategories(includeInactive),
    staleTime: 60_000,
  });
}

export function useCreateTheatreUrgencyCategory() {
  return usePlanningMutation((payload: TheatreUrgencyCategoryPayload) =>
    api.createTheatreUrgencyCategory(payload),
  );
}

export function useUpdateTheatreUrgencyCategory() {
  return usePlanningMutation(
    (input: { uuid: string; payload: TheatreUrgencyCategoryPayload }) =>
      api.updateTheatreUrgencyCategory(input.uuid, input.payload),
  );
}

// --- waiting list ----------------------------------------------------------

export function useTheatreWaitingList(filters: TheatreWaitingListFilters) {
  return useQuery({
    queryKey: theatrePlanningKeys.waitingList(filters),
    queryFn: () => api.fetchTheatreWaitingList(filters),
  });
}

export function useTheatreWaitingListEntry(uuid: string | null) {
  return useQuery({
    queryKey: theatrePlanningKeys.waitingListEntry(uuid ?? ""),
    queryFn: () => api.fetchTheatreWaitingListEntry(uuid as string),
    enabled: Boolean(uuid),
  });
}

export function useCreateTheatreWaitingListEntry() {
  return usePlanningMutation((payload: TheatreWaitingListPayload) =>
    api.createTheatreWaitingListEntry(payload),
  );
}

export function useUpdateTheatreWaitingListEntry() {
  return usePlanningMutation(
    (input: { uuid: string; payload: TheatreWaitingListPayload }) =>
      api.updateTheatreWaitingListEntry(input.uuid, input.payload),
  );
}

export function useRemoveTheatreWaitingListEntry() {
  return usePlanningMutation(
    (input: { uuid: string; reason: string; note?: string }) =>
      api.removeTheatreWaitingListEntry(input.uuid, { reason: input.reason, note: input.note }),
  );
}

export function useReinstateTheatreWaitingListEntry() {
  return usePlanningMutation((input: { uuid: string; note?: string }) =>
    api.reinstateTheatreWaitingListEntry(input.uuid, input.note),
  );
}

export function useCheckTheatreWaitingListSchedule() {
  return useMutation({
    mutationFn: (input: {
      uuid: string;
      payload: { room: string; scheduled_start: string; scheduled_end?: string | null };
    }) => api.checkTheatreWaitingListSchedule(input.uuid, input.payload),
  });
}

export function useScheduleTheatreWaitingListEntry() {
  return usePlanningMutation((input: { uuid: string; payload: TheatreSchedulePayload }) =>
    api.scheduleTheatreWaitingListEntry(input.uuid, input.payload),
  );
}

// --- pre-op clinic ---------------------------------------------------------

export function useTheatrePreOpRules(includeInactive = false) {
  return useQuery({
    queryKey: theatrePlanningKeys.preOpRules(includeInactive),
    queryFn: () => api.fetchTheatrePreOpRules(includeInactive),
  });
}

export function useCreateTheatrePreOpRule() {
  return usePlanningMutation((payload: TheatrePreOpTestRulePayload) =>
    api.createTheatrePreOpRule(payload),
  );
}

export function useUpdateTheatrePreOpRule() {
  return usePlanningMutation(
    (input: { uuid: string; payload: TheatrePreOpTestRulePayload }) =>
      api.updateTheatrePreOpRule(input.uuid, input.payload),
  );
}

export function useArchiveTheatrePreOpRule() {
  return usePlanningMutation((uuid: string) => api.archiveTheatrePreOpRule(uuid));
}

export function useTheatrePreOpQueue(includeReady = false, clinic = "") {
  return useQuery({
    queryKey: theatrePlanningKeys.preOpQueue(includeReady, clinic),
    queryFn: () => api.fetchTheatrePreOpQueue({ includeReady, clinic: clinic || undefined }),
  });
}

export function useTheatrePreOpAssessments(
  params: { entry?: string; case?: string },
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatrePlanningKeys.preOpAssessments(params),
    queryFn: () => api.fetchTheatrePreOpAssessments(params),
    enabled: options.enabled ?? Boolean(params.entry || params.case),
  });
}

export function useTheatrePreOpAssessment(uuid: string | null) {
  return useQuery({
    queryKey: theatrePlanningKeys.preOpAssessment(uuid ?? ""),
    queryFn: () => api.fetchTheatrePreOpAssessment(uuid as string),
    enabled: Boolean(uuid),
  });
}

export function useCreateTheatrePreOpAssessment() {
  return usePlanningMutation((payload: TheatrePreOpAssessmentPayload) =>
    api.createTheatrePreOpAssessment(payload),
  );
}

export function useUpdateTheatrePreOpAssessment() {
  return usePlanningMutation(
    (input: { uuid: string; payload: TheatrePreOpAssessmentPayload }) =>
      api.updateTheatrePreOpAssessment(input.uuid, input.payload),
  );
}

export function useGenerateTheatrePreOpOrders() {
  return usePlanningMutation(
    (input: { uuid: string; tests: string[]; confirm: boolean; encounter?: string | null }) =>
      api.generateTheatrePreOpOrders(input.uuid, {
        tests: input.tests,
        confirm: input.confirm,
        encounter: input.encounter,
      }),
  );
}

export function useResolveTheatrePreOpTest() {
  return usePlanningMutation(
    (input: {
      uuid: string;
      testUuid: string;
      action: "waive" | "result" | "reopen";
      note?: string;
    }) =>
      api.resolveTheatrePreOpTest(input.uuid, input.testUuid, {
        action: input.action,
        note: input.note,
      }),
  );
}

export function useRecordTheatreClearance() {
  return usePlanningMutation((input: { uuid: string; payload: TheatreClearancePayload }) =>
    api.recordTheatreClearance(input.uuid, input.payload),
  );
}
