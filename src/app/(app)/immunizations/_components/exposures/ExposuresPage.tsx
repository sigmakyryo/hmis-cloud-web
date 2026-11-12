"use client";

import { ImmPageShell } from "../shared/ImmPageShell";
import { ExposuresWorkbench } from "./ExposuresWorkbench";

export function ExposuresPage() {
  return (
    <ImmPageShell testId="oh-immunizations-exposures-page" title="Exposures">
      <ExposuresWorkbench />
    </ImmPageShell>
  );
}
