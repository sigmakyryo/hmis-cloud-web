"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { LoadError } from "../shared/QuietLoading";
import { VaccinesLots } from "./VaccinesLots";
import { fetchOhImmLots, fetchOhImmVaccines } from "@/features/occupational-health/services/immunisation.service";

export function VaccinesPage() {
  const vaccines = useQuery({ queryKey: ["oh-imm-vaccines"], queryFn: fetchOhImmVaccines });
  const lots = useQuery({ queryKey: ["oh-imm-lots"], queryFn: () => fetchOhImmLots() });

  return (
    <ImmPageShell testId="oh-immunizations-vaccines-page" title="Vaccines & lots">
      {vaccines.isError || lots.isError ? (
        <LoadError>Could not load vaccines or lots. Check your connection and try again.</LoadError>
      ) : (
        <VaccinesLots
          vaccines={vaccines.data ?? []}
          lots={lots.data ?? []}
          loading={vaccines.isLoading || lots.isLoading}
        />
      )}
    </ImmPageShell>
  );
}
