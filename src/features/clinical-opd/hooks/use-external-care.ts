"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveExternalReference,
  archiveExternalTransfer,
  archiveSettingsOutsideHospital,
  archiveSettingsReferenceKind,
  createExternalReference,
  createExternalTransfer,
  fetchEncounterOutsideHospitals,
  fetchEncounterReferenceKinds,
  fetchExternalReferences,
  fetchExternalTransfers,
  fetchSettingsOutsideHospitals,
  fetchSettingsReferenceKinds,
  saveSettingsOutsideHospital,
  saveSettingsReferenceKind,
  uploadReferenceDocument,
  uploadTransferDocument,
} from "@/features/clinical-opd/services/external-care.service";
import type {
  CreateReferenceInput,
  CreateTransferInput,
  ExternalReferenceKind,
} from "@/features/clinical-opd/types/external-care.types";

function encounterKey(name: string, visitUuid: string, encounterUuid: string) {
  return [name, visitUuid, encounterUuid] as const;
}

export function useEncounterOutsideHospitals(
  visitUuid: string,
  encounterUuid: string,
  enabled = true,
) {
  return useQuery({
    queryKey: encounterKey("external-care-hospitals", visitUuid, encounterUuid),
    queryFn: () => fetchEncounterOutsideHospitals({ visitUuid, encounterUuid }),
    enabled: enabled && Boolean(visitUuid && encounterUuid),
  });
}

export function useExternalTransfers(
  visitUuid: string,
  encounterUuid: string,
  enabled = true,
) {
  return useQuery({
    queryKey: encounterKey("external-care-transfers", visitUuid, encounterUuid),
    queryFn: () => fetchExternalTransfers({ visitUuid, encounterUuid }),
    enabled: enabled && Boolean(visitUuid && encounterUuid),
  });
}

export function useExternalReferences(
  visitUuid: string,
  encounterUuid: string,
  enabled = true,
) {
  return useQuery({
    queryKey: encounterKey("external-care-references", visitUuid, encounterUuid),
    queryFn: () => fetchExternalReferences({ visitUuid, encounterUuid }),
    enabled: enabled && Boolean(visitUuid && encounterUuid),
  });
}

export function useEncounterReferenceKinds(
  visitUuid: string,
  encounterUuid: string,
  enabled = true,
) {
  return useQuery({
    queryKey: encounterKey("external-care-kinds", visitUuid, encounterUuid),
    queryFn: () => fetchEncounterReferenceKinds({ visitUuid, encounterUuid }),
    enabled: enabled && Boolean(visitUuid && encounterUuid),
  });
}

export function useCreateExternalTransfer(visitUuid: string, encounterUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      files,
    }: {
      input: CreateTransferInput;
      files: File[];
    }) => {
      const transfer = await createExternalTransfer({ visitUuid, encounterUuid }, input);
      const failedFileNames: string[] = [];
      for (const file of files) {
        try {
          await uploadTransferDocument({ visitUuid, encounterUuid }, transfer.uuid, file);
        } catch {
          failedFileNames.push(file.name);
        }
      }
      return { failedFileNames };
    },
    onSuccess: async (_transfer, variables) => {
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-transfers", visitUuid, encounterUuid),
      });
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-hospitals", visitUuid, encounterUuid),
      });
      if (variables.input.direction === "outbound") {
        await queryClient.invalidateQueries({
          queryKey: ["encounter-disposition", visitUuid, encounterUuid],
        });
      }
    },
  });
}

export function useCreateExternalReference(visitUuid: string, encounterUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      files,
    }: {
      input: CreateReferenceInput;
      files: File[];
    }) => {
      const reference = await createExternalReference(
        { visitUuid, encounterUuid },
        input,
      );
      const failedFileNames: string[] = [];
      for (const file of files) {
        try {
          await uploadReferenceDocument(
            { visitUuid, encounterUuid },
            reference.uuid,
            file,
          );
        } catch {
          failedFileNames.push(file.name);
        }
      }
      return { failedFileNames };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-references", visitUuid, encounterUuid),
      });
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-hospitals", visitUuid, encounterUuid),
      });
    },
  });
}

export function useArchiveExternalTransfer(visitUuid: string, encounterUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transferUuid: string) =>
      archiveExternalTransfer({ visitUuid, encounterUuid }, transferUuid),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-transfers", visitUuid, encounterUuid),
      });
    },
  });
}

export function useUploadExternalTransferDocument(
  visitUuid: string,
  encounterUuid: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transferUuid, file }: { transferUuid: string; file: File }) =>
      uploadTransferDocument({ visitUuid, encounterUuid }, transferUuid, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-transfers", visitUuid, encounterUuid),
      });
    },
  });
}

export function useArchiveExternalReference(visitUuid: string, encounterUuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (referenceUuid: string) =>
      archiveExternalReference({ visitUuid, encounterUuid }, referenceUuid),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-references", visitUuid, encounterUuid),
      });
    },
  });
}

export function useUploadExternalReferenceDocument(
  visitUuid: string,
  encounterUuid: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ referenceUuid, file }: { referenceUuid: string; file: File }) =>
      uploadReferenceDocument({ visitUuid, encounterUuid }, referenceUuid, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: encounterKey("external-care-references", visitUuid, encounterUuid),
      });
    },
  });
}

export function useSettingsOutsideHospitals() {
  return useQuery({
    queryKey: ["settings-outside-hospitals"],
    queryFn: fetchSettingsOutsideHospitals,
  });
}

export function useSaveSettingsOutsideHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      hospitalUuid,
      input,
    }: {
      hospitalUuid?: string;
      input: { name: string; town: string; phone: string };
    }) => saveSettingsOutsideHospital(input, hospitalUuid),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["settings-outside-hospitals"],
      });
    },
  });
}

export function useArchiveSettingsOutsideHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveSettingsOutsideHospital,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["settings-outside-hospitals"],
      });
    },
  });
}

export function useSettingsReferenceKinds() {
  return useQuery({
    queryKey: ["settings-reference-kinds"],
    queryFn: fetchSettingsReferenceKinds,
  });
}

export function useSaveSettingsReferenceKind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kindUuid,
      input,
    }: {
      kindUuid?: string;
      input: { label: string; scope: ExternalReferenceKind["scope"] };
    }) => saveSettingsReferenceKind(input, kindUuid),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["settings-reference-kinds"],
      });
    },
  });
}

export function useArchiveSettingsReferenceKind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveSettingsReferenceKind,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["settings-reference-kinds"],
      });
    },
  });
}
