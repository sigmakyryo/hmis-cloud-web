"use client";

import { ImmPageShell } from "../shared/ImmPageShell";
import { ExposuresWorkbench } from "./ExposuresWorkbench";

export function ExposuresPage() {
  return (
    <ImmPageShell
      testId="oh-immunizations-exposures-page"
      title="Exposures"
      description="Log incidents, start PEP/HBIG clocks, follow-ups, and on-call contacts."
    >
      <ExposuresWorkbench />
    </ImmPageShell>
  );
}
