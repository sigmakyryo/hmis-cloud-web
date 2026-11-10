"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { SchedulesManager } from "./SchedulesManager";
import { fetchOhImmSchedules } from "@/features/occupational-health/services/immunisation.service";

export function SchedulesPage() {
  const schedules = useQuery({ queryKey: ["oh-imm-schedules"], queryFn: fetchOhImmSchedules });

  return (
    <ImmPageShell
      testId="oh-immunizations-schedules-page"
      title="Schedules"
      description="Publish who needs which vaccine series, with assignment rules and certificates."
    >
      {schedules.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load schedules. Check your connection and try again.
        </p>
      ) : (
        <SchedulesManager schedules={schedules.data ?? []} loading={schedules.isLoading} />
      )}
    </ImmPageShell>
  );
}
