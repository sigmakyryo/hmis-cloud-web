"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { draftIodFromVisit } from "@/features/occupational-health/iod-case/iod-from-visit.service";
import {
  fetchIodCaseDetail,
  fetchIodCaseEntries,
  fetchIodCasePack,
  iodCaseKeys,
  patchIodCaseDetail,
} from "@/features/occupational-health/iod-case/iod-case.service";
import { useToast } from "@/providers/toast-provider";

export function useIodCase(uuid: string) {
  const detail = useQuery({
    queryKey: iodCaseKeys.detail(uuid),
    queryFn: () => fetchIodCaseDetail(uuid),
  });
  // The pack needs an employment record; a missing one must not hide the case itself.
  const pack = useQuery({
    queryKey: iodCaseKeys.pack(uuid),
    queryFn: () => fetchIodCasePack(uuid),
    retry: false,
  });
  const entries = useQuery({
    queryKey: iodCaseKeys.entries(uuid),
    queryFn: () => fetchIodCaseEntries(uuid),
  });
  return { detail, pack, entries };
}

/** Saves case fields, then refreshes everything the page derives from them (timeline events, notices). */
export function useUpdateIodCase(uuid: string, successTitle = "Case updated") {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (changes: Record<string, unknown>) => patchIodCaseDetail(uuid, changes),
    onSuccess: async () => {
      toast({ variant: "success", title: successTitle });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: iodCaseKeys.detail(uuid) }),
        queryClient.invalidateQueries({ queryKey: iodCaseKeys.pack(uuid) }),
        queryClient.invalidateQueries({ queryKey: iodCaseKeys.entries(uuid) }),
        queryClient.invalidateQueries({ queryKey: iodCaseKeys.list }),
      ]);
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not update the case",
        description: error instanceof Error ? error.message : undefined,
      }),
  });
}

/** Writes the case up again from its OPD visit record, on request. */
export function useDraftIodFromVisit(uuid: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => draftIodFromVisit(uuid),
    onSuccess: async (result) => {
      const waiting = result.ai_status === "waiting";
      toast({
        variant: "success",
        title: waiting ? "Nothing to draft from yet" : "Drafted from the visit record",
        description: waiting
          ? "The visit has no documentation yet. The case will be filled in automatically once it does."
          : "Please review what was drafted.",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: iodCaseKeys.detail(uuid) }),
        queryClient.invalidateQueries({ queryKey: iodCaseKeys.entries(uuid) }),
      ]);
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not draft the case",
        description: error instanceof Error ? error.message : undefined,
      }),
  });
}
