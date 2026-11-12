"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addTheatreAnaesthesiaVital,
  addTheatreConsumable,
  addTheatreRecoveryObservation,
  addTheatreTeamMember,
  cancelTheatreConsumable,
  dischargeTheatreRecovery,
  fetchTheatreAnaesthesia,
  fetchTheatreConsumables,
  fetchTheatreOperationNote,
  fetchTheatreRecovery,
  fetchTheatreReportSummary,
  issueTheatreConsumable,
  signTheatreAnaesthesia,
  signTheatreOperationNote,
  updateTheatreAnaesthesia,
  updateTheatreOperationNote,
  updateTheatreRecovery,
  assignTheatreCaseRoom,
  createTheatreCase,
  createTheatreRoom,
  ensureTheatreCaseForEncounter,
  fetchTheatreBoard,
  fetchTheatreCases,
  fetchTheatreChecklist,
  fetchTheatrePreOp,
  fetchTheatreRooms,
  fetchTheatreTeam,
  recordTheatreChecklistStage,
  removeTheatreTeamMember,
  rescheduleTheatreCase,
  transitionTheatreCase,
  updateTheatreCaseDetails,
  updateTheatrePreOp,
  updateTheatreRoom,
  addTheatreCaseProcedure,
  removeTheatreCaseProcedure,
  startTheatreCrashCase,
  updateTheatreCaseProcedure,
} from "@/features/clinical-theatre/services/clinical-theatre.service";
import type {
  AddTheatreAnaesthesiaVitalPayload,
  AddTheatreConsumablePayload,
  AddTheatreRecoveryObservationPayload,
  AddTheatreTeamMemberPayload,
  IssueTheatreConsumablePayload,
  TheatreReportFilters,
  UpdateTheatreAnaesthesiaPayload,
  UpdateTheatreOperationNotePayload,
  UpdateTheatreRecoveryPayload,
  CreateTheatreCasePayload,
  CreateTheatreRoomPayload,
  RecordTheatreChecklistPayload,
  TheatreBoardFilters,
  TheatreCaseFilters,
  TheatreCaseStatus,
  TheatreChecklistStageId,
  TheatreRoomFilters,
  UpdateTheatreCaseDetailsPayload,
  UpdateTheatrePreOpPayload,
  UpdateTheatreRoomPayload,
  StartTheatreCrashCasePayload,
  TheatreCaseProcedurePayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export const theatreQueryKeys = {
  all: ["theatre"] as const,
  rooms: (filters: TheatreRoomFilters = {}) =>
    ["theatre", "rooms", filters] as const,
  cases: (filters: TheatreCaseFilters = {}) =>
    ["theatre", "cases", filters] as const,
  board: (filters: TheatreBoardFilters = {}) =>
    ["theatre", "board", filters] as const,
  team: (caseUuid: string) => ["theatre", "team", caseUuid] as const,
  checklist: (caseUuid: string) => ["theatre", "checklist", caseUuid] as const,
  preOp: (caseUuid: string) => ["theatre", "pre-op", caseUuid] as const,
  anaesthesia: (caseUuid: string) => ["theatre", "anaesthesia", caseUuid] as const,
  operationNote: (caseUuid: string) =>
    ["theatre", "operation-note", caseUuid] as const,
  recovery: (caseUuid: string) => ["theatre", "recovery", caseUuid] as const,
  consumables: (caseUuid: string) => ["theatre", "consumables", caseUuid] as const,
  report: (filters: TheatreReportFilters) => ["theatre", "report", filters] as const,
};

export function useTheatreRooms(
  filters: TheatreRoomFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatreQueryKeys.rooms(filters),
    queryFn: () => fetchTheatreRooms(filters),
    enabled: options.enabled ?? true,
  });
}

export function useTheatreCases(
  filters: TheatreCaseFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatreQueryKeys.cases(filters),
    queryFn: () => fetchTheatreCases(filters),
    enabled: options.enabled ?? true,
  });
}

function useInvalidateTheatre() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: theatreQueryKeys.all });
}

export function useStartTheatreCrashCase() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (payload: StartTheatreCrashCasePayload) => startTheatreCrashCase(payload),
    onSuccess: () => void invalidate(),
  });
}

export function useAddTheatreCaseProcedure() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { uuid: string; payload: TheatreCaseProcedurePayload }) =>
      addTheatreCaseProcedure(input.uuid, input.payload),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateTheatreCaseProcedure() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: {
      uuid: string;
      procedureUuid: string;
      payload: TheatreCaseProcedurePayload;
    }) => updateTheatreCaseProcedure(input.uuid, input.procedureUuid, input.payload),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveTheatreCaseProcedure() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { uuid: string; procedureUuid: string }) =>
      removeTheatreCaseProcedure(input.uuid, input.procedureUuid),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateTheatreCase() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (payload: CreateTheatreCasePayload) => createTheatreCase(payload),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateTheatreCaseDetails() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { uuid: string; payload: UpdateTheatreCaseDetailsPayload }) =>
      updateTheatreCaseDetails(input.uuid, input.payload),
    onSuccess: () => void invalidate(),
  });
}

/** Set up the draft case of a theatre encounter that has none. */
export function useEnsureTheatreCaseForEncounter() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (encounterUuid: string) => ensureTheatreCaseForEncounter(encounterUuid),
    onSuccess: () => void invalidate(),
  });
}

export function useTransitionTheatreCase() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: {
      uuid: string;
      status: TheatreCaseStatus;
      reason?: string;
    }) =>
      transitionTheatreCase(input.uuid, {
        status: input.status,
        reason: input.reason,
      }),
    onSuccess: () => void invalidate(),
  });
}

export function useRescheduleTheatreCase() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: {
      uuid: string;
      scheduled_start: string;
      scheduled_end?: string | null;
    }) =>
      rescheduleTheatreCase(input.uuid, {
        scheduled_start: input.scheduled_start,
        scheduled_end: input.scheduled_end,
      }),
    onSuccess: () => void invalidate(),
  });
}

export function useAssignTheatreCaseRoom() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { uuid: string; room: string }) =>
      assignTheatreCaseRoom(input.uuid, input.room),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateTheatreRoom() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (payload: CreateTheatreRoomPayload) => createTheatreRoom(payload),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateTheatreRoom() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { uuid: string; payload: UpdateTheatreRoomPayload }) =>
      updateTheatreRoom(input.uuid, input.payload),
    onSuccess: () => void invalidate(),
  });
}

export function useTheatreBoard(filters: TheatreBoardFilters) {
  return useQuery({
    queryKey: theatreQueryKeys.board(filters),
    queryFn: () => fetchTheatreBoard(filters),
  });
}

export function useTheatreTeam(caseUuid: string | undefined) {
  return useQuery({
    queryKey: theatreQueryKeys.team(caseUuid ?? ""),
    queryFn: () => fetchTheatreTeam(caseUuid as string),
    enabled: Boolean(caseUuid),
  });
}

export function useAddTheatreTeamMember() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { caseUuid: string; payload: AddTheatreTeamMemberPayload }) =>
      addTheatreTeamMember(input.caseUuid, input.payload),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveTheatreTeamMember() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { caseUuid: string; memberUuid: string }) =>
      removeTheatreTeamMember(input.caseUuid, input.memberUuid),
    onSuccess: () => void invalidate(),
  });
}

export function useTheatreChecklist(caseUuid: string | undefined) {
  return useQuery({
    queryKey: theatreQueryKeys.checklist(caseUuid ?? ""),
    queryFn: () => fetchTheatreChecklist(caseUuid as string),
    enabled: Boolean(caseUuid),
  });
}

export function useRecordTheatreChecklistStage() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: {
      caseUuid: string;
      stage: TheatreChecklistStageId;
      payload: RecordTheatreChecklistPayload;
    }) => recordTheatreChecklistStage(input.caseUuid, input.stage, input.payload),
    onSuccess: () => void invalidate(),
  });
}

export function useTheatrePreOp(caseUuid: string | undefined) {
  return useQuery({
    queryKey: theatreQueryKeys.preOp(caseUuid ?? ""),
    queryFn: () => fetchTheatrePreOp(caseUuid as string),
    enabled: Boolean(caseUuid),
  });
}

export function useUpdateTheatrePreOp() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (input: { caseUuid: string; payload: UpdateTheatrePreOpPayload }) =>
      updateTheatrePreOp(input.caseUuid, input.payload),
    onSuccess: () => void invalidate(),
  });
}

/** The theatre case behind a theatre workspace encounter (one per encounter). */
export function useTheatreCaseForEncounter(encounterUuid: string) {
  const query = useTheatreCases({ encounter: encounterUuid });
  return { ...query, theatreCase: query.data?.[0] };
}

function useCaseQuery<T>(
  key: readonly unknown[],
  caseUuid: string | undefined,
  fetcher: (caseUuid: string) => Promise<T>,
) {
  return useQuery({
    queryKey: key,
    queryFn: () => fetcher(caseUuid as string),
    enabled: Boolean(caseUuid),
  });
}

function useCaseMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const invalidate = useInvalidateTheatre();
  return useMutation({ mutationFn, onSuccess: () => void invalidate() });
}

export function useTheatreAnaesthesia(caseUuid: string | undefined) {
  return useCaseQuery(
    theatreQueryKeys.anaesthesia(caseUuid ?? ""),
    caseUuid,
    fetchTheatreAnaesthesia,
  );
}

export function useUpdateTheatreAnaesthesia() {
  return useCaseMutation(
    (input: { caseUuid: string; payload: UpdateTheatreAnaesthesiaPayload }) =>
      updateTheatreAnaesthesia(input.caseUuid, input.payload),
  );
}

export function useAddTheatreAnaesthesiaVital() {
  return useCaseMutation(
    (input: { caseUuid: string; payload: AddTheatreAnaesthesiaVitalPayload }) =>
      addTheatreAnaesthesiaVital(input.caseUuid, input.payload),
  );
}

export function useSignTheatreAnaesthesia() {
  return useCaseMutation((caseUuid: string) => signTheatreAnaesthesia(caseUuid));
}

export function useTheatreOperationNote(caseUuid: string | undefined) {
  return useCaseQuery(
    theatreQueryKeys.operationNote(caseUuid ?? ""),
    caseUuid,
    fetchTheatreOperationNote,
  );
}

export function useUpdateTheatreOperationNote() {
  return useCaseMutation(
    (input: { caseUuid: string; payload: UpdateTheatreOperationNotePayload }) =>
      updateTheatreOperationNote(input.caseUuid, input.payload),
  );
}

export function useSignTheatreOperationNote() {
  return useCaseMutation((caseUuid: string) => signTheatreOperationNote(caseUuid));
}

export function useTheatreRecovery(caseUuid: string | undefined) {
  return useCaseQuery(
    theatreQueryKeys.recovery(caseUuid ?? ""),
    caseUuid,
    fetchTheatreRecovery,
  );
}

export function useUpdateTheatreRecovery() {
  return useCaseMutation(
    (input: { caseUuid: string; payload: UpdateTheatreRecoveryPayload }) =>
      updateTheatreRecovery(input.caseUuid, input.payload),
  );
}

export function useAddTheatreRecoveryObservation() {
  return useCaseMutation(
    (input: { caseUuid: string; payload: AddTheatreRecoveryObservationPayload }) =>
      addTheatreRecoveryObservation(input.caseUuid, input.payload),
  );
}

export function useDischargeTheatreRecovery() {
  return useCaseMutation(
    (input: { caseUuid: string; payload?: UpdateTheatreRecoveryPayload }) =>
      dischargeTheatreRecovery(input.caseUuid, input.payload),
  );
}

export function useTheatreConsumables(caseUuid: string | undefined) {
  return useCaseQuery(
    theatreQueryKeys.consumables(caseUuid ?? ""),
    caseUuid,
    fetchTheatreConsumables,
  );
}

export function useAddTheatreConsumable() {
  return useCaseMutation(
    (input: { caseUuid: string; payload: AddTheatreConsumablePayload }) =>
      addTheatreConsumable(input.caseUuid, input.payload),
  );
}

export function useIssueTheatreConsumable() {
  return useCaseMutation(
    (input: {
      caseUuid: string;
      itemUuid: string;
      payload?: IssueTheatreConsumablePayload;
    }) => issueTheatreConsumable(input.caseUuid, input.itemUuid, input.payload),
  );
}

export function useCancelTheatreConsumable() {
  return useCaseMutation((input: { caseUuid: string; itemUuid: string }) =>
    cancelTheatreConsumable(input.caseUuid, input.itemUuid),
  );
}

export function useTheatreReportSummary(
  filters: TheatreReportFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatreQueryKeys.report(filters),
    queryFn: () => fetchTheatreReportSummary(filters),
    enabled: options.enabled ?? true,
  });
}
