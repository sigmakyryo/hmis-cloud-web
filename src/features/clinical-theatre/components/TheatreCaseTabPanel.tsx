"use client";

import { TheatreCaseActions } from "@/features/clinical-theatre/components/TheatreCaseActions";
import { TheatreCaseSummary } from "@/features/clinical-theatre/components/TheatreCaseSummary";
import { TheatreSafetyBadges } from "@/features/clinical-theatre/components/TheatreSafetyBadges";
import { useTheatreCases } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

/** Theatre workspace "Case" tab: the case linked to this theatre encounter. */
export function TheatreCaseTabPanel({ encounterUuid }: ClinicalWorkspacePanelProps) {
  const { data = [], isLoading, error } = useTheatreCases({
    encounter: encounterUuid,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading theatre case…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Could not load the theatre case."}
      </p>
    );
  }
  const theatreCase = data[0];
  if (!theatreCase) {
    return (
      <p className="text-sm text-muted-foreground">
        No theatre case is linked to this encounter.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="theatre-case-tab">
      <TheatreCaseSummary theatreCase={theatreCase} />
      <TheatreSafetyBadges safety={theatreCase.safety} />
      {theatreCase.notes ? (
        <p className="whitespace-pre-wrap text-sm">{theatreCase.notes}</p>
      ) : null}
      <TheatreCaseActions theatreCase={theatreCase} />
    </div>
  );
}
