"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DueWorklist } from "./DueWorklist";
import { ImmPageShell } from "../shared/ImmPageShell";
import { LoadError } from "../shared/QuietLoading";
import { fetchOhImmDueFiltered, seedOhImmExamples } from "@/features/occupational-health/services/immunisation.service";
import { useToast } from "@/providers/toast-provider";

export function DuePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const due = useQuery({
    queryKey: ["oh-imm-due"],
    queryFn: () => fetchOhImmDueFiltered(14),
  });
  const seed = useMutation({
    mutationFn: seedOhImmExamples,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["oh-imm-due"] });
      void qc.invalidateQueries({ queryKey: ["oh-imm-due-filtered"] });
      void qc.invalidateQueries({ queryKey: ["oh-imm-vaccines"] });
      void qc.invalidateQueries({ queryKey: ["oh-imm-schedules"] });
      toast({
        variant: "success",
        title: "Example packs loaded",
        description: "Editable examples only — review before clinical use.",
      });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not load examples",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  return (
    <ImmPageShell testId="oh-immunizations-due-page" title="Due & overdue">
      {due.isError ? (
        <LoadError>Could not load the due list. Check your connection and try again.</LoadError>
      ) : (
        <DueWorklist
          rows={due.data ?? []}
          loading={due.isLoading}
          seeding={seed.isPending}
          onLoadExamples={() => seed.mutate()}
        />
      )}
    </ImmPageShell>
  );
}
