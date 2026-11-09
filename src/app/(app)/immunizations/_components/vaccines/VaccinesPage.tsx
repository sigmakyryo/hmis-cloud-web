"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { VaccinesLots } from "./VaccinesLots";
import { fetchOhImmLots, fetchOhImmVaccines } from "@/features/occupational-health/services/immunisation.service";

export function VaccinesPage() {
  const vaccines = useQuery({ queryKey: ["oh-imm-vaccines"], queryFn: fetchOhImmVaccines });
  const lots = useQuery({ queryKey: ["oh-imm-lots"], queryFn: () => fetchOhImmLots() });
  const loading = vaccines.isLoading || lots.isLoading;
  const errored = vaccines.isError || lots.isError;

  return (
    <ImmPageShell
      testId="oh-immunizations-vaccines-page"
      title="Vaccines & lots"
      description="Catalog of vaccines and stock lots used for administration."
    >
      {errored ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load vaccines or lots. Check your connection and try again.
        </p>
      ) : (
        <VaccinesLots vaccines={vaccines.data ?? []} lots={lots.data ?? []} loading={loading} />
      )}
    </ImmPageShell>
  );
}
