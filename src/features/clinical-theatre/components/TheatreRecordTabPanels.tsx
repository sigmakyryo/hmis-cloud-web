"use client";

import { TheatreAnaesthesiaPanel } from "@/features/clinical-theatre/components/TheatreAnaesthesiaPanel";
import { TheatreCasePanelGate } from "@/features/clinical-theatre/components/TheatreCasePanelGate";
import { TheatreConsumablesPanel } from "@/features/clinical-theatre/components/TheatreConsumablesPanel";
import { TheatreOperationNotePanel } from "@/features/clinical-theatre/components/TheatreOperationNotePanel";
import { TheatreRecoveryPanel } from "@/features/clinical-theatre/components/TheatreRecoveryPanel";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

/** Theatre workspace "Anaesthesia" tab. */
export function TheatreAnaesthesiaTabPanel({ encounterUuid }: ClinicalWorkspacePanelProps) {
  return (
    <TheatreCasePanelGate encounterUuid={encounterUuid}>
      {(theatreCase) => <TheatreAnaesthesiaPanel theatreCase={theatreCase} />}
    </TheatreCasePanelGate>
  );
}

/** Theatre workspace "Op note" tab. */
export function TheatreOperationNoteTabPanel({
  encounterUuid,
}: ClinicalWorkspacePanelProps) {
  return (
    <TheatreCasePanelGate encounterUuid={encounterUuid}>
      {(theatreCase) => <TheatreOperationNotePanel theatreCase={theatreCase} />}
    </TheatreCasePanelGate>
  );
}

/** Theatre workspace "Recovery" tab. */
export function TheatreRecoveryTabPanel({ encounterUuid }: ClinicalWorkspacePanelProps) {
  return (
    <TheatreCasePanelGate encounterUuid={encounterUuid}>
      {(theatreCase) => <TheatreRecoveryPanel theatreCase={theatreCase} />}
    </TheatreCasePanelGate>
  );
}

/** Theatre workspace "Consumables" tab. */
export function TheatreConsumablesTabPanel({
  encounterUuid,
}: ClinicalWorkspacePanelProps) {
  return (
    <TheatreCasePanelGate encounterUuid={encounterUuid}>
      {(theatreCase) => <TheatreConsumablesPanel theatreCase={theatreCase} />}
    </TheatreCasePanelGate>
  );
}
