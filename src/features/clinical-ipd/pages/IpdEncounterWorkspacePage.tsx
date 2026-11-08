"use client";

import type { ReactNode } from "react";

import { IPD_WORKSPACE_CONFIG } from "@/features/clinical-ipd/config/ipd-workspace.config";
import { OpdEncounterWorkspacePage } from "@/features/clinical-opd/pages/OpdEncounterWorkspacePage";

type IpdEncounterWorkspacePageProps = {
  visitUuid: string;
  encounterUuid: string;
  children: ReactNode;
};

export function IpdEncounterWorkspacePage({
  visitUuid,
  encounterUuid,
  children,
}: IpdEncounterWorkspacePageProps) {
  return (
    <OpdEncounterWorkspacePage
      visitUuid={visitUuid}
      encounterUuid={encounterUuid}
      config={IPD_WORKSPACE_CONFIG}
    >
      {children}
    </OpdEncounterWorkspacePage>
  );
}
