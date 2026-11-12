"use client";

import { TheatreCasePanelGate } from "@/features/clinical-theatre/components/TheatreCasePanelGate";
import { TheatreChecklistPanel } from "@/features/clinical-theatre/components/TheatreChecklistPanel";
import { TheatrePreOpPanel } from "@/features/clinical-theatre/components/TheatrePreOpPanel";
import { TheatreTeamPanel } from "@/features/clinical-theatre/components/TheatreTeamPanel";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

/** Theatre workspace "Team" tab. */
export function TheatreTeamTabPanel({ encounterUuid }: ClinicalWorkspacePanelProps) {
  return (
    <TheatreCasePanelGate encounterUuid={encounterUuid}>
      {(theatreCase) => <TheatreTeamPanel theatreCase={theatreCase} />}
    </TheatreCasePanelGate>
  );
}

/** Theatre workspace "WHO checklist" tab. */
export function TheatreChecklistTabPanel({
  encounterUuid,
}: ClinicalWorkspacePanelProps) {
  return (
    <TheatreCasePanelGate encounterUuid={encounterUuid}>
      {(theatreCase) => <TheatreChecklistPanel theatreCase={theatreCase} />}
    </TheatreCasePanelGate>
  );
}

/** Theatre workspace "Pre-op" tab. */
export function TheatrePreOpTabPanel({ encounterUuid }: ClinicalWorkspacePanelProps) {
  return (
    <TheatreCasePanelGate encounterUuid={encounterUuid}>
      {(theatreCase) => <TheatrePreOpPanel theatreCase={theatreCase} />}
    </TheatreCasePanelGate>
  );
}
