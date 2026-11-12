"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveTheatrePreferenceCard,
  billTheatreCaseProcedure,
  confirmAllTheatrePlannedItems,
  confirmTheatrePlannedItem,
  createTheatrePreferenceCard,
  createTheatreProcedureCode,
  dismissTheatrePlannedItem,
  fetchTheatrePlannedItems,
  fetchTheatrePreferenceCards,
  fetchTheatreProcedureCodes,
  fetchTheatreProductCodes,
  importTheatreProcedureCodes,
  loadTheatrePreferenceCard,
  loadTheatreProcedureCodeSample,
  saveTheatreCaseAsPreferenceCard,
  searchTheatreProcedureProducts,
  setTheatreProductCodes,
  updateTheatrePreferenceCard,
  updateTheatreProcedureCode,
} from "@/features/clinical-theatre/services/theatre-catalog.service";
import type {
  SaveTheatrePreferenceCardPayload,
  TheatrePreferenceCardPayload,
  TheatreProcedureCodeFilters,
  TheatreProcedureCodeImportPayload,
  TheatreProcedureCodeSystem,
} from "@/features/clinical-theatre/types/theatre-catalog.types";

export const theatreCatalogKeys = {
  procedureProducts: (q: string, caseUuid?: string) =>
    ["theatre", "procedure-products", q, caseUuid ?? ""] as const,
  procedureCodes: (filters: TheatreProcedureCodeFilters) =>
    ["theatre", "procedure-codes", filters] as const,
  productCodes: (productUuid: string) =>
    ["theatre", "product-codes", productUuid] as const,
  preferenceCards: (mine: boolean, includeInactive: boolean) =>
    ["theatre", "preference-cards", mine, includeInactive] as const,
  plannedItems: (caseUuid: string) => ["theatre", "planned-items", caseUuid] as const,
};

function useTheatreMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["theatre"] }),
  });
}

export function useTheatreProcedureProducts(
  q: string,
  options: { caseUuid?: string; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatreCatalogKeys.procedureProducts(q, options.caseUuid),
    queryFn: () => searchTheatreProcedureProducts({ q, caseUuid: options.caseUuid }),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useBillTheatreCaseProcedure() {
  return useTheatreMutation((input: { uuid: string; procedureUuid: string }) =>
    billTheatreCaseProcedure(input.uuid, input.procedureUuid),
  );
}

export function useTheatreProcedureCodes(
  filters: TheatreProcedureCodeFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: theatreCatalogKeys.procedureCodes(filters),
    queryFn: () => fetchTheatreProcedureCodes(filters),
    enabled: options.enabled ?? true,
  });
}

export function useCreateTheatreProcedureCode() {
  return useTheatreMutation(
    (payload: {
      system: TheatreProcedureCodeSystem;
      code: string;
      description?: string;
    }) => createTheatreProcedureCode(payload),
  );
}

export function useUpdateTheatreProcedureCode() {
  return useTheatreMutation(
    (input: { uuid: string; payload: { description?: string; is_active?: boolean } }) =>
      updateTheatreProcedureCode(input.uuid, input.payload),
  );
}

export function useImportTheatreProcedureCodes() {
  return useTheatreMutation((payload: TheatreProcedureCodeImportPayload) =>
    importTheatreProcedureCodes(payload),
  );
}

export function useLoadTheatreProcedureCodeSample() {
  return useTheatreMutation((_: void) => loadTheatreProcedureCodeSample());
}

export function useTheatreProductCodes(productUuid: string | null) {
  return useQuery({
    queryKey: theatreCatalogKeys.productCodes(productUuid ?? ""),
    queryFn: () => fetchTheatreProductCodes(productUuid ?? ""),
    enabled: Boolean(productUuid),
  });
}

export function useSetTheatreProductCodes() {
  return useTheatreMutation(
    (input: {
      productUuid: string;
      codes: Array<{ code: string; is_primary: boolean }>;
    }) => setTheatreProductCodes(input.productUuid, input.codes),
  );
}

export function useTheatrePreferenceCards(
  params: { mine?: boolean; includeInactive?: boolean } = {},
) {
  const mine = Boolean(params.mine);
  const includeInactive = Boolean(params.includeInactive);
  return useQuery({
    queryKey: theatreCatalogKeys.preferenceCards(mine, includeInactive),
    queryFn: () => fetchTheatrePreferenceCards({ mine, includeInactive }),
  });
}

export function useCreateTheatrePreferenceCard() {
  return useTheatreMutation((payload: TheatrePreferenceCardPayload) =>
    createTheatrePreferenceCard(payload),
  );
}

export function useUpdateTheatrePreferenceCard() {
  return useTheatreMutation(
    (input: { uuid: string; payload: TheatrePreferenceCardPayload }) =>
      updateTheatrePreferenceCard(input.uuid, input.payload),
  );
}

export function useArchiveTheatrePreferenceCard() {
  return useTheatreMutation((uuid: string) => archiveTheatrePreferenceCard(uuid));
}

export function useTheatrePlannedItems(caseUuid: string) {
  return useQuery({
    queryKey: theatreCatalogKeys.plannedItems(caseUuid),
    queryFn: () => fetchTheatrePlannedItems(caseUuid),
    enabled: Boolean(caseUuid),
  });
}

export function useLoadTheatrePreferenceCard() {
  return useTheatreMutation((input: { uuid: string; cardUuid?: string | null }) =>
    loadTheatrePreferenceCard(input.uuid, input.cardUuid),
  );
}

export function useConfirmTheatrePlannedItem() {
  return useTheatreMutation(
    (input: { uuid: string; itemUuid: string; quantity?: string }) =>
      confirmTheatrePlannedItem(input.uuid, input.itemUuid, input.quantity),
  );
}

export function useDismissTheatrePlannedItem() {
  return useTheatreMutation((input: { uuid: string; itemUuid: string }) =>
    dismissTheatrePlannedItem(input.uuid, input.itemUuid),
  );
}

export function useConfirmAllTheatrePlannedItems() {
  return useTheatreMutation((uuid: string) => confirmAllTheatrePlannedItems(uuid));
}

export function useSaveTheatreCaseAsPreferenceCard() {
  return useTheatreMutation(
    (input: { uuid: string; payload?: SaveTheatrePreferenceCardPayload }) =>
      saveTheatreCaseAsPreferenceCard(input.uuid, input.payload),
  );
}
