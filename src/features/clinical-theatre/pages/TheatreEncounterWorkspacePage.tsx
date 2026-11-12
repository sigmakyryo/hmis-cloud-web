"use client";

import type { ReactNode } from "react";

import { THEATRE_WORKSPACE_CONFIG } from "@/features/clinical-theatre/config/theatre-workspace.config";
import { OpdEncounterWorkspacePage } from "@/features/clinical-opd/pages/OpdEncounterWorkspacePage";

type TheatreEncounterWorkspacePageProps = {
  visitUuid: string;
  encounterUuid: string;
  children: ReactNode;
};

export function TheatreEncounterWorkspacePage({
  visitUuid,
  encounterUuid,
  children,
}: TheatreEncounterWorkspacePageProps) {
  return (
    <OpdEncounterWorkspacePage
      visitUuid={visitUuid}
      encounterUuid={encounterUuid}
      config={THEATRE_WORKSPACE_CONFIG}
    >
      {children}
    </OpdEncounterWorkspacePage>
  );
}
