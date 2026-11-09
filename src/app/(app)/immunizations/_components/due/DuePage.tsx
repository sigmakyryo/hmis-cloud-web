"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { DueWorklist } from "./DueWorklist";
import { ImmPageShell } from "../shared/ImmPageShell";
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
    <ImmPageShell
      testId="oh-immunizations-due-page"
      title="Due & overdue"
      description="People who need a dose, titre, fit-test, or exposure follow-up soon."
      actions={
        <SecondaryButton type="button" disabled={seed.isPending} onClick={() => seed.mutate()}>
          {seed.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </>
          ) : (
            "Load example packs"
          )}
        </SecondaryButton>
      }
    >
      {due.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load the due list. Check your connection and try again.
        </p>
      ) : (
        <DueWorklist rows={due.data ?? []} loading={due.isLoading} />
      )}
    </ImmPageShell>
  );
}
