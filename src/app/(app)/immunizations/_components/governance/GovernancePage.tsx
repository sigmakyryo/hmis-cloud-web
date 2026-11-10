"use client";

import { ImmPageShell } from "../shared/ImmPageShell";
import { GovernanceControls } from "./GovernanceControls";

export function GovernancePage() {
  return (
    <ImmPageShell testId="oh-immunizations-governance-page" title="Governance">
      <GovernanceControls />
    </ImmPageShell>
  );
}
