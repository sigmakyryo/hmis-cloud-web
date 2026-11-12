"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "@/features/clinical-theatre/services/theatre-cssd.service";
import type {
  TheatreCountCategory,
  TheatreCountPhase,
  TheatreCountResolvePayload,
  TheatreCycleCreatePayload,
  TheatreCycleFilters,
  TheatreCycleResultPayload,
  TheatreImplantRecallFilters,
  TheatreSteriliserPayload,
  TheatreTrayFilters,
  TheatreTrayIssuePayload,
  TheatreTraySetPayload,
} from "@/features/clinical-theatre/types/theatre-cssd.types";

export const theatreCssdKeys = {
  sterilisers: (includeArchived: boolean) =>
    ["theatre", "sterilisers", includeArchived] as const,
  traySets: (includeArchived: boolean) => ["theatre", "tray-sets", includeArchived] as const,
  trays: (filters: TheatreTrayFilters) => ["theatre", "trays", filters] as const,
  tray: (uuid: string) => ["theatre", "tray", uuid] as const,
  cycles: (filters: TheatreCycleFilters) => ["theatre", "cycles", filters] as const,
  cycle: (uuid: string) => ["theatre", "cycle", uuid] as const,
  caseTrays: (caseUuid: string) => ["theatre", "case-trays", caseUuid] as const,
  availableTrays: (caseUuid: string, q: string) =>
    ["theatre", "available-trays", caseUuid, q] as const,
  counts: (caseUuid: string) => ["theatre", "counts", caseUuid] as const,
  witnesses: (caseUuid: string, q: string) => ["theatre", "count-witnesses", caseUuid, q] as const,
  implantRecall: (filters: TheatreImplantRecallFilters) =>
    ["theatre", "implant-recall", filters] as const,
  implantBatches: (product: string) => ["theatre", "implant-batches", product] as const,
};

/** CSSD, count and tray changes move case safety flags too: refresh all theatre data. */
function useCssdMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["theatre"] }),
  });
}

// --- setup -----------------------------------------------------------------

export function useTheatreSterilisers(includeArchived = false) {
  return useQuery({
    queryKey: theatreCssdKeys.sterilisers(includeArchived),
    queryFn: () => api.fetchTheatreSterilisers(includeArchived),
  });
}

export function useSaveTheatreSteriliser() {
  return useCssdMutation((input: { uuid?: string; payload: TheatreSteriliserPayload }) =>
    api.saveTheatreSteriliser(input.payload, input.uuid),
  );
}

export function useTheatreTraySets(includeArchived = false) {
  return useQuery({
    queryKey: theatreCssdKeys.traySets(includeArchived),
    queryFn: () => api.fetchTheatreTraySets(includeArchived),
  });
}

export function useSaveTheatreTraySet() {
  return useCssdMutation((input: { uuid?: string; payload: TheatreTraySetPayload }) =>
    api.saveTheatreTraySet(input.payload, input.uuid),
  );
}

export function useArchiveTheatreTraySet() {
  return useCssdMutation((uuid: string) => api.archiveTheatreTraySet(uuid));
}

export function useTheatreTrays(filters: TheatreTrayFilters = {}) {
  return useQuery({
    queryKey: theatreCssdKeys.trays(filters),
    queryFn: () => api.fetchTheatreTrays(filters),
  });
}

export function useTheatreTray(uuid: string | null) {
  return useQuery({
    queryKey: theatreCssdKeys.tray(uuid ?? ""),
    queryFn: () => api.fetchTheatreTray(uuid as string),
    enabled: Boolean(uuid),
  });
}

export function useCreateTheatreTray() {
  return useCssdMutation(api.createTheatreTray);
}

export function useRetireTheatreTray() {
  return useCssdMutation((uuid: string) => api.retireTheatreTray(uuid));
}

export function useQuarantineTheatreTray() {
  return useCssdMutation((input: { uuid: string; reason: string }) =>
    api.quarantineTheatreTray(input.uuid, input.reason),
  );
}

export function useReleaseTheatreTrayQuarantine() {
  return useCssdMutation((input: { uuid: string; reason?: string }) =>
    api.releaseTheatreTrayQuarantine(input.uuid, input.reason),
  );
}

// --- cycles ----------------------------------------------------------------

export function useTheatreCycles(filters: TheatreCycleFilters = {}) {
  return useQuery({
    queryKey: theatreCssdKeys.cycles(filters),
    queryFn: () => api.fetchTheatreCycles(filters),
  });
}

export function useTheatreCycle(uuid: string | null) {
  return useQuery({
    queryKey: theatreCssdKeys.cycle(uuid ?? ""),
    queryFn: () => api.fetchTheatreCycle(uuid as string),
    enabled: Boolean(uuid),
  });
}

export function useStartTheatreCycle() {
  return useCssdMutation((payload: TheatreCycleCreatePayload) => api.startTheatreCycle(payload));
}

export function useRecordTheatreCycleResult() {
  return useCssdMutation((input: { uuid: string; payload: TheatreCycleResultPayload }) =>
    api.recordTheatreCycleResult(input.uuid, input.payload),
  );
}

export function useRecallTheatreCycle() {
  return useCssdMutation((input: { uuid: string; reason: string }) =>
    api.recallTheatreCycle(input.uuid, input.reason),
  );
}

// --- case trays ------------------------------------------------------------

export function useTheatreCaseTrays(caseUuid: string) {
  return useQuery({
    queryKey: theatreCssdKeys.caseTrays(caseUuid),
    queryFn: () => api.fetchTheatreCaseTrays(caseUuid),
  });
}

export function useTheatreAvailableTrays(caseUuid: string, q: string, enabled: boolean) {
  return useQuery({
    queryKey: theatreCssdKeys.availableTrays(caseUuid, q),
    queryFn: () => api.fetchTheatreAvailableTrays(caseUuid, q),
    enabled,
  });
}

export function useAssignTheatreTray() {
  return useCssdMutation(
    (input: { caseUuid: string; trayUuid?: string; barcode?: string }) =>
      api.assignTheatreTray(input.caseUuid, {
        tray_uuid: input.trayUuid,
        barcode: input.barcode,
      }),
  );
}

export function useReleaseTheatreCaseTray() {
  return useCssdMutation((input: { caseUuid: string; itemUuid: string; reason?: string }) =>
    api.releaseTheatreCaseTray(input.caseUuid, input.itemUuid, input.reason),
  );
}

export function useReturnTheatreCaseTray() {
  return useCssdMutation(
    (input: {
      caseUuid: string;
      itemUuid: string;
      issues: TheatreTrayIssuePayload[];
      notes?: string;
    }) =>
      api.returnTheatreCaseTray(input.caseUuid, input.itemUuid, {
        issues: input.issues,
        notes: input.notes,
      }),
  );
}

// --- counts ----------------------------------------------------------------

export function useTheatreCounts(caseUuid: string) {
  return useQuery({
    queryKey: theatreCssdKeys.counts(caseUuid),
    queryFn: () => api.fetchTheatreCounts(caseUuid),
  });
}

export function useStartTheatreCount() {
  return useCssdMutation((caseUuid: string) => api.startTheatreCount(caseUuid));
}

export function useAddTheatreCountItem() {
  return useCssdMutation(
    (input: {
      caseUuid: string;
      category: TheatreCountCategory;
      name?: string;
      quantity: number;
    }) =>
      api.addTheatreCountItem(input.caseUuid, {
        category: input.category,
        name: input.name,
        quantity: input.quantity,
      }),
  );
}

export function useUpdateTheatreCountItem() {
  return useCssdMutation(
    (input: { caseUuid: string; itemUuid: string; name?: string; initial?: number }) =>
      api.updateTheatreCountItem(input.caseUuid, input.itemUuid, {
        name: input.name,
        initial: input.initial,
      }),
  );
}

export function useRemoveTheatreCountItem() {
  return useCssdMutation((input: { caseUuid: string; itemUuid: string }) =>
    api.removeTheatreCountItem(input.caseUuid, input.itemUuid),
  );
}

export function useAddToTheatreCountItem() {
  return useCssdMutation((input: { caseUuid: string; itemUuid: string; quantity: number }) =>
    api.addToTheatreCountItem(input.caseUuid, input.itemUuid, input.quantity),
  );
}

export function useRecordTheatreCounts() {
  return useCssdMutation(
    (input: {
      caseUuid: string;
      phase: TheatreCountPhase;
      counts: Record<string, number | null>;
    }) => api.recordTheatreCounts(input.caseUuid, input.phase, input.counts),
  );
}

export function useConfirmTheatreCount() {
  return useCssdMutation(
    (input: { caseUuid: string; phase: TheatreCountPhase; witnessId: number; notes?: string }) =>
      api.confirmTheatreCount(input.caseUuid, {
        phase: input.phase,
        witness_id: input.witnessId,
        notes: input.notes,
      }),
  );
}

export function useResolveTheatreCount() {
  return useCssdMutation((input: { caseUuid: string; payload: TheatreCountResolvePayload }) =>
    api.resolveTheatreCount(input.caseUuid, input.payload),
  );
}

export function useTheatreCountWitnesses(caseUuid: string, q: string, enabled: boolean) {
  return useQuery({
    queryKey: theatreCssdKeys.witnesses(caseUuid, q),
    queryFn: () => api.fetchTheatreCountWitnesses(caseUuid, q),
    enabled,
  });
}

// --- implants --------------------------------------------------------------

export function useTheatreImplantRecall(filters: TheatreImplantRecallFilters, enabled: boolean) {
  return useQuery({
    queryKey: theatreCssdKeys.implantRecall(filters),
    queryFn: () => api.fetchTheatreImplantRecall(filters),
    enabled,
  });
}

export function useTheatreImplantBatches(productUuid: string | null) {
  return useQuery({
    queryKey: theatreCssdKeys.implantBatches(productUuid ?? ""),
    queryFn: () => api.fetchTheatreImplantBatches(productUuid as string),
    enabled: Boolean(productUuid),
  });
}
