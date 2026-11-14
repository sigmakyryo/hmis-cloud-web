"use client";

import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ExposuresWorkbench } from "@/app/(app)/immunizations/_components/exposures/ExposuresWorkbench";

/** Needle-stick and body-fluid incidents, kept on their own workflow and homed under Exposure management. */
export function ExposureIncidentsPage() {
  return (
    <ImmPageShell testId="exposure-incidents-page" title="Biological exposure incidents">
      <ExposuresWorkbench />
    </ImmPageShell>
  );
}
