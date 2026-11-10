"use client";

import { ImmPageShell } from "../shared/ImmPageShell";
import { PdcaBoard } from "./PdcaBoard";

export function PdcaPage() {
  return (
    <ImmPageShell
      testId="oh-immunizations-pdca-page"
      title="PDCA"
      description="Root-cause actions, seroprevalence audits, and cold-chain checks."
    >
      <PdcaBoard />
    </ImmPageShell>
  );
}
