"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { LoadError } from "../shared/QuietLoading";
import { SchedulesManager } from "./SchedulesManager";
import { fetchOhImmSchedules } from "@/features/occupational-health/services/immunisation.service";

export function SchedulesPage() {
  const schedules = useQuery({ queryKey: ["oh-imm-schedules"], queryFn: fetchOhImmSchedules });

  return (
    <ImmPageShell testId="oh-immunizations-schedules-page" title="Schedules">
      {schedules.isError ? (
        <LoadError>Could not load schedules. Check your connection and try again.</LoadError>
      ) : (
        <SchedulesManager schedules={schedules.data ?? []} loading={schedules.isLoading} />
      )}
    </ImmPageShell>
  );
}
