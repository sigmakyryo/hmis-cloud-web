"use client";

import { ImmPageShell } from "../shared/ImmPageShell";
import { RiskTasks } from "./RiskTasks";

export function RiskPage() {
  return (
    <ImmPageShell
      testId="oh-immunizations-risk-page"
      title="Risk & tasks"
      description="Bio-risk pathways, task scores, and non-responder protocols."
    >
      <RiskTasks />
    </ImmPageShell>
  );
}
