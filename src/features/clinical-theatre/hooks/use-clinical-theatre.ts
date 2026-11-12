"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignTheatreCaseRoom,
  createTheatreCase,
  createTheatreRoom,
  fetchTheatreCases,
  fetchTheatreRooms,
  rescheduleTheatreCase,
  transitionTheatreCase,
  updateTheatreRoom,
} from "@/features/clinical-theatre/services/clinical-theatre.service";
import type {
  CreateTheatreCasePayload,
  CreateTheatreRoomPayload,
  TheatreCaseFilters,
  TheatreCaseStatus,
  TheatreRoomFilters,
  UpdateTheatreRoomPayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export const theatreQueryKeys = {
  all: ["theatre"] as const,
  rooms: (filters: TheatreRoomFilters = {}) =>
    ["theatre", "rooms", filters] as const,
  cases: (filters: TheatreCaseFilters = {}) =>
    ["theatre", "cases", filters] as const,
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
