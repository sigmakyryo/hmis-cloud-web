"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { ExportsAudit } from "./ExportsAudit";
import { fetchOhImmSchedules } from "@/features/occupational-health/services/immunisation.service";

export function ExportsPage() {
  const schedules = useQuery({ queryKey: ["oh-imm-schedules"], queryFn: fetchOhImmSchedules });

  return (
    <ImmPageShell
      testId="oh-immunizations-exports-page"
      title="Exports & audit"
      description="DHIS/FHIR packs, mappings, and a quiet activity trail."
    >
      {schedules.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load export tools. Check your connection and try again.
        </p>
      ) : (
        <ExportsAudit schedules={schedules.data ?? []} />
      )}
    </ImmPageShell>
  );
}
