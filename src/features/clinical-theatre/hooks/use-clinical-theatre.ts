"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addTheatreTeamMember,
  assignTheatreCaseRoom,
  createTheatreCase,
  createTheatreRoom,
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
  updateTheatrePreOp,
  updateTheatreRoom,
} from "@/features/clinical-theatre/services/clinical-theatre.service";
import type {
  AddTheatreTeamMemberPayload,
  CreateTheatreCasePayload,
  CreateTheatreRoomPayload,
  RecordTheatreChecklistPayload,
  TheatreBoardFilters,
  TheatreCaseFilters,
  TheatreCaseStatus,
  TheatreChecklistStageId,
  TheatreRoomFilters,
  UpdateTheatrePreOpPayload,
  UpdateTheatreRoomPayload,
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

export function useCreateTheatreCase() {
  const invalidate = useInvalidateTheatre();
  return useMutation({
    mutationFn: (payload: CreateTheatreCasePayload) => createTheatreCase(payload),
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
