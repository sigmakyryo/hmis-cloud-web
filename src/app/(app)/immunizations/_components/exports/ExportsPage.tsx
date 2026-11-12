"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { LoadError } from "../shared/QuietLoading";
import { ExportsAudit } from "./ExportsAudit";
import { fetchOhImmSchedules } from "@/features/occupational-health/services/immunisation.service";

export function ExportsPage() {
  const schedules = useQuery({ queryKey: ["oh-imm-schedules"], queryFn: fetchOhImmSchedules });

  return (
    <ImmPageShell testId="oh-immunizations-exports-page" title="Exports & audit">
      {schedules.isError ? (
        <LoadError>Could not load export tools. Check your connection and try again.</LoadError>
      ) : (
        <ExportsAudit schedules={schedules.data ?? []} />
      )}
    </ImmPageShell>
  );
}
