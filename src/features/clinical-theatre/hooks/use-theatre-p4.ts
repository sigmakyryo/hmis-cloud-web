"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchTheatreAnaesthesia } from "@/features/clinical-theatre/services/clinical-theatre.service";
import * as api from "@/features/clinical-theatre/services/theatre-p4.service";
import type {
  TheatreFamilyBoardLinkPayload,
  TheatreMonitorDevicePayload,
  TheatreVitalReviewPayload,
} from "@/features/clinical-theatre/types/theatre-p4.types";

/** Live chart polling interval (ms). SSE is not used: the API is WSGI. */
export const THEATRE_LIVE_POLL_MS = 12_000;

export const theatreP4Keys = {
  devices: (includeRevoked: boolean) => ["theatre", "monitor-devices", includeRevoked] as const,
  caseDevices: (caseUuid: string) => ["theatre", "case-devices", caseUuid] as const,
  familyBoard: (filters: { room?: string; clinic?: string }) =>
    ["theatre", "family-board", filters] as const,
  familyLinks: (includeRevoked: boolean) =>
    ["theatre", "family-board-links", includeRevoked] as const,
  familyCode: (caseUuid: string) => ["theatre", "family-code", caseUuid] as const,
};

function useTheatreMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["theatre"] }),
  });
}

// --- live anaesthesia chart ------------------------------------------------

/**
 * Same cache entry as ``useTheatreAnaesthesia``; polls while the case is in a
 * live stage and the record is not signed.
 */
export function useTheatreAnaesthesiaLive(caseUuid: string | undefined, live: boolean) {
  return useQuery({
    queryKey: ["theatre", "anaesthesia", caseUuid ?? ""] as const,
    queryFn: () => fetchTheatreAnaesthesia(caseUuid as string),
    enabled: Boolean(caseUuid),
    refetchInterval: (query) =>
      live && !query.state.data?.signed_at ? THEATRE_LIVE_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useTheatreCaseDevices(caseUuid: string | undefined, live: boolean) {
  return useQuery({
    queryKey: theatreP4Keys.caseDevices(caseUuid ?? ""),
    queryFn: () => api.fetchTheatreCaseDevices(caseUuid as string),
    enabled: Boolean(caseUuid),
    refetchInterval: live ? THEATRE_LIVE_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useReviewTheatreDeviceVitals() {
  return useTheatreMutation((input: { caseUuid: string; payload: TheatreVitalReviewPayload }) =>
    api.reviewTheatreDeviceVitals(input.caseUuid, input.payload),
  );
}

// --- device registry (Settings) --------------------------------------------

export function useTheatreMonitorDevices(includeRevoked = false, enabled = true) {
  return useQuery({
    queryKey: theatreP4Keys.devices(includeRevoked),
    queryFn: () => api.fetchTheatreMonitorDevices(includeRevoked),
    enabled,
  });
}

export function useSaveTheatreMonitorDevice() {
  return useTheatreMutation((input: { uuid?: string; payload: TheatreMonitorDevicePayload }) =>
    api.saveTheatreMonitorDevice(input.payload, input.uuid),
  );
}

export function useRotateTheatreMonitorDevice() {
  return useTheatreMutation((uuid: string) => api.rotateTheatreMonitorDevice(uuid));
}

export function useRevokeTheatreMonitorDevice() {
  return useTheatreMutation((uuid: string) => api.revokeTheatreMonitorDevice(uuid));
}

// --- family board ----------------------------------------------------------

export function useTheatreFamilyBoard(
  filters: { room?: string; clinic?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: theatreP4Keys.familyBoard(filters),
    queryFn: () => api.fetchTheatreFamilyBoard(filters),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useTheatreFamilyCode() {
  return useTheatreMutation((input: { caseUuid: string; regenerate?: boolean }) =>
    api.fetchTheatreFamilyCode(input.caseUuid, input.regenerate ?? false),
  );
}

export function useTheatreFamilyBoardLinks(includeRevoked = false, enabled = true) {
  return useQuery({
    queryKey: theatreP4Keys.familyLinks(includeRevoked),
    queryFn: () => api.fetchTheatreFamilyBoardLinks(includeRevoked),
    enabled,
  });
}

export function useCreateTheatreFamilyBoardLink() {
  return useTheatreMutation((payload: TheatreFamilyBoardLinkPayload) =>
    api.createTheatreFamilyBoardLink(payload),
  );
}

export function useRotateTheatreFamilyBoardLink() {
  return useTheatreMutation((uuid: string) => api.rotateTheatreFamilyBoardLink(uuid));
}

export function useRevokeTheatreFamilyBoardLink() {
  return useTheatreMutation((uuid: string) => api.revokeTheatreFamilyBoardLink(uuid));
}
