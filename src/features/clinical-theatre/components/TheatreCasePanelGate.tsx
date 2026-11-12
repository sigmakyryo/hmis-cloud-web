"use client";

import type { ReactNode } from "react";

import { useTheatreCaseForEncounter } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";

type TheatreCasePanelGateProps = {
  encounterUuid: string;
  children: (theatreCase: TheatreCase) => ReactNode;
};

/** Load the encounter's theatre case and show loading / empty / error states. */
export function TheatreCasePanelGate({
  encounterUuid,
  children,
}: TheatreCasePanelGateProps) {
  const { theatreCase, isLoading, error } = useTheatreCaseForEncounter(encounterUuid);

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
  if (!theatreCase) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="theatre-case-missing">
        Set up the theatre case above to start recording.
      </p>
    );
  }
  return <>{children(theatreCase)}</>;
}
